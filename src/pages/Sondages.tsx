import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
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
  getDocs
} from 'firebase/firestore';
import { db } from '../../firebase';
import { Poll, PollOption, PollVote, UserRole } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Check, BarChart2, X, ChevronRight, ChevronLeft, PieChart, Trash2, Lock, Unlock, Share2, Edit3 } from 'lucide-react';
import { StoryPolls } from '../components/StoryPolls';
import { PollAnalytics } from '../components/PollAnalytics';
import { ConfirmModal } from '../../components/ui';

// --- UI COMPONENTS (Design System) ---

const GlassCard: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div 
    className={`bg-white dark:bg-[#161a22]/60 backdrop-blur-xl border border-slate-200 dark:border-white/5 rounded-3xl p-6 shadow-sm dark:shadow-[0_8px_32px_rgba(0,0,0,0.2)] ${className}`}
  >
    {children}
  </div>
);

const ProgressBar: React.FC<{ progress: number; isSelected?: boolean }> = ({ progress, isSelected }) => (
  <div className="w-full h-2 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden relative">
    <motion.div 
      initial={{ width: 0 }}
      animate={{ width: `${progress}%` }}
      transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
      className={`h-full rounded-full ${isSelected ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]' : 'bg-slate-300 dark:bg-white/20'}`}
    />
  </div>
);

// --- MAIN PAGE COMPONENT ---

