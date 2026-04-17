import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTable, insertRow, updateRow, deleteRow } from '../lib/hooks';
import { MeetLink, UserRole } from '../types';
import { Badge, Spinner, ErrBox, Modal, ConfirmModal, GlassCard, Button, Input, AppCard, AutoGrid, Avatar } from '../components/ui';
import { 
  Plus, 
  Video, 
  ExternalLink, 
  Clock, 
  Edit2, 
  Trash2,
  Calendar as CalendarIcon,
  Share2,
  Mail,
  ChevronRight
} from 'lucide-react';
import { generateSmartShare, shareToWhatsApp, shareToEmail } from '../lib/shareUtils';
import { motion, AnimatePresence } from 'motion/react';
import { where, orderBy } from 'firebase/firestore';
import { format, parseISO, isValid } from 'date-fns';
import { fr } from 'date-fns/locale';
import { notificationService } from '../services/notificationService';
import { activityService } from '../services/activityService';
import { cn } from '../lib/utils';

export const Meet: React.FC = () => {
  const { user, classInfo } = useAuth();
  const meetConstraints = React.useMemo(() => {
    const constraints: any[] = [orderBy('time', 'asc')];
    if (user?.role !== UserRole.ADMIN) {
      constraints.unshift(where('className', '==', user?.class_name || ''));
    }
    return constraints;
  }, [user?.class_name, user?.role]);

  const { data: meetings, loading, error } = useTable<MeetLink>(
    'meetings',
    meetConstraints,
    50,
    !!user?.class_name || user?.role === 'ADMIN'
  );
  
  const [isModalOpen, setIsModalOpen] = useState(false);
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
  const [editingMeet, setEditingMeet] = useState<MeetLink | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    platform: 'Google Meet' as any,
    url: '',
    time: ''
  });

  const canManage = user?.role === UserRole.ADMIN || user?.role === UserRole.DELEGATE;

  useEffect(() => {
    if (!meetings || !user) return;
    const now = new Date().getTime();
    // Consider meeting expired 12 hours after its scheduled time
    const EXPIRE_MS = 12 * 60 * 60 * 1000;
    meetings.forEach(meet => {
      if (meet.time && new Date(meet.time).getTime() + EXPIRE_MS < now) {
        if (user.role === UserRole.ADMIN || user.id === meet.userId) {
          deleteRow('meetings', meet.id).catch(console.error);
        }
      }
    });
  }, [meetings, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    try {
      if (editingMeet) {
        await updateRow('meetings', editingMeet.id, formData);
      } else {
        await insertRow('meetings', {
          ...formData,
          userId: user?.id,
          authorAvatar: user?.avatar || null,
          className: user?.class_name,
          createdAt: new Date().toISOString()
        });

        // Close modal immediately after DB write
        setIsModalOpen(false);
        setEditingMeet(null);
        setFormData({ title: '', platform: 'Google Meet' as any, url: '', time: '' });
        setSubmitting(false);

        if (user?.class_name) {
          const meetingDate = new Date(formData.time).toLocaleString('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            hour: '2-digit',
            minute: '2-digit'
          });

          const notificationMessage = `Une réunion sur ${formData.platform} est prévue le ${meetingDate}. Lien: ${formData.url}`;

          notificationService.notifyClass(
            user.class_name,
            `Nouvelle réunion: ${formData.title}`,
            notificationMessage,
            'info',
            formData.url // Use the actual meeting URL as the link
          ).catch(err => console.error("Notification error:", err));

          // Also send a message to the Forum in background
          (async () => {
            try {
              const { addDoc, collection, serverTimestamp } = await import('firebase/firestore');
              const { db } = await import('../firebase');
              
              await addDoc(collection(db, 'messages'), {
                text: `📅 **Nouvelle Réunion Planifiée**\n\n**Sujet:** ${formData.title}\n**Plateforme:** ${formData.platform}\n**Date:** ${meetingDate}\n\n🔗 [Rejoindre la réunion](${formData.url})\n\n${formData.url}`,
                type: 'text',
                userId: 'system',
                userName: 'Système',
                userAvatar: null,
                className: user.class_name,
                createdAt: serverTimestamp(),
                readBy: ['system']
              });
            } catch (forumErr) {
              console.error("Error sending meeting message to forum:", forumErr);
            }
          })();
        }

        if (user) {
          activityService.logActivity(
            user,
            `A organisé une réunion: ${formData.title}`,
            'new_meeting',
            'meeting_create'
          ).catch(err => console.error("Activity log error:", err));
        }
        
        return; // Exit early as we already closed the modal
      }
      setIsModalOpen(false);
      setEditingMeet(null);
      setFormData({ title: '', platform: 'Google Meet', url: '', time: '' });
      setSubmitting(false);
    } catch (err) {
      console.error(err);
      setSubmitting(false);
    }
  };

  const handleEdit = (meet: MeetLink) => {
    setEditingMeet(meet);
    setFormData({
      title: meet.title || '',
      platform: meet.platform || 'Google Meet',
      url: meet.url || '',
      time: meet.time || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Supprimer la réunion',
      message: 'Êtes-vous sûr de vouloir supprimer ce lien de réunion ?',
      type: 'danger',
      onConfirm: async () => {
        await deleteRow('meetings', id);
      }
    });
  };

  const handleShareWhatsApp = (meet: MeetLink) => {
    const { whatsapp } = generateSmartShare('reunion', {
      title: meet.title,
      platform: meet.platform,
      url: meet.url,
      date: meet.time,
      className: meet.className,
      classEmail: classInfo?.class_email
    });
    shareToWhatsApp(whatsapp);
  };

  const handleShareEmail = (meet: MeetLink) => {
    const { emailSubject, emailBody, classEmail } = generateSmartShare('reunion', {
      title: meet.title,
      platform: meet.platform,
      url: meet.url,
      date: meet.time,
      className: meet.className,
      classEmail: classInfo?.class_email
    });
    shareToEmail(emailSubject, emailBody, classEmail);
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'Google Meet': return 'https://upload.wikimedia.org/wikipedia/commons/9/9b/Google_Meet_icon_%282020%29.svg';
      case 'Zoom': return 'https://upload.wikimedia.org/wikipedia/commons/9/94/Zoom_Communications_Logo.svg';
      case 'Teams': return 'https://upload.wikimedia.org/wikipedia/commons/c/c9/Microsoft_Office_Teams_%282018%E2%80%93present%29.svg';
      default: return null;
    }
  };

  const formatMeetingTime = (timeStr: string) => {
    try {
      const date = parseISO(timeStr);
      if (!isValid(date)) return timeStr;
      
      const dayName = format(date, 'EEEE', { locale: fr });
      const formattedDate = format(date, 'd MMMM yyyy', { locale: fr });
      const formattedTime = format(date, 'HH:mm');
      
      return {
        day: dayName.charAt(0).toUpperCase() + dayName.slice(1),
        date: formattedDate,
        time: formattedTime
      };
    } catch (e) {
      return timeStr;
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size={48} /></div>;
  if (error) return <ErrBox message={error} />;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 px-4">
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
            <Badge variant="info" className="text-[10px] font-bold uppercase tracking-wider">Réunions</Badge>
            <ChevronRight size={14} />
            <span className="text-[10px] font-bold uppercase tracking-wider">{user?.class_name || 'Ma Classe'}</span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white tracking-tight">Hub de Visioconférence</h1>
          <p className="text-[14px] text-gray-500 dark:text-gray-400">
            Accédez aux cours en ligne et aux réunions de votre classe.
          </p>
        </div>
        
        {canManage && (
          <Button 
            onClick={() => { setEditingMeet(null); setFormData({ title: '', platform: 'Google Meet', url: '', time: '' }); setIsModalOpen(true); }}
            className="flex items-center gap-2"
          >
            <Plus size={18} />
            <span className="text-[13px] font-medium">Nouveau Lien</span>
          </Button>
        )}
      </div>

      <AutoGrid minWidth="280px">
        <AnimatePresence mode="popLayout" initial={false}>
          {meetings.map((meet) => {
            const timeInfo = formatMeetingTime(meet.time);
            const isFormatted = typeof timeInfo === 'object';

            return (
              <motion.div
                key={meet.id}
                layout
                initial={{ opacity: 0, scale: 0.98, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ 
                  type: "spring", 
                  stiffness: 400, 
                  damping: 25,
                  mass: 0.8
                }}
                className="group transform-gpu"
              >
                <AppCard 
                  className="h-full flex flex-col transition-all duration-300"
                  header={
                    <div className="flex justify-between items-start w-full gap-3">
                      <div className="flex items-center gap-2">
                        <Avatar 
                          src={meet.authorAvatar} 
                          name="Délégué" 
                          size="xs" 
                        />
                        <div className="w-8 h-8 rounded-md bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center p-1.5">
                          {getPlatformIcon(meet.platform) ? (
                            <img src={getPlatformIcon(meet.platform)!} alt={meet.platform} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                          ) : (
                            <Video className="text-gray-400" size={16} />
                          )}
                        </div>
                        <h3 className="text-[16px] font-semibold text-gray-900 dark:text-white leading-tight">
                          {meet.title}
                        </h3>
                      </div>
                      <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="sm" onClick={() => handleShareWhatsApp(meet)} className="p-2 h-auto text-gray-600 dark:text-gray-400 hover:text-[#25D366]" title="Partager sur WhatsApp">
                          <Share2 size={16} />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleShareEmail(meet)} className="p-2 h-auto text-gray-600 dark:text-gray-400 hover:text-blue-500" title="Partager par Email">
                          <Mail size={16} />
                        </Button>
                        {canManage && (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(meet)} className="p-2 h-auto text-gray-600 dark:text-gray-400 hover:text-blue-500">
                              <Edit2 size={16} />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(meet.id)} className="p-2 h-auto text-gray-600 dark:text-gray-400 hover:text-danger">
                              <Trash2 size={16} />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  }
                  footer={
                    <Button 
                      as="a"
                      href={meet.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      variant="secondary"
                      size="sm"
                      className="w-full flex items-center justify-center gap-2"
                    >
                      <ExternalLink size={14} />
                      <span>Rejoindre</span>
                    </Button>
                  }
                >
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-[13px] text-gray-600 dark:text-gray-300">
                        <CalendarIcon size={14} className="text-gray-400" />
                        <div className="flex gap-2">
                          {isFormatted ? (
                            <>
                              <span className="text-gray-400">{timeInfo.day}</span>
                              <span className="font-medium">{timeInfo.date}</span>
                            </>
                          ) : (
                            <span>{meet.time}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-[13px] text-gray-600 dark:text-gray-300">
                        <Clock size={14} className="text-gray-400" />
                        <div className="flex items-center gap-2">
                          {isFormatted ? (
                            <span className="font-medium">{timeInfo.time}</span>
                          ) : (
                            <span>Horaire non défini</span>
                          )}
                          <span className="text-gray-300 dark:text-gray-600">•</span>
                          <span className="text-gray-500">{meet.platform}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-[13px] text-gray-600 dark:text-gray-300 pt-1">
                        <ExternalLink size={14} className="text-gray-400 shrink-0" />
                        <a 
                          href={meet.url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-blue-600 dark:text-blue-400 hover:underline truncate font-medium"
                        >
                          {meet.url}
                        </a>
                      </div>
                    </div>
                  </div>
                </AppCard>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </AutoGrid>

      {meetings.length === 0 && (
        <div className="text-center py-16 border border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
          <Video size={40} className="mx-auto text-gray-300 mb-4"/>
          <h3 className="text-[16px] font-semibold text-gray-900 dark:text-white tracking-tight">Aucune réunion</h3>
          <p className="text-[14px] text-gray-500 dark:text-gray-400 mt-1">Aucun lien de visioconférence n'a été partagé pour le moment.</p>
        </div>
      )}

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingMeet ? "Modifier le lien" : "Nouveau lien de réunion"}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider ml-1">Titre de la réunion</label>
              <Input 
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Cours de Mathématiques"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider ml-1">Plateforme</label>
                <select 
                  value={formData.platform}
                  onChange={(e) => setFormData({ ...formData, platform: e.target.value as any })}
                  className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2 text-[14px] outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                >
                  <option value="Google Meet">Google Meet</option>
                  <option value="Zoom">Zoom</option>
                  <option value="Teams">Teams</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider ml-1">Date & Heure</label>
                <input 
                  type="datetime-local"
                  required
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2 text-[14px] outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider ml-1">URL de la réunion</label>
              <Input 
                type="url"
                required
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                placeholder="https://meet.google.com/..."
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button 
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
              className="flex-1"
              disabled={submitting}
            >
              Annuler
            </Button>
            <Button 
              type="submit"
              className="flex-1"
              isLoading={submitting}
            >
              {editingMeet ? "Mettre à jour" : "Enregistrer"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
