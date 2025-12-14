import React, { useState } from 'react';
import { User, UserRole, ScheduleItem, SchoolClass } from '../types';
import { 
  FileSpreadsheet, Upload, Download, Eye, Clock, Trash2, 
  History, X, Share2, Loader2, Users, Copy, Check
} from 'lucide-react';

interface ScheduleProps {
  user: User;
  schedules: ScheduleItem[];
  addSchedule: (s: ScheduleItem) => void;
  deleteSchedule: (id: string) => void;
  classes: SchoolClass[];
}

export const Schedule: React.FC<ScheduleProps> = ({ user, schedules, addSchedule, deleteSchedule, classes }) => {
  const [viewingItem, setViewingItem] = useState<ScheduleItem | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const canEdit = user.role === UserRole.RESPONSIBLE || user.role === UserRole.ADMIN;

  const canDelete = (item: ScheduleItem) => {
      if (user.role === UserRole.ADMIN) return true;
      if (user.role === UserRole.RESPONSIBLE && item.classLevel === user.classLevel) return true;
      return false;
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsUploading(true);
      const file = e.target.files[0];
      
      // Simulation d'upload
      setTimeout(() => {
          const newItem: ScheduleItem = {
              id: Date.now().toString(),
              title: file.name.replace('.xlsx', ''),
              classLevel: user.classLevel,
              semester: 'Semestre 2', // Par défaut pour la démo
              url: '#', // Lien factice
              uploadedAt: new Date().toISOString(),
              version: 1
          };
          
          addSchedule(newItem);
          setIsUploading(false);
      }, 1000);
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce planning ?")) {
      deleteSchedule(id);
    }
  };

  const handleShare = (item: ScheduleItem) => {
      const targetClassObj = classes.find(c => c.name === item.classLevel);
      const emailTarget = targetClassObj?.email;

      if (!emailTarget) {
          alert("Impossible de trouver l'email de la classe.");
          return;
      }
      const subject = `Emploi du temps - ${item.classLevel}`;
      const body = `Veuillez trouver ci-joint le lien vers l'emploi du temps (${item.semester}) : \n\n${item.url}`;
      window.location.href = `mailto:${emailTarget}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const handleCopy = (item: ScheduleItem) => {
      const text = `Emploi du temps - ${item.title}\nLien : ${item.url}`;
      navigator.clipboard.writeText(text);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
           <div className="flex items-center gap-3">
               <h2 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">Planning & Horaires</h2>
               <span className="bg-university/10 dark:bg-sky-500/20 text-university dark:text-sky-400 text-xs font-bold px-3 py-1 rounded-full border border-university/20 dark:border-sky-500/20 flex items-center gap-1">
                  <Users size={12} /> {user.role === UserRole.ADMIN ? 'Vue Admin' : user.classLevel}
               </span>
           </div>
           <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
             Gestion des emplois du temps universitaires.
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
            <button className="flex items-center gap-2 bg-university hover:bg-university-dark dark:bg-sky-600 dark:hover:bg-sky-700 text-white px-6 py-2.5 rounded-lg font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50 text-sm">
              {isUploading ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
              <span>{isUploading ? 'Traitement...' : 'Téléverser un planning (.xlsx)'}</span>
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {schedules.map((item) => (
            <div key={item.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-card hover:shadow-lg hover:border-university/30 dark:hover:border-sky-500/30 transition-all flex flex-col relative overflow-hidden group">
                <div className="p-6 pb-4">
                    <div className="flex justify-between items-start mb-4">
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 p-3 rounded-lg border border-emerald-100 dark:border-emerald-800">
                            <FileSpreadsheet size={24} />
                        </div>
                        {canDelete(item) && (
                            <button 
                                onClick={() => handleDelete(item.id)}
                                className="p-2 rounded-lg transition-all text-xs font-bold text-slate-400 hover:text-alert hover:bg-alert-light dark:hover:bg-alert/10"
                            >
                                <Trash2 size={18} />
                            </button>
                        )}
                    </div>

                    <div className="mb-2">
                        <h3 className="font-bold text-slate-800 dark:text-white text-base leading-tight truncate" title={item.title}>{item.title}</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">{item.semester} • {item.classLevel}</p>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <Clock size={10} /> 
                        MAJ {new Date(item.uploadedAt).toLocaleDateString()}
                    </div>
                </div>

                <div className="mt-auto px-6 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-2 py-1 rounded border border-slate-200 dark:border-slate-700">
                        <History size={10} /> V{item.version}
                    </div>
                    <div className="flex gap-2">
                         <button onClick={() => handleCopy(item)} className="p-2 rounded-lg text-slate-500 hover:text-university dark:hover:text-sky-400 hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all" title="Copier le lien">
                            {copiedId === item.id ? <Check size={18} className="text-emerald-500" /> : <Copy size={18} />}
                         </button>
                         <button onClick={() => handleShare(item)} className="p-2 rounded-lg text-slate-500 hover:text-university dark:hover:text-sky-400 hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all" title="Partager">
                            <Share2 size={18} />
                         </button>
                         <a href={item.url} download className="p-2 rounded-lg text-slate-500 hover:text-university dark:hover:text-sky-400 hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all" title="Télécharger">
                            <Download size={18} />
                         </a>
                         <button onClick={() => setViewingItem(item)} className="px-3 py-1.5 rounded-lg bg-university hover:bg-university-dark dark:bg-sky-600 dark:hover:bg-sky-700 text-white text-xs font-bold transition-colors">
                            Ouvrir
                         </button>
                    </div>
                </div>
            </div>
        ))}
        
        {schedules.length === 0 && (
            <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                <FileSpreadsheet size={40} className="opacity-30 mb-3" />
                <p className="font-medium text-sm">Aucun emploi du temps disponible pour cette classe.</p>
            </div>
        )}
      </div>

      {viewingItem && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-5xl h-[80vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
                <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 p-2 rounded-lg">
                            <FileSpreadsheet size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 dark:text-white text-sm">{viewingItem.title}.xlsx</h3>
                            <p className="text-slate-500 dark:text-slate-400 text-xs">{viewingItem.semester}</p>
                        </div>
                    </div>
                    <button onClick={() => setViewingItem(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition-colors">
                        <X size={20} />
                    </button>
                </div>
                <div className="flex-1 bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
                    <div className="text-center p-8">
                        <FileSpreadsheet size={64} className="mx-auto text-emerald-200 dark:text-emerald-800 mb-4" />
                        <h4 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-2">Aperçu Excel</h4>
                        <p className="text-slate-500 dark:text-slate-400 font-medium mb-6 text-sm max-w-md mx-auto">
                            L'affichage direct des fichiers Excel n'est pas supporté en mode local. Téléchargez le fichier pour le consulter.
                        </p>
                        <a href={viewingItem.url} download className="px-6 py-3 bg-university dark:bg-sky-600 text-white rounded-lg font-bold text-sm shadow-sm hover:bg-university-dark dark:hover:bg-sky-700 inline-flex items-center gap-2">
                            <Download size={18} /> Télécharger le fichier
                        </a>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};