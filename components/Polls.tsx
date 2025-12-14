import React, { useState } from 'react';
import { Poll, User, UserRole } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Plus, Check, X, Trash2, Users, Edit2, Loader2 } from 'lucide-react';

interface PollsProps {
  user: User;
  polls: Poll[];
  addPoll: (p: Poll) => void;
  updatePoll: (p: Poll) => void;
  deletePoll: (id: string) => void;
  votePoll: (pollId: string, optionId: string) => void;
}

const COLORS = ['#87CEEB', '#0ea5e9', '#0284c7', '#bae6fd'];

export const Polls: React.FC<PollsProps> = ({ user, polls, addPoll, updatePoll, deletePoll, votePoll }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  
  // Changement ici : On stocke des objets {id, text} au lieu de simples strings pour tracker les IDs lors de l'édition
  const [options, setOptions] = useState<{id?: string, text: string}[]>([{text: ''}, {text: ''}]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Admin cannot create polls (Pedagogical content)
  const canCreate = user.role === UserRole.RESPONSIBLE || user.role === UserRole.ADMIN;
  
  const canModify = (poll: Poll) => {
      if (user.role === UserRole.ADMIN) return true;
      if (user.role === UserRole.RESPONSIBLE && poll.classLevel === user.classLevel) return true;
      return false;
  };

  const handleOptionChange = (idx: number, val: string) => {
    const newOpts = [...options];
    newOpts[idx] = { ...newOpts[idx], text: val };
    setOptions(newOpts);
  };

  const addOptionField = () => setOptions([...options, { text: '' }]);

  const removeOptionField = (idx: number) => {
      if (options.length <= 2) return;
      const newOpts = options.filter((_, i) => i !== idx);
      setOptions(newOpts);
  };

  const resetForm = () => {
    setIsCreating(false);
    setEditingId(null);
    setQuestion(''); 
    setOptions([{text: ''}, {text: ''}]);
    setIsSubmitting(false);
  };

  const handleEdit = (poll: Poll) => {
      setEditingId(poll.id);
      setQuestion(poll.question);
      // On map les options existantes pour garder leurs IDs
      setOptions(poll.options.map(o => ({ id: o.id, text: o.text })));
      setIsCreating(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const createOrUpdatePoll = async () => {
    if (!question || options.some(o => !o.text.trim())) return;
    setIsSubmitting(true);

    setTimeout(() => {
        if (editingId) {
            const originalPoll = polls.find(p => p.id === editingId);
            if (originalPoll) {
                // Reconstruire les options pour l'update
                const updatedOptions = options.map((opt, idx) => {
                    // Si l'option a un ID, on garde l'ancien vote count, sinon 0 (nouvelle option)
                    const originalOpt = originalPoll.options.find(o => o.id === opt.id);
                    return {
                        id: opt.id || `opt-${Date.now()}-${idx}`, // Nouvel ID si ajout
                        text: opt.text,
                        votes: originalOpt ? originalOpt.votes : 0
                    };
                });

                const updated: Poll = { 
                    ...originalPoll, 
                    question,
                    options: updatedOptions,
                    // Recalcul du total des votes (au cas où on a supprimé une option avec des votes)
                    totalVotes: updatedOptions.reduce((acc, curr) => acc + curr.votes, 0)
                };
                updatePoll(updated);
            }
        } else {
            const newPoll: Poll = {
                id: Date.now().toString(),
                question,
                classLevel: user.classLevel,
                options: options.map((opt, idx) => ({ 
                    id: `opt-${Date.now()}-${idx}`, 
                    text: opt.text, 
                    votes: 0 
                })),
                authorId: user.id,
                active: true,
                totalVotes: 0
            };
            addPoll(newPoll);
        }
        resetForm();
        setIsSubmitting(false);
    }, 500);
  };

  const handleVote = (pollId: string, optionId: string) => {
      votePoll(pollId, optionId);
  };

  const handleDelete = (poll: Poll) => {
    if (window.confirm("Voulez-vous vraiment supprimer ce sondage ?")) {
       deletePoll(poll.id);
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <div>
             <div className="flex items-center gap-3">
                 <h2 className="text-3xl font-bold text-slate-800 dark:text-white tracking-tight">Sondages</h2>
                 <span className="bg-brand/10 dark:bg-sky-500/20 text-brand dark:text-sky-400 text-xs font-bold px-3 py-1 rounded-full border border-brand/20 dark:border-sky-500/20 flex items-center gap-1">
                     <Users size={12} /> {user.role === UserRole.ADMIN ? 'Vue Admin' : user.classLevel}
                 </span>
             </div>
             <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Avis de la classe.</p>
        </div>
        {canCreate && !isCreating && (
             <button onClick={() => setIsCreating(true)} className="bg-brand dark:bg-sky-600 hover:bg-sky-400 dark:hover:bg-sky-500 text-white px-8 py-3.5 rounded-2xl font-bold flex items-center gap-2 shadow-lg active:scale-95"><Plus size={22} /> <span className="hidden sm:inline">Nouveau sondage</span></button>
        )}
      </div>

      {isCreating && (
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-xl border border-sky-100 dark:border-slate-800 ring-4 ring-white/50 dark:ring-slate-800/50 animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-start mb-8">
                  <h3 className="font-bold text-xl text-slate-800 dark:text-white">{editingId ? 'Modifier le sondage' : `Créer un sondage pour ${user.classLevel}`}</h3>
                  <button onClick={resetForm} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors"><X size={24} /></button>
              </div>
              
              <div className="relative mb-6">
                <input 
                    className="w-full p-4 pr-12 bg-slate-50 dark:bg-slate-800 border-0 rounded-2xl focus:ring-4 focus:ring-brand/10 dark:focus:ring-sky-500/20 focus:bg-white dark:focus:bg-slate-800 outline-none font-medium placeholder:text-slate-400 text-lg text-slate-800 dark:text-white" 
                    placeholder="Posez votre question ici..." 
                    value={question} 
                    onChange={(e) => setQuestion(e.target.value)} 
                />
              </div>
              
              <div className="space-y-4 mb-8">
                  {options.map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-sm font-bold text-slate-500 dark:text-slate-400">{idx + 1}</div>
                          <div className="relative flex-1">
                              <input 
                                className="w-full p-3.5 bg-slate-50 dark:bg-slate-800 border-0 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-brand dark:focus:ring-sky-500 focus:bg-white dark:focus:bg-slate-800 outline-none text-slate-800 dark:text-white pr-10" 
                                placeholder={`Option ${idx + 1}`} 
                                value={opt.text} 
                                onChange={(e) => handleOptionChange(idx, e.target.value)} 
                              />
                              {options.length > 2 && (
                                  <button 
                                    onClick={() => removeOptionField(idx)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-alert p-1"
                                  >
                                      <X size={16} />
                                  </button>
                              )}
                          </div>
                      </div>
                  ))}
              </div>
              
              <div className="flex justify-between items-center pt-6 border-t border-slate-50 dark:border-slate-800">
                  <button onClick={addOptionField} className="text-brand dark:text-sky-400 text-sm font-bold hover:underline px-2 flex items-center gap-1">
                      <Plus size={16}/> Ajouter une option
                  </button>
                  <div className="flex gap-3">
                       <button onClick={resetForm} className="text-slate-500 dark:text-slate-400 px-6 py-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl font-bold transition-colors">Annuler</button>
                       <button onClick={createOrUpdatePoll} disabled={isSubmitting} className="bg-brand dark:bg-sky-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-sky-400 dark:hover:bg-sky-500 shadow-md active:scale-95 flex items-center gap-2">
                           {isSubmitting && <Loader2 className="animate-spin" size={18} />}
                           {editingId ? 'Mettre à jour' : 'Publier'}
                       </button>
                  </div>
              </div>
          </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {polls.map(poll => (
            <div key={poll.id} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-soft border border-white dark:border-slate-800 hover:shadow-lg transition-all relative">
                <div className="flex justify-between items-start mb-8">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white leading-tight max-w-[80%]">{poll.question}</h3>
                    <div className="flex items-center gap-2">
                        <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">{poll.totalVotes} votes</span>
                        {canModify(poll) && (
                            <>
                             <button onClick={() => handleEdit(poll)} className="p-2 text-action-edit bg-sky-50 dark:bg-sky-900/20 hover:bg-sky-100 dark:hover:bg-sky-900/40 rounded-xl transition-colors" title="Modifier">
                                <Edit2 size={18} className="text-sky-600 dark:text-sky-400" />
                             </button>
                             <button onClick={() => handleDelete(poll)} className="p-2 rounded-xl transition-all text-slate-300 hover:text-alert hover:bg-red-50 dark:hover:bg-red-900/20">
                                 <Trash2 size={18} />
                             </button>
                            </>
                        )}
                    </div>
                </div>
                
                <div className="space-y-4 mb-10">
                    {poll.options.map(opt => {
                        const percent = poll.totalVotes > 0 ? Math.round((opt.votes / poll.totalVotes) * 100) : 0;
                        const isSelected = poll.userVoteOptionId === opt.id;
                        
                        return (
                            <button 
                                key={opt.id} 
                                onClick={() => handleVote(poll.id, opt.id)} 
                                className={`w-full relative overflow-hidden p-5 border rounded-2xl transition-all group text-left 
                                    ${isSelected 
                                        ? 'bg-sky-50 dark:bg-sky-900/10 border-sky-400 dark:border-sky-500 ring-2 ring-sky-200 dark:ring-sky-900/30' 
                                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800 hover:border-brand/50 dark:hover:border-sky-500/50'
                                    }`}
                            >
                                <div className={`absolute top-0 bottom-0 left-0 transition-all duration-700 ease-out ${isSelected ? 'bg-sky-200/50 dark:bg-sky-800/30' : 'bg-slate-200/30 dark:bg-slate-700/30'}`} style={{width: `${percent}%`}}></div>
                                <div className="relative flex justify-between items-center z-10">
                                    <div className="flex items-center gap-3">
                                        {isSelected && <Check size={18} className="text-university dark:text-sky-400 animate-in zoom-in duration-300" strokeWidth={3} />}
                                        <span className={`font-bold text-sm ${isSelected ? 'text-university dark:text-sky-400' : 'text-slate-700 dark:text-slate-200 group-hover:text-brand dark:group-hover:text-sky-400'}`}>
                                            {opt.text}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`text-xs font-bold ${isSelected ? 'text-university dark:text-sky-400' : 'text-slate-400 dark:text-slate-500'}`}>
                                            {percent}%
                                        </span>
                                    </div>
                                </div>
                            </button>
                        )
                    })}
                </div>

                <div className="h-48 w-full bg-slate-50 dark:bg-slate-800 rounded-3xl p-6 border border-slate-100 dark:border-slate-700">
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