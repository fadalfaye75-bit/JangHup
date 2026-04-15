import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePaginatedTable, insertRow, updateRow, deleteRow } from '../lib/hooks';
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
  TrendingUp
} from 'lucide-react';
import { generateSmartShare, shareToWhatsApp, shareToEmail } from '../lib/shareUtils';
import { PollAnalytics } from '../components/PollAnalytics';
import { ConfirmModal, Spinner, ErrBox, GlassCard, Button, Input, Badge, Modal, AppCard, AutoGrid } from '../components/ui';
import { notificationService } from '../services/notificationService';
import { cn } from '../lib/utils';

const ProgressBar: React.FC<{ progress: number; isSelected?: boolean }> = ({ progress, isSelected }) => (
  <div className="w-full h-2.5 bg-[var(--bg-main)] rounded-full overflow-hidden relative border border-[var(--border-main)]">
    <motion.div 
      initial={{ width: 0 }}
      animate={{ width: `${progress}%` }}
      transition={{ duration: 1, ease: "easeOut" }}
      className={cn(
        "h-full rounded-full transition-all",
        isSelected ? 'bg-primary shadow-sm' : 'bg-[var(--text-muted)]/20'
      )}
    />
  </div>
);

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

  const [newQuestion, setNewQuestion] = useState('');
  const [newOptions, setNewOptions] = useState<{ id?: string; label: string }[]>([
    { label: '' },
    { label: '' }
  ]);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    if (polls.length === 0) {
      setPollsWithOptions([]);
      return;
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

    const className = user.class_name || 'GENERAL';

    try {
      if (editingPoll) {
        await updateDoc(doc(db, 'polls', editingPoll.id), {
          question: newQuestion,
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
      console.error(error);
      setError(error.message || "Erreur lors de la création du sondage.");
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
          const batch = writeBatch(db);
          const optionsSnap = await getDocs(query(collection(db, 'poll_options'), where('pollId', '==', id)));
          optionsSnap.docs.forEach(d => batch.delete(d.ref));
          const votesSnap = await getDocs(query(collection(db, 'poll_votes'), where('pollId', '==', id)));
          votesSnap.docs.forEach(d => batch.delete(d.ref));
          batch.delete(doc(db, 'polls', id));
          await batch.commit();
          refetch();
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
      refetch();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditPoll = (poll: Poll) => {
    setEditingPoll(poll);
    setNewQuestion(poll.question);
    setNewOptions(poll.options?.map(o => ({ id: o.id, label: o.label })) || [{ label: '' }, { label: '' }]);
    setIsModalOpen(true);
  };

  const handleShareWhatsApp = (poll: Poll) => {
    const { whatsapp } = generateSmartShare('sondage', {
      title: poll.question,
      className: poll.className,
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
      <AutoGrid minWidth="320px">
        <AnimatePresence mode="popLayout">
          {pollsWithOptions.map((poll) => {
            const hasVoted = !!myVotes[poll.id];
            const canManage = user?.role === UserRole.ADMIN || (user?.role === UserRole.DELEGATE && user.id === poll.userId);

            return (
              <motion.div
                key={poll.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="group h-full"
              >
                <AppCard 
                  className="h-full flex flex-col"
                  header={
                    <div className="flex justify-between items-start w-full gap-3">
                      <div className="flex items-center gap-2">
                        <Badge variant={poll.isActive ? 'success' : 'secondary'}>
                          {poll.isActive ? 'Actif' : 'Clôturé'}
                        </Badge>
                        {hasVoted && <Badge variant="primary">Voté</Badge>}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="sm" onClick={() => handleShareWhatsApp(poll)} className="px-2 py-1 h-auto text-gray-500 hover:text-[#25D366]">
                          <Share2 size={14} />
                        </Button>
                        {canManage && (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => handleEditPoll(poll)} className="px-2 py-1 h-auto text-gray-500 hover:text-gray-900 dark:hover:text-white">
                              <Edit3 size={14} />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleToggleStatus(poll)} className={cn("px-2 py-1 h-auto", poll.isActive ? "text-gray-500 hover:text-amber-500" : "text-amber-500")}>
                              {poll.isActive ? <Lock size={14} /> : <Unlock size={14} />}
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeletePoll(poll.id)} className="px-2 py-1 h-auto text-gray-500 hover:text-red-500">
                              <Trash2 size={14} />
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
                      onClick={() => setSelectedPollForAnalytics(poll)}
                    >
                      <PieChart size={14} />
                      <span>Analyses détaillées</span>
                    </Button>
                  }
                >
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <h3 className="text-[16px] font-semibold text-gray-900 dark:text-white leading-tight">{poll.question}</h3>
                      <p className="text-[12px] text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                        <TrendingUp size={12} className="text-gray-400" />
                        {poll.totalVotes} votes au total
                      </p>
                    </div>

                    <div className="space-y-2">
                      {poll.options?.map((option) => {
                        const percentage = poll.totalVotes > 0 ? Math.round((option.votes / poll.totalVotes) * 100) : 0;
                        const isSelected = myVotes[poll.id] === option.id;

                        return (
                          <button
                            key={option.id}
                            disabled={!poll.isActive || voting === poll.id}
                            onClick={() => handleVote(poll.id, option.id)}
                            className={cn(
                              "w-full text-left space-y-1.5 p-2.5 rounded-lg transition-all border",
                              isSelected 
                                ? "bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800/30 ring-1 ring-blue-500/20" 
                                : "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                            )}
                          >
                            <div className="flex justify-between items-center">
                              <span className={cn("text-[13px] font-medium", isSelected ? "text-blue-700 dark:text-blue-400" : "text-gray-700 dark:text-gray-300")}>
                                {option.label}
                              </span>
                              <span className="text-[12px] text-gray-500 dark:text-gray-400">{percentage}%</span>
                            </div>
                            <ProgressBar progress={percentage} isSelected={isSelected} />
                          </button>
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

      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button variant="secondary" onClick={loadMore} isLoading={loadingMore} className="px-8">
            Charger plus
          </Button>
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
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)} className="flex-1">Annuler</Button>
            <Button type="submit" className="flex-1">
              {editingPoll ? "Mettre à jour" : "Lancer le sondage"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Analytics Modal */}
      <Modal 
        isOpen={!!selectedPollForAnalytics} 
        onClose={() => setSelectedPollForAnalytics(null)} 
        title="Analyses du Sondage"
      >
        {selectedPollForAnalytics && (
          <PollAnalytics poll={selectedPollForAnalytics} />
        )}
      </Modal>
    </div>
  );
};
