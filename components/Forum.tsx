import React, { useState } from 'react';
import { User, ForumPost } from '../types';
import { MessageSquare, Plus, MessageCircle, Heart, Share2, Loader2, Trash2 } from 'lucide-react';

interface ForumProps {
  user: User;
  posts: ForumPost[];
  addPost: (post: ForumPost) => void;
}

export const Forum: React.FC<ForumProps> = ({ user, posts, addPost }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreatePost = (e: React.FormEvent) => {
      e.preventDefault();
      if(!newPostTitle || !newPostContent) return;

      setIsSubmitting(true);
      
      // Simulate network delay for better UX
      setTimeout(() => {
          const newPost: ForumPost = {
              id: Date.now().toString(),
              title: newPostTitle,
              content: newPostContent,
              authorId: user.id,
              authorName: user.name,
              categoryId: 'general',
              createdAt: new Date().toISOString(),
              views: 0,
              replies: []
          };

          addPost(newPost);
          setIsCreating(false);
          setNewPostTitle('');
          setNewPostContent('');
          setIsSubmitting(false);
      }, 500);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
            <div>
               <div className="flex items-center gap-3">
                   <h2 className="text-3xl font-bold text-slate-800 dark:text-white tracking-tight">Forum Étudiant</h2>
                   <span className="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-xs font-bold px-3 py-1 rounded-full border border-indigo-100 dark:border-indigo-800 flex items-center gap-1">
                     <MessageSquare size={12} /> {user.classLevel}
                   </span>
               </div>
               <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Espace de discussion et d'entraide.</p>
            </div>
            {!isCreating && (
                <button onClick={() => setIsCreating(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-md active:scale-95 flex items-center gap-2 text-sm transition-all">
                    <Plus size={18} /> Nouvelle discussion
                </button>
            )}
        </div>

        {isCreating && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-lg border border-slate-200 dark:border-slate-800 animate-in slide-in-from-top-4">
                <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-white">Poser une question</h3>
                <form onSubmit={handleCreatePost} className="space-y-4">
                    <input 
                        className="w-full p-3 bg-slate-50 dark:bg-slate-800 border-0 rounded-xl font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Titre de votre sujet..."
                        value={newPostTitle}
                        onChange={e => setNewPostTitle(e.target.value)}
                        autoFocus
                        disabled={isSubmitting}
                    />
                    <textarea 
                        className="w-full p-3 bg-slate-50 dark:bg-slate-800 border-0 rounded-xl text-slate-600 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500 min-h-[120px]"
                        placeholder="Détaillez votre question ou message ici..."
                        value={newPostContent}
                        onChange={e => setNewPostContent(e.target.value)}
                        disabled={isSubmitting}
                    />
                    <div className="flex justify-end gap-3">
                        <button type="button" onClick={() => setIsCreating(false)} disabled={isSubmitting} className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">Annuler</button>
                        <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 flex items-center gap-2">
                            {isSubmitting && <Loader2 className="animate-spin" size={16} />} Publier
                        </button>
                    </div>
                </form>
            </div>
        )}

        <div className="space-y-4">
            {posts.length > 0 ? posts.map(post => (
                <div key={post.id} className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800 transition-all cursor-pointer group">
                    <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 font-bold">
                                {post.authorName.charAt(0)}
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-800 dark:text-white text-base group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{post.title}</h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                    <span className="font-medium">{post.authorName}</span> • <span className="opacity-70">{new Date(post.createdAt).toLocaleDateString()}</span>
                                </p>
                            </div>
                        </div>
                        <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase rounded-lg">
                            {post.categoryId || 'General'}
                        </span>
                    </div>
                    
                    <p className="text-slate-600 dark:text-slate-300 text-sm line-clamp-2 mb-4 pl-[52px]">
                        {post.content}
                    </p>

                    <div className="flex items-center gap-6 pl-[52px] text-slate-400 text-xs font-bold">
                        <div className="flex items-center gap-1.5 hover:text-indigo-500 transition-colors">
                            <MessageCircle size={16} /> {post.replies ? post.replies.length : 0} réponses
                        </div>
                        <div className="flex items-center gap-1.5 hover:text-pink-500 transition-colors">
                            <Heart size={16} /> J'aime
                        </div>
                         <div className="flex items-center gap-1.5 hover:text-slate-600 dark:hover:text-slate-200 transition-colors ml-auto">
                            <Share2 size={16} /> Partager
                        </div>
                    </div>
                </div>
            )) : (
                <div className="py-20 text-center bg-slate-50 dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                    <MessageSquare size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                    <p className="text-slate-500 dark:text-slate-400 font-medium">Aucune discussion pour le moment.</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Soyez le premier à lancer un sujet !</p>
                </div>
            )}
        </div>
    </div>
  );
};