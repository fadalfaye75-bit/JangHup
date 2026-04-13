import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePaginatedTable, insertRow, updateRow, deleteRow } from '../../lib/hooks';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp, 
  increment, 
  writeBatch,
  orderBy,
  getDocs,
  limit
} from 'firebase/firestore';
import { db } from '../../firebase';
import { Poll, PollOption, PollVote, UserRole } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Check, BarChart2, X, ChevronRight, ChevronLeft, PieChart, Trash2, Lock, Unlock, Share2, Edit3, Mail, Loader2 } from 'lucide-react';
import { generateSmartShare, shareToWhatsApp, shareToEmail } from '../lib/shareUtils';
import { PollAnalytics } from '../components/PollAnalytics';
import { ConfirmModal, Btn, Spinner, Card, ErrBox } from '../../components/ui';
import { notificationService } from '../services/notificationService';

// --- UI COMPONENTS (Design System) ---

// Removed local GlassCard as we use Card from ui components

import { GlassCard } from '../components/ui/GlassCard';

const ProgressBar: React.FC<{ progress: number; isSelected?: boolean }> = ({ progress, isSelected }) => (
  <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden relative border border-white/10 shadow-inner">
    <motion.div 
      initial={{ width: 0 }}
      animate={{ width: `${progress}%` }}
      transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
      className={`h-full rounded-full relative ${isSelected ? 'bg-gradient-to-r from-primary to-neon-blue shadow-[0_0_20px_rgba(108,99,255,0.5)]' : 'bg-slate-700'}`}
    >
      {isSelected && (
        <motion.div 
          animate={{ x: ['-100%', '100%'] }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
        />
      )}
    </motion.div>
  </div>
);

// --- MAIN PAGE COMPONENT ---

export const Sondages: React.FC = () => {
  const { user, classInfo } = useAuth();
  const [pollsWithOptions, setPollsWithOptions] = useState<Poll[]>([]);
  const [myVotes, setMyVotes] = useState<Record<string, string>>({});
  const [voting, setVoting] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPoll, setEditingPoll] = useState<Poll | null>(null);
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });
  const [selectedPollForAnalytics, setSelectedPollForAnalytics] = useState<Poll | null>(null);

  // Form state
  const [newQuestion, setNewQuestion] = useState('');
  const [newOptions, setNewOptions] = useState<{ id?: string; label: string }[]>([
    { label: '' },
    { label: '' }
  ]);
  const [error, setError] = useState<string | null>(null);

  // 1. Fetch Polls with Pagination
  const pollConstraints = React.useMemo(() => {
    const constraints: any[] = [orderBy('createdAt', 'desc')];
    if (user?.role !== UserRole.ADMIN) {
      constraints.unshift(where('className', '==', user?.class_name || ''));
    }
    return constraints;
  }, [user?.class_name, user?.role]);

  const { 
    data: polls, 
    loading: pollsLoading, 
    hasMore, 
    loadMore, 
    loadingMore,
    error: fetchError,
    refetch
  } = usePaginatedTable<Poll>(
    'polls',
    pollConstraints,
    10,
    !!user?.class_name || user?.role === UserRole.ADMIN
  );

  // 2. Listen to Options for LOADED polls only (Scalability Optimization)
  useEffect(() => {
    if (polls.length === 0) {
      setPollsWithOptions([]);
      return;
    }

    const pollIds = polls.map(p => p.id);
    // Firestore 'in' query limited to 30 items, which fits our pageSize of 10
    const optionsQ = query(
      collection(db, 'poll_options'), 
      where('pollId', 'in', pollIds)
    );

    const unsubscribeOptions = onSnapshot(optionsQ, (snapshot) => {
      const allOptions = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PollOption));
      setPollsWithOptions(polls.map(poll => ({
        ...poll,
        options: allOptions.filter(opt => opt.pollId === poll.id)
      })));
    }, (err) => {
      console.error("🔥 Poll Options Snapshot Error:", err);
    });

    return () => unsubscribeOptions();
  }, [polls]);

  // 3. Listen to User's Votes
  useEffect(() => {
    if (!user) return;
    const votesQ = query(collection(db, 'poll_votes'), where('userId', '==', user.id));
    const unsubscribeVotes = onSnapshot(votesQ, (snapshot) => {
      const votesMap: Record<string, string> = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        votesMap[data.pollId] = data.optionId;
      });
      setMyVotes(votesMap);
    });

    return () => unsubscribeVotes();
  }, [user]);

  const handleVote = async (pollId: string, optionId: string) => {
    if (!user || voting === pollId) return;

    const existingVoteOptionId = myVotes[pollId];
    if (existingVoteOptionId === optionId) return;

    setVoting(pollId);
    try {
      const batch = writeBatch(db);
      const voteId = `${user.id}_${pollId}`;
      const voteRef = doc(db, 'poll_votes', voteId);
      
      if (existingVoteOptionId) {
        // Change vote
        batch.update(voteRef, {
          optionId,
          updatedAt: new Date().toISOString()
        });

        // Decrement old option
        const oldOptionRef = doc(db, 'poll_options', existingVoteOptionId);
        batch.update(oldOptionRef, { votes: increment(-1) });

        // Increment new option
        const newOptionRef = doc(db, 'poll_options', optionId);
        batch.update(newOptionRef, { votes: increment(1) });

        // Update poll timestamp to ensure any metadata listeners trigger
        const pollRef = doc(db, 'polls', pollId);
        batch.update(pollRef, { updatedAt: new Date().toISOString() });
      } else {
        // New vote
        batch.set(voteRef, {
          pollId,
          optionId,
          userId: user.id,
          createdAt: new Date().toISOString()
        });

        // Increment option votes
        const optionRef = doc(db, 'poll_options', optionId);
        batch.update(optionRef, { votes: increment(1) });

        // Increment poll total votes
        const pollRef = doc(db, 'polls', pollId);
        batch.update(pollRef, { totalVotes: increment(1) });
      }

      await batch.commit();
    } catch (error) {
      console.error("Erreur lors du vote:", error);
    } finally {
      setVoting(null);
    }
  };

  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    const validOptions = newOptions.filter(o => o.label.trim());
    if (!user || (!editingPoll && validOptions.length < 2) || !newQuestion.trim()) return;

    // Ensure className is present
    const className = user.class_name || 'GENERAL';

    try {
      if (editingPoll) {
        await updateDoc(doc(db, 'polls', editingPoll.id), {
          question: newQuestion,
          updatedAt: serverTimestamp()
        });

        const batch = writeBatch(db);
        
        // Handle existing options and new ones
        for (const opt of newOptions) {
          if (!opt.label.trim()) continue;
          
          if (opt.id) {
            // Update existing option
            const optRef = doc(db, 'poll_options', opt.id);
            batch.update(optRef, { label: opt.label });
          } else {
            // Add new option
            const optRef = doc(collection(db, 'poll_options'));
            batch.set(optRef, {
              pollId: editingPoll.id,
              label: opt.label,
              votes: 0,
              createdAt: serverTimestamp()
            });
          }
        }
        
        // Note: We don't delete options here to avoid breaking vote history
        // If an option was removed from the list, it stays in DB but won't be shown next time
        // unless we implement a proper deletion logic that handles votes.
        
        await batch.commit();
      } else {
        // Ensure we have a valid class name
        if (!className || className === 'GENERAL') {
          if (user.role !== UserRole.ADMIN) {
            throw new Error("Vous devez appartenir à une classe pour créer un sondage.");
          }
        }

        const pollRef = await addDoc(collection(db, 'polls'), {
          question: newQuestion,
          userId: user.id,
          className: className,
          isActive: true,
          totalVotes: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        const batch = writeBatch(db);
        newOptions.forEach(opt => {
          if (opt.label.trim()) {
            const optRef = doc(collection(db, 'poll_options'));
            batch.set(optRef, {
              pollId: pollRef.id,
              label: opt.label,
              votes: 0,
              createdAt: serverTimestamp()
            });
          }
        });
        await batch.commit();

        // Notify all students in the class
        await notificationService.notifyClass(
          className,
          `Nouveau sondage: ${newQuestion}`,
          `Un nouveau sondage est disponible. Votre avis compte !`,
          'info',
          '/polls'
        );
      }

      setIsModalOpen(false);
      setEditingPoll(null);
      setNewQuestion('');
      setNewOptions([{ label: '' }, { label: '' }]);
      refetch();
    } catch (error: any) {
      console.error("🔥 Erreur lors de la création/modification du sondage:", error);
      setError(error.message || "Erreur lors de la création du sondage. Vérifiez vos permissions.");
    }
  };

  const handleEditPoll = (poll: Poll) => {
    setEditingPoll(poll);
    setNewQuestion(poll.question || '');
    if (poll.options && poll.options.length > 0) {
      setNewOptions(poll.options.map(opt => ({ id: opt.id, label: opt.label })));
    } else {
      setNewOptions([{ label: '' }, { label: '' }]);
    }
    setIsModalOpen(true);
  };

  const handleDeletePoll = (pollId: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Supprimer le sondage',
      message: 'Êtes-vous sûr de vouloir supprimer ce sondage ainsi que tous ses votes et options ? Cette action est irréversible.',
      type: 'danger',
      onConfirm: async () => {
        try {
          const batch = writeBatch(db);
          
          // Delete poll options first
          const optionsSnap = await getDocs(query(collection(db, 'poll_options'), where('pollId', '==', pollId)));
          optionsSnap.docs.forEach(d => batch.delete(d.ref));
          
          // Delete poll votes
          const votesSnap = await getDocs(query(collection(db, 'poll_votes'), where('pollId', '==', pollId)));
          votesSnap.docs.forEach(d => batch.delete(d.ref));
          
          // Delete poll itself
          batch.delete(doc(db, 'polls', pollId));
          
          await batch.commit();
          refetch();
        } catch (error) {
          console.error("Erreur lors de la suppression:", error);
        }
      }
    });
  };

  const handleTogglePollStatus = async (pollId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'polls', pollId), {
        isActive: !currentStatus
      });
    } catch (error) {
      console.error("Erreur lors de la modification du statut:", error);
    }
  };

  const addOptionField = () => setNewOptions([...newOptions, { label: '' }]);
  const removeOptionField = (index: number) => {
    if (newOptions.length > 2) {
      setNewOptions(newOptions.filter((_, i) => i !== index));
    }
  };

  if (pollsLoading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <Spinner size={48} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 pb-20 space-y-12">
      <ConfirmModal 
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig({ ...confirmConfig, isOpen: false })}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        message={confirmConfig.message}
        type={confirmConfig.type}
      />

      {(error || fetchError) && (
        <div className="mb-6">
          <ErrBox message={error || fetchError || ''} />
        </div>
      )}

      {/* Analytics Modal Overlay */}
      <AnimatePresence>
        {selectedPollForAnalytics && (
          <div className="fixed inset-0 z-[1500] bg-black/90 backdrop-blur-xl flex items-center justify-center p-5">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, filter: 'blur(20px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.9, filter: 'blur(20px)' }}
              className="w-full max-w-4xl max-h-[90vh] overflow-y-auto"
            >
              <GlassCard className="p-8 glass-ultra border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                <div className="flex justify-between items-center mb-10">
                  <div className="space-y-1">
                    <h2 className="text-3xl font-black text-white tracking-tight">Analyse des Données</h2>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">{selectedPollForAnalytics.question}</p>
                  </div>
                  <button 
                    onClick={() => setSelectedPollForAnalytics(null)} 
                    className="p-3 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-2xl transition-all"
                  >
                    <X size={24} />
                  </button>
                </div>
                <PollAnalytics poll={selectedPollForAnalytics} />
              </GlassCard>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
        <div className="space-y-1">
          <h1 className="heading-futuristic">Vox Populi</h1>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
            Exprimez votre avis sur la vie du campus et de la classe {user?.class_name}
          </p>
        </div>
        
        <div className="flex gap-4 w-full lg:w-auto">
          {(user?.role === UserRole.ADMIN || user?.role === UserRole.DELEGATE) && (
            <button 
              onClick={() => setIsModalOpen(true)}
              className="btn-futuristic-primary px-10 py-4 flex items-center justify-center gap-3 flex-1 lg:flex-none"
            >
              <Plus size={20} />
              <span className="font-black uppercase tracking-widest text-xs">Nouveau Sondage</span>
            </button>
          )}
        </div>
      </div>

      {pollsWithOptions.length === 0 && !loadingMore ? (
        <div className="text-center py-32 glass-ultra rounded-[48px] border-2 border-dashed border-white/5">
          <BarChart2 size={80} className="mx-auto text-slate-800 mb-8" />
          <h3 className="text-2xl font-black text-white tracking-tight">Aucun sondage actif</h3>
          <p className="text-slate-500 font-medium max-w-xs mx-auto mt-2">Revenez plus tard pour participer aux décisions collectives.</p>
        </div>
      ) : (
        <div className="space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <AnimatePresence mode="popLayout">
              {pollsWithOptions.map((poll) => {
                const hasVoted = !!myVotes[poll.id];
                return (
                  <motion.div 
                    key={poll.id}
                    layout
                    initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
                    transition={{ type: "spring", stiffness: 200, damping: 25 }}
                  >
                    <GlassCard className="h-full flex flex-col p-8 border-white/5 hover:border-primary/30 transition-all duration-500 group" tilt={true}>
                    <div className="flex justify-between items-start mb-8 relative z-10">
                      <div className="flex flex-wrap gap-3">
                        <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] border ${
                          poll.isActive 
                            ? 'bg-success/10 text-success border-success/20' 
                            : 'bg-danger/10 text-danger border-danger/20'
                        }`}>
                          {poll.isActive ? 'Session Ouverte' : 'Session Clôturée'}
                        </div>
                        {hasVoted && (
                          <div className="px-4 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-full text-[9px] font-black uppercase tracking-[0.2em]">
                            Participation Validée
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <button 
                          onClick={() => setSelectedPollForAnalytics(poll)}
                          className="p-2.5 bg-white/5 hover:bg-white/10 text-slate-500 hover:text-primary rounded-xl transition-all"
                          title="Analyses"
                        >
                          <PieChart size={18} />
                        </button>
                        <button 
                          onClick={() => {
                            const { whatsapp } = generateSmartShare('sondage', {
                              title: poll.question,
                              className: poll.className,
                              totalVotes: poll.totalVotes,
                              date: poll.createdAt,
                              classEmail: classInfo?.class_email
                            });
                            shareToWhatsApp(whatsapp);
                          }}
                          className="p-2.5 bg-white/5 hover:bg-white/10 text-slate-500 hover:text-[#25D366] rounded-xl transition-all"
                          title="WhatsApp"
                        >
                          <Share2 size={18} />
                        </button>
                        {(user?.role === UserRole.ADMIN || (user?.role === UserRole.DELEGATE && poll.userId === user.id)) && (
                          <>
                            <button 
                              onClick={() => handleTogglePollStatus(poll.id, poll.isActive)}
                              className="p-2.5 bg-white/5 hover:bg-white/10 text-slate-500 hover:text-white rounded-xl transition-all"
                              title={poll.isActive ? "Verrouiller" : "Déverrouiller"}
                            >
                              {poll.isActive ? <Lock size={18} /> : <Unlock size={18} />}
                            </button>
                            <button 
                              onClick={() => handleEditPoll(poll)}
                              className="p-2.5 bg-white/5 hover:bg-white/10 text-slate-500 hover:text-primary rounded-xl transition-all"
                              title="Éditer"
                            >
                              <Edit3 size={18} />
                            </button>
                            <button 
                              onClick={() => handleDeletePoll(poll.id)}
                              className="p-2.5 bg-white/5 hover:bg-white/10 text-slate-500 hover:text-danger rounded-xl transition-all"
                              title="Supprimer"
                            >
                              <Trash2 size={18} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <h3 className="text-2xl font-black text-white mb-10 leading-tight tracking-tight group-hover:text-primary transition-colors duration-500 relative z-10">
                      {poll.question}
                    </h3>

                    <div className="flex flex-col gap-5 flex-1 relative z-10">
                      {poll.options?.map((option) => {
                        const dynamicTotalVotes = poll.options?.reduce((sum, opt) => sum + opt.votes, 0) || 0;
                        const percentage = dynamicTotalVotes > 0 ? Math.round((option.votes / dynamicTotalVotes) * 100) : 0;
                        const isMyVote = myVotes[poll.id] === option.id;
                        const showResults = hasVoted || user?.role === UserRole.ADMIN || poll.userId === user?.id;

                        return (
                          <motion.div 
                            key={option.id} 
                            className="space-y-3"
                            layout
                          >
                            <button
                              disabled={!poll.isActive || voting === poll.id}
                              onClick={() => handleVote(poll.id, option.id)}
                              className={`w-full p-5 rounded-[24px] text-left transition-all duration-500 flex justify-between items-center group/opt relative overflow-hidden active:scale-[0.98] ${
                                isMyVote 
                                  ? 'bg-primary/10 border-2 border-primary/50 text-primary shadow-[0_0_30px_rgba(108,99,255,0.1)]' 
                                  : 'bg-white/5 border border-white/5 text-slate-400 hover:border-white/20 hover:text-white'
                              }`}
                            >
                              <div className="flex items-center gap-4 relative z-10">
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${
                                  isMyVote ? 'border-primary bg-primary shadow-[0_0_15px_rgba(108,99,255,0.5)]' : 'border-white/10 group-hover/opt:border-white/30'
                                }`}>
                                  {isMyVote && <Check size={14} className="text-white" />}
                                </div>
                                <span className="font-black text-sm uppercase tracking-widest">{option.label}</span>
                              </div>
                              
                              {showResults && (
                                <motion.div 
                                  initial={{ opacity: 0, x: 10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  className="flex items-center gap-2 relative z-10"
                                >
                                  <span className={`font-black text-lg tracking-tighter ${isMyVote ? 'text-primary' : 'text-slate-600'}`}>
                                    {percentage}%
                                  </span>
                                </motion.div>
                              )}

                              {/* Background progress fill */}
                              {showResults && (
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${percentage}%` }}
                                  className={`absolute inset-y-0 left-0 opacity-[0.05] pointer-events-none transition-all duration-1000 ${
                                    isMyVote ? 'bg-primary' : 'bg-white'
                                  }`}
                                />
                              )}
                            </button>
                            {showResults && (
                              <div className="px-1">
                                <ProgressBar progress={percentage} isSelected={isMyVote} />
                              </div>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>

                    <div className="mt-10 pt-8 border-t border-white/5 flex justify-between items-center relative z-10">
                      <div className="flex items-center gap-2">
                        <BarChart2 size={16} className="text-primary" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">
                          {poll.options?.reduce((sum, opt) => sum + opt.votes, 0) || 0} Participants
                        </span>
                      </div>
                      {hasVoted && (
                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                          Vote Sécurisé
                        </div>
                      )}
                    </div>
                    </GlassCard>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {hasMore && (
            <div className="flex justify-center pt-10">
              <button 
                onClick={loadMore} 
                disabled={loadingMore}
                className="px-12 py-5 bg-white/5 border border-white/10 rounded-[24px] text-[10px] font-black uppercase tracking-[0.3em] text-white hover:bg-white/10 transition-all disabled:opacity-50 shadow-2xl"
              >
                {loadingMore ? <Spinner size={20} /> : 'Charger plus de données'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* MODAL CREATION */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-5 bg-black/80 backdrop-blur-xl">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 40, filter: 'blur(20px)' }}
              animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.9, y: 40, filter: 'blur(20px)' }}
              className="w-full max-w-xl glass-ultra rounded-[40px] p-10 shadow-[0_0_100px_rgba(0,0,0,0.5)] border border-white/10"
            >
              <div className="flex justify-between items-center mb-10">
                <div className="space-y-1">
                  <h2 className="text-3xl font-black text-white tracking-tight">
                    {editingPoll ? "Configuration" : "Initialisation"}
                  </h2>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Nouveau flux de décision</p>
                </div>
                <button 
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingPoll(null);
                    setNewQuestion('');
                    setNewOptions([{ label: '' }, { label: '' }]);
                  }} 
                  className="p-3 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-2xl transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleCreatePoll} className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-1">Question Centrale</label>
                  <input 
                    required
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    placeholder="Quelle est votre question ?"
                    className="w-full p-5 bg-white/5 border border-white/10 rounded-[24px] text-white outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-slate-700 font-medium"
                  />
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-1">Options de Réponse</label>
                  <div className="space-y-4">
                    {newOptions.map((opt, idx) => (
                      <div key={idx} className="flex gap-3 group">
                        <input 
                          required
                          value={opt.label}
                          onChange={(e) => {
                            const next = [...newOptions];
                            next[idx] = { ...next[idx], label: e.target.value };
                            setNewOptions(next);
                          }}
                          placeholder={`Option ${idx + 1}`}
                          className="flex-1 p-4 bg-white/5 border border-white/10 rounded-[20px] text-white outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-slate-800 font-medium"
                        />
                        {newOptions.length > 2 && (
                          <button 
                            type="button"
                            onClick={() => removeOptionField(idx)}
                            className="p-4 bg-danger/10 text-danger border border-danger/20 rounded-[20px] hover:bg-danger/20 transition-all"
                          >
                            <X size={20} />
                          </button>
                        )}
                      </div>
                    ))}
                    <button 
                      type="button"
                      onClick={addOptionField}
                      className="w-full p-5 bg-white/5 border-2 border-dashed border-white/5 rounded-[24px] text-slate-500 font-black text-[10px] uppercase tracking-[0.3em] hover:bg-white/10 hover:border-primary/30 hover:text-primary transition-all"
                    >
                      + Ajouter un vecteur
                    </button>
                  </div>
                </div>

                <div className="pt-6">
                  <button 
                    type="submit"
                    className="w-full p-6 bg-primary text-white rounded-[24px] font-black text-sm uppercase tracking-[0.3em] shadow-2xl shadow-primary/40 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    {editingPoll ? "Mettre à jour le flux" : "Lancer le sondage"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
