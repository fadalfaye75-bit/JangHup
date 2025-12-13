import React, { useState } from 'react';
import { Meeting, User, UserRole } from '../types';
import { supabase } from '../lib/supabaseClient';
import { 
  Video, Plus, Calendar, Clock, Trash2, ExternalLink, X, Check, Link as LinkIcon, Copy, Share2, AlertOctagon, Users, Edit2
} from 'lucide-react';

interface MeetProps {
  user: User;
  meetings: Meeting[];
  addMeeting: (m: Meeting) => void;
  updateMeeting: (m: Meeting) => void;
  deleteMeeting: (id: string) => void;
}

export const Meet: React.FC<MeetProps> = ({ user, meetings, addMeeting, updateMeeting, deleteMeeting }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [link, setLink] = useState('');
  const [platform, setPlatform] = useState<'Google Meet' | 'Zoom' | 'Teams' | 'Autre'>('Google Meet');

  // Admin cannot create meetings (Pedagogical content)
  const canEdit = user.role === UserRole.RESPONSIBLE;
  
  // Delete/Edit Rights: Admin OR (Responsible AND Same Class)
  const canModify = (meeting: Meeting) => {
      if (user.role === UserRole.ADMIN) return true;
      if (user.role === UserRole.RESPONSIBLE && meeting.classLevel === user.classLevel) return true;
      return false;
  };

  const resetForm = () => {
    setIsAdding(false);
    setEditingId(null);
    setTitle(''); setDate(''); setTime(''); setLink('');
  }

  const handleEdit = (m: Meeting) => {
      setEditingId(m.id);
      setTitle(m.title);
      setDate(m.date);
      setTime(m.time);
      setLink(m.link);
      setPlatform(m.platform);
      setIsAdding(true);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !date || !time || !link) return;

    try {
        const payload = {
          title, date, time, link, platform,
          class_level: user.classLevel, // Auto-assign class
          author_id: user.id,
          author_name: user.name
        };

        let data, error;

        if (editingId) {
            // Update
            const res = await supabase.from('meetings').update(payload).eq('id', editingId).select().single();
            data = res.data; error = res.error;
        } else {
            // Insert
            const res = await supabase.from('meetings').insert(payload).select().single();
            data = res.data; error = res.error;
        }

        if (error) throw error;

        if (data) {
            const formatted: Meeting = {
                id: data.id,
                title: data.title,
                classLevel: data.class_level,
                date: data.date,
                time: data.time,
                link: data.link,
                platform: data.platform,
                authorId: data.author_id,
                authorName: data.author_name
            };
            
            if (editingId) updateMeeting(formatted);
            else addMeeting(formatted);
            
            resetForm();
        }
    } catch (error: any) {
        alert(`Erreur : ${error.message || 'Erreur inconnue'}`);
        console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    if (deleteConfirmId === id) {
      const { error } = await supabase.from('meetings').delete().eq('id', id);
      if (!error) deleteMeeting(id);
      else alert("Impossible de supprimer cette réunion.");
      setDeleteConfirmId(null);
    } else {
      setDeleteConfirmId(id);
      setTimeout(() => setDeleteConfirmId(null), 3000);
    }
  };

  const handleCopy = (m: Meeting) => {
      navigator.clipboard.writeText(m.link);
      setCopiedId(m.id);
      setTimeout(() => setCopiedId(null), 2000);
  };

  const handleShare = (m: Meeting) => {
      const classEmail = m.classLevel.toLowerCase().replace(/[^a-z0-9]/g, '.') + '@janghub.sn';
      const subject = `Réunion ${user.classLevel}: ${m.title}`;
      const body = `Rejoignez la réunion "${m.title}" le ${new Date(m.date).toLocaleDateString()} à ${m.time}.\n\nLien : ${m.link}`;
      window.location.href = `mailto:${classEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const sortedMeetings = [...meetings].sort((a, b) => {
    const dateA = new Date(`${a.date}T${a.time}`);
    const dateB = new Date(`${b.date}T${b.time}`);
    return dateA.getTime() - dateB.getTime();
  });

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
               <div className="flex items-center gap-3">
                   <h2 className="text-3xl font-bold text-slate-800 dark:text-white tracking-tight">Visioconférence</h2>
                   <span className="bg-brand/10 dark:bg-sky-500/20 text-brand dark:text-sky-400 text-xs font-bold px-3 py-1 rounded-full border border-brand/20 dark:border-sky-500/20 flex items-center gap-1">
                     <Users size={12} /> {user.role === UserRole.ADMIN ? 'Vue Admin' : user.classLevel}
                   </span>
               </div>
                <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Cours en ligne pour la classe.</p>
            </div>
            {canEdit && !isAdding && (
                <button onClick={() => setIsAdding(true)} className="bg-brand hover:bg-sky-400 text-white px-8 py-3.5 rounded-2xl font-bold shadow-lg flex items-center gap-2 active:scale-95">
                    <Plus size={22} /> Nouvelle Réunion
                </button>
            )}
        </div>

        {isAdding && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-center justify-center p-4">
                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 ring-4 ring-white/20 dark:ring-slate-700/50">
                    <div className="bg-brand dark:bg-sky-600 p-8 text-white flex justify-between items-center">
                        <h3 className="font-bold text-xl flex items-center gap-2">{editingId ? 'Modifier le cours' : 'Planifier un cours'}</h3>
                        <button onClick={resetForm} className="hover:bg-white/20 p-2 rounded-xl transition-colors"><X size={24} /></button>
                    </div>
                    <form onSubmit={handleSubmit} className="p-8 space-y-6">
                        {/* Simplified fields for brevity */}
                        <input value={title} onChange={e => setTitle(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-0 rounded-2xl outline-none font-medium text-slate-800 dark:text-white" placeholder="Titre" required />
                        <div className="grid grid-cols-2 gap-5">
                            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-0 rounded-2xl outline-none text-slate-800 dark:text-white" required />
                            <input type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-0 rounded-2xl outline-none text-slate-800 dark:text-white" required />
                        </div>
                        <div className="relative">
                            <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input value={link} onChange={e => setLink(e.target.value)} className="w-full p-4 pl-12 bg-slate-50 dark:bg-slate-800 border-0 rounded-2xl outline-none text-slate-800 dark:text-white" placeholder="Lien de réunion" required />
                        </div>
                        <div className="pt-4 flex justify-end gap-3">
                            <button type="button" onClick={resetForm} className="px-6 py-3 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl font-bold">Annuler</button>
                            <button type="submit" className="px-8 py-3 bg-brand dark:bg-sky-600 text-white rounded-2xl font-bold shadow-md active:scale-95">
                                {editingId ? 'Mettre à jour' : 'Planifier'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {sortedMeetings.map(meeting => (
                <div key={meeting.id} className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-soft border border-white dark:border-slate-800 hover:shadow-lg transition-all flex flex-col relative">
                    <div className="flex justify-between items-start mb-6">
                        <div className="px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800">{meeting.platform}</div>
                        <div className="flex gap-1">
                             <button onClick={() => handleCopy(meeting)} className="text-slate-300 dark:text-slate-600 hover:text-action-copy transition-colors p-2">{copiedId === meeting.id ? <Check size={18} /> : <Copy size={18} />}</button>
                             <button onClick={() => handleShare(meeting)} className="text-slate-300 dark:text-slate-600 hover:text-action-share transition-colors p-2"><Share2 size={18} /></button>
                             {canModify(meeting) && (
                                <>
                                 <button onClick={() => handleEdit(meeting)} className="text-slate-300 dark:text-slate-600 hover:text-action-edit transition-colors p-2">
                                    <Edit2 size={18} />
                                 </button>
                                 <button onClick={() => handleDelete(meeting.id)} className={`transition-all p-2 rounded-xl flex items-center gap-1 ${deleteConfirmId === meeting.id ? 'bg-alert text-white' : 'text-slate-300 dark:text-slate-600 hover:text-alert'}`}>
                                    {deleteConfirmId === meeting.id ? <AlertOctagon size={18} /> : <Trash2 size={18} />}
                                 </button>
                                </>
                             )}
                        </div>
                    </div>
                    <h3 className="font-bold text-slate-800 dark:text-white text-xl mb-1">{meeting.title}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-8">Organisé par {meeting.authorName}</p>
                    <div className="space-y-4 mb-8 bg-slate-50 dark:bg-slate-800 p-6 rounded-3xl">
                        <div className="flex items-center gap-4 text-slate-600 dark:text-slate-300"><Calendar size={20} className="text-brand dark:text-sky-500" /><span className="font-bold text-sm">{new Date(meeting.date).toLocaleDateString()}</span></div>
                        <div className="flex items-center gap-4 text-slate-600 dark:text-slate-300"><Clock size={20} className="text-brand dark:text-sky-500" /><span className="font-bold text-sm">{meeting.time}</span></div>
                    </div>
                    <a href={meeting.link} target="_blank" rel="noreferrer" className="mt-auto w-full py-4 bg-slate-800 hover:bg-brand dark:bg-slate-700 dark:hover:bg-sky-600 text-white rounded-2xl font-bold flex items-center justify-center gap-3 transition-all shadow-md active:scale-95 text-sm">Rejoindre la réunion <ExternalLink size={18} /></a>
                </div>
            ))}
        </div>
    </div>
  );
};