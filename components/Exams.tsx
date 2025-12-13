import React, { useState } from 'react';
import { Exam, User, UserRole } from '../types';
import { supabase } from '../lib/supabaseClient';
import { 
  Calendar as CalendarIcon, Clock, MapPin, Plus, Trash2, AlertTriangle, 
  FileText, Check, X, Hourglass, Share2, Copy, AlertOctagon, Users
} from 'lucide-react';

interface ExamsProps {
  user: User;
  exams: Exam[];
  addExam: (e: Exam) => void;
  deleteExam: (id: string) => void;
}

export const Exams: React.FC<ExamsProps> = ({ user, exams, addExam, deleteExam }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Form State
  const [subject, setSubject] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState('2h');
  const [room, setRoom] = useState('');
  const [notes, setNotes] = useState('');

  // Admin cannot create exams (Pedagogical content)
  const canEdit = user.role === UserRole.RESPONSIBLE;
  
  // Delete Rights: Admin OR (Responsible AND Same Class)
  const canDelete = (exam: Exam) => {
      if (user.role === UserRole.ADMIN) return true;
      if (user.role === UserRole.RESPONSIBLE && exam.classLevel === user.classLevel) return true;
      return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !date || !time) return;

    try {
        const newExamData = {
          subject,
          class_level: user.classLevel, // Auto-assign class
          date: new Date(`${date}T${time}`).toISOString(),
          duration,
          room,
          notes,
          author_id: user.id
        };

        const { data, error } = await supabase.from('exams').insert(newExamData).select().single();
        if (error) throw error;

        if (data) {
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
            addExam(formattedExam);
            setIsAdding(false);
            setSubject(''); setDate(''); setTime(''); setRoom(''); setNotes('');
        }
    } catch (error: any) {
        alert(`Erreur lors de la création du DS : ${error.message || 'Erreur inconnue'}`);
        console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    if (deleteConfirmId === id) {
      const { error } = await supabase.from('exams').delete().eq('id', id);
      if (!error) deleteExam(id);
      else alert("Impossible de supprimer cet examen.");
      setDeleteConfirmId(null);
    } else {
      setDeleteConfirmId(id);
      setTimeout(() => setDeleteConfirmId(null), 3000);
    }
  };

  const handleCopy = (exam: Exam) => {
      const text = `DS : ${exam.subject}\nDate : ${new Date(exam.date).toLocaleDateString()}\nHeure : ${new Date(exam.date).toLocaleTimeString()}\nSalle : ${exam.room}`;
      navigator.clipboard.writeText(text);
      setCopiedId(exam.id);
      setTimeout(() => setCopiedId(null), 2000);
  };

  const handleShare = (exam: Exam) => {
      const classEmail = exam.classLevel.toLowerCase().replace(/[^a-z0-9]/g, '.') + '@janghub.sn';
      const subject = `Rappel DS ${exam.classLevel}: ${exam.subject}`;
      const body = `N'oubliez pas le devoir surveillé de ${exam.subject} le ${new Date(exam.date).toLocaleDateString()} à ${new Date(exam.date).toLocaleTimeString()}.\nSalle : ${exam.room}`;
      window.location.href = `mailto:${classEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  // Sort exams by date (ascending)
  const sortedExams = [...exams].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <div className="flex items-center gap-3">
               <h2 className="text-3xl font-bold text-slate-800 tracking-tight">DS & Évaluations</h2>
               <span className="bg-brand/10 text-brand text-xs font-bold px-3 py-1 rounded-full border border-brand/20 flex items-center gap-1">
                 <Users size={12} /> {user.role === UserRole.ADMIN ? 'Vue Admin' : user.classLevel}
               </span>
           </div>
           <p className="text-slate-500 font-medium mt-1">Calendrier des devoirs surveillés.</p>
        </div>
        {canEdit && !isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-brand hover:bg-sky-400 text-white px-8 py-3.5 rounded-2xl font-bold shadow-lg shadow-sky-200 transition-all flex items-center gap-2 transform hover:-translate-y-0.5 active:scale-95"
          >
            <Plus size={22} /> Programmer un DS
          </button>
        )}
      </div>

      {/* Add Exam Modal */}
      {isAdding && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
           <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden ring-4 ring-white/20">
              <div className="bg-brand p-8 text-white flex justify-between items-center">
                 <h3 className="font-bold text-xl flex items-center gap-3">
                    <CalendarIcon size={24} /> Programmer une évaluation
                 </h3>
                 <button onClick={() => setIsAdding(false)} className="hover:bg-white/20 p-2 rounded-xl transition-colors">
                    <X size={24} />
                 </button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                  {/* Matière - Full Width */}
                  <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                        <FileText size={18} className="text-brand"/> Matière
                      </label>
                      <input 
                        type="text" 
                        value={subject} 
                        onChange={e => setSubject(e.target.value)} 
                        className="w-full p-4 bg-slate-50 border-0 rounded-2xl outline-none font-medium focus:ring-2 focus:ring-brand/20 transition-all" 
                        placeholder="Ex: Mathématiques" 
                        required 
                      />
                  </div>

                  {/* Date & Heure grouping */}
                  <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100">
                      <label className="block text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                          <Clock size={18} className="text-brand"/> Date et Heure
                      </label>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="text-xs font-bold text-slate-400 mb-1 block uppercase tracking-wider">Date</label>
                              <input 
                                type="date" 
                                value={date} 
                                onChange={e => setDate(e.target.value)} 
                                className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none font-medium focus:border-brand" 
                                required 
                              />
                          </div>
                          <div>
                              <label className="text-xs font-bold text-slate-400 mb-1 block uppercase tracking-wider">Début</label>
                              <input 
                                type="time" 
                                value={time} 
                                onChange={e => setTime(e.target.value)} 
                                className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none font-medium focus:border-brand" 
                                required 
                              />
                          </div>
                      </div>
                  </div>

                  {/* Logistics: Durée & Salle */}
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                           <Hourglass size={18} className="text-brand"/> Durée
                        </label>
                        <select 
                            value={duration} 
                            onChange={e => setDuration(e.target.value)} 
                            className="w-full p-4 bg-slate-50 border-0 rounded-2xl outline-none font-medium focus:ring-2 focus:ring-brand/20"
                        >
                            <option>1h</option><option>2h</option><option>3h</option><option>4h</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                            <MapPin size={18} className="text-brand"/> Salle
                        </label>
                        <input 
                            type="text" 
                            value={room} 
                            onChange={e => setRoom(e.target.value)} 
                            className="w-full p-4 bg-slate-50 border-0 rounded-2xl outline-none font-medium focus:ring-2 focus:ring-brand/20" 
                            placeholder="Ex: 102"
                        />
                    </div>
                  </div>
                  
                  {/* Notes */}
                  <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Notes ou Chapitres</label>
                      <textarea 
                        value={notes} 
                        onChange={e => setNotes(e.target.value)} 
                        className="w-full p-4 bg-slate-50 border-0 rounded-2xl outline-none h-24 resize-none font-medium focus:ring-2 focus:ring-brand/20" 
                        placeholder="Chapitres à réviser..."
                      />
                  </div>

                  <div className="pt-4 flex justify-end gap-3 border-t border-slate-50">
                      <button type="button" onClick={() => setIsAdding(false)} className="px-6 py-3 text-slate-500 hover:bg-slate-100 rounded-2xl font-bold transition-colors">Annuler</button>
                      <button type="submit" className="px-8 py-3 bg-brand text-white rounded-2xl font-bold hover:bg-sky-400 shadow-md active:scale-95 flex items-center gap-2">Enregistrer <Check size={20} /></button>
                  </div>
              </form>
           </div>
        </div>
      )}

      {/* Timeline / List */}
      <div className="relative space-y-12">
         {/* Vertical Line */}
         <div className="hidden md:block absolute left-24 top-6 bottom-6 w-[2px] bg-slate-200/50"></div>

         {sortedExams.map((exam) => {
             const examDate = new Date(exam.date);
             const now = new Date();
             const diffTime = examDate.getTime() - now.getTime();
             const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
             const isImminent = diffDays >= 0 && diffDays <= 7;
             const isPast = diffDays < 0;

             return (
                 <div key={exam.id} className={`relative md:pl-32 transition-all ${isPast ? 'opacity-50 grayscale' : ''}`}>
                     
                     <div className={`hidden md:flex absolute left-24 top-10 w-6 h-6 rounded-full border-[5px] border-white shadow-md -translate-x-[11px] z-10 ${isImminent ? 'bg-alert animate-pulse' : 'bg-brand'} ${isPast ? 'bg-slate-300' : ''}`}></div>

                     <div className="hidden md:block absolute left-0 top-6 w-20 text-right">
                         <span className="block text-3xl font-bold text-slate-700 leading-none tracking-tight">{examDate.getDate()}</span>
                         <span className="block text-sm font-bold text-slate-400 uppercase tracking-wider mt-1">{examDate.toLocaleDateString('fr-FR', { month: 'short' })}</span>
                     </div>

                     <div className={`bg-white rounded-[2.5rem] p-8 shadow-soft border transition-all hover:shadow-xl group ${isImminent ? 'border-alert/30 ring-4 ring-alert/5' : 'border-white'}`}>
                        {isImminent && (
                            <div className="absolute top-0 right-0 bg-alert text-white text-xs font-bold px-6 py-2 rounded-bl-3xl rounded-tr-[2.3rem] flex items-center gap-2 shadow-sm">
                                <AlertTriangle size={16} /> J-{diffDays}
                            </div>
                        )}

                        <div className="flex flex-col md:flex-row gap-8">
                             {/* Mobile Date Header */}
                             <div className="md:hidden flex items-center gap-3 text-slate-500 mb-2">
                                <CalendarIcon size={20} className="text-brand" />
                                <span className="font-bold text-lg">{examDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                             </div>

                             <div className="flex-1">
                                 <h3 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3">{exam.subject}</h3>
                                 <div className="flex flex-wrap gap-y-4 gap-x-6 text-sm text-slate-600 mb-8">
                                     <div className="flex items-center gap-3 bg-sky-50 px-5 py-2.5 rounded-2xl text-sky-800 font-bold">
                                         <Clock size={20} className="text-brand" />
                                         <span>{examDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute:'2-digit'})}</span>
                                         <span className="text-sky-300">|</span>
                                         <span>{exam.duration}</span>
                                     </div>
                                     <div className="flex items-center gap-3 bg-emerald-50 px-5 py-2.5 rounded-2xl text-emerald-800 font-bold">
                                         <MapPin size={20} className="text-emerald-500" />
                                         <span>Salle {exam.room}</span>
                                     </div>
                                     {/* Admin View: Show Class */}
                                     {user.role === UserRole.ADMIN && (
                                         <div className="flex items-center gap-3 bg-slate-100 px-5 py-2.5 rounded-2xl text-slate-600 font-bold">
                                             <span>{exam.classLevel}</span>
                                         </div>
                                     )}
                                 </div>
                                 {exam.notes && (
                                     <div className="flex gap-4 items-start bg-amber-50 p-6 rounded-3xl border border-amber-100">
                                         <FileText size={24} className="text-amber-500 mt-0.5 flex-shrink-0" />
                                         <p className="text-sm text-slate-700 leading-relaxed font-medium">{exam.notes}</p>
                                     </div>
                                 )}
                             </div>

                             <div className="flex md:flex-col justify-end gap-3 border-t md:border-t-0 md:border-l border-slate-100 pt-6 md:pt-0 md:pl-8">
                                <button onClick={() => handleCopy(exam)} className="p-3.5 text-action-copy hover:bg-green-50 rounded-2xl transition-all">{copiedId === exam.id ? <Check size={22} /> : <Copy size={22} />}</button>
                                <button onClick={() => handleShare(exam)} className="p-3.5 text-action-share hover:bg-blue-50 rounded-2xl transition-all"><Share2 size={22} /></button>
                                {canDelete(exam) && (
                                     <button onClick={() => handleDelete(exam.id)} className={`p-3.5 rounded-2xl transition-all flex items-center justify-center ${deleteConfirmId === exam.id ? 'bg-alert text-white' : 'text-slate-300 hover:text-alert hover:bg-red-50'}`}>
                                         {deleteConfirmId === exam.id ? <AlertOctagon size={22} /> : <Trash2 size={22} />}
                                     </button>
                                )}
                             </div>
                        </div>
                     </div>
                 </div>
             );
         })}
      </div>
    </div>
  );
};