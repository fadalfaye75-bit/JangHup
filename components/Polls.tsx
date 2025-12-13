import React, { useState } from 'react';
import { Poll, User, UserRole } from '../types';
import { supabase } from '../lib/supabaseClient';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Plus, CheckCircle2, X, Trash2, AlertOctagon, Users, Edit2, Loader2 } from 'lucide-react';

interface PollsProps {
  user: User;
  polls: Poll[];
  addPoll: (p: Poll) => void;
  updatePoll: (p: Poll) => void;
  votePoll: (pollId: string, optionId: string) => void;
}

const COLORS = ['#87CEEB', '#0ea5e9', '#0284c7', '#bae6fd'];

export const Polls: React.FC<PollsProps> = ({ user, polls, addPoll, updatePoll, votePoll }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Admin cannot create polls (Pedagogical content)
  const canCreate = user.role === UserRole.RESPONSIBLE;
  
  // Delete/Edit Rights: Admin OR (Responsible AND Same Class)
  const canModify = (poll: Poll) => {
      if (user.role === UserRole.ADMIN) return true;
      if (user.role === UserRole.RESPONSIBLE && poll.classLevel === user.classLevel) return true;
      return false;
  };

  const handleOptionChange = (idx: number, val: string) => {
    const newOpts = [...options];
    newOpts[idx] = val;
    setOptions(newOpts);
  };

  const addOptionField = () => setOptions([...options, '']);

  const resetForm = () => {
    setIsCreating(false);
    setEditingId(null);
    setQuestion(''); 
    setOptions(['', '']);
    setIsSubmitting(false);
  };

  const handleEdit = (poll: Poll) => {
      setEditingId(poll.id);
      setQuestion(poll.question);
      setOptions(poll.options.map(o => o.text));
      setIsCreating(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const createOrUpdatePoll = async () => {
    if (!question || options.some(o => !o.trim())) return;
    setIsSubmitting(true);

    try {
        if (editingId) {
            // EDIT: Only updating question title is safe.
            const { data, error } = await supabase.from('polls').update({ question }).eq('id', editingId).select().single();
            if (error) throw error;
            
            // Optimistic update
            const originalPoll = polls.find(p => p.id === editingId);
            if (originalPoll && data) {
                const updated: Poll = { ...originalPoll, question: data.question };
                updatePoll(updated);
            }
        } else {
            // CREATE
            const { data: pollData, error: pollError } = await supabase
                .from('polls')
                .insert({ 
                    question, 
                    author_id: user.id, 
                    class_level: user.classLevel, 
                    active: true 
                })
                .select().single();

            if (pollError) throw pollError;

            if (pollData) {
                const optionsData = options.map(text => ({ poll_id: pollData.id, text, votes: 0 }));
                const { data: optData, error: optError } = await supabase.from('poll_options').insert(optionsData).select();

                if (optError) throw optError;

                if (optData) {
                    const newPoll: Poll = {
                        id: pollData.id,
                        question: pollData.question,
                        classLevel: pollData.class_level,
                        options: optData.map((o: any) => ({ id: o.id, text: o.text, votes: o.votes })),
                        authorId: pollData.author_id,
                        active: true,
                        totalVotes: 0
                    };
                    addPoll(newPoll);
                }
            }
        }
        resetForm();
    } catch (error: any) {
        alert(`Erreur : ${error.message || 'Erreur inconnue'}`);
        console.error(error);
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleVote = async (pollId: string, optionId: string, currentVotes: number) => {
      // Optimistic Update
      votePoll(pollId, optionId); 

      try {
          // Utilisation de la syntaxe RPC ou update direct si RLS le permet
          // Idéalement: une fonction stockée 'vote_for_option' pour gérer la concurrence
          // Ici: update simple
          await supabase
            .from('poll_options')
            .update({ votes: currentVotes + 1 })
            .eq('id', optionId);
            
          // Note: En production, il faudrait une table 'votes' pour empêcher le double vote
          // (user_id, poll_id). Ici simplifié pour le MVP.
      } catch (err) {
          console.error("Vote failed", err);
      }
  };

  const handleDelete = async (poll: Poll) => {
    if (deleteConfirmId === poll.id) {
       await supabase.from('polls').delete().eq('id', poll.id);
       setDeleteConfirmId(null);
       votePoll('refresh', 'refresh'); // Trigger refresh in parent
    } else {
       setDeleteConfirmId(poll.id);
       setTimeout(() => setDeleteConfirmId(null), 3000);
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <div>
             <div className="flex items-center gap-3">
                 <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Sondages</h2>
                 <span className="bg-brand/10 text-brand text-xs font-bold px-3 py-1 rounded-full border border-brand/20 flex items-center gap-1">
                     <Users size={12} /> {user.role === UserRole.ADMIN ? 'Vue Admin' : user.classLevel}
                 </span>
             </div>
             <p className="text-slate-500 font-medium mt-1">Avis de la classe.</p>
        </div>
        {canCreate && !isCreating && (
             <button onClick={() => setIsCreating(true)} className="bg-brand hover:bg-sky-400 text-white px-8 py-3.5 rounded-2xl font-bold flex items-center gap-2 shadow-lg active:scale-95"><Plus size={22} /> <span className="hidden sm:inline">Nouveau sondage</span></button>
        )}
      </div>

      {isCreating && (
          <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-sky-100 ring-4 ring-white/50 animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-start mb-8">
                  <h3 className="font-bold text-xl text-slate-800">{editingId ? 'Modifier la question' : `Créer un sondage pour ${user.classLevel}`}</h3>
                  <button onClick={resetForm} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-50 rounded-xl transition-colors"><X size={24} /></button>
              </div>
              <input className="w-full p-4 bg-slate-50 border-0 rounded-2xl mb-6 focus:ring-4 focus:ring-brand/10 focus:bg-white outline-none font-medium placeholder:text-slate-400 text-lg" placeholder="Question ?" value={question} onChange={(e) => setQuestion(e.target.value)} />
              
              {!editingId && (
                  <div className="space-y-4 mb-8">
                      {options.map((opt, idx) => (
                          <div key={idx} className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-500">{idx + 1}</div>
                              <input className="w-full p-3.5 bg-slate-50 border-0 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-brand focus:bg-white outline-none" placeholder={`Option ${idx + 1}`} value={opt} onChange={(e) => handleOptionChange(idx, e.target.value)} />
                          </div>
                      ))}
                  </div>
              )}
              {editingId && <p className="text-sm text-amber-500 font-bold mb-4 bg-amber-50 p-3 rounded-xl border border-amber-100">⚠️ Les options ne peuvent pas être modifiées une fois le sondage créé pour préserver les votes.</p>}
              
              <div className="flex justify-between items-center pt-6 border-t border-slate-50">
                  {!editingId ? <button onClick={addOptionField} className="text-brand text-sm font-bold hover:underline px-2">+ Ajouter une option</button> : <div></div>}
                  <div className="flex gap-3">
                       <button onClick={resetForm} className="text-slate-500 px-6 py-3 hover:bg-slate-100 rounded-2xl font-bold transition-colors">Annuler</button>
                       <button onClick={createOrUpdatePoll} disabled={isSubmitting} className="bg-brand text-white px-8 py-3 rounded-2xl font-bold hover:bg-sky-400 shadow-md active:scale-95 flex items-center gap-2">
                           {isSubmitting && <Loader2 className="animate-spin" size={18} />}
                           {editingId ? 'Mettre à jour' : 'Publier'}
                       </button>
                  </div>
              </div>
          </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {polls.map(poll => (
            <div key={poll.id} className="bg-white p-8 rounded-[2.5rem] shadow-soft border border-white hover:shadow-lg transition-all relative">
                <div className="flex justify-between items-start mb-8">
                    <h3 className="text-xl font-bold text-slate-800 leading-tight max-w-[80%]">{poll.question}</h3>
                    <div className="flex items-center gap-2">
                        <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">{poll.totalVotes} votes</span>
                        {canModify(poll) && (
                            <>
                             <button onClick={() => handleEdit(poll)} className="p-2 text-action-edit bg-sky-50 hover:bg-sky-100 rounded-xl transition-colors" title="Modifier">
                                <Edit2 size={18} />
                             </button>
                             <button onClick={() => handleDelete(poll)} className={`p-2 rounded-xl transition-all ${deleteConfirmId === poll.id ? 'bg-alert text-white' : 'text-slate-300 hover:text-alert hover:bg-red-50'}`}>
                                 {deleteConfirmId === poll.id ? <AlertOctagon size={18} /> : <Trash2 size={18} />}
                             </button>
                            </>
                        )}
                    </div>
                </div>
                
                <div className="space-y-4 mb-10">
                    {poll.options.map(opt => {
                        const percent = poll.totalVotes > 0 ? Math.round((opt.votes / poll.totalVotes) * 100) : 0;
                        return (
                            <button key={opt.id} onClick={() => handleVote(poll.id, opt.id, opt.votes)} className="w-full relative overflow-hidden p-5 border border-slate-100 rounded-2xl hover:border-brand/50 transition-all group text-left bg-slate-50 hover:bg-white">
                                <div className="absolute top-0 bottom-0 left-0 bg-sky-100/50 transition-all duration-700 ease-out" style={{width: `${percent}%`}}></div>
                                <div className="relative flex justify-between items-center z-10">
                                    <span className="text-slate-700 font-bold group-hover:text-brand transition-colors text-sm">{opt.text}</span>
                                    <div className="flex items-center gap-3"><span className="text-xs font-bold text-slate-400">{percent}%</span><CheckCircle2 size={18} className="text-slate-200 group-hover:text-brand transition-colors" /></div>
                                </div>
                            </button>
                        )
                    })}
                </div>

                <div className="h-48 w-full bg-slate-50 rounded-3xl p-6 border border-slate-100">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={poll.options}>
                            <XAxis dataKey="text" tick={{fontSize: 10, fill: '#94a3b8'}} interval={0} axisLine={false} tickLine={false} />
                            <YAxis hide />
                            <Tooltip cursor={{fill: 'rgba(135, 206, 235, 0.1)'}} contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.1)'}} />
                            <Bar dataKey="votes" radius={[8, 8, 8, 8]} barSize={40}>
                                {poll.options.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        ))}
      </div>
    </div>
  );
};