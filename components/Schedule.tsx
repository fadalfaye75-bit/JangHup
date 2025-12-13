import React, { useState, useEffect } from 'react';
import { User, UserRole, ScheduleItem } from '../types';
import { supabase } from '../lib/supabaseClient';
import { 
  FileSpreadsheet, Upload, Download, Eye, Clock, Trash2, 
  History, X, Share2, AlertOctagon, Loader2
} from 'lucide-react';

interface ScheduleProps {
  user: User;
}

export const Schedule: React.FC<ScheduleProps> = ({ user }) => {
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [viewingItem, setViewingItem] = useState<ScheduleItem | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Admin cannot upload schedules (Pedagogical content)
  const canEdit = user.role === UserRole.RESPONSIBLE;

  // Delete Rights: Admin OR (Responsible AND Same Class)
  const canDelete = (item: ScheduleItem) => {
      if (user.role === UserRole.ADMIN) return true;
      if (user.role === UserRole.RESPONSIBLE && item.classLevel === user.classLevel) return true;
      return false;
  };

  useEffect(() => {
    fetchSchedules();
  }, [user.classLevel]);

  const fetchSchedules = async () => {
    // Note: App.tsx handles filtering, but here we can refetch if needed.
    // For simplicity, we rely on App passing strict data, but this component fetches its own initially?
    // In current architecture, App fetches everything.
    // Actually, App passed 'user' but this component fetches its own data in useEffect.
    // We need to fix this component to respect the passed user/props or handle Admin view.
    
    let query = supabase.from('schedules').select('*').order('uploaded_at', { ascending: false });
    
    if (user.role !== UserRole.ADMIN) {
        query = query.eq('class_level', user.classLevel);
    }
    
    const { data, error } = await query;

    if (data) {
        setSchedules(data.map(d => ({
            id: d.id,
            title: d.title,
            classLevel: d.class_level,
            semester: d.semester,
            url: d.url,
            uploadedAt: d.uploaded_at,
            version: d.version || 1
        })));
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsUploading(true);
      const file = e.target.files[0];
      const fileName = `${user.classLevel}/${Date.now()}_${file.name}`;
      
      try {
          // Upload file
          const { error: uploadError } = await supabase.storage.from('files').upload(fileName, file);
          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage.from('files').getPublicUrl(fileName);

          const newItem = {
            title: file.name.replace('.xlsx', ''),
            class_level: user.classLevel, // Auto-assign class
            semester: 'Semestre 2',
            uploaded_at: new Date().toISOString(),
            url: publicUrl,
            version: 1
          };

          // Insert DB
          const { error: dbError } = await supabase.from('schedules').insert(newItem);
          if (dbError) throw dbError;

          fetchSchedules();
      } catch (error) {
          console.error("Upload failed", error);
          alert("Erreur d'upload");
      } finally {
          setIsUploading(false);
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (deleteConfirmId === id) {
      await supabase.from('schedules').delete().eq('id', id);
      setSchedules(schedules.filter(s => s.id !== id));
      setDeleteConfirmId(null);
    } else {
      setDeleteConfirmId(id);
      setTimeout(() => setDeleteConfirmId(null), 3000);
    }
  };

  const handleShare = (item: ScheduleItem) => {
      const classEmail = item.classLevel.toLowerCase().replace(/[^a-z0-9]/g, '.') + '@janghub.sn';
      const subject = `Emploi du temps ${user.classLevel}`;
      const body = `Voici l'emploi du temps pour la classe ${item.classLevel}.\n\nLien: ${item.url}`;
      window.location.href = `mailto:${classEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Header & Upload */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
           <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Emploi du temps</h2>
           <p className="text-slate-500 font-medium mt-1">
             Classe : <span className="text-brand font-bold">{user.role === UserRole.ADMIN ? 'Toutes (Vue Admin)' : user.classLevel}</span>
           </p>
        </div>
        
        {canEdit && (
          <div className="relative group">
            <input 
              type="file" 
              accept=".xlsx, .xls" 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              onChange={handleUpload}
              disabled={isUploading}
            />
            <button className="flex items-center gap-2 bg-brand hover:bg-sky-400 text-white px-8 py-3.5 rounded-2xl font-bold transition-all shadow-lg shadow-sky-200 active:scale-95 disabled:opacity-50">
              {isUploading ? <Loader2 className="animate-spin" size={20} /> : <Upload size={20} />}
              <span>{isUploading ? 'Envoi...' : 'Mettre à jour / Téléverser'}</span>
            </button>
          </div>
        )}
      </div>

      {/* List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {schedules.map((item) => (
            <div key={item.id} className="bg-white rounded-[2.5rem] p-8 shadow-soft border border-white hover:shadow-lg hover:border-brand/20 transition-all group flex flex-col relative">
                <div className="flex justify-between items-start mb-6">
                    <div className="bg-emerald-50 text-emerald-500 p-4 rounded-2xl shadow-sm">
                        <FileSpreadsheet size={32} />
                    </div>
                    {canDelete(item) && (
                        <button 
                            onClick={() => handleDelete(item.id)}
                            className={`p-3 rounded-2xl transition-all duration-300 flex items-center gap-2 absolute top-6 right-6 ${deleteConfirmId === item.id ? 'bg-alert text-white px-4' : 'text-slate-300 hover:text-alert hover:bg-red-50'}`}
                        >
                             {deleteConfirmId === item.id ? (
                               <><AlertOctagon size={20} /> Supprimer</>
                             ) : (
                               <Trash2 size={22} />
                             )}
                        </button>
                    )}
                </div>

                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-3 py-1.5 rounded-lg uppercase tracking-wider">
                            {item.classLevel}
                        </span>
                        <span className="bg-sky-50 text-sky-600 text-[10px] font-bold px-3 py-1.5 rounded-lg uppercase tracking-wider">
                            {item.semester}
                        </span>
                    </div>
                    <h3 className="font-bold text-slate-800 text-xl leading-tight mb-2 line-clamp-2">{item.title}</h3>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                        <Clock size={14} /> 
                        Mis à jour le {new Date(item.uploadedAt).toLocaleDateString()}
                    </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg">
                        <History size={14} /> v{item.version}
                    </div>
                    <div className="flex gap-2">
                         <button onClick={() => handleShare(item)} className="p-2.5 rounded-xl text-action-share hover:bg-blue-50 transition-colors" title="Partager">
                            <Share2 size={20} />
                         </button>
                         <a 
                            href={item.url}
                            download
                            className="p-2.5 rounded-xl text-emerald-600 hover:bg-emerald-50 transition-colors flex items-center justify-center"
                            title="Télécharger"
                         >
                            <Download size={20} />
                         </a>
                         <button 
                            onClick={() => setViewingItem(item)}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand/10 text-brand hover:bg-brand/20 text-sm font-bold transition-colors ml-2"
                         >
                            <Eye size={18} /> Ouvrir
                         </button>
                    </div>
                </div>
            </div>
        ))}
        
        {/* Empty State */}
        {schedules.length === 0 && (
            <div className="col-span-full py-24 flex flex-col items-center justify-center text-slate-400 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100">
                <FileSpreadsheet size={56} className="opacity-20 mb-4" />
                <p className="font-medium text-lg">Aucun emploi du temps trouvé.</p>
            </div>
        )}
      </div>

      {/* Excel Viewer Modal (Simplified for visual demo) */}
      {viewingItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-[2.5rem] w-full max-w-6xl h-[85vh] flex flex-col shadow-2xl overflow-hidden ring-4 ring-white/20">
                <div className="bg-emerald-600 text-white p-6 flex justify-between items-center">
                    <div className="flex items-center gap-5">
                        <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm shadow-inner">
                            <FileSpreadsheet size={28} />
                        </div>
                        <div>
                            <h3 className="font-bold text-xl leading-tight">{viewingItem.title}.xlsx</h3>
                            <p className="text-emerald-100 text-xs font-bold opacity-90 tracking-wide uppercase mt-1">Lecture seule • {viewingItem.semester}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <a href={viewingItem.url} download className="px-5 py-2.5 hover:bg-white/10 rounded-2xl transition-colors text-emerald-50 text-sm font-bold flex items-center gap-2">
                            <Download size={20} /> <span className="hidden sm:inline">Télécharger</span>
                        </a>
                        <button 
                            onClick={() => setViewingItem(null)}
                            className="p-2.5 hover:bg-red-500/20 rounded-2xl transition-colors text-white"
                        >
                            <X size={28} />
                        </button>
                    </div>
                </div>
                <div className="flex-1 bg-slate-50 flex items-center justify-center">
                    <p className="text-slate-400 font-medium">Prévisualisation Excel non disponible en mode démo. Veuillez télécharger le fichier.</p>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};