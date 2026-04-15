import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePaginatedTable, deleteRow } from '../lib/hooks';
import { Notification } from '../types';
import { useVirtualizer } from '@tanstack/react-virtual';
import { where, orderBy, writeBatch, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { GlassCard, Badge, Spinner, ErrBox, ConfirmModal, Button } from '../components/ui';
import { Bell, Trash2, CheckCircle2, Clock, Info, AlertTriangle, Share2, Mail, ChevronRight } from 'lucide-react';
import { generateSmartShare, shareToWhatsApp, shareToEmail } from '../lib/shareUtils';
import { fmtDate } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="mb-4"
    >
      <GlassCard className={cn(
        "flex gap-4 p-5 border-l-4 group transition-all",
        notif.isRead ? 'opacity-60' : 'shadow-md border-primary'
      )} style={{ borderLeftColor: notif.type === 'danger' ? '#FF4757' : notif.type === 'warning' ? '#FFA502' : 'var(--primary)' }}>
        <div className="w-12 h-12 rounded-2xl bg-[var(--bg-main)] border border-[var(--border-main)] flex items-center justify-center shrink-0 shadow-sm">
          {getIcon(notif.type)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start mb-1">
            <h3 className="font-bold text-[var(--text-main)] text-sm">{notif.title}</h3>
            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1">
              <Clock size={10} /> {fmtDate(notif.createdAt)}
            </span>
          </div>
          <p className="text-[var(--text-secondary)] text-xs font-medium leading-relaxed">{notif.message}</p>
        </div>
        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={() => handleShareWhatsApp(notif)}
            className="p-2 text-[var(--text-muted)] hover:text-[#25D366] transition-colors"
            title="Partager sur WhatsApp"
          >
            <Share2 size={16} />
          </button>
          <button 
            onClick={() => handleShareEmail(notif)}
            className="p-2 text-[var(--text-muted)] hover:text-primary transition-colors"
            title="Partager par Email"
          >
            <Mail size={16} />
          </button>
          <button 
            onClick={() => handleDelete(notif.id)}
            className="p-2 text-[var(--text-muted)] hover:text-danger transition-colors"
            title="Supprimer"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </GlassCard>
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
      case 'info': return <Info size={20} className="text-primary"/>;
      case 'success': return <CheckCircle2 size={20} className="text-success"/>;
      case 'warning': return <AlertTriangle size={20} className="text-warning"/>;
      case 'danger': return <AlertTriangle size={20} className="text-danger"/>;
      case 'reply': return <Share2 size={20} className="text-primary"/>;
      case 'mention': return <Bell size={20} className="text-primary"/>;
      default: return <Bell size={20} />;
    }
  };

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
            <Badge variant="primary" className="text-[10px] font-bold uppercase tracking-wider">Centre d'alertes</Badge>
            <ChevronRight size={14} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Notifications</span>
          </div>
          <h1 className="text-3xl font-bold text-[var(--text-main)] tracking-tight">Vos Notifications</h1>
          <p className="text-xs font-medium text-[var(--text-secondary)]">
            Restez informé des activités importantes de votre classe.
          </p>
        </div>
        {notifications.some(n => !n.isRead) && (
          <Button variant="secondary" size="sm" onClick={handleMarkAllAsRead} className="text-[10px] font-bold uppercase tracking-wider">
            Tout marquer comme lu
          </Button>
        )}
      </div>

      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {notifications.map((notif) => (
            <NotificationItem
              key={notif.id}
              notif={notif}
              getIcon={getIcon}
              handleShareWhatsApp={handleShareWhatsApp}
              handleShareEmail={handleShareEmail}
              handleDelete={handleDelete}
            />
          ))}
        </AnimatePresence>

        {hasMore && (
          <div className="flex justify-center pt-4">
            <Button 
              variant="secondary"
              onClick={loadMore} 
              isLoading={loadingMore}
              className="px-8"
            >
              Charger plus
            </Button>
          </div>
        )}

        {notifications.length === 0 && (
          <div className="text-center py-20 border-2 border-dashed border-[var(--border-main)] rounded-[32px]">
            <Bell size={48} className="mx-auto text-[var(--text-muted)] mb-4"/>
            <h3 className="text-lg font-bold text-[var(--text-main)] tracking-tight">Aucune notification</h3>
            <p className="text-[var(--text-secondary)] font-medium text-sm mt-1">Vous êtes à jour ! Aucune nouvelle notification pour le moment.</p>
          </div>
        )}
      </div>
    </div>
  );
};
