import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTable, insertRow, updateRow, deleteRow } from '../lib/hooks';
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
import { db } from '../firebase';
import { Poll, PollOption, PollVote, UserRole } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Check, 
  BarChart2, 
  X, 
  ChevronRight, 
  PieChart, 
  Trash2, 
  Lock, 
  Unlock, 
  Share2, 
  Edit3, 
  Mail, 
  Loader2,
  Filter,
  TrendingUp,
  Clock
} from 'lucide-react';
import { generateSmartShare, shareToWhatsApp, shareToEmail } from '../lib/shareUtils';
import { PollAnalytics } from '../components/PollAnalytics';
import { ConfirmModal, Spinner, ErrBox, GlassCard, Button, Input, Badge, Modal, AppCard, AutoGrid, Avatar } from '../components/ui';
import { notificationService } from '../services/notificationService';
import { activityService } from '../services/activityService';
import { cn } from '../lib/utils';

const ProgressBar: React.FC<{ progress: number; isSelected?: boolean }> = ({ progress, isSelected }) => (
  <div className="w-full h-3 bg-gray-200 dark:bg-black/20 rounded-full overflow-hidden relative border border-gray-300/30 dark:border-white/5">
    <motion.div 
      initial={{ width: 0 }}
      animate={{ width: `${progress}%` }}
      transition={{ type: "spring", bounce: 0, duration: 1.5 }}
      className={cn(
        "h-full rounded-full transition-all relative overflow-hidden",
        isSelected 
          ? 'bg-gradient-to-r from-primary to-[#8A84FF] shadow-[0_0_15px_rgba(108,99,255,0.4)]' 
          : 'bg-gradient-to-r from-gray-300 to-gray-400 dark:from-gray-700 dark:to-gray-600'
      )}
    >
      {isSelected && (
        <motion.div 
          animate={{ x: ['-200%', '300%'] }}
          transition={{ repeat: Infinity, duration: 2.5, ease: "linear" }}
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent w-full skew-x-12"
        />
      )}
    </motion.div>
  </div>
);

