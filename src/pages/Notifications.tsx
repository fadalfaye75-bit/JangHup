import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePaginatedTable, deleteRow } from '../lib/hooks';
import { Notification } from '../types';
import { useVirtualizer } from '@tanstack/react-virtual';
import { where, orderBy, writeBatch, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { GlassCard, Badge, Spinner, ErrBox, ConfirmModal, Button } from '../components/ui';
import { Bell, Trash2, CheckCircle2, Clock, Info, AlertTriangle, Share2, Mail, ChevronRight, ExternalLink } from 'lucide-react';
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
      initial={{ opacity: 0, scale: 0.98, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -10 }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      transition={{ 
        type: "spring", 
        stiffness: 400, 
        damping: 25,
        mass: 0.8
      }}
      className="mb-3 transform-gpu"
    >
      <div className={cn(
        "flex gap-4 p-4 rounded-xl border transition-all duration-300 group bg-white dark:bg-gray-900 cursor-pointer shadow-sm hover:shadow-md",
        notif.isRead 
          ? 'border-gray-200 dark:border-gray-800 opacity-60' 
          : 'border-blue-200 dark:border-blue-900/50'
      )}>
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center shrink-0 border",
          notif.type === 'danger' ? 'bg-red-50 text-red-500 border-red-100 dark:bg-red-900/20 dark:border-red-800/30' :
          notif.type === 'warning' ? 'bg-amber-50 text-amber-500 border-amber-100 dark:bg-amber-900/20 dark:border-amber-800/30' :
          notif.type === 'success' ? 'bg-emerald-50 text-emerald-500 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800/30' :
          'bg-blue-50 text-blue-500 border-blue-100 dark:bg-blue-900/20 dark:border-blue-800/30'
        )}>
          {getIcon(notif.type)}
        </div>
        <div className="flex-1 min-w-0 py-0.5">
          <div className="flex justify-between items-start mb-1">
            <h3 className={cn("font-semibold text-[14px]", notif.isRead ? "text-gray-700 dark:text-gray-300" : "text-gray-900 dark:text-white")}>{notif.title}</h3>
            <span className="text-[12px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <Clock size={12} /> {fmtDate(notif.createdAt)}
            </span>
          </div>
          <p className="text-[13px] text-gray-600 dark:text-gray-400 leading-relaxed">{notif.message}</p>
          {notif.link && (
            <div className="mt-3">
              {notif.link.startsWith('http') ? (
                <Button 
                  as="a" 
                  href={notif.link} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  variant="secondary" 
                  size="sm" 
                  className="inline-flex items-center gap-2 text-[12px]"
                >
                  <ExternalLink size={14} />
                  Ouvrir le lien
                </Button>
              ) : (
                <Button 
                  as="a" 
                  href={notif.link} 
                  variant="secondary" 
                  size="sm" 
                  className="inline-flex items-center gap-2 text-[12px]"
                >
                  <ChevronRight size={14} />
                  Voir les détails
                </Button>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={() => handleShareWhatsApp(notif)}
            className="p-1.5 text-gray-400 hover:text-[#25D366] transition-colors rounded-md hover:bg-gray-50 dark:hover:bg-gray-800"
            title="Partager sur WhatsApp"
          >
            <Share2 size={14} />
          </button>
          <button 
            onClick={() => handleDelete(notif.id)}
            className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded-md hover:bg-red-50 dark:hover:bg-red-900/20"
            title="Supprimer"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
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
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <Badge variant="primary" className="text-[10px] font-bold uppercase tracking-wider">Centre d'alertes</Badge>
            <ChevronRight size={14} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Notifications</span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white tracking-tight">Vos Notifications</h1>
          <p className="text-[14px] text-gray-500 dark:text-gray-400">
            Restez informé des activités importantes de votre classe.
          </p>
        </div>
        {notifications.some(n => !n.isRead) && (
          <Button variant="secondary" size="sm" onClick={handleMarkAllAsRead} className="text-[13px] font-medium">
            Tout marquer comme lu
          </Button>
        )}
      </div>

      <div className="space-y-1">
        <AnimatePresence mode="popLayout" initial={false}>
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
          <div className="text-center py-16 border border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
            <Bell size={32} className="mx-auto text-gray-400 mb-4"/>
            <h3 className="text-[16px] font-semibold text-gray-900 dark:text-white tracking-tight">Aucune notification</h3>
            <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1">Vous êtes à jour ! Aucune nouvelle notification pour le moment.</p>
          </div>
        )}
      </div>
    </div>
  );
};
