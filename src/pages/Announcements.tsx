import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Announcement, UserRole } from '../types';
import { Badge, Spinner, ErrBox, Modal, ConfirmModal, GlassCard, Button, Input, AppCard } from '../components/ui';
import { 
  Plus, 
  Search, 
  Trash2, 
  ExternalLink,
  AlertTriangle,
  Megaphone,
  Pin,
  CheckCircle2,
  MoreHorizontal,
  Eye,
  Share2,
  Mail,
  User as UserIcon,
  ChevronRight,
  Clock
} from 'lucide-react';
import { generateSmartShare, shareToWhatsApp, shareToEmail } from '../lib/shareUtils';
import { fmtDate } from '../lib/utils';
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
import { db } from '../firebase';
import { notificationService } from '../services/notificationService';
import { cn } from '../lib/utils';

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
      console.error("Announcements Error:", err);
      setError("Erreur lors du chargement des annonces");
      setLoading(false);
    });

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
      console.error("Announcement Status Error:", err);
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
          className: user.class_name,
          color: 'primary',
          createdAt: new Date().toISOString()
        });

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
    <div className="max-w-3xl mx-auto space-y-8 pb-20 px-4">
      <ConfirmModal 
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig({ ...confirmConfig, isOpen: false })}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        message={confirmConfig.message}
        type={confirmConfig.type}
      />
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[var(--text-muted)] mb-1">
            <Badge variant="primary" className="text-[10px] font-bold uppercase tracking-wider">Communication</Badge>
            <ChevronRight size={14} />
            <span className="text-[10px] font-bold uppercase tracking-wider">{user?.class_name || 'Ma Classe'}</span>
          </div>
          <h1 className="text-3xl font-bold text-[var(--text-main)] tracking-tight">Annonces Officielles</h1>
          <p className="text-xs font-medium text-[var(--text-secondary)]">
            {unreadCount > 0 ? `${unreadCount} nouvelles annonces à lire.` : 'Vous êtes à jour sur toutes les annonces.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <Button variant="secondary" size="sm" onClick={handleMarkAllAsRead} className="text-[10px] font-bold uppercase tracking-wider">
              Tout marquer lu
            </Button>
          )}
          {canManage && (
            <Button 
              onClick={() => { setEditingAnn(null); setFormData({ title: '', content: '', priority: 'normal', link: '', isPinned: false }); setIsModalOpen(true); }}
              className="flex items-center gap-2"
            >
              <Plus size={18} />
              <span className="font-bold uppercase tracking-wider text-xs">Publier</span>
            </Button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
        <input 
          type="text"
          placeholder="Rechercher une annonce..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input-standard pl-12 py-3"
        />
      </div>

      {/* Announcements List */}
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
                onViewportEnter={() => handleMarkAsRead(ann.id)}
                className="group"
              >
                <AppCard 
                  header={
                    <div className="flex justify-between items-center w-full">
                      <div className="flex items-center gap-3">
                        {ann.isPinned ? <Pin size={18} className="text-warning fill-warning" /> : <Megaphone size={18} className={cn(!isRead ? "text-primary" : "text-[var(--text-muted)]")} />}
                        <h3 className={cn("text-base md:text-lg font-bold tracking-tight leading-tight", !isRead && "text-primary")}>
                          {ann.title}
                        </h3>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleShareWhatsApp(ann)} className="p-2 text-[var(--text-muted)] hover:text-[#25D366] transition-colors">
                          <Share2 size={16} />
                        </button>
                        {canManage && (
                          <>
                            <button onClick={() => handleTogglePin(ann)} className={cn("p-2 transition-colors", ann.isPinned ? "text-warning" : "text-[var(--text-muted)] hover:text-warning")}>
                              <Pin size={16} />
                            </button>
                            <button onClick={() => handleEdit(ann)} className="p-2 text-[var(--text-muted)] hover:text-primary transition-colors">
                              <MoreHorizontal size={16} />
                            </button>
                            <button onClick={() => handleDelete(ann.id)} className="p-2 text-[var(--text-muted)] hover:text-danger transition-colors">
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  }
                  footer={
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-[var(--bg-card)] border border-[var(--border-card)] flex items-center justify-center text-primary shadow-sm">
                          <UserIcon size={14} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-[var(--text-main)] uppercase tracking-wider">{ann.author}</span>
                          <span className="text-[9px] text-[var(--text-muted)] font-bold uppercase">Auteur</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {isRead && (
                          <div className="flex items-center gap-1 text-success text-[10px] font-bold uppercase tracking-wider">
                            <CheckCircle2 size={12} /> Lu
                          </div>
                        )}
                        <Badge variant={ann.priority === 'urgent' ? 'danger' : ann.priority === 'important' ? 'warning' : 'primary'} className="text-[8px] px-2 py-0.5 uppercase">
                          {ann.priority}
                        </Badge>
                      </div>
                    </div>
                  }
                  className={cn(
                    "transition-all",
                    !isRead && "ring-2 ring-primary/20 shadow-lg shadow-primary/5",
                    ann.isPinned && "ring-2 ring-warning/20"
                  )}
                >
                  <div className="space-y-4">
                    <p className="text-sm md:text-base text-[var(--text-secondary)] font-medium leading-relaxed whitespace-pre-wrap">
                      {ann.content}
                    </p>

                    {ann.link && (
                      <Button 
                        as="a" 
                        href={ann.link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        variant="secondary"
                        size="sm"
                        className="flex items-center gap-2 w-fit rounded-xl"
                      >
                        <ExternalLink size={14} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">En savoir plus</span>
                      </Button>
                    )}
                  </div>
                </AppCard>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {filteredAnnouncements.length === 0 && (
        <div className="text-center py-16 border-2 border-dashed border-[var(--border-main)] rounded-[32px]">
          <Megaphone size={48} className="mx-auto text-[var(--text-muted)] mb-4"/>
          <h3 className="text-lg font-bold text-[var(--text-main)] tracking-tight">Aucune annonce</h3>
          <p className="text-[var(--text-secondary)] font-medium text-sm mt-1">Il n'y a aucune annonce correspondant à votre recherche.</p>
        </div>
      )}

      {/* New/Edit Announcement Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingAnn ? "Modifier l'annonce" : "Publier une Annonce"}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider ml-1">Titre de l'annonce</label>
              <Input 
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Report du cours de Physique"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider ml-1">Priorité</label>
              <div className="flex gap-2">
                {(['normal', 'important', 'urgent'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setFormData({ ...formData, priority: p })}
                    className={cn(
                      "flex-1 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider border transition-all",
                      formData.priority === p 
                        ? p === 'urgent' ? "bg-danger text-white border-danger" : p === 'important' ? "bg-warning text-white border-warning" : "bg-primary text-white border-primary"
                        : "bg-[var(--bg-main)] text-[var(--text-muted)] border-[var(--border-main)] hover:border-[var(--text-muted)]"
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider ml-1">Contenu de l'annonce</label>
              <textarea 
                required
                rows={5}
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="input-standard resize-none py-3"
                placeholder="Détails de l'annonce..."
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider ml-1">Lien externe (Facultatif)</label>
              <Input 
                type="url"
                value={formData.link}
                onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="flex items-center gap-2 ml-1">
              <input 
                type="checkbox"
                id="isPinned"
                checked={formData.isPinned}
                onChange={(e) => setFormData({ ...formData, isPinned: e.target.checked })}
                className="w-4 h-4 rounded border-[var(--border-main)] text-primary focus:ring-primary"
              />
              <label htmlFor="isPinned" className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider cursor-pointer">Épingler l'annonce</label>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)} className="flex-1">Annuler</Button>
            <Button type="submit" className="flex-1">
              {editingAnn ? "Mettre à jour" : "Publier l'annonce"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
