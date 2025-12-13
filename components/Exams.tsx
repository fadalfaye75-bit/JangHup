import React, { useState } from 'react';
import { Exam, User, UserRole } from '../types';
import { supabase } from '../lib/supabaseClient';
import { 
  Calendar as CalendarIcon, Clock, MapPin, Plus, Trash2, AlertTriangle, 
  FileText, Check, X, Share2, Copy, AlertOctagon, Users, Edit2, Mail
} from 'lucide-react';

interface ExamsProps {
  user: User;
  exams: Exam[];
  addExam: (e: Exam) => void;
  updateExam: (e: Exam) => void;
  deleteExam: (id: string) => void;
}

export const Exams: React.FC<ExamsProps> = ({ user, exams, addExam, updateExam, deleteExam }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const [subject, setSubject] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState('2h');
  const [room, setRoom] = useState('');
  const [notes, setNotes] = useState('');

  const canEdit = user.role === UserRole.RESPONSIBLE;
  
  const canModify = (exam: Exam) => {
      if (user.role === UserRole.ADMIN) return true;
      if (user.role === UserRole.RESPONSIBLE && exam.classLevel === user.classLevel) return true;
      return false;
  };

  const resetForm = () => {
      setIsAdding(false);
      setEditingId(null);
      setSubject(''); setDate(''); setTime(''); setRoom(''); setNotes('');
  }

  const handleEdit = (exam: Exam) => {
      setEditingId(exam.id);
      setSubject(exam.subject);
      setRoom(exam.room);
      setNotes(exam.notes || '');
      setDuration(exam.duration);
      const examDate = new Date(exam.date);
      setDate(examDate.toISOString().split('T')[0]);
      setTime(examDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute:'2-digit' }));
      setIsAdding(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !date || !time) return;

    try {
        const payload = {
          subject,
          class_level: user.classLevel, 
          date: new Date(`${date}T${time}`).toISOString(),
          duration,
          room,
          notes,
          author_id: user.id
        };

        let data, error;
        if (editingId) {
            const res = await supabase.from('exams').update(payload).eq('id', editingId).select().single();
            data = res.data; error = res.error;
        } else {
            const res = await supabase.from('exams').insert(payload).select().single();
            data = res.data; error = res.error;
        }
        if (error) throw error;
        const formattedExam: Exam = {
            id: data.id,
            subject: data.subject,
            classLevel: data.class_level,
            date: data.date,
            duration: data.duration,
            room: data.room,
            notes: data.notes,
            authorId: data.author_id
        };
        if (editingId) updateExam(formattedExam);
        else addExam(formattedExam);
        resetForm();
    } catch (error: any) {
        alert(`Erreur : ${error.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (deleteConfirmId === id) {
      const { error } = await supabase.from('exams').delete().eq('id', id);
      if (!error) deleteExam(id);
      setDeleteConfirmId(null);
    } else {
      setDeleteConfirmId(id);
      setTimeout(() => setDeleteConfirmId(null), 3000);
    }
  };

  const handleCopy = (exam: Exam) => {
    const text = `DS: ${exam.subject}\nDate: ${new Date(exam.date).toLocaleDateString()} à ${new Date(exam.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}\nSalle: ${exam.room}\nDurée: ${exam.duration}\nNotes: ${exam.notes || 'Aucune'}`;
    navigator.clipboard.writeText(text);
    setCopiedId(exam.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleShare = (exam: Exam) => {
    const classEmail = exam.classLevel.toLowerCase().replace(/[^a-z0-9]/g, '.') + '@janghub.sn';
    const subject = `[Rappel DS] ${exam.subject}`;
    const body = `Bonjour,\n\nUn devoir surveillé est programmé :\n\nMatière : ${exam.subject}\nDate : ${new Date(exam.date).toLocaleDateString()} à ${new Date(exam.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}\nSalle : ${exam.room}\nDurée : ${exam.duration}\n\nNotes : ${exam.notes || 'N/A'}\n\nCordialement.`;
    window.location.href = `mailto:${classEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const sortedExams = [...exams].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
           <div className="flex items-center gap-3">
               <h2 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">Calendrier des Évaluations</h2>
               <span className="bg-university/10 dark:bg-sky-500/20 text-university dark:text-sky-400 text-xs font-bold px-3 py-1 rounded-full border border-university/20 dark:border-sky-500/20 flex items-center gap-1">
                  <Users size={12} /> {user.role === UserRole.ADMIN ? 'Vue Admin' : user.classLevel}
               </span>
           </div>
           <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Devoirs surveillés, partiels et examens.</p>
        </div>
        {canEdit && !isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-university hover:bg-university-dark dark:bg-sky-600 dark:hover:bg-sky-700 text-white px-6 py-2.5 rounded-lg font-bold shadow-sm transition-all flex items-center gap-2 text-sm"
          >
            <Plus size={18} /> Programmer un DS
          </button>
        )}
      </div>

      {isAdding && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                 <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <CalendarIcon size={20} className="text-university dark:text-sky-400" /> {editingId ? 'Modifier l\'examen' : 'Nouveau devoir'}
                 </h3>
                 <button onClick={resetForm} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                    <X size={20} />
                 </button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                  <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-1.5">Matière</label>
                      <input 
                        type="text" 
                        value={subject} 
                        onChange={e => setSubject(e.target.value)} 
                        className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none font-medium focus:ring-2 focus:ring-university/20 dark:focus:ring-sky-500/20 focus:border-university dark:focus:border-sky-500 text-sm text-slate-800 dark:text-white" 
                        placeholder="Ex: Analyse Mathématique" 
                        required 
                      />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                      <div>
                          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-1.5">Date</label>
                          <input 
                            type="date" 
                            value={date} 
                            onChange={e => setDate(e.target.value)} 
                            className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none font-medium focus:ring-2 focus:ring-university/20 dark:focus:ring-sky-500/20 focus:border-university dark:focus:border-sky-500 text-sm text-slate-800 dark:text-white" 
                            required 
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-1.5">Heure</label>
                          <input 
                            type="time" 
                            value={time} 
                            onChange={e => setTime(e.target.value)} 
                            className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none font-medium focus:ring-2 focus:ring-university/20 dark:focus:ring-sky-500/20 focus:border-university dark:focus:border-sky-500 text-sm text-slate-800 dark:text-white" 
                            required 
                          />
                      </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-1.5">Durée</label>
                        <select 
                            value={duration} 
                            onChange={e => setDuration(e.target.value)} 
                            className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none font-medium focus:ring-2 focus:ring-university/20 dark:focus:ring-sky-500/20 focus:border-university dark:focus:border-sky-500 text-sm text-slate-800 dark:text-white"
                        >
                            <option>1h</option><option>2h</option><option>3h</option><option>4h</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-1.5">Salle / Amphi</label>
                        <input 
                            type="text" 
                            value={room} 
                            onChange={e => setRoom(e.target.value)} 
                            className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none font-medium focus:ring-2 focus:ring-university/20 dark:focus:ring-sky-500/20 focus:border-university dark:focus:border-sky-500 text-sm text-slate-800 dark:text-white" 
                            placeholder="Amphi A"
                        />
                    </div>
                  </div>
                  
                  <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-1.5">Notes (Optionnel)</label>
                      <textarea 
                        value={notes} 
                        onChange={e => setNotes(e.target.value)} 
                        className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none h-20 resize-none font-medium focus:ring-2 focus:ring-university/20 dark:focus:ring-sky-500/20 focus:border-university dark:focus:border-sky-500 text-sm text-slate-800 dark:text-white" 
                        placeholder="Chapitres à réviser, matériel autorisé..."
                      />
                  </div>

                  <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                      <button type="button" onClick={resetForm} className="px-5 py-2.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-bold text-sm transition-colors border border-transparent">Annuler</button>
                      <button type="submit" className="px-6 py-2.5 bg-university dark:bg-sky-600 text-white rounded-lg font-bold hover:bg-university-dark dark:hover:bg-sky-700 shadow-sm flex items-center gap-2 text-sm">
                         {editingId ? 'Mettre à jour' : 'Enregistrer'}
                      </button>
                  </div>
              </form>
           </div>
        </div>
      )}

      <div className="space-y-4">
         {sortedExams.map((exam) => {
             const examDate = new Date(exam.date);
             const now = new Date();
             const diffTime = examDate.getTime() - now.getTime();
             const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
             const isImminent = diffDays >= 0 && diffDays <= 7;
             const isPast = diffDays < 0;

             return (
                 <div key={exam.id} className={`group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 p-0 flex flex-col md:flex-row overflow-hidden hover:shadow-elevation transition-all duration-300 ${isPast ? 'opacity-50 grayscale-[0.5]' : ''}`}>
                     
                     {/* Date Column - Refined */}
                     <div className={`w-full md:w-28 flex flex-col items-center justify-center p-5 border-b md:border-b-0 md:border-r border-slate-100/50 dark:border-slate-800 transition-colors ${isImminent ? 'bg-orange-50/50 dark:bg-orange-900/20' : 'bg-slate-50/30 dark:bg-slate-800/30 group-hover:bg-slate-50/80 dark:group-hover:bg-slate-800/80'}`}>
                         <span className={`text-2xl font-bold tracking-tight ${isImminent ? 'text-orange-500' : 'text-slate-700 dark:text-slate-200'}`}>{examDate.getDate()}</span>
                         <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mt-1">{examDate.toLocaleDateString('fr-FR', { month: 'short' })}</span>
                         {isImminent && <span className="mt-3 text-[9px] font-bold text-orange-600 dark:text-orange-400 bg-orange-100/80 dark:bg-orange-900/40 px-2 py-0.5 rounded-full flex items-center gap-1"><AlertTriangle size={8} /> J-{diffDays}</span>}
                     </div>

                     <div className="flex-1 p-5 md:p-6 flex flex-col justify-between relative">
                         <div className="flex justify-between items-start mb-3 gap-4">
                             <div>
                                 <h3 className="text-base md:text-lg font-bold text-slate-800 dark:text-white leading-tight mb-2 group-hover:text-university dark:group-hover:text-sky-400 transition-colors">{exam.subject}</h3>
                                 <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                                     <div className="flex items-center gap-1.5">
                                         <Clock size={14} className="text-slate-400" />
                                         {examDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute:'2-digit'})} • {exam.duration}
                                     </div>
                                     <div className="flex items-center gap-1.5">
                                         <MapPin size={14} className="text-slate-400" />
                                         {exam.room}
                                     </div>
                                 </div>
                             </div>
                             {user.role === UserRole.ADMIN && (
                                 <span className="shrink-0 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-bold px-2 py-1 rounded-md border border-slate-200/50 dark:border-slate-700">
                                     {exam.classLevel}
                                 </span>
                             )}
                         </div>

                         {exam.notes && (
                             <div className="mt-2 mb-4">
                                 <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50/80 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-100 dark:border-slate-800 leading-relaxed">
                                     <span className="font-bold text-slate-400 block mb-1 text-[10px] uppercase">Notes</span>
                                     {exam.notes}
                                 </p>
                             </div>
                         )}

                         <div className="flex justify-end items-center gap-2 pt-4 mt-auto border-t border-slate-50 dark:border-slate-800">
                             <button onClick={() => handleCopy(exam)} className="p-2 text-slate-400 hover:text-university dark:hover:text-sky-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-all" title="Copier détails">
                                 {copiedId === exam.id ? <Check size={16} className="text-success" /> : <Copy size={16} />}
                             </button>
                             
                             <button onClick={() => handleShare(exam)} className="p-2 text-slate-400 hover:text-university dark:hover:text-sky-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-all" title="Partager par mail">
                                 <Mail size={16} />
                             </button>

                             {canModify(exam) && (
                                 <>
                                    <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                                    <button onClick={() => handleEdit(exam)} className="p-2 text-slate-400 hover:text-university dark:hover:text-sky-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-all" title="Modifier">
                                        <Edit2 size={16} />
                                    </button>
                                    <button onClick={() => handleDelete(exam.id)} className={`p-2 rounded-lg transition-all ${deleteConfirmId === exam.id ? 'bg-alert text-white shadow-sm' : 'text-slate-400 hover:text-alert hover:bg-alert-light dark:hover:bg-alert/10'}`}>
                                        {deleteConfirmId === exam.id ? <Trash2 size={16} /> : <Trash2 size={16} />}
                                    </button>
                                 </>
                             )}
                         </div>
                     </div>
                 </div>
             );
         })}
         {sortedExams.length === 0 && (
             <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                 <CalendarIcon size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                 <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">Aucun examen programmé.</p>
             </div>
         )}
      </div>
    </div>
  );
};