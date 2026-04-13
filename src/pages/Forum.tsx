import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePaginatedTable, insertRow, updateRow, deleteRow } from '../../lib/hooks';
import { Post, Comment, Vote, UserRole } from '../../types';
import { useVirtualizer } from '@tanstack/react-virtual';
import { 
  Card, 
  Badge, 
  SecHdr, 
  Spinner, 
  ErrBox, 
  Btn, 
  Modal, 
  ConfirmModal,
  Skeleton 
} from '../../components/ui';
import { 
  Plus, 
  Search, 
  MessageSquare, 
  ArrowBigUp, 
  ArrowBigDown, 
  Share2, 
  Mail, 
  Trash2, 
  MoreVertical,
  User as UserIcon,
  Clock,
  ChevronRight,
  Reply,
  TrendingUp,
  Filter,
  X,
  Send,
  Bell,
  Zap
} from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { generateSmartShare, shareToWhatsApp, shareToEmail } from '../lib/shareUtils';
import { fmtDate } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { 
  where, 
  orderBy, 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc,
  increment,
  writeBatch,
  serverTimestamp,
  getDocs,
  limit,
  startAfter
} from 'firebase/firestore';
import { db } from '../../firebase';

// --- Sub-components ---

const VoteButtons = React.memo<{ 
  targetId: string; 
  score: number; 
  userVote: 'up' | 'down' | null;
  onVote: (type: 'up' | 'down') => void;
  vertical?: boolean;
}>(({ targetId, score, userVote, onVote, vertical = true }) => {
  return (
    <div className={`flex ${vertical ? 'flex-col items-center' : 'items-center gap-2'} bg-white/5 rounded-2xl p-2 border border-white/10 shadow-inner backdrop-blur-md`}>
      <button 
        onClick={(e) => { e.stopPropagation(); onVote('up'); }}
        className={`p-2.5 rounded-xl transition-all duration-500 ${userVote === 'up' ? 'text-warning bg-warning/20 shadow-[0_0_20px_rgba(255,184,0,0.3)] scale-110' : 'text-slate-500 hover:text-white hover:bg-white/10'}`}
      >
        <ArrowBigUp size={vertical ? 26 : 22} fill={userVote === 'up' ? 'currentColor' : 'none'} />
      </button>
      <span className={`font-black text-sm tracking-tighter my-1 ${userVote === 'up' ? 'text-warning' : userVote === 'down' ? 'text-primary' : 'text-slate-400'}`}>
        {score}
      </span>
      <button 
        onClick={(e) => { e.stopPropagation(); onVote('down'); }}
        className={`p-2.5 rounded-xl transition-all duration-500 ${userVote === 'down' ? 'text-primary bg-primary/20 shadow-[0_0_20px_rgba(108,99,255,0.3)] scale-110' : 'text-slate-500 hover:text-white hover:bg-white/10'}`}
      >
        <ArrowBigDown size={vertical ? 26 : 22} fill={userVote === 'down' ? 'currentColor' : 'none'} />
      </button>
    </div>
  );
});

