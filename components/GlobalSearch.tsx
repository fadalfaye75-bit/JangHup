import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Announcement, Exam, Meeting, Poll, ScheduleItem, ViewState } from '../types';
import { Search, X, Calendar, Megaphone, FileText, Video, ArrowRight, Hash } from 'lucide-react';

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: ViewState) => void;
  data: {
    announcements: Announcement[];
    exams: Exam[];
    meetings: Meeting[];
    schedules: ScheduleItem[];
    polls: Poll[];
  };
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ isOpen, onClose, onNavigate, data }) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  // Gestion de la touche Echap
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const filteredResults = useMemo(() => {
    if (!query.trim()) return null;
    const lowerQuery = query.toLowerCase();

    return {
      exams: data.exams.filter(e => 
        e.subject.toLowerCase().includes(lowerQuery) || 
        e.room.toLowerCase().includes(lowerQuery) ||
        e.classLevel.toLowerCase().includes(lowerQuery)
      ).slice(0, 5),
      
      announcements: data.announcements.filter(a => 
        a.content.toLowerCase().includes(lowerQuery) || 
        a.authorName.toLowerCase().includes(lowerQuery)
      ).slice(0, 5),
      
      schedules: data.schedules.filter(s => 
        s.title.toLowerCase().includes(lowerQuery) || 
        s.semester.toLowerCase().includes(lowerQuery)
      ).slice(0, 3),

      meetings: data.meetings.filter(m => 
        m.title.toLowerCase().includes(lowerQuery) || 
        m.platform.toLowerCase().includes(lowerQuery)
      ).slice(0, 3)
    };
  }, [query, data]);

  const hasResults = filteredResults && (
    filteredResults.exams.length > 0 || 
    filteredResults.announcements.length > 0 || 
    filteredResults.schedules.length > 0 ||
    filteredResults.meetings.length > 0
  );

  const handleSelect = (view: ViewState) => {
    onNavigate(view);
    onClose();
    setQuery('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-4 md:pt-24 px-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 slide-in-from-top-4 duration-200">
        
        {/* Search Header */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-100 dark:border-slate-800">
          <Search className="text-slate-400" size={20} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Rechercher des cours, examens, documents..."
            className="flex-1 bg-transparent border-none outline-none text-lg text-slate-800 dark:text-white placeholder:text-slate-400 font-medium"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button 
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-bold px-2 py-1"
          >
            ESC
          </button>
        </div>

        {/* Results */}
        <div className="overflow-y-auto p-2 bg-slate-50/50 dark:bg-slate-950/50 min-h-[100px]">
          {!query && (
            <div className="py-12 text-center text-slate-400 dark:text-slate-500">
               <Search size={48} className="mx-auto mb-3 opacity-20" />
               <p className="text-sm font-medium">Tapez pour rechercher dans JàngHub</p>
            </div>
          )}

          {query && !hasResults && (
            <div className="py-12 text-center text-slate-500 dark:text-slate-400">
               <p className="text-sm">Aucun résultat trouvé pour "{query}"</p>
            </div>
          )}

          {hasResults && (
            <div className="space-y-4 p-2">
              
              {/* EXAMS */}
              {filteredResults!.exams.length > 0 && (
                <section>
                  <h4 className="px-3 mb-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <Calendar size={12} /> Examens
                  </h4>
                  <div className="space-y-1">
                    {filteredResults!.exams.map(exam => (
                      <button 
                        key={exam.id}
                        onClick={() => handleSelect('EXAMS')}
                        className="w-full text-left flex items-center gap-3 p-3 rounded-xl hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all group"
                      >
                        <div className="bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 p-2 rounded-lg">
                          <Calendar size={18} />
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-slate-700 dark:text-white text-sm group-hover:text-university dark:group-hover:text-sky-400">{exam.subject}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                             {new Date(exam.date).toLocaleDateString()} à {exam.room}
                          </p>
                        </div>
                        <ArrowRight size={16} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {/* FILES / SCHEDULES */}
              {filteredResults!.schedules.length > 0 && (
                <section>
                   <h4 className="px-3 mb-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <FileText size={12} /> Fichiers & Plannings
                  </h4>
                  <div className="space-y-1">
                    {filteredResults!.schedules.map(item => (
                      <button 
                        key={item.id}
                        onClick={() => handleSelect('SCHEDULE')}
                        className="w-full text-left flex items-center gap-3 p-3 rounded-xl hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all group"
                      >
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 p-2 rounded-lg">
                          <FileText size={18} />
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-slate-700 dark:text-white text-sm group-hover:text-university dark:group-hover:text-sky-400">{item.title}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                             {item.semester} • {item.classLevel}
                          </p>
                        </div>
                        <ArrowRight size={16} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {/* MEETINGS */}
              {filteredResults!.meetings.length > 0 && (
                <section>
                   <h4 className="px-3 mb-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <Video size={12} /> Visioconférences
                  </h4>
                  <div className="space-y-1">
                    {filteredResults!.meetings.map(meet => (
                      <button 
                        key={meet.id}
                        onClick={() => handleSelect('MEET')}
                        className="w-full text-left flex items-center gap-3 p-3 rounded-xl hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all group"
                      >
                        <div className="bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 p-2 rounded-lg">
                          <Video size={18} />
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-slate-700 dark:text-white text-sm group-hover:text-university dark:group-hover:text-sky-400">{meet.title}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                             {meet.platform} • {new Date(meet.date).toLocaleDateString()}
                          </p>
                        </div>
                        <ArrowRight size={16} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {/* ANNOUNCEMENTS */}
              {filteredResults!.announcements.length > 0 && (
                <section>
                   <h4 className="px-3 mb-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <Megaphone size={12} /> Annonces
                  </h4>
                  <div className="space-y-1">
                    {filteredResults!.announcements.map(ann => (
                      <button 
                        key={ann.id}
                        onClick={() => handleSelect('ANNOUNCEMENTS')}
                        className="w-full text-left flex items-start gap-3 p-3 rounded-xl hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all group"
                      >
                        <div className="bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 p-2 rounded-lg shrink-0">
                          <Hash size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-700 dark:text-white text-sm truncate group-hover:text-university dark:group-hover:text-sky-400">
                             De: {ann.authorName}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                             {ann.content}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              )}

            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="bg-slate-50 dark:bg-slate-800 px-4 py-2 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center text-[10px] text-slate-400 dark:text-slate-500 font-medium">
             <span>Recherche globale JàngHub</span>
             <div className="flex gap-3">
                 <span className="flex items-center gap-1"><kbd className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded px-1">↑↓</kbd> Naviguer</span>
                 <span className="flex items-center gap-1"><kbd className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded px-1">↵</kbd> Choisir</span>
             </div>
        </div>
      </div>
    </div>
  );
};