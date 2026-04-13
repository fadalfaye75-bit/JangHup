import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Announcement, UserRole, AnnouncementReadStatus } from '../../types';
import { Card, Badge, Spinner, ErrBox, Modal, ConfirmModal } from '../../components/ui';
import { GlassCard } from '../components/ui/GlassCard';
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
  EyeOff,
  Share2,
  Mail
} from 'lucide-react';
import { generateSmartShare, shareToWhatsApp, shareToEmail } from '../lib/shareUtils';
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
import { notificationService } from '../services/notificationService';

export const Announcements: React.FC = () => {
  const { user, classInfo } = useAuth();
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
    const constraints: any[] = [orderBy('createdAt', 'desc')];
    if (user.role !== UserRole.ADMIN) {
      constraints.unshift(where('className', '==', user.class_name || ''));
    }
    
    const q = query(
      collection(db, 'announcements'),
      ...constraints
    );

    const unsubscribeAnn = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Announcement));
      setAnnouncements(data);
      setLoading(false);
    }, (err) => {
      console.error("🔥 Announcements Snapshot Error:", err);
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
    }, (err) => {
      console.error("🔥 Announcement Status Snapshot Error:", err);
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
        const docRef = await addDoc(collection(db, 'announcements'), {
          ...formData,
          userId: user.id,
          author: user.name,
          className: user.class_name,
          color: 'primary',
          createdAt: new Date().toISOString()
        });

        // Notify all students in the class
        await notificationService.notifyClass(
          user.class_name,
          `Nouvelle annonce: ${formData.title}`,
          formData.content.substring(0, 100) + (formData.content.length > 100 ? '...' : ''),
          formData.priority === 'urgent' ? 'danger' : 'info',
          '/announcements'
        );
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
      title: ann.title || '',
      content: ann.content || '',
      priority: ann.priority || 'normal',
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

  const handleShareWhatsApp = (ann: Announcement) => {
    const { whatsapp } = generateSmartShare('annonce', {
      title: ann.title,
      content: ann.content,
      priority: ann.priority,
      className: ann.className,
      date: ann.createdAt,
      classEmail: classInfo?.class_email
    });
    shareToWhatsApp(whatsapp);
  };

  const handleShareEmail = (ann: Announcement) => {
    const { emailSubject, emailBody, classEmail } = generateSmartShare('annonce', {
      title: ann.title,
      content: ann.content,
      priority: ann.priority,
      className: ann.className,
      date: ann.createdAt,
      classEmail: classInfo?.class_email
    });
    shareToEmail(emailSubject, emailBody, classEmail);
  };

  const filteredAnnouncements = announcements
    .filter(ann => 
      ann.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      ann.content.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
    });

  const unreadCount = announcements.filter(ann => !readStatuses[ann.id]).length;

  if (loading) return <div className="flex justify-center py-20"><Spinner size={48} /></div>;
  if (error) return <ErrBox message={error} />;

  return (
    <div className="max-w-2xl mx-auto space-y-10 pb-20 px-4">
      <ConfirmModal 
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig({ ...confirmConfig, isOpen: false })}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        message={confirmConfig.message}
        type={confirmConfig.type}
      />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="heading-futuristic">Annonces</h1>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
            {unreadCount > 0 ? `${unreadCount} nouvelles transmissions` : 'Système à jour'}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {unreadCount > 0 && (
            <button 
              onClick={handleMarkAllAsRead}
              className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-white transition-colors"
            >
              Tout marquer lu
            </button>
          )}
          {canManage && (
            <button 
              onClick={() => setIsModalOpen(true)}
              className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-[0_0_20px_rgba(108,99,255,0.4)] hover:scale-110 transition-transform border border-white/10"
            >
              <Plus size={24} />
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative group">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors" size={20} />
        <input 
          type="text" 
          placeholder="Rechercher dans les archives..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-14 pr-6 py-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm font-medium text-white placeholder:text-slate-600"
        />
      </div>

      {/* Feed */}
      <div className="space-y-6">
        <AnimatePresence mode="popLayout">
          {filteredAnnouncements.map((ann) => {
            const isRead = readStatuses[ann.id];
            return (
              <motion.div
                key={ann.id}
                layout
                initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
                transition={{ type: "spring", stiffness: 200, damping: 25 }}
              >
                <GlassCard className={`p-0 overflow-hidden border-white/5 hover:border-primary/30 transition-all duration-500 group ${!isRead ? 'shadow-[0_0_30px_rgba(108,99,255,0.05)]' : ''}`} tilt={true}>
                  {/* Card Header */}
                  <div className="p-6 flex items-center justify-between border-b border-white/5 relative z-10">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary to-accent p-[1px]">
                        <div className="w-full h-full rounded-2xl bg-[#0F0F1A] flex items-center justify-center text-white font-black text-lg">
                          {ann.author.charAt(0)}
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-sm text-white tracking-tight">{ann.author}</span>
                          {ann.isPinned && <Pin size={14} className="text-primary fill-primary" />}
                          {!isRead && <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_10px_rgba(108,99,255,0.8)]" />}
                        </div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{ann.className}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <button 
                        onClick={() => handleShareWhatsApp(ann)}
                        className="p-2.5 bg-white/5 hover:bg-white/10 text-slate-500 hover:text-[#25D366] rounded-xl transition-all"
                        title="Partager sur WhatsApp"
                      >
                        <Share2 size={18} />
                      </button>
                      <button 
                        onClick={() => handleShareEmail(ann)}
                        className="p-2.5 bg-white/5 hover:bg-white/10 text-slate-500 hover:text-primary rounded-xl transition-all"
                        title="Partager par Email"
                      >
                        <Mail size={18} />
                      </button>
                      {canManage && (
                        <>
                          <button 
                            onClick={() => handleTogglePin(ann)}
                            className={`p-2.5 bg-white/5 hover:bg-white/10 transition-all rounded-xl ${ann.isPinned ? 'text-primary' : 'text-slate-500 hover:text-primary'}`}
                          >
                            <Pin size={18} />
                          </button>
                          <button 
                            onClick={() => handleEdit(ann)}
                            className="p-2.5 bg-white/5 hover:bg-white/10 text-slate-500 hover:text-primary rounded-xl transition-all"
                          >
                            <MoreHorizontal size={18} />
                          </button>
                          <button 
                            onClick={() => handleDelete(ann.id)}
                            className="p-2.5 bg-white/5 hover:bg-white/10 text-slate-500 hover:text-danger rounded-xl transition-all"
                          >
                            <Trash2 size={18} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-6 space-y-4 relative z-10">
                    <div className="space-y-2">
                      <h3 className="text-xl font-black text-white leading-tight tracking-tight group-hover:text-primary transition-colors duration-500">
                        {ann.title}
                      </h3>
                      <p className="text-sm text-slate-400 leading-relaxed whitespace-pre-wrap font-medium group-hover:text-slate-300 transition-colors">
                        {ann.content}
                      </p>
                    </div>
                    
                    {ann.link && (
                      <a 
                        href={ann.link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary hover:text-white transition-colors"
                      >
                        <ExternalLink size={14} />
                        Accéder à la ressource
                      </a>
                    )}
                  </div>

                  {/* Card Footer */}
                  <div className="px-6 py-4 bg-white/5 flex items-center justify-between border-t border-white/5 relative z-10">
                    <div className="flex items-center gap-6">
                      <button 
                        onClick={() => handleMarkAsRead(ann.id)}
                        className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-colors ${isRead ? 'text-slate-600' : 'text-primary'}`}
                      >
                        {isRead ? <CheckCircle2 size={16} /> : <Eye size={16} />}
                        {isRead ? 'Archivé' : 'Marquer lu'}
                      </button>
                      {ann.priority === 'urgent' && (
                        <div className="flex items-center gap-2 text-[10px] font-black text-danger animate-pulse tracking-widest">
                          <AlertTriangle size={14} />
                          PRIORITÉ CRITIQUE
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                      {fmtDate(ann.createdAt)}
                    </span>
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {filteredAnnouncements.length === 0 && (
          <div className="text-center py-24 px-6 glass-ultra rounded-[40px] border-2 border-dashed border-white/5">
            <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/10">
              <Megaphone size={48} className="text-slate-700" />
            </div>
            <h3 className="text-xl font-black text-white tracking-tight">Aucune transmission</h3>
            <p className="text-slate-500 font-medium mt-2">Le canal de communication est actuellement silencieux.</p>
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
        title={editingAnn ? "Modifier la transmission" : "Nouvelle transmission"}
      >
        <form onSubmit={handleSubmit} className="space-y-8 p-2">
          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-3 ml-1">Titre de l'annonce</label>
              <input 
                type="text" 
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl outline-none focus:ring-2 focus:ring-primary/50 transition-all text-white font-medium placeholder:text-slate-600"
                placeholder="Ex: Changement de terminal..."
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-3 ml-1">Priorité</label>
                <select 
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                  className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl outline-none focus:ring-2 focus:ring-primary/50 transition-all text-white font-medium appearance-none cursor-pointer"
                >
                  <option value="normal" className="bg-[#0F0F1A]">Normal</option>
                  <option value="important" className="bg-[#0F0F1A]">Important</option>
                  <option value="urgent" className="bg-[#0F0F1A]">Urgent</option>
                </select>
              </div>
              <div className="flex items-end pb-4">
                <label className="flex items-center gap-4 cursor-pointer group">
                  <div className="relative">
                    <input 
                      type="checkbox" 
                      className="sr-only"
                      checked={formData.isPinned}
                      onChange={(e) => setFormData({ ...formData, isPinned: e.target.checked })}
                    />
                    <div className={`w-12 h-7 rounded-full transition-all duration-500 ${formData.isPinned ? 'bg-primary shadow-[0_0_15px_rgba(108,99,255,0.5)]' : 'bg-white/10'}`} />
                    <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform duration-500 ${formData.isPinned ? 'translate-x-5' : ''}`} />
                  </div>
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest group-hover:text-primary transition-colors">Prioritaire</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-3 ml-1">Message</label>
              <textarea 
                required
                rows={5}
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl outline-none focus:ring-2 focus:ring-primary/50 transition-all text-white font-medium placeholder:text-slate-600 resize-none"
                placeholder="Écrivez votre message ici..."
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-3 ml-1">Lien externe (optionnel)</label>
              <input 
                type="url" 
                value={formData.link}
                onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl outline-none focus:ring-2 focus:ring-primary/50 transition-all text-white font-medium placeholder:text-slate-600"
                placeholder="https://..."
              />
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button 
              type="button" 
              onClick={() => setIsModalOpen(false)}
              className="flex-1 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors"
            >
              Annuler
            </button>
            <button 
              type="submit"
              className="btn-futuristic-primary flex-1 py-5"
            >
              <span className="font-black uppercase tracking-widest text-xs">
                {editingAnn ? "Mettre à jour" : "Diffuser l'annonce"}
              </span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