export const Sondages: React.FC = () => {
  const { user, classInfo } = useAuth();
  const navigate = useNavigate();
  const [pollsWithOptions, setPollsWithOptions] = useState<Poll[]>([]);
  const [classCounts, setClassCounts] = useState<Record<string, number>>({});
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

  const [newQuestion, setNewQuestion] = useState('');
  const [newOptions, setNewOptions] = useState<{ id?: string; label: string }[]>([
    { label: '' },
    { label: '' }
  ]);
  const [newEndDate, setNewEndDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
    error: fetchError
  } = useTable<Poll>(
    'polls',
    pollConstraints,
    30,
    !!user?.class_name || (user?.role?.toUpperCase() === 'ADMIN')
  );

  const performDeletePoll = async (id: string) => {
    const batch = writeBatch(db);
    const optionsSnap = await getDocs(query(collection(db, 'poll_options'), where('pollId', '==', id)));
    optionsSnap.docs.forEach(d => batch.delete(d.ref));
    const votesSnap = await getDocs(query(collection(db, 'poll_votes'), where('pollId', '==', id)));
    votesSnap.docs.forEach(d => batch.delete(d.ref));
    batch.delete(doc(db, 'polls', id));
    await batch.commit();
  };

  useEffect(() => {
    if (polls.length === 0) {
      setPollsWithOptions([]);
      return;
    }

    // Auto-deactivate or delete expired polls
    if (user) {
      const now = new Date().getTime();
      const EXPIRE_MS = 24 * 60 * 60 * 1000; // 24 hours
      polls.forEach(poll => {
        if (poll.endDate) {
          const endTime = new Date(poll.endDate).getTime();
          if (now > endTime + EXPIRE_MS) {
            if (user.role === UserRole.ADMIN || user.id === poll.userId) {
              performDeletePoll(poll.id).catch(console.error);
            }
          } else if (now > endTime && poll.isActive) {
            if (user.role === UserRole.ADMIN || user.id === poll.userId) {
              updateDoc(doc(db, 'polls', poll.id), { isActive: false }).catch(console.error);
            }
          }
        }
      });
    }

    const pollIds = polls.map(p => p.id);
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

  useEffect(() => {
    if (polls.length > 0) {
      const uniqueClasses = Array.from(new Set(polls.filter(p => !classCounts[p.className]).map(p => p.className)));
      if (uniqueClasses.length === 0) return;

      const fetchCountsForClasses = async () => {
        const counts: Record<string, number> = {};
        await Promise.all(uniqueClasses.map(async (className) => {
          try {
            const q = query(collection(db, 'users_public'), where('class_name', '==', className));
            const snap = await getDocs(q);
            counts[className] = snap.size;
          } catch (err) {
            console.error(`Error fetching class size for ${className}:`, err);
          }
        }));
        setClassCounts(prev => ({ ...prev, ...counts }));
      };
      fetchCountsForClasses();
    }
  }, [polls]);

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
        batch.update(voteRef, {
          optionId,
          updatedAt: new Date().toISOString()
        });
        batch.update(doc(db, 'poll_options', existingVoteOptionId), { votes: increment(-1) });
        batch.update(doc(db, 'poll_options', optionId), { votes: increment(1) });
        batch.update(doc(db, 'polls', pollId), { updatedAt: new Date().toISOString() });
      } else {
        batch.set(voteRef, {
          pollId,
          optionId,
          userId: user.id,
          createdAt: new Date().toISOString()
        });
        batch.update(doc(db, 'poll_options', optionId), { votes: increment(1) });
        batch.update(doc(db, 'polls', pollId), { totalVotes: increment(1) });
      }

      await batch.commit();

      // Log activity
      const poll = pollsWithOptions.find(p => p.id === pollId);
      if (poll) {
        await activityService.logActivity(
          user,
          `A voté au sondage: ${poll.question}`,
          pollId,
          'poll_vote'
        );
      }
    } catch (error) {
      console.error("Erreur lors du vote:", error);
      notificationService.notifyUser(user.id, "Erreur", "Impossible d'enregistrer votre vote. Veuillez réessayer.", 'danger', '/polls');
    } finally {
      setVoting(null);
    }
  };

  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    const validOptions = newOptions.filter(o => o.label.trim());
    if (!user || (!editingPoll && validOptions.length < 2) || !newQuestion.trim()) return;

    const className = user.class_name || 'GENERAL';

    setSubmitting(true);
    try {
      if (editingPoll) {
        await updateDoc(doc(db, 'polls', editingPoll.id), {
          question: newQuestion,
          endDate: newEndDate || null,
          updatedAt: serverTimestamp()
        });

        const batch = writeBatch(db);
        for (const opt of newOptions) {
          if (!opt.label.trim()) continue;
          if (opt.id) {
            batch.update(doc(db, 'poll_options', opt.id), { label: opt.label });
          } else {
            const optRef = doc(collection(db, 'poll_options'));
            batch.set(optRef, {
              pollId: editingPoll.id,
              label: opt.label,
              votes: 0,
              createdAt: serverTimestamp()
            });
          }
        }
        await batch.commit();
      } else {
        const pollRef = await addDoc(collection(db, 'polls'), {
          question: newQuestion,
          userId: user.id,
          authorAvatar: user.avatar || null,
          className: className,
          isActive: true,
          totalVotes: 0,
          endDate: newEndDate || null,
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

        // Close modal immediately after DB operations
        setIsModalOpen(false);
        setEditingPoll(pollRef as any); // Temporary set for background tasks if needed
        setNewQuestion('');
        setNewOptions([{ label: '' }, { label: '' }]);
        setNewEndDate('');
        setSubmitting(false);

        // Run notifications in background
        notificationService.notifyClass(
          className,
          `Nouveau sondage: ${newQuestion}`,
          `Un nouveau sondage est disponible. Votre avis compte !`,
          'info',
          '/polls'
        ).catch(err => console.error("Notification error:", err));
        
        return; // Exit early as we already closed the modal
      }

      setIsModalOpen(false);
      setEditingPoll(null);
      setNewQuestion('');
      setNewOptions([{ label: '' }, { label: '' }]);
      setNewEndDate('');
      setSubmitting(false);
    } catch (error: any) {
      console.error(error);
      setError(error.message || "Erreur lors de la création du sondage.");
      setSubmitting(false);
    }
  };

  const handleDeletePoll = (id: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Supprimer le sondage',
      message: 'Voulez-vous vraiment supprimer ce sondage et tous ses votes ?',
      type: 'danger',
      onConfirm: async () => {
        try {
          await performDeletePoll(id);
        } catch (err) {
          console.error(err);
        }
      }
    });
  };

  const handleToggleStatus = async (poll: Poll) => {
    try {
      await updateDoc(doc(db, 'polls', poll.id), {
        isActive: !poll.isActive,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditPoll = (poll: Poll) => {
    setEditingPoll(poll);
    setNewQuestion(poll.question);
    setNewEndDate(poll.endDate || '');
    setNewOptions(poll.options?.map(o => ({ id: o.id, label: o.label })) || [{ label: '' }, { label: '' }]);
    setIsModalOpen(true);
  };

  const handleShareWhatsApp = (poll: Poll) => {
    const { whatsapp } = generateSmartShare('sondage', {
      title: poll.question,
      className: poll.className,
      totalVotes: poll.totalVotes,
      options: poll.options?.map(o => ({ label: o.label, votes: o.votes })),
      url: window.location.origin + '/polls'
    });
    shareToWhatsApp(whatsapp);
  };

  if (pollsLoading) return <div className="flex justify-center py-20"><Spinner size={48} /></div>;
  if (fetchError) return <ErrBox message={fetchError} />;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 px-4">
      <ConfirmModal 
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig({ ...confirmConfig, isOpen: false })}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        message={confirmConfig.message}
        type={confirmConfig.type}
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <Badge variant="success" className="text-[10px] font-bold uppercase tracking-wider">Sondages</Badge>
            <ChevronRight size={14} />
            <span className="text-[10px] font-bold uppercase tracking-wider">{user?.class_name || 'Ma Classe'}</span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white tracking-tight">Prise de Décision</h1>
          <p className="text-[14px] text-gray-500 dark:text-gray-400">
            Participez aux votes et consultez les tendances de votre classe.
          </p>
        </div>
        
        {(user?.role === UserRole.ADMIN || user?.role === UserRole.DELEGATE) && (
          <Button 
            onClick={() => { setEditingPoll(null); setNewQuestion(''); setNewOptions([{ label: '' }, { label: '' }]); setIsModalOpen(true); }}
            className="flex items-center gap-2"
          >
            <Plus size={16} />
            <span>Nouveau Sondage</span>
          </Button>
        )}
      </div>

      {/* Polls Grid */}
      <AutoGrid minWidth="280px">
        <AnimatePresence mode="popLayout" initial={false}>
          {pollsWithOptions.map((poll) => {
            const hasVoted = !!myVotes[poll.id];
            const canManage = user?.role === UserRole.ADMIN || (user?.role === UserRole.DELEGATE && user.id === poll.userId);

            return (
              <motion.div
                key={poll.id}
                layout
                initial={{ opacity: 0, scale: 0.98, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                transition={{ 
                  type: "spring", 
                  stiffness: 400, 
                  damping: 25,
                  mass: 0.8
                }}
                className="group transform-gpu"
              >
                <AppCard 
                  className="h-full flex flex-col transition-all duration-300"
                  header={
                    <div className="flex justify-between items-start w-full gap-3">
                      <div className="flex items-center gap-2">
                        <Avatar 
                          src={poll.authorAvatar} 
                          name="Délégué" 
                          size="xs" 
                        />
                        <Badge variant={poll.isActive ? 'success' : 'secondary'}>
                          {poll.isActive ? 'Actif' : 'Clôturé'}
                        </Badge>
                        {hasVoted && <Badge variant="primary">Voté</Badge>}
                      </div>
                      <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="sm" onClick={() => handleShareWhatsApp(poll)} className="p-2 h-auto text-gray-600 dark:text-gray-400 hover:text-[#25D366]">
                          <Share2 size={16} />
                        </Button>
                        {canManage && (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => handleEditPoll(poll)} className="p-2 h-auto text-gray-600 dark:text-gray-400 hover:text-blue-500">
                              <Edit3 size={16} />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleToggleStatus(poll)} className={cn("p-2 h-auto", poll.isActive ? "text-gray-600 dark:text-gray-400 hover:text-amber-500" : "text-amber-500")}>
                              {poll.isActive ? <Lock size={16} /> : <Unlock size={16} />}
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeletePoll(poll.id)} className="p-2 h-auto text-gray-600 dark:text-gray-400 hover:text-danger text-sm">
                              <Trash2 size={16} />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  }
                  footer={
                    <Button 
                      variant="secondary" 
                      size="sm"
                      className="w-full flex items-center justify-center gap-2"
                      onClick={() => navigate(`/polls/${poll.id}/analytics`)}
                    >
                      <PieChart size={14} />
                      <span>Analyses détaillées</span>
                    </Button>
                  }
                >
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <h3 className="text-[18px] font-bold text-gray-900 dark:text-white leading-tight tracking-tight">{poll.question}</h3>
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
                          <TrendingUp size={12} className="text-gray-400" />
                          <span className="text-[11px] font-medium text-gray-600 dark:text-gray-400">
                            {poll.totalVotes} votes 
                            {classCounts[poll.className] ? ` (${Math.round((poll.totalVotes / classCounts[poll.className]) * 100)}%)` : ''}
                          </span>
                        </div>
                        {poll.endDate && (
                          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20">
                            <Clock size={12} className="text-amber-500" />
                            <span className="text-[11px] font-medium text-amber-700 dark:text-amber-400">
                              Finit le {new Date(poll.endDate).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      {poll.options?.map((option) => {
                        const percentage = poll.totalVotes > 0 ? Math.round((option.votes / poll.totalVotes) * 100) : 0;
                        const isSelected = myVotes[poll.id] === option.id;

                        return (
                          <motion.button
                            layout
                            whileHover={poll.isActive ? { scale: 1.01, x: 2 } : {}}
                            whileTap={poll.isActive ? { scale: 0.99 } : {}}
                            key={option.id}
                            disabled={!poll.isActive || voting === poll.id}
                            onClick={() => handleVote(poll.id, option.id)}
                            className={cn(
                              "w-full text-left p-4 rounded-2xl border transition-all duration-300 relative group/opt",
                              isSelected 
                                ? "bg-primary/5 border-primary/40 ring-2 ring-primary/10 shadow-sm" 
                                : "bg-white dark:bg-white/5 border-[var(--border-main)] dark:border-white/5 hover:border-primary/20 dark:hover:border-primary/20"
                            )}
                          >
                            <div className="flex justify-between items-center mb-3">
                              <span className={cn(
                                "text-[15px] font-bold tracking-tight transition-colors duration-300 flex items-center gap-2",
                                isSelected ? "text-primary" : "text-[var(--text-main)]"
                              )}>
                                {option.label}
                                {isSelected && (
                                  <motion.div
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ type: "spring", stiffness: 400, damping: 15 }}
                                  >
                                    <Check size={16} className="text-primary" />
                                  </motion.div>
                                )}
                              </span>
                              <div className="flex flex-col items-end">
                                <motion.span 
                                  key={percentage}
                                  initial={{ opacity: 0, y: -5 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className={cn(
                                    "text-[12px] font-extrabold transition-colors duration-300 uppercase tracking-wider",
                                    isSelected ? "text-primary" : "text-[var(--text-muted)]"
                                  )}
                                >
                                  {percentage}%
                                </motion.span>
                                <span className="text-[10px] text-[var(--text-muted)] font-medium leading-none">
                                  {option.votes} {option.votes > 1 ? 'votes' : 'vote'}
                                </span>
                              </div>
                            </div>
                            <ProgressBar progress={percentage} isSelected={isSelected} />
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                </AppCard>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </AutoGrid>

      {pollsWithOptions.length === 0 && (
        <div className="text-center py-16 border border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
          <BarChart2 size={32} className="mx-auto text-gray-400 mb-4"/>
          <h3 className="text-[16px] font-semibold text-gray-900 dark:text-white tracking-tight">Aucun sondage</h3>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1">Aucun sondage n'a été créé pour le moment.</p>
        </div>
      )}


      {/* New/Edit Poll Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingPoll ? "Modifier le sondage" : "Nouveau Sondage"}
      >
        <form onSubmit={handleCreatePoll} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider ml-1">Question du sondage</label>
              <Input 
                required
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                placeholder="Ex: Quelle date pour le prochain examen ?"
                className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg py-2.5 px-3 text-[13px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-gray-400"
              />
            </div>
            <div className="space-y-3">
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider ml-1">Options de réponse</label>
              {newOptions.map((opt, i) => (
                <div key={i} className="flex gap-2">
                  <Input 
                    required
                    value={opt.label}
                    onChange={(e) => {
                      const updated = [...newOptions];
                      updated[i].label = e.target.value;
                      setNewOptions(updated);
                    }}
                    placeholder={`Option ${i + 1}`}
                    className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg py-2.5 px-3 text-[13px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-gray-400"
                  />
                  {newOptions.length > 2 && (
                    <button 
                      type="button" 
                      onClick={() => setNewOptions(newOptions.filter((_, idx) => idx !== i))}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
              ))}
              {newOptions.length < 6 && (
                <Button 
                  type="button" 
                  variant="secondary" 
                  size="sm" 
                  onClick={() => setNewOptions([...newOptions, { label: '' }])}
                  className="w-full border-dashed"
                >
                  <Plus size={14} className="mr-1" /> Ajouter une option
                </Button>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider ml-1">Date de fin (Optionnel)</label>
              <Input 
                type="datetime-local"
                value={newEndDate}
                onChange={(e) => setNewEndDate(e.target.value)}
                className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg py-2.5 px-3 text-[13px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
              />
              <p className="text-[11px] text-gray-400 ml-1">Le sondage sera automatiquement clôturé après cette date, puis supprimé 24h plus tard.</p>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)} className="flex-1" disabled={submitting}>Annuler</Button>
            <Button type="submit" className="flex-1" isLoading={submitting}>
              {editingPoll ? "Mettre à jour" : "Lancer le sondage"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
