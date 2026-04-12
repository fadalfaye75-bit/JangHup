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
import { ConfirmModal, Btn, Spinner, Card } from '../../components/ui';
import { notificationService } from '../services/notificationService';

// --- UI COMPONENTS (Design System) ---

// Removed local GlassCard as we use Card from ui components

const ProgressBar: React.FC<{ progress: number; isSelected?: boolean }> = ({ progress, isSelected }) => (
  <div className="w-full h-2 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden relative">
    <motion.div 
      initial={{ width: 0 }}
      animate={{ width: `${progress}%` }}
      transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
      className={`h-full rounded-full ${isSelected ? 'bg-accent shadow-[0_0_12px_rgba(0,200,150,0.4)]' : 'bg-slate-300 dark:bg-white/20'}`}
    />
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
  const [newOptions, setNewOptions] = useState(['', '']);
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
    if (!user || (!editingPoll && newOptions.filter(o => o.trim()).length < 2) || !newQuestion.trim()) return;

    // Ensure className is present
    const className = user.class_name || 'GENERAL';

    try {
      if (editingPoll) {
        await updateDoc(doc(db, 'polls', editingPoll.id), {
          question: newQuestion,
          updatedAt: serverTimestamp()
        });
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
          if (opt.trim()) {
            const optRef = doc(collection(db, 'poll_options'));
            batch.set(optRef, {
              pollId: pollRef.id,
              label: opt,
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
      setNewOptions(['', '']);
      refetch();
    } catch (error: any) {
      console.error("🔥 Erreur lors de la création/modification du sondage:", error);
      setError(error.message || "Erreur lors de la création du sondage. Vérifiez vos permissions.");
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

  const addOptionField = () => setNewOptions([...newOptions, '']);
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
    <div className="max-w-5xl mx-auto px-4 py-8">
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
          <div className="fixed inset-0 z-[1500] bg-black/90 backdrop-blur-md flex items-center justify-center p-5">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-3xl max-h-[90vh] overflow-y-auto"
            >
              <Card className="p-6">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white">Analyses : {selectedPollForAnalytics.question}</h2>
                  <button onClick={() => setSelectedPollForAnalytics(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                    <X size={24} />
                  </button>
                </div>
                <PollAnalytics poll={selectedPollForAnalytics} />
              </Card>
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
          {(user?.role === UserRole.ADMIN || user?.role === UserRole.DELEGATE) && (
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/30 hover:bg-primary/90 transition-all"
            >
              <Plus size={20} /> Créer
            </button>
          )}
        </div>
      </div>

      {pollsWithOptions.length === 0 && !loadingMore ? (
        <div className="text-center py-24 bg-white dark:bg-white/2 rounded-[32px] border-2 border-dashed border-slate-200 dark:border-white/5">
          <BarChart2 size={64} className="mx-auto text-slate-200 dark:text-white/10 mb-6" />
          <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Aucun sondage actif</h3>
          <p className="text-slate-500 dark:text-slate-400">Revenez plus tard pour participer aux décisions de la classe.</p>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {pollsWithOptions.map((poll) => {
              const hasVoted = !!myVotes[poll.id];
              return (
                <motion.div 
                  key={poll.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className="h-full flex flex-col p-6 hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex flex-wrap gap-2">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          poll.isActive 
                            ? 'bg-accent/10 text-accent' 
                            : 'bg-rose-500/10 text-rose-500'
                        }`}>
                          {poll.isActive ? 'Actif' : 'Fermé'}
                        </span>
                        {hasVoted && (
                          <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-bold uppercase tracking-wider">
                            Voté
                          </span>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <button 
                          onClick={() => setSelectedPollForAnalytics(poll)}
                          className="p-2 text-slate-400 hover:text-primary transition-colors"
                          title="Voir analytics"
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
                          className="p-2 text-slate-400 hover:text-[#25D366] transition-colors"
                          title="Partager sur WhatsApp"
                        >
                          <Share2 size={18} />
                        </button>
                        <button 
                          onClick={() => {
                            const { emailSubject, emailBody, classEmail } = generateSmartShare('sondage', {
                              title: poll.question,
                              className: poll.className,
                              totalVotes: poll.totalVotes,
                              date: poll.createdAt,
                              classEmail: classInfo?.class_email
                            });
                            shareToEmail(emailSubject, emailBody, classEmail);
                          }}
                          className="p-2 text-slate-400 hover:text-primary transition-colors"
                          title="Partager par Email"
                        >
                          <Mail size={18} />
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
                        const dynamicTotalVotes = poll.options?.reduce((sum, opt) => sum + opt.votes, 0) || 0;
                        const percentage = dynamicTotalVotes > 0 ? Math.round((option.votes / dynamicTotalVotes) * 100) : 0;
                        const isMyVote = myVotes[poll.id] === option.id;
                        const showResults = hasVoted || user?.role === UserRole.ADMIN || poll.userId === user?.id;

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
                                  ? 'bg-accent/10 border-2 border-accent/50 text-accent' 
                                  : 'bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 text-slate-700 dark:text-white hover:border-slate-300 dark:hover:border-white/20'
                              }`}
                            >
                              <div className="flex items-center gap-3 relative z-10">
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                                  isMyVote ? 'border-accent bg-accent' : 'border-slate-300 dark:border-white/20'
                                }`}>
                                  {isMyVote && <Check size={12} className="text-white" />}
                                </div>
                                <span className="font-bold">{option.label}</span>
                              </div>
                              
                              {showResults && (
                                <motion.div 
                                  initial={{ opacity: 0, x: 10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  className="flex items-center gap-2 relative z-10"
                                >
                                  <span className={`font-black text-sm ${isMyVote ? 'text-accent' : 'text-slate-400 dark:text-white/40'}`}>
                                    {percentage}%
                                  </span>
                                </motion.div>
                              )}

                              {/* Background progress fill for voted polls */}
                              {showResults && (
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${percentage}%` }}
                                  className={`absolute inset-y-0 left-0 opacity-[0.08] dark:opacity-[0.12] pointer-events-none ${
                                    isMyVote ? 'bg-accent' : 'bg-slate-400'
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

                    <div className="mt-8 pt-6 border-t border-slate-100 dark:border-white/5 flex justify-between items-center">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-white/30">
                        {poll.options?.reduce((sum, opt) => sum + opt.votes, 0) || 0} votes au total
                      </p>
                      {hasVoted && (
                        <p className="text-[10px] font-black uppercase tracking-widest text-accent flex items-center gap-1.5">
                          <Check size={14} /> Vote enregistré
                        </p>
                      )}
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {hasMore && (
            <div className="flex justify-center pt-8">
              <Btn 
                variant="secondary" 
                onClick={loadMore} 
                disabled={loadingMore}
                className="px-10"
              >
                {loadingMore ? <Spinner size={18} /> : 'Charger plus de sondages'}
              </Btn>
            </div>
          )}
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
              className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-[32px] p-8 shadow-2xl border border-slate-200 dark:border-white/10"
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
                    className="w-full p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-800 dark:text-white outline-none focus:border-primary transition-colors"
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
                            className="flex-1 p-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-white outline-none focus:border-primary transition-colors"
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
                    className="w-full p-4 bg-primary text-white rounded-2xl font-black text-lg shadow-xl shadow-primary/30 hover:bg-primary/90 active:scale-[0.98] transition-all"
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
