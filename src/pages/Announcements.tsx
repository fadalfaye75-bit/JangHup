import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Announcement, UserRole } from '../types';
import { Badge, Spinner, ErrBox, Modal, ConfirmModal, GlassCard, Button, Input, AppCard, Avatar } from '../components/ui';
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
import { activityService } from '../services/activityService';
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

    setLoading(true);
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
          authorAvatar: user.avatar || null,
          className: user.class_name,
          color: 'primary',
          createdAt: new Date().toISOString()
        });

        // Close modal immediately
        setIsModalOpen(false);
        setEditingAnn(null);
        setFormData({ title: '', content: '', priority: 'normal', link: '', isPinned: false });
        setLoading(false);

        // Run notifications in background
        notificationService.notifyClass(
          user.class_name,
          `Nouvelle annonce: ${formData.title}`,
          formData.content.substring(0, 100) + (formData.content.length > 100 ? '...' : ''),
          formData.priority === 'urgent' ? 'danger' : 'info',
          '/announcements'
        ).catch(err => console.error("Notification error:", err));

        return;
      }
      setIsModalOpen(false);
      setEditingAnn(null);
      setFormData({ title: '', content: '', priority: 'normal', link: '', isPinned: false });
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
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

      // Log activity
      const ann = announcements.find(a => a.id === annId);
      if (ann) {
        await activityService.logActivity(
          user,
          `A lu l'annonce: ${ann.title}`,
          annId,
          'announcement_read'
        );
      }
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
      url: ann.link,
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
      url: ann.link,
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
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <Badge variant="primary" className="text-[10px] font-bold uppercase tracking-wider">Communication</Badge>
            <ChevronRight size={14} />
            <span className="text-[10px] font-bold uppercase tracking-wider">{user?.class_name || 'Ma Classe'}</span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white tracking-tight">Annonces Officielles</h1>
          <p className="text-[14px] text-gray-500 dark:text-gray-400">
            {unreadCount > 0 ? `${unreadCount} nouvelles annonces à lire.` : 'Vous êtes à jour sur toutes les annonces.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <Button variant="secondary" size="sm" onClick={handleMarkAllAsRead} className="text-[13px] font-medium">
              Tout marquer lu
            </Button>
          )}
          {canManage && (
            <Button 
              onClick={() => { setEditingAnn(null); setFormData({ title: '', content: '', priority: 'normal', link: '', isPinned: false }); setIsModalOpen(true); }}
              className="flex items-center gap-2"
            >
              <Plus size={16} />
              <span>Publier</span>
            </Button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        <input 
          type="text"
          placeholder="Rechercher une annonce..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg pl-10 pr-4 py-2.5 text-[13px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-gray-400"
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
                    <div className="flex justify-between items-start w-full gap-3">
                      <div className="flex items-center gap-2">
                        {ann.isPinned ? <Pin size={16} className="text-amber-500 fill-amber-500" /> : <Megaphone size={16} className={cn(!isRead ? "text-blue-500" : "text-gray-400")} />}
                        <h3 className={cn("text-[16px] font-semibold leading-tight", !isRead ? "text-gray-900 dark:text-white" : "text-gray-800 dark:text-gray-200")}>
                          {ann.title}
                        </h3>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="sm" onClick={() => handleShareWhatsApp(ann)} className="px-2 py-1 h-auto text-gray-500 hover:text-[#25D366]">
                          <Share2 size={14} />
                        </Button>
                        {canManage && (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => handleTogglePin(ann)} className={cn("px-2 py-1 h-auto", ann.isPinned ? "text-amber-500" : "text-gray-500 hover:text-amber-500")}>
                              <Pin size={14} />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(ann)} className="px-2 py-1 h-auto text-gray-500 hover:text-gray-900 dark:hover:text-white">
                              <MoreHorizontal size={14} />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(ann.id)} className="px-2 py-1 h-auto text-gray-500 hover:text-red-500">
                              <Trash2 size={14} />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  }
                  footer={
                    <>
                      <div className="flex items-center gap-2">
                        <Avatar 
                          src={ann.authorAvatar} 
                          name={ann.author} 
                          size="xs" 
                        />
                        <span className="text-[12px] text-gray-500 dark:text-gray-400">{ann.author}</span>
                        <span className="text-gray-300 dark:text-gray-600">•</span>
                        <span className="text-[12px] text-gray-500 dark:text-gray-400">{fmtDate(ann.createdAt)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {isRead && (
                          <div className="flex items-center gap-1 text-green-600 text-[12px]">
                            <CheckCircle2 size={12} /> Lu
                          </div>
                        )}
                        <Badge variant={ann.priority === 'urgent' ? 'danger' : ann.priority === 'important' ? 'warning' : 'secondary'}>
                          {ann.priority}
                        </Badge>
                      </div>
                    </>
                  }
                  className={cn(
                    !isRead && "border-blue-200 dark:border-blue-900/50 bg-blue-50/30 dark:bg-blue-900/10",
                    ann.isPinned && "border-amber-200 dark:border-amber-900/50"
                  )}
                >
                  <div className="space-y-3">
                    <p className="text-[14px] text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
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
                        className="flex items-center gap-2 w-fit mt-2"
                      >
                        <ExternalLink size={14} />
                        <span>En savoir plus</span>
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
        <div className="text-center py-16 border border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
          <Megaphone size={32} className="mx-auto text-gray-400 mb-4"/>
          <h3 className="text-[16px] font-semibold text-gray-900 dark:text-white tracking-tight">Aucune annonce</h3>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1">Il n'y a aucune annonce correspondant à votre recherche.</p>
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
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider ml-1">Titre de l'annonce</label>
              <Input 
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Report du cours de Physique"
                className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg py-2.5 px-3 text-[13px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-gray-400"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider ml-1">Priorité</label>
              <div className="flex gap-2">
                {(['normal', 'important', 'urgent'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setFormData({ ...formData, priority: p })}
                    className={cn(
                      "flex-1 py-2 rounded-lg text-[11px] font-semibold uppercase tracking-wider border transition-all",
                      formData.priority === p 
                        ? p === 'urgent' ? "bg-red-500 text-white border-red-500" : p === 'important' ? "bg-amber-500 text-white border-amber-500" : "bg-blue-500 text-white border-blue-500"
                        : "bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider ml-1">Contenu de l'annonce</label>
              <textarea 
                required
                rows={5}
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg py-2.5 px-3 text-[13px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-gray-400 resize-none"
                placeholder="Détails de l'annonce..."
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider ml-1">Lien externe (Facultatif)</label>
              <Input 
                type="url"
                value={formData.link}
                onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                placeholder="https://..."
                className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg py-2.5 px-3 text-[13px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-gray-400"
              />
            </div>
            <div className="flex items-center gap-2 ml-1">
              <input 
                type="checkbox"
                id="isPinned"
                checked={formData.isPinned}
                onChange={(e) => setFormData({ ...formData, isPinned: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
              />
              <label htmlFor="isPinned" className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider cursor-pointer">Épingler l'annonce</label>
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
