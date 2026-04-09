import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, X, Megaphone, GraduationCap, Video, BarChart3, BookOpen, ArrowRight, Command } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTable } from '../lib/hooks';
import { useAuth } from '../lib/AuthContext';
import { where } from 'firebase/firestore';
import { Announcement, Exam, MeetLink, Poll, Resource } from '../types';

export const GlobalSearch: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const { user } = useAuth();
  const { data: announcements } = useTable<Announcement>('announcements', [where('className', '==', user?.className || '')]);
  const { data: exams } = useTable<Exam>('exams', [where('className', '==', user?.className || '')]);
  const { data: meetings } = useTable<MeetLink>('meetings', [where('className', '==', user?.className || '')]);
  const { data: polls } = useTable<Poll>('polls', [where('className', '==', user?.className || '')]);
  const { data: resources } = useTable<Resource>('resources', [where('className', '==', user?.className || '')]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        isOpen ? onClose() : null; // This is handled by parent usually, but good to have
      }
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const results = [
    ...announcements.map(a => ({ ...a, type: 'announcement', icon: Megaphone, path: '/announcements' })),
    ...exams.map(e => ({ ...e, type: 'exam', icon: GraduationCap, path: '/exams' })),
    ...meetings.map(m => ({ ...m, type: 'meeting', icon: Video, path: '/meetings' })),
    ...polls.map(p => ({ ...p, type: 'poll', icon: BarChart3, path: '/polls' })),
    ...resources.map(r => ({ ...r, type: 'resource', icon: BookOpen, path: '/resources' })),
  ].filter(item => {
    const title = (item as any).title || (item as any).question || (item as any).subject || '';
    return title.toLowerCase().includes(query.toLowerCase());
  }).slice(0, 8);

  const handleSelect = (path: string) => {
    navigate(path);
    onClose();
    setQuery('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh] px-4 bg-slate-900/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -20 }}
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
      >
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center gap-4">
          <Search className="text-slate-400" size={24} />
          <input
            autoFocus
            type="text"
            placeholder="Rechercher une annonce, un examen, une ressource..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-lg text-slate-800 dark:text-white placeholder:text-slate-400"
          />
          <div className="flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-[10px] font-bold text-slate-500 uppercase">
            <Command size={10} /> K
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400">
            <X size={20} />
          </button>
        </div>

        <div className="max-h-[400px] overflow-y-auto p-2">
          {query.length > 0 ? (
            <div className="space-y-1">
              {results.length > 0 ? results.map((res: any, i) => (
                <button
                  key={i}
                  onClick={() => handleSelect(res.path)}
                  className="w-full flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-2xl transition-all group text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 group-hover:text-primary group-hover:bg-primary/10 transition-all">
                    <res.icon size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 dark:text-white truncate">
                      {res.title || res.question || res.subject}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-widest font-bold">
                      {res.type}
                    </p>
                  </div>
                  <ArrowRight size={18} className="text-slate-300 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </button>
              )) : (
                <div className="py-12 text-center">
                  <p className="text-slate-400 font-medium">Aucun résultat pour "{query}"</p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-6">
              <p className="text-label mb-4">Raccourcis rapides</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Annonces', path: '/announcements', icon: Megaphone },
                  { label: 'Examens', path: '/exams', icon: GraduationCap },
                  { label: 'Ressources', path: '/resources', icon: BookOpen },
                  { label: 'Sondages', path: '/polls', icon: BarChart3 },
                ].map((item, i) => (
                  <button
                    key={i}
                    onClick={() => handleSelect(item.path)}
                    className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl hover:bg-primary/5 hover:border-primary/20 border border-transparent transition-all group"
                  >
                    <item.icon size={18} className="text-slate-400 group-hover:text-primary" />
                    <span className="font-bold text-slate-700 dark:text-slate-300">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
