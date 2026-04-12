import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePaginatedTable, deleteRow } from '../../lib/hooks';
import { Notification } from '../../types';
import { useVirtualizer } from '@tanstack/react-virtual';
import { where, orderBy, writeBatch, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Card, Badge, SecHdr, Spinner, ErrBox, Btn, ConfirmModal } from '../../components/ui';
import { Bell, Trash2, CheckCircle2, Clock, Info, AlertTriangle, Share2, Mail } from 'lucide-react';
import { generateSmartShare, shareToWhatsApp, shareToEmail } from '../lib/shareUtils';
import { fmtDate } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const NotificationItem = React.memo<{
  notif: Notification;
  getIcon: (type: string) => React.ReactNode;
  handleShareWhatsApp: (notif: Notification) => void;
  handleShareEmail: (notif: Notification) => void;
  handleDelete: (id: string) => void;
}>(({ notif, getIcon, handleShareWhatsApp, handleShareEmail, handleDelete }) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
    >
      <Card className={`flex gap-4 p-5 border-l-4 group ${notif.isRead ? 'opacity-60' : ''}`} style={{ borderLeftColor: notif.type === 'danger' ? '#FF4757' : notif.type === 'warning' ? '#FFA502' : '#6C63FF' }}>
        <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center shrink-0">
          {getIcon(notif.type)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start mb-1">
            <h3 className="font-bold text-slate-800 dark:text-white">{notif.title}</h3>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <Clock size={10} /> {fmtDate(notif.createdAt)}
            </span>
          </div>
          <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">{notif.message}</p>
        </div>
        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={() => handleShareWhatsApp(notif)}
            className="p-2 text-slate-300 hover:text-[#25D366] transition-colors"
            title="Partager sur WhatsApp"
          >
            <Share2 size={18} />
          </button>
          <button 
            onClick={() => handleShareEmail(notif)}
            className="p-2 text-slate-300 hover:text-primary transition-colors"
            title="Partager par Email"
          >
            <Mail size={18} />
          </button>
          <button 
            onClick={() => handleDelete(notif.id)}
            className="p-2 text-slate-300 hover:text-danger transition-colors"
            title="Supprimer"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </Card>
    </motion.div>
  );
});

export const Notifications: React.FC = () => {
  const { user, classInfo } = useAuth();
  const { 
    data: notifications, 
    loading, 
    error,
    hasMore,
    loadMore,
    loadingMore,
    refetch
  } = usePaginatedTable<Notification>(
    'notifications',
    [where('userId', '==', user?.id || ''), orderBy('createdAt', 'desc')],
    20,
    !!user?.id
  );
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
  const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    setScrollElement(document.getElementById('scroll-container') as HTMLDivElement);
  }, []);

  const rowVirtualizer = useVirtualizer({
    count: notifications.length,
    getScrollElement: () => scrollElement,
    estimateSize: () => 100,
    overscan: 5,
  });

  const handleDelete = (id: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Supprimer la notification',
      message: 'Voulez-vous vraiment supprimer cette notification ?',
      type: 'danger',
      onConfirm: async () => {
        await deleteRow('notifications', id);
        refetch();
      }
    });
  };

  const handleMarkAllAsRead = async () => {
    const unread = notifications.filter(n => !n.isRead);
    if (unread.length === 0) return;

    try {
      const batch = writeBatch(db);
      unread.forEach(notif => {
        const notifRef = doc(db, 'notifications', notif.id);
        batch.update(notifRef, { isRead: true });
      });
      await batch.commit();
      refetch();
    } catch (err) {
      console.error("Error marking all as read:", err);
    }
  };

  const handleShareWhatsApp = (notif: Notification) => {
    const { whatsapp } = generateSmartShare('notification', {
      title: notif.title,
      content: notif.message,
      date: notif.createdAt,
      classEmail: classInfo?.class_email
    });
    shareToWhatsApp(whatsapp);
  };

  const handleShareEmail = (notif: Notification) => {
    const { emailSubject, emailBody, classEmail } = generateSmartShare('notification', {
      title: notif.title,
      content: notif.message,
      date: notif.createdAt,
      classEmail: classInfo?.class_email
    });
    shareToEmail(emailSubject, emailBody, classEmail);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'info': return <Info className="text-info" />;
      case 'success': return <CheckCircle2 className="text-accent" />;
      case 'warning': return <AlertTriangle className="text-warning" />;
      case 'danger': return <AlertTriangle className="text-danger" />;
      case 'reply': return <Share2 className="text-primary" />;
      case 'mention': return <Bell className="text-primary" />;
      default: return <Bell />;
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size={48} /></div>;
  if (error) return <ErrBox message={error} />;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <ConfirmModal 
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig({ ...confirmConfig, isOpen: false })}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        message={confirmConfig.message}
        type={confirmConfig.type}
      />
      <SecHdr 
        title="Centre de Notifications" 
        subtitle="Restez informé des dernières mises à jour"
        action={notifications.some(n => !n.isRead) && (
          <Btn variant="ghost" className="text-slate-400 hover:text-primary" onClick={handleMarkAllAsRead}>
            Tout marquer comme lu
          </Btn>
        )}
      />

      <div className="space-y-4">
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const notif = notifications[virtualRow.index];
            return (
              <div
                key={notif.id}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <NotificationItem
                  notif={notif}
                  getIcon={getIcon}
                  handleShareWhatsApp={handleShareWhatsApp}
                  handleShareEmail={handleShareEmail}
                  handleDelete={handleDelete}
                />
              </div>
            );
          })}
        </div>

        {hasMore && (
          <div className="flex justify-center pt-4">
            <Btn 
              variant="secondary" 
              onClick={loadMore} 
              disabled={loadingMore}
            >
              {loadingMore ? <Spinner size={18} /> : 'Charger plus'}
            </Btn>
          </div>
        )}

        {notifications.length === 0 && (
          <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-slate-800">
            <Bell size={48} className="mx-auto text-slate-200 dark:text-slate-800 mb-4" />
            <p className="text-slate-400 font-medium">Vous n'avez aucune notification</p>
          </div>
        )}
      </div>
    </div>
  );
};