export const Sondages: React.FC = () => {
  const { user } = useAuth();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [myVotes, setMyVotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
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
  const [viewMode, setViewMode] = useState<'LIST' | 'STORY'>('LIST');
  const [selectedPollForAnalytics, setSelectedPollForAnalytics] = useState<Poll | null>(null);

  // Form state
  const [newQuestion, setNewQuestion] = useState('');
  const [newOptions, setNewOptions] = useState(['', '']);

  useEffect(() => {
    if (!user || (!user.class_name && user.role !== UserRole.ADMIN)) {
      setLoading(false);
      return;
    }

    // 1. Listen to Polls
    const q = query(
      collection(db, 'polls'), 
      where('className', '==', user.class_name || 'ADMIN'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribePolls = onSnapshot(q, (snapshot) => {
      const pollsData = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        options: [] // Initialize options
      } as Poll));
      setPolls(pollsData);
      setLoading(false);
    }, (err) => {
      console.error("🔥 Polls Snapshot Error:", err);
      setLoading(false);
    });

    // 2. Listen to ALL Options for these polls (to get real-time vote counts)
    const optionsQ = query(collection(db, 'poll_options'));
    const unsubscribeOptions = onSnapshot(optionsQ, (snapshot) => {
      const allOptions = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PollOption));
      setPolls(currentPolls => currentPolls.map(poll => ({
        ...poll,
        options: allOptions.filter(opt => opt.pollId === poll.id)
      })));
    }, (err) => {
      console.error("🔥 Poll Options Snapshot Error:", err);
    });

    // 3. Listen to User's Votes
    const votesQ = query(collection(db, 'poll_votes'), where('userId', '==', user.id));
    const unsubscribeVotes = onSnapshot(votesQ, (snapshot) => {
      const votesMap: Record<string, string> = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        votesMap[data.pollId] = data.optionId;
      });
      setMyVotes(votesMap);
    });

    return () => {
      unsubscribePolls();
      unsubscribeOptions();
      unsubscribeVotes();
    };
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
    if (!user || (!editingPoll && newOptions.filter(o => o.trim()).length < 2) || !newQuestion.trim()) return;

    try {
      if (editingPoll) {
        await updateDoc(doc(db, 'polls', editingPoll.id), {
          question: newQuestion,
          updatedAt: new Date().toISOString()
        });
      } else {
        const pollRef = await addDoc(collection(db, 'polls'), {
          question: newQuestion,
          userId: user.id,
          className: user.class_name,
          isActive: true,
          totalVotes: 0,
          createdAt: new Date().toISOString()
        });

        const batch = writeBatch(db);
        newOptions.forEach(opt => {
          if (opt.trim()) {
            const optRef = doc(collection(db, 'poll_options'));
            batch.set(optRef, {
              pollId: pollRef.id,
              label: opt,
              votes: 0
            });
          }
        });
        await batch.commit();
      }

      setIsModalOpen(false);
      setEditingPoll(null);
      setNewQuestion('');
      setNewOptions(['', '']);
    } catch (error) {
      console.error("Erreur lors de la création/modification du sondage:", error);
    }
  };

  const handleEditPoll = (poll: Poll) => {
    setEditingPoll(poll);
    setNewQuestion(poll.question || '');
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

  const addOptionField = () => setNewOptions([...newOptions, '']);
  const removeOptionField = (index: number) => {
    if (newOptions.length > 2) {
      setNewOptions(newOptions.filter((_, i) => i !== index));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div className="animate-spin w-10 h-10 border-4 border-[#6C63FF] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (viewMode === 'STORY') {
    return <StoryPolls onClose={() => setViewMode('LIST')} />;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <ConfirmModal 
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig({ ...confirmConfig, isOpen: false })}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        message={confirmConfig.message}
        type={confirmConfig.type}
      />
      {/* Analytics Modal Overlay */}
      <AnimatePresence>
        {selectedPollForAnalytics && (
          <div className="fixed inset-0 z-[1500] bg-black/90 backdrop-blur-md flex items-center justify-center p-5">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-3xl max-h-[90vh] overflow-y-auto"
            >
              <GlassCard>
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white">Analyses : {selectedPollForAnalytics.question}</h2>
                  <button onClick={() => setSelectedPollForAnalytics(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                    <X size={24} />
                  </button>
                </div>
                <PollAnalytics poll={selectedPollForAnalytics} />
              </GlassCard>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-800 dark:text-white mb-2 tracking-tight">Sondages</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Exprimez votre avis sur la vie du campus</p>
        </div>
        
        <div className="flex gap-3 w-full md:w-auto">
          <button 
            onClick={() => setViewMode(viewMode === 'LIST' ? 'STORY' : 'LIST')}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-white dark:bg-white/5 text-slate-700 dark:text-white rounded-2xl border border-slate-200 dark:border-white/10 font-bold hover:bg-slate-50 dark:hover:bg-white/10 transition-all"
          >
            {viewMode === 'LIST' ? <ChevronRight size={20} /> : < ChevronLeft size={20} />}
            {viewMode === 'LIST' ? 'Mode Story' : 'Mode Liste'}
          </button>

          {(user?.role === UserRole.ADMIN || user?.role === UserRole.DELEGATE) && (
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-[#6C63FF] text-white rounded-2xl font-bold shadow-lg shadow-[#6C63FF]/30 hover:bg-[#5b54d6] transition-all"
            >
              <Plus size={20} /> Créer
            </button>
          )}
        </div>
      </div>

      {polls.length === 0 ? (
        <div className="text-center py-24 bg-white dark:bg-white/2 rounded-[32px] border-2 border-dashed border-slate-200 dark:border-white/5">
          <BarChart2 size={64} className="mx-auto text-slate-200 dark:text-white/10 mb-6" />
          <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Aucun sondage actif</h3>
          <p className="text-slate-500 dark:text-slate-400">Revenez plus tard pour participer aux décisions de la classe.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {polls.map((poll) => {
            const hasVoted = !!myVotes[poll.id];
            return (
              <motion.div 
                key={poll.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <GlassCard className="h-full flex flex-col">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex flex-wrap gap-2">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        poll.isActive 
                          ? 'bg-emerald-500/10 text-emerald-500' 
                          : 'bg-rose-500/10 text-rose-500'
                      }`}>
                        {poll.isActive ? 'Actif' : 'Fermé'}
                      </span>
                      {hasVoted && (
                        <span className="px-3 py-1 bg-[#6C63FF]/10 text-[#6C63FF] rounded-full text-[10px] font-bold uppercase tracking-wider">
                          Voté
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button 
                        onClick={() => setSelectedPollForAnalytics(poll)}
                        className="p-2 text-slate-400 hover:text-[#6C63FF] transition-colors"
                        title="Voir analytics"
                      >
                        <PieChart size={18} />
                      </button>
                      <button 
                        onClick={() => {
                          const text = `📊 Sondage JangHup\n${poll.question}\nVote ici: ${window.location.href}`;
                          window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                        }}
                        className="p-2 text-slate-400 hover:text-[#25D366] transition-colors"
                        title="Partager sur WhatsApp"
                      >
                        <Share2 size={18} />
                      </button>
                      {(user?.role === UserRole.ADMIN || (user?.role === UserRole.DELEGATE && poll.userId === user.id)) && (
                        <>
                          <button 
                            onClick={() => handleTogglePollStatus(poll.id, poll.isActive)}
                            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                            title={poll.isActive ? "Clôturer" : "Ouvrir"}
                          >
                            {poll.isActive ? <Lock size={18} /> : <Unlock size={18} />}
                          </button>
                          <button 
                            onClick={() => handleEditPoll(poll)}
                            className="p-2 text-slate-400 hover:text-primary transition-colors"
                            title="Modifier"
                          >
                            <Edit3 size={18} />
                          </button>
                          <button 
                            onClick={() => handleDeletePoll(poll.id)}
                            className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 size={18} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6 leading-tight">
                    {poll.question}
                  </h3>

                  <div className="flex flex-col gap-3 flex-1">
                    {poll.options?.map((option) => {
                      const percentage = poll.totalVotes > 0 ? Math.round((option.votes / poll.totalVotes) * 100) : 0;
                      const isMyVote = myVotes[poll.id] === option.id;

                      return (
                        <motion.div 
                          key={option.id} 
                          className="space-y-1.5"
                          layout
                        >
                          <button
                            disabled={!poll.isActive || voting === poll.id}
                            onClick={() => handleVote(poll.id, option.id)}
                            className={`w-full p-4 rounded-2xl text-left transition-all duration-300 flex justify-between items-center group relative overflow-hidden active:scale-[0.98] ${
                              isMyVote 
                                ? 'bg-emerald-500/10 border-2 border-emerald-500/50 text-emerald-600 dark:text-emerald-400' 
                                : 'bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 text-slate-700 dark:text-white hover:border-slate-300 dark:hover:border-white/20'
                            }`}
                          >
                            <div className="flex items-center gap-3 relative z-10">
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                                isMyVote ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300 dark:border-white/20'
                              }`}>
                                {isMyVote && <Check size={12} className="text-white" />}
                              </div>
                              <span className="font-bold">{option.label}</span>
                            </div>
                            
                            {hasVoted && (
                              <motion.div 
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="flex items-center gap-2 relative z-10"
                              >
                                <span className={`font-black text-sm ${isMyVote ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-white/40'}`}>
                                  {percentage}%
                                </span>
                              </motion.div>
                            )}

                            {/* Background progress fill for voted polls */}
                            {hasVoted && (
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${percentage}%` }}
                                className={`absolute inset-y-0 left-0 opacity-[0.08] dark:opacity-[0.12] pointer-events-none ${
                                  isMyVote ? 'bg-emerald-500' : 'bg-slate-400'
                                }`}
                              />
                            )}
                          </button>
                          {hasVoted && (
                            <div className="px-1">
                              <ProgressBar progress={percentage} isSelected={isMyVote} />
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>

                  <div className="mt-8 pt-6 border-t border-slate-100 dark:border-white/5 flex justify-between items-center">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-white/30">
                      {poll.totalVotes} votes au total
                    </p>
                    {hasVoted && (
                      <p className="text-[10px] font-black uppercase tracking-widest text-[#00C896] flex items-center gap-1.5">
                        <Check size={14} /> Vote enregistré
                      </p>
                    )}
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* MODAL CREATION */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-5 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-lg bg-white dark:bg-[#161a22] rounded-[32px] p-8 shadow-2xl border border-slate-200 dark:border-white/10"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black text-slate-800 dark:text-white">
                  {editingPoll ? "Modifier le sondage" : "Nouveau Sondage"}
                </h2>
                <button 
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingPoll(null);
                    setNewQuestion('');
                    setNewOptions(['', '']);
                  }} 
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleCreatePoll} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 dark:text-white/30 uppercase tracking-[0.2em] mb-2">Question</label>
                  <input 
                    required
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    placeholder="Quelle est votre question ?"
                    className="w-full p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-800 dark:text-white outline-none focus:border-[#6C63FF] transition-colors"
                  />
                </div>

                {!editingPoll && (
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-white/30 uppercase tracking-[0.2em] mb-2">Options</label>
                    <div className="space-y-3">
                      {newOptions.map((opt, idx) => (
                        <div key={idx} className="flex gap-2">
                          <input 
                            required
                            value={opt}
                            onChange={(e) => {
                              const next = [...newOptions];
                              next[idx] = e.target.value;
                              setNewOptions(next);
                            }}
                            placeholder={`Option ${idx + 1}`}
                            className="flex-1 p-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-white outline-none focus:border-[#6C63FF] transition-colors"
                          />
                          {newOptions.length > 2 && (
                            <button 
                              type="button"
                              onClick={() => removeOptionField(idx)}
                              className="p-3 bg-rose-500/10 text-rose-500 rounded-xl hover:bg-rose-500/20 transition-colors"
                            >
                              <X size={18} />
                            </button>
                          )}
                        </div>
                      ))}
                      <button 
                        type="button"
                        onClick={addOptionField}
                        className="w-full p-3 bg-slate-50 dark:bg-white/5 border border-dashed border-slate-300 dark:border-white/20 rounded-xl text-slate-500 dark:text-white/40 font-bold text-sm hover:bg-slate-100 dark:hover:bg-white/10 transition-all"
                      >
                        + Ajouter une option
                      </button>
                    </div>
                  </div>
                )}

                <div className="pt-4">
                  <button 
                    type="submit"
                    className="w-full p-4 bg-[#6C63FF] text-white rounded-2xl font-black text-lg shadow-xl shadow-[#6C63FF]/30 hover:bg-[#5b54d6] active:scale-[0.98] transition-all"
                  >
                    {editingPoll ? "Mettre à jour" : "Créer le sondage"}
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
