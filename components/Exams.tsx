import React, { useState } from 'react';
import { Exam, User, UserRole } from '../types';
import { 
  Calendar as CalendarIcon, Clock, MapPin, Plus, Trash2, AlertTriangle, 
  Check, Copy, Mail, Users, Edit2, X, Hourglass
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
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const [subject, setSubject] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState('2h');
  const [room, setRoom] = useState('');
  const [notes, setNotes] = useState('');

  const canCreate = user.role === UserRole.RESPONSIBLE || user.role === UserRole.ADMIN;
  
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !date || !time) return;

    const newExam: Exam = {
        id: editingId || Date.now().toString(),
        subject,
        classLevel: user.classLevel, 
        date: new Date(`${date}T${time}`).toISOString(),
        duration,
        room,
        notes,
        authorId: user.id
    };

    if (editingId) updateExam(newExam);
    else addExam(newExam);
    
    resetForm();
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cet examen ?")) {
      deleteExam(id);
    }
  };

  const handleCopy = (exam: Exam) => {
    const text = `DS: ${exam.subject}\nDate: ${new Date(exam.date).toLocaleDateString()} à ${new Date(exam.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}\nSalle: ${exam.room}\nDurée: ${exam.duration}`;
    navigator.clipboard.writeText(text);
    setCopiedId(exam.id);
    setTimeout(() => setCopiedId(null), 2000);
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
        {canCreate && !isAdding && (
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
             
             return (
                 <div key={exam.id} className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row gap-6 relative overflow-hidden">
                     {isImminent && (
                         <div className="absolute top-0 right-0 bg-warning text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl shadow-sm flex items-center gap-1 z-10">
                             <AlertTriangle size={12} /> J-{diffDays}
                         </div>
                     )}
                     
                     <div className="flex-shrink-0 flex flex-col items-center justify-center w-full md:w-20 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 py-4 md:py-0">
                         <span className="text-3xl font-bold text-slate-800 dark:text-white">{new Date(exam.date).getDate()}</span>
                         <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">{new Date(exam.date).toLocaleDateString('fr-FR', { month: 'short' })}</span>
                     </div>

                     <div className="flex-1">
                         <div className="flex justify-between items-start mb-2">
                             <div>
                                 <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1 group-hover:text-university dark:group-hover:text-sky-400 transition-colors">{exam.subject}</h3>
                                 <div className="flex flex-wrap gap-4 text-sm text-slate-500 dark:text-slate-400">
                                     <div className="flex items-center gap-1.5">
                                         <Clock size={16} className="text-slate-400" /> 
                                         <span className="font-medium">{new Date(exam.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute:'2-digit' })}</span>
                                         <span className="text-slate-300 mx-1">•</span>
                                         <span className="flex items-center gap-1"><Hourglass size={14}/> {exam.duration}</span>
                                     </div>
                                     <div className="flex items-center gap-1.5">
                                         <MapPin size={16} className="text-slate-400" /> 
                                         <span className="font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300">{exam.room}</span>
                                     </div>
                                 </div>
                             </div>
                             
                             <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                 <button onClick={() => handleCopy(exam)} className="p-2 text-slate-300 hover:text-slate-600 dark:text-slate-600 dark:hover:text-slate-300 transition-colors">
                                     {copiedId === exam.id ? <Check size={18}/> : <Copy size={18}/>}
                                 </button>
                                 {canModify(exam) && (
                                     <>
                                         <button onClick={() => handleEdit(exam)} className="p-2 text-slate-300 hover:text-university dark:text-slate-600 dark:hover:text-sky-400 transition-colors">
                                             <Edit2 size={18}/>
                                         </button>
                                         <button onClick={() => handleDelete(exam.id)} className="p-2 text-slate-300 hover:text-alert dark:text-slate-600 dark:hover:text-red-400 transition-colors">
                                             <Trash2 size={18}/>
                                         </button>
                                     </>
                                 )}
                             </div>
                         </div>
                         
                         {exam.notes && (
                             <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
                                 <p className="text-xs text-slate-600 dark:text-slate-400 italic">
                                     <span className="font-bold not-italic mr-1">Notes:</span> {exam.notes}
                                 </p>
                             </div>
                         )}
                     </div>
                 </div>
             );
         })}
         
         {exams.length === 0 && (
             <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                 <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300 dark:text-slate-600">
                     <CalendarIcon size={32} />
                 </div>
                 <h3 className="text-slate-800 dark:text-white font-bold text-lg">Aucun examen programmé</h3>
                 <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Le calendrier est vide pour le moment.</p>
                 {canCreate && (
                     <button onClick={() => setIsAdding(true)} className="mt-4 text-university dark:text-sky-400 text-sm font-bold hover:underline">
                         Programmer le premier devoir
                     </button>
                 )}
             </div>
         )}
      </div>
    </div>
  );
};