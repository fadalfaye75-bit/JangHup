import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/AuthContext';
import { Announcement, UserRole, AnnouncementReadStatus } from '../../types';
import { Card, Badge, Spinner, ErrBox, Modal, ConfirmModal } from '../../components/ui';
import { 
  Plus, 
  Search, 
  Trash2, 
  ExternalLink,
  AlertTriangle,
  Megaphone,
  Pin,
  CheckCircle2,
  X,
  MoreHorizontal,
  Eye,
  EyeOff
} from 'lucide-react';
import { fmtDate } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  setDoc,
  writeBatch,
  getDocs
} from 'firebase/firestore';
import { db } from '../../firebase';

export const Announcements: React.FC = () => {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [readStatuses, setReadStatuses] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAnn, setEditingAnn] = useState<Announcement | null>(null);
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    priority: 'normal' as 'normal' | 'important' | 'urgent',
    link: '',
    isPinned: false
  });

  const canManage = user?.role === UserRole.ADMIN || user?.role === UserRole.DELEGATE;

  useEffect(() => {
    if (!user) return;

    // Listen to announcements
    const q = query(
      collection(db, 'announcements'),
      where('className', '==', user.className),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeAnn = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Announcement));
      setAnnouncements(data);
      setLoading(false);
    }, (err) => {
      console.error(err);
      setError("Erreur lors du chargement des annonces");
      setLoading(false);
    });

    // Listen to read statuses
    const statusQ = query(
      collection(db, 'announcement_read_statuses'),
      where('userId', '==', user.id)
    );

    const unsubscribeStatus = onSnapshot(statusQ, (snapshot) => {
      const statuses: Record<string, boolean> = {};
      snapshot.docs.forEach(doc => {
        statuses[doc.data().announcementId] = true;
      });
      setReadStatuses(statuses);
    });

    return () => {
      unsubscribeAnn();
      unsubscribeStatus();
    };
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      if (editingAnn) {
        await updateDoc(doc(db, 'announcements', editingAnn.id), {
          ...formData,
          updatedAt: new Date().toISOString()
        });
      } else {
        await addDoc(collection(db, 'announcements'), {
          ...formData,
          userId: user.id,
          author: user.name,
          className: user.className,
          color: '#6C63FF',
          createdAt: new Date().toISOString()
        });
      }
      setIsModalOpen(false);
      setEditingAnn(null);
      setFormData({ title: '', content: '', priority: 'normal', link: '', isPinned: false });
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = (ann: Announcement) => {
    setEditingAnn(ann);
    setFormData({
      title: ann.title,
      content: ann.content,
      priority: ann.priority,
      link: ann.link || '',
      isPinned: ann.isPinned || false
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Supprimer l\'annonce',
      message: 'Êtes-vous sûr de vouloir supprimer cette annonce ? Cette action est irréversible.',
      type: 'danger',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'announcements', id));
          
          // Clean up read statuses (optional but good)
          const statusSnap = await getDocs(query(collection(db, 'announcement_read_statuses'), where('announcementId', '==', id)));
          const batch = writeBatch(db);
          statusSnap.docs.forEach(d => batch.delete(d.ref));
          await batch.commit();
        } catch (err) {
          console.error(err);
        }
      }
    });
  };

  const handleTogglePin = async (ann: Announcement) => {
    try {
      await updateDoc(doc(db, 'announcements', ann.id), {
        isPinned: !ann.isPinned
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAsRead = async (annId: string) => {
    if (!user || readStatuses[annId]) return;
    try {
      const statusId = `${user.id}_${annId}`;
      await setDoc(doc(db, 'announcement_read_statuses', statusId), {
        userId: user.id,
        announcementId: annId,
        readAt: new Date().toISOString()
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user || announcements.length === 0) return;
    try {
      const batch = writeBatch(db);
      announcements.forEach(ann => {
        if (!readStatuses[ann.id]) {
          const statusId = `${user.id}_${ann.id}`;
          batch.set(doc(db, 'announcement_read_statuses', statusId), {
            userId: user.id,
            announcementId: ann.id,
            readAt: new Date().toISOString()
          });
        }
      });
      await batch.commit();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredAnnouncements = announcements
    .filter(ann => 
      ann.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      ann.content.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const unreadCount = announcements.filter(ann => !readStatuses[ann.id]).length;

  if (loading) return <div className="flex justify-center py-20"><Spinner size={48} /></div>;
  if (error) return <ErrBox message={error} />;

  return (
    <div className="max-w-xl mx-auto space-y-8 pb-20">
      <ConfirmModal 
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig({ ...confirmConfig, isOpen: false })}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        message={confirmConfig.message}
        type={confirmConfig.type}
      />
      {/* Header */}
      <div className="flex items-center justify-between px-4 md:px-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Annonces</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
            {unreadCount > 0 ? `${unreadCount} nouvelles annonces` : 'Tout est à jour'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <button 
              onClick={handleMarkAllAsRead}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              Tout marquer lu
            </button>
          )}
          {canManage && (
            <button 
              onClick={() => setIsModalOpen(true)}
              className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-200 hover:scale-110 transition-transform"
            >
              <Plus size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="px-4 md:px-0">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Rechercher..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-slate-100 dark:bg-slate-900 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
          />
        </div>
      </div>

      {/* Feed */}
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {filteredAnnouncements.map((ann) => {
            const isRead = readStatuses[ann.id];
            return (
              <motion.div
                key={ann.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="px-0 md:px-0"
              >
                <div className="bg-white dark:bg-slate-900 border-y md:border border-slate-100 dark:border-slate-800 md:rounded-2xl overflow-hidden shadow-sm">
                  {/* Card Header */}
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 p-[2px]">
                        <div className="w-full h-full rounded-full bg-white dark:bg-slate-900 flex items-center justify-center text-slate-500 font-bold text-sm border-2 border-white dark:border-slate-900">
                          {ann.author.charAt(0)}
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900 dark:text-white">{ann.author}</span>
                          {ann.isPinned && <Pin size={12} className="text-indigo-500 fill-indigo-500" />}
                          {!isRead && <div className="w-2 h-2 rounded-full bg-indigo-500" />}
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{user?.className}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      {canManage && (
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => handleTogglePin(ann)}
                            className={`p-2 transition-colors ${ann.isPinned ? 'text-indigo-500' : 'text-slate-400 hover:text-indigo-500'}`}
                          >
                            <Pin size={16} />
                          </button>
                          <button 
                            onClick={() => handleEdit(ann)}
                            className="p-2 text-slate-400 hover:text-indigo-500 transition-colors"
                          >
                            <MoreHorizontal size={16} />
                          </button>
                          <button 
                            onClick={() => handleDelete(ann.id)}
                            className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                      <button className="p-2 text-slate-400">
                        <MoreHorizontal size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="px-4 pb-4 space-y-3">
                    <div className="space-y-1">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                        {ann.title}
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">
                        {ann.content}
                      </p>
                    </div>
                    
                    {ann.link && (
                      <a 
                        href={ann.link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
                      >
                        <ExternalLink size={14} />
                        Voir plus
                      </a>
                    )}
                  </div>

                  {/* Card Actions (Instagram style) */}
                  <div className="px-4 py-3 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => handleMarkAsRead(ann.id)}
                        className={`flex items-center gap-1.5 text-xs font-bold transition-colors ${isRead ? 'text-slate-400' : 'text-indigo-600'}`}
                      >
                        {isRead ? <CheckCircle2 size={16} /> : <Eye size={16} />}
                        {isRead ? 'Lu' : 'Marquer lu'}
                      </button>
                      {ann.priority === 'urgent' && (
                        <div className="flex items-center gap-1 text-[10px] font-black text-rose-500 animate-pulse">
                          <AlertTriangle size={12} />
                          URGENT
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      {fmtDate(ann.createdAt)}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {filteredAnnouncements.length === 0 && (
          <div className="text-center py-20 px-4">
            <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <Megaphone size={40} className="text-slate-200" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Aucune annonce</h3>
            <p className="text-slate-500">Restez à l'écoute pour les prochaines mises à jour.</p>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setEditingAnn(null);
          setFormData({ title: '', content: '', priority: 'normal', link: '', isPinned: false });
        }} 
        title={editingAnn ? "Modifier l'annonce" : "Nouvelle annonce"}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Titre de l'annonce</label>
              <input 
                type="text" 
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                placeholder="Ex: Changement de salle pour le cours de Math"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Priorité</label>
                <select 
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none"
                >
                  <option value="normal">Normal</option>
                  <option value="important">Important</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div className="flex items-end pb-4">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input 
                      type="checkbox" 
                      className="sr-only"
                      checked={formData.isPinned}
                      onChange={(e) => setFormData({ ...formData, isPinned: e.target.checked })}
                    />
                    <div className={`w-10 h-6 rounded-full transition-colors ${formData.isPinned ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-800'}`} />
                    <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${formData.isPinned ? 'translate-x-4' : ''}`} />
                  </div>
                  <span className="text-sm font-bold text-slate-600 dark:text-slate-300 group-hover:text-indigo-500 transition-colors">Épingler</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Message</label>
              <textarea 
                required
                rows={5}
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
                placeholder="Écrivez votre message ici..."
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Lien externe (optionnel)</label>
              <input 
                type="url" 
                value={formData.link}
                onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                placeholder="https://example.com"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button 
              type="button" 
              onClick={() => setIsModalOpen(false)}
              className="flex-1 py-4 text-sm font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Annuler
            </button>
            <button 
              type="submit"
              className="flex-1 py-4 bg-indigo-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-200 hover:scale-105 transition-transform"
            >
              {editingAnn ? "Mettre à jour" : "Publier l'annonce"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