const CommentItem = React.memo<{
  comment: Comment;
  allComments: Comment[];
  depth?: number;
  onReply: (parentId: string, authorName: string) => void;
  onDelete: (id: string) => void;
  onVote: (id: string, type: 'up' | 'down') => void;
  userVotes: Record<string, 'up' | 'down'>;
  canDelete: boolean;
}>(({ comment, allComments, depth = 0, onReply, onDelete, onVote, userVotes, canDelete }) => {
  const replies = allComments.filter(c => c.parentId === comment.id);
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className={`relative ${depth > 0 ? 'ml-4 md:ml-8 mt-4' : 'mt-6'}`}>
      {depth > 0 && (
        <div className="absolute -left-4 md:-left-8 top-0 bottom-0 w-px bg-slate-100 dark:bg-white/5" />
      )}
      
      <div className="flex gap-3">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400">
            <UserIcon size={16} />
          </div>
          {replies.length > 0 && (
            <button 
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="w-6 h-6 rounded-md bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-400 hover:text-primary transition-colors"
            >
              <ChevronRight size={14} className={`transition-transform ${isCollapsed ? '' : 'rotate-90'}`} />
            </button>
          )}
        </div>

        <div className="flex-1">
          <div className="bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-slate-900 dark:text-white">{comment.authorName}</span>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider">{fmtDate(comment.createdAt)}</span>
              </div>
              <div className="flex items-center gap-1">
                <VoteButtons 
                  targetId={comment.id} 
                  score={comment.votesScore} 
                  userVote={userVotes[comment.id] || null}
                  onVote={(type) => onVote(comment.id, type)}
                  vertical={false}
                />
                {canDelete && (
                  <button 
                    onClick={() => onDelete(comment.id)}
                    className="p-1.5 text-slate-400 hover:text-danger transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
              {comment.content}
            </p>
            <div className="mt-3 flex items-center gap-4">
              <button 
                onClick={() => onReply(comment.id, comment.authorName)}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-primary transition-colors"
              >
                <Reply size={14} />
                Répondre
              </button>
            </div>
          </div>

          {!isCollapsed && replies.length > 0 && (
            <div className="space-y-4">
              {replies.map(reply => (
                <CommentItem 
                  key={reply.id} 
                  comment={reply} 
                  allComments={allComments} 
                  depth={depth + 1}
                  onReply={onReply}
                  onDelete={onDelete}
                  onVote={onVote}
                  userVotes={userVotes}
                  canDelete={canDelete}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

// --- Main Component ---

const PostItem = React.memo<{
  post: Post;
  user: any;
  userVotes: Record<string, 'up' | 'down'>;
  handleVote: (id: string, type: 'post' | 'comment', voteType: 'up' | 'down') => void;
  handleShareWhatsApp: (post: Post) => void;
  setConfirmDelete: (config: { id: string, type: 'post' | 'comment' }) => void;
  setSelectedPost: (post: Post) => void;
}>(({ post, user, userVotes, handleVote, handleShareWhatsApp, setConfirmDelete, setSelectedPost }) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
      transition={{ type: "spring", stiffness: 200, damping: 25 }}
      className="group mb-8"
    >
      <GlassCard 
        className="flex gap-0 p-0 overflow-hidden cursor-pointer border-white/5 hover:border-primary/30 transition-all duration-500"
        onClick={() => setSelectedPost(post)}
        tilt={true}
      >
        {/* Vote Sidebar */}
        <div className="w-20 bg-white/[0.02] flex flex-col items-center py-8 border-r border-white/5 relative z-10">
          <VoteButtons 
            targetId={post.id} 
            score={post.votesScore} 
            userVote={userVotes[post.id] || null}
            onVote={(type) => handleVote(post.id, 'post', type)}
          />
        </div>

        {/* Content */}
        <div className="flex-1 p-8 relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-inner">
                <UserIcon size={16} />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-white uppercase tracking-widest leading-none mb-1">{post.authorName}</span>
                <span className="text-[9px] text-slate-500 font-black uppercase tracking-tighter">{fmtDate(post.createdAt)}</span>
              </div>
              {new Date(post.createdAt).getTime() > Date.now() - 86400000 && (
                <div className="px-2.5 py-0.5 bg-success/10 text-success rounded-full text-[8px] font-black uppercase tracking-widest border border-success/20 ml-2 animate-pulse">
                  Nouveau
                </div>
              )}
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <button 
                onClick={(e) => { e.stopPropagation(); handleShareWhatsApp(post); }}
                className="p-2.5 bg-white/5 hover:bg-white/10 text-slate-500 hover:text-[#25D366] rounded-xl transition-all"
              >
                <Share2 size={18} />
              </button>
              {(user?.role === UserRole.ADMIN || user?.id === post.userId) && (
                <button 
                  onClick={(e) => { e.stopPropagation(); setConfirmDelete({ id: post.id, type: 'post' }); }}
                  className="p-2.5 bg-white/5 hover:bg-white/10 text-slate-500 hover:text-danger rounded-xl transition-all"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>
          </div>

          <h3 className="text-2xl font-black text-white mb-4 tracking-tight group-hover:text-primary transition-colors duration-500 leading-tight">
            {post.title}
          </h3>
          <p className="text-sm text-slate-400 line-clamp-2 mb-8 leading-relaxed font-medium group-hover:text-slate-300 transition-colors duration-500">
            {post.content}
          </p>

          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-slate-500">
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/10">
                <MessageSquare size={14} className="text-primary" />
              </div>
              {post.commentsCount} commentaires
            </div>
            <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-slate-500">
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/10">
                <Filter size={14} className="text-primary" />
              </div>
              {post.className}
            </div>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
});

export const Forum: React.FC = () => {
  const { user, classInfo } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'top'>('recent');
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isNewPostModalOpen, setIsNewPostModalOpen] = useState(false);
  const [userVotes, setUserVotes] = useState<Record<string, 'up' | 'down'>>({});
  const [replyTarget, setReplyTarget] = useState<{ id: string | null; name: string | null }>({ id: null, name: null });
  const [commentContent, setCommentContent] = useState('');
  
  const [newPostData, setNewPostData] = useState({ title: '', content: '' });
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; type: 'post' | 'comment' } | null>(null);
  const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    setScrollElement(document.getElementById('scroll-container') as HTMLDivElement);
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch posts with pagination
  const postConstraints = useMemo(() => {
    const constraints: any[] = [orderBy('createdAt', 'desc')];
    if (user?.role !== UserRole.ADMIN) {
      constraints.unshift(where('className', '==', user?.class_name || ''));
    }
    return constraints;
  }, [user?.class_name, user?.role]);

  const { 
    data: posts, 
    loading: postsLoading, 
    error: postsError,
    hasMore,
    loadMore,
    loadingMore,
    refetch
  } = usePaginatedTable<Post>(
    'posts',
    postConstraints,
    10,
    !!user?.class_name || user?.role === 'ADMIN'
  );

  // Fetch user votes
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'votes'), where('userId', '==', user.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const votes: Record<string, 'up' | 'down'> = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data() as Vote;
        votes[data.targetId] = data.type;
      });
      setUserVotes(votes);
    }, (err) => {
      console.error("🔥 Forum Votes Snapshot Error:", err);
    });
    return () => unsubscribe();
  }, [user]);

  // Fetch comments for selected post with pagination
  const commentConstraints = useMemo(() => [
    where('postId', '==', selectedPost?.id || ''), 
    orderBy('createdAt', 'asc')
  ], [selectedPost?.id]);

  const {
    data: postComments,
    loading: commentsLoading,
    hasMore: hasMoreComments,
    loadMore: loadMoreComments,
    loadingMore: loadingMoreComments,
  } = usePaginatedTable<Comment>(
    'comments',
    commentConstraints,
    10,
    !!selectedPost
  );

  const filteredPosts = useMemo(() => {
    let result = posts.filter(p => 
      p.title.toLowerCase().includes(debouncedSearch.toLowerCase()) || 
      p.content.toLowerCase().includes(debouncedSearch.toLowerCase())
    );
    if (sortBy === 'top') {
      result.sort((a, b) => b.votesScore - a.votesScore);
    }
    return result;
  }, [posts, debouncedSearch, sortBy]);

  const handleVote = async (targetId: string, targetType: 'post' | 'comment', type: 'up' | 'down') => {
    if (!user) return;

    const voteId = `${user.id}_${targetId}`;
    const voteRef = doc(db, 'votes', voteId);
    const targetRef = doc(db, targetType === 'post' ? 'posts' : 'comments', targetId);
    
    const currentVote = userVotes[targetId];
    const batch = writeBatch(db);

    if (currentVote === type) {
      // Remove vote
      batch.delete(voteRef);
      batch.update(targetRef, { votesScore: increment(type === 'up' ? -1 : 1) });
    } else if (currentVote) {
      // Change vote
      batch.update(voteRef, { type });
      batch.update(targetRef, { votesScore: increment(type === 'up' ? 2 : -2) });
    } else {
      // New vote
      batch.set(voteRef, {
        userId: user.id,
        targetId,
        type,
        createdAt: serverTimestamp()
      });
      batch.update(targetRef, { votesScore: increment(type === 'up' ? 1 : -1) });
    }

    try {
      await batch.commit();
      // Optimistically update if it's a post in the list
      if (targetType === 'post') {
        refetch();
      }
    } catch (err) {
      console.error("Vote error:", err);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostData.title.trim() || !newPostData.content.trim()) return;

    try {
      await insertRow('posts', {
        ...newPostData,
        userId: user?.id,
        authorName: user?.name,
        className: user?.class_name,
        votesScore: 0,
        commentsCount: 0
      });
      setIsNewPostModalOpen(false);
      setNewPostData({ title: '', content: '' });
      refetch();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPost || !commentContent.trim()) return;

    try {
      const batch = writeBatch(db);
      const commentRef = doc(collection(db, 'comments'));
      
      batch.set(commentRef, {
        postId: selectedPost.id,
        parentId: replyTarget.id,
        userId: user?.id,
        authorName: user?.name,
        content: commentContent,
        votesScore: 0,
        createdAt: serverTimestamp()
      });

      batch.update(doc(db, 'posts', selectedPost.id), {
        commentsCount: increment(1)
      });

      // Handle mentions (simplified)
      const mentions = commentContent.match(/@(\w+)/g);
      if (mentions) {
        // In a real app, we'd find users and create notifications
      }

      // Notify post author if not self
      if (selectedPost.userId !== user?.id && !replyTarget.id) {
        const notifRef = doc(collection(db, 'notifications'));
        batch.set(notifRef, {
          userId: selectedPost.userId,
          type: 'reply',
          message: `${user?.name} a répondu à votre post: ${selectedPost.title}`,
          link: `/forum?post=${selectedPost.id}`,
          isRead: false,
          createdAt: serverTimestamp()
        });
      }

      // Notify parent comment author if it's a reply
      if (replyTarget.id) {
        const parentComment = postComments.find(c => c.id === replyTarget.id);
        if (parentComment && parentComment.userId !== user?.id) {
          const notifRef = doc(collection(db, 'notifications'));
          batch.set(notifRef, {
            userId: parentComment.userId,
            type: 'reply',
            message: `${user?.name} a répondu à votre commentaire`,
            link: `/forum?post=${selectedPost.id}`,
            isRead: false,
            createdAt: serverTimestamp()
          });
        }
      }

      await batch.commit();
      setCommentContent('');
      setReplyTarget({ id: null, name: null });
      refetch();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      if (confirmDelete.type === 'post') {
        await deleteRow('posts', confirmDelete.id);
        if (selectedPost?.id === confirmDelete.id) setSelectedPost(null);
        refetch();
      } else {
        await deleteRow('comments', confirmDelete.id);
        if (selectedPost) {
          await updateRow('posts', selectedPost.id, {
            commentsCount: increment(-1)
          });
          refetch();
        }
      }
      setConfirmDelete(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleShareWhatsApp = (post: Post) => {
    const { whatsapp } = generateSmartShare('forum', {
      title: post.title,
      content: post.content,
      author: post.authorName,
      className: post.className,
      date: post.createdAt,
      classEmail: classInfo?.class_email
    });
    shareToWhatsApp(whatsapp);
  };

  const rowVirtualizer = useVirtualizer({
    count: filteredPosts.length,
    getScrollElement: () => scrollElement,
    estimateSize: () => 180,
    overscan: 5,
  });

  const handleShareEmail = (post: Post) => {
    const { emailSubject, emailBody, classEmail } = generateSmartShare('forum', {
      title: post.title,
      content: post.content,
      author: post.authorName,
      className: post.className,
      date: post.createdAt,
      classEmail: classInfo?.class_email
    });
    shareToEmail(emailSubject, emailBody, classEmail);
  };

  if (postsError) return <ErrBox message={postsError} />;

  return (
    <div className="max-w-7xl mx-auto px-4 pb-20 space-y-10">
      <ConfirmModal 
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title={`Supprimer ${confirmDelete?.type === 'post' ? 'le post' : 'le commentaire'}`}
        message="Cette action est irréversible. Êtes-vous sûr ?"
      />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        <div className="space-y-1">
          <h1 className="heading-futuristic">Agora Digitale</h1>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
            Espace de discussion libre pour la classe {user?.class_name}
          </p>
        </div>
        
        <button 
          onClick={() => setIsNewPostModalOpen(true)} 
          className="btn-futuristic-primary px-10 py-4 flex items-center gap-3 self-start lg:self-center"
        >
          <Plus size={20} />
          <span className="font-black uppercase tracking-widest text-xs">Nouvelle Discussion</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left Sidebar - Trending & Stats */}
        <div className="lg:col-span-3 space-y-8 order-2 lg:order-1">
          <GlassCard className="p-8 border-white/5 shadow-2xl" tilt={false}>
            <div className="flex items-center gap-3 mb-8 text-primary relative z-10">
              <TrendingUp size={24} />
              <span className="font-black uppercase tracking-widest text-xs">Tendances</span>
            </div>
            <div className="space-y-8 relative z-10">
              {posts.slice(0, 3).map((p, i) => (
                <div key={p.id} className="group cursor-pointer" onClick={() => setSelectedPost(p)}>
                  <div className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-3">
                    <span className="text-primary mr-2">0{i + 1}</span>
                    {p.className}
                  </div>
                  <div className="text-sm font-black text-white group-hover:text-primary transition-colors line-clamp-2 tracking-tight leading-tight">
                    {p.title}
                  </div>
                  <div className="flex items-center gap-4 mt-4">
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">
                      {p.votesScore} votes
                    </div>
                    <div className="w-1 h-1 rounded-full bg-slate-800" />
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">
                      {p.commentsCount} comm.
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard className="p-8 bg-primary/5 border-primary/20 shadow-[0_0_30px_rgba(108,99,255,0.1)]" tilt={true}>
            <div className="flex items-center gap-3 mb-4 text-primary relative z-10">
              <Zap size={24} className="animate-pulse" />
              <span className="font-black uppercase tracking-widest text-xs">Flux d'Activité</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed font-medium relative z-10">
              Restez connecté aux dernières interactions. Le système vous notifiera en temps réel des réponses et mentions.
            </p>
          </GlassCard>
        </div>

        {/* Main Feed */}
        <div className="lg:col-span-9 space-y-8 order-1 lg:order-2">
          {/* Filters */}
          <GlassCard className="flex flex-col md:flex-row gap-6 p-6 rounded-[32px] border-white/5 shadow-2xl" tilt={false}>
            <div className="relative flex-1 group z-10">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors" size={20} />
              <input 
                type="text" 
                placeholder="Rechercher dans l'Agora..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-14 pr-6 py-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm font-medium text-white placeholder:text-slate-700"
              />
            </div>
            <div className="flex gap-3 z-10">
              <button 
                onClick={() => setSortBy('recent')}
                className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-500 ${sortBy === 'recent' ? 'bg-primary text-white shadow-[0_0_20px_rgba(108,99,255,0.3)]' : 'bg-white/5 text-slate-500 hover:bg-white/10'}`}
              >
                Récents
              </button>
              <button 
                onClick={() => setSortBy('top')}
                className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-500 ${sortBy === 'top' ? 'bg-primary text-white shadow-[0_0_20px_rgba(108,99,255,0.3)]' : 'bg-white/5 text-slate-500 hover:bg-white/10'}`}
              >
                Populaires
              </button>
            </div>
          </GlassCard>

          {/* Posts List */}
          <div className="space-y-6">
            {postsLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Card key={i} className="flex gap-6 p-6">
                  <Skeleton className="w-16 h-24 rounded-2xl" />
                  <div className="flex-1 space-y-4">
                    <Skeleton className="h-5 w-1/4 rounded-lg" />
                    <Skeleton className="h-8 w-3/4 rounded-lg" />
                    <Skeleton className="h-16 w-full rounded-xl" />
                  </div>
                </Card>
              ))
            ) : filteredPosts.length > 0 ? (
              <>
                <div
                  style={{
                    height: `${rowVirtualizer.getTotalSize()}px`,
                    width: '100%',
                    position: 'relative',
                  }}
                >
                  {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const post = filteredPosts[virtualRow.index];
                    return (
                      <div
                        key={post.id}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: `${virtualRow.size}px`,
                          transform: `translateY(${virtualRow.start}px)`,
                        }}
                      >
                        <PostItem
                          post={post}
                          user={user}
                          userVotes={userVotes}
                          handleVote={handleVote}
                          handleShareWhatsApp={handleShareWhatsApp}
                          setConfirmDelete={setConfirmDelete}
                          setSelectedPost={setSelectedPost}
                        />
                      </div>
                    );
                  })}
                </div>
                
                {hasMore && !debouncedSearch && (
                  <div className="flex justify-center pt-8">
                    <button 
                      onClick={loadMore} 
                      disabled={loadingMore}
                      className="px-10 py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/10 transition-all disabled:opacity-50"
                    >
                      {loadingMore ? <Spinner size={18} /> : 'Charger plus de données'}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-24 glass-ultra rounded-[40px] border-2 border-dashed border-white/5">
                <MessageSquare size={64} className="mx-auto text-slate-700 mb-6" />
                <h3 className="text-xl font-black text-white tracking-tight">Aucune discussion</h3>
                <p className="text-slate-500 font-medium mt-2 max-w-xs mx-auto">Soyez le premier à initialiser un flux de discussion dans votre classe !</p>
                <button 
                  onClick={() => setIsNewPostModalOpen(true)}
                  className="mt-8 text-[10px] font-black uppercase tracking-widest text-primary hover:text-white transition-colors"
                >
                  Lancer un sujet
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Post Detail Modal */}
      <AnimatePresence>
        {selectedPost && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-950 rounded-[2.5rem] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-slate-100 dark:border-white/5 flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50/50 dark:bg-white/[0.02]">
                <div className="flex items-center gap-3">
                  <Btn variant="ghost" className="p-2 rounded-full" onClick={() => setSelectedPost(null)}>
                    <X size={20} />
                  </Btn>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">Discussion</h3>
                </div>
                <div className="flex items-center gap-2">
                  <Btn variant="secondary" size="sm" onClick={() => handleShareWhatsApp(selectedPost)}>
                    <Share2 size={16} />
                    Partager
                  </Btn>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 custom-scrollbar">
                {/* Post Content */}
                <div className="flex gap-6">
                  <div className="hidden md:block">
                    <VoteButtons 
                      targetId={selectedPost.id} 
                      score={selectedPost.votesScore} 
                      userVote={userVotes[selectedPost.id] || null}
                      onVote={(type) => handleVote(selectedPost.id, 'post', type)}
                    />
                  </div>
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-2">
                      <Badge type="primary">{selectedPost.className}</Badge>
                      <span className="text-xs text-slate-400">Posté par <span className="font-bold text-slate-600 dark:text-slate-300">{selectedPost.authorName}</span> • {fmtDate(selectedPost.createdAt)}</span>
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white leading-tight">{selectedPost.title}</h1>
                    <div className="text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap text-lg">
                      {selectedPost.content}
                    </div>
                  </div>
                </div>

                <div className="h-px bg-slate-100 dark:bg-white/5" />

                {/* Comments Section */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <MessageSquare size={20} className="text-primary" />
                      Commentaires ({selectedPost.commentsCount})
                    </h3>
                  </div>

                  <div className="space-y-4">
                    {postComments.filter(c => !c.parentId).map(comment => (
                      <CommentItem 
                        key={comment.id} 
                        comment={comment} 
                        allComments={postComments}
                        onReply={(id, name) => setReplyTarget({ id, name })}
                        onDelete={(id) => setConfirmDelete({ id, type: 'comment' })}
                        onVote={(id, type) => handleVote(id, 'comment', type)}
                        userVotes={userVotes}
                        canDelete={user?.role === UserRole.ADMIN || user?.id === comment.userId}
                      />
                    ))}
                    
                    {hasMoreComments && (
                      <div className="flex justify-center pt-4">
                        <Btn 
                          variant="secondary" 
                          size="sm" 
                          onClick={loadMoreComments} 
                          disabled={loadingMoreComments}
                        >
                          {loadingMoreComments ? <Spinner size={16} /> : 'Charger plus de commentaires'}
                        </Btn>
                      </div>
                    )}

                    {postComments.length === 0 && !commentsLoading && (
                      <div className="text-center py-10 text-slate-400">
                        Aucun commentaire pour le moment. Soyez le premier à répondre !
                      </div>
                    )}

                    {commentsLoading && (
                      <div className="flex justify-center py-8">
                        <Spinner />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Comment Input */}
              <div className="p-6 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
                <form onSubmit={handleAddComment} className="space-y-3">
                  {replyTarget.id && (
                    <div className="flex items-center justify-between bg-primary/10 px-4 py-2 rounded-xl">
                      <span className="text-xs font-bold text-primary">En réponse à {replyTarget.name}</span>
                      <button onClick={() => setReplyTarget({ id: null, name: null })} className="text-primary hover:text-primary/70">
                        <X size={14} />
                      </button>
                    </div>
                  )}
                  <div className="relative">
                    <textarea 
                      rows={2}
                      value={commentContent}
                      onChange={(e) => setCommentContent(e.target.value)}
                      placeholder="Qu'en pensez-vous ?"
                      className="w-full pl-4 pr-14 py-4 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl outline-none focus:ring-2 focus:ring-primary transition-all text-sm resize-none"
                    />
                    <button 
                      type="submit"
                      disabled={!commentContent.trim()}
                      className="absolute right-3 bottom-3 p-3 bg-primary text-white rounded-xl shadow-lg shadow-primary/20 hover:scale-110 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                    >
                      <Send size={18} />
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* New Post Modal */}
      <Modal 
        isOpen={isNewPostModalOpen} 
        onClose={() => setIsNewPostModalOpen(false)} 
        title="Lancer une discussion"
      >
        <form onSubmit={handleCreatePost} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Titre du sujet</label>
            <input 
              type="text" 
              required
              value={newPostData.title}
              onChange={(e) => setNewPostData({ ...newPostData, title: e.target.value })}
              className="w-full px-5 py-3.5 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-2xl outline-none focus:ring-2 focus:ring-primary transition-all text-sm"
              placeholder="Ex: Question sur le cours de Physique"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Contenu</label>
            <textarea 
              rows={6}
              required
              value={newPostData.content}
              onChange={(e) => setNewPostData({ ...newPostData, content: e.target.value })}
              className="w-full px-5 py-3.5 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-2xl outline-none focus:ring-2 focus:ring-primary transition-all text-sm resize-none"
              placeholder="Détaillez votre question ou partagez votre information ici..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Btn 
              type="button" 
              variant="secondary" 
              className="flex-1" 
              onClick={() => setIsNewPostModalOpen(false)}
            >
              Annuler
            </Btn>
            <Btn type="submit" className="flex-1">
              Publier
            </Btn>
          </div>
        </form>
      </Modal>
    </div>
  );
};
