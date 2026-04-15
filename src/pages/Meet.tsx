import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTable, insertRow, updateRow, deleteRow } from '../lib/hooks';
import { MeetLink, UserRole } from '../types';
import { Badge, Spinner, ErrBox, Modal, ConfirmModal, GlassCard, Button, Input, AppCard, AutoGrid } from '../components/ui';
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
  
  const [formData, setFormData] = useState({
    title: '',
    platform: 'Google Meet' as any,
    url: '',
    time: ''
  });

  const canManage = user?.role === UserRole.ADMIN || user?.role === UserRole.DELEGATE;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingMeet) {
        await updateRow('meetings', editingMeet.id, formData);
      } else {
        await insertRow('meetings', {
          ...formData,
          userId: user?.id,
          className: user?.class_name,
          createdAt: new Date().toISOString()
        });

        if (user?.class_name) {
          await notificationService.notifyClass(
            user.class_name,
            `Nouvelle réunion: ${formData.title}`,
            `Une réunion sur ${formData.platform} est prévue le ${new Date(formData.time).toLocaleString()}.`,
            'info',
            '/meetings'
          );
        }
      }
      setIsModalOpen(false);
      setEditingMeet(null);
      setFormData({ title: '', platform: 'Google Meet', url: '', time: '' });
    } catch (err) {
      console.error(err);
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
          <div className="flex items-center gap-2 text-[var(--text-muted)] mb-1">
            <Badge variant="info" className="text-[10px] font-bold uppercase tracking-wider">Réunions</Badge>
            <ChevronRight size={14} />
            <span className="text-[10px] font-bold uppercase tracking-wider">{user?.class_name || 'Ma Classe'}</span>
          </div>
          <h1 className="text-3xl font-bold text-[var(--text-main)] tracking-tight">Hub de Visioconférence</h1>
          <p className="text-xs font-medium text-[var(--text-secondary)]">
            Accédez aux cours en ligne et aux réunions de votre classe.
          </p>
        </div>
        
        {canManage && (
          <Button 
            onClick={() => { setEditingMeet(null); setFormData({ title: '', platform: 'Google Meet', url: '', time: '' }); setIsModalOpen(true); }}
            className="flex items-center gap-2"
          >
            <Plus size={18} />
            <span className="font-bold uppercase tracking-wider text-xs">Nouveau Lien</span>
          </Button>
        )}
      </div>

      <AutoGrid minWidth="280px">
        <AnimatePresence mode="popLayout">
          {meetings.map((meet) => {
            const timeInfo = formatMeetingTime(meet.time);
            const isFormatted = typeof timeInfo === 'object';

            return (
              <motion.div
                key={meet.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="group h-full"
              >
                <AppCard 
                  className="h-full flex flex-col"
                  header={
                    <div className="flex justify-between items-center w-full">
                      <div className="w-12 h-12 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-card)] flex items-center justify-center p-2.5 shadow-sm group-hover:scale-110 transition-transform">
                        {getPlatformIcon(meet.platform) ? (
                          <img src={getPlatformIcon(meet.platform)!} alt={meet.platform} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                        ) : (
                          <Video className="text-[var(--text-muted)]" size={24} />
                        )}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleShareWhatsApp(meet)} 
                          className="p-2 text-[var(--text-muted)] hover:text-[#25D366] transition-colors"
                          title="Partager sur WhatsApp"
                        >
                          <Share2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleShareEmail(meet)} 
                          className="p-2 text-[var(--text-muted)] hover:text-primary transition-colors"
                          title="Partager par Email"
                        >
                          <Mail size={16} />
                        </button>
                        {canManage && (
                          <>
                            <button onClick={() => handleEdit(meet)} className="p-2 text-[var(--text-muted)] hover:text-primary transition-colors">
                              <Edit2 size={16} />
                            </button>
                            <button onClick={() => handleDelete(meet.id)} className="p-2 text-[var(--text-muted)] hover:text-danger transition-colors">
                              <Trash2 size={16} />
                            </button>
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
                      className="w-full flex items-center justify-center gap-2 rounded-xl"
                    >
                      <ExternalLink size={16} />
                      <span className="font-bold uppercase tracking-wider text-xs">Rejoindre</span>
                    </Button>
                  }
                >
                  <div className="space-y-6">
                    <h3 className="text-lg font-bold text-[var(--text-main)] tracking-tight group-hover:text-primary transition-colors leading-tight">{meet.title}</h3>
                    
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 text-[var(--text-secondary)] text-sm font-medium">
                        <div className="w-8 h-8 rounded-lg bg-[var(--bg-main)] flex items-center justify-center text-primary/60 border border-[var(--border-card)]">
                          <CalendarIcon size={16} />
                        </div>
                        <div className="flex flex-col">
                          {isFormatted ? (
                            <>
                              <span className="font-bold text-[var(--text-main)] text-[10px] uppercase tracking-wider leading-none mb-1">{timeInfo.day}</span>
                              <span className="text-[var(--text-muted)] text-xs">{timeInfo.date}</span>
                            </>
                          ) : (
                            <span>{meet.time}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-[var(--text-secondary)] text-sm font-medium">
                        <div className="w-8 h-8 rounded-lg bg-[var(--bg-main)] flex items-center justify-center text-primary/60 border border-[var(--border-card)]">
                          <Clock size={16} />
                        </div>
                        <div className="flex flex-col">
                          {isFormatted ? (
                            <span className="font-bold text-[var(--text-main)] text-base tracking-tight leading-none">{timeInfo.time}</span>
                          ) : (
                            <span>Horaire non défini</span>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"/>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)]">{meet.platform}</span>
                          </div>
                        </div>
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
        <div className="text-center py-16 border-2 border-dashed border-[var(--border-main)] rounded-[32px]">
          <Video size={48} className="mx-auto text-[var(--text-muted)] mb-4"/>
          <h3 className="text-lg font-bold text-[var(--text-main)] tracking-tight">Aucune réunion</h3>
          <p className="text-[var(--text-secondary)] font-medium text-sm mt-1">Aucun lien de visioconférence n'a été partagé pour le moment.</p>
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
              <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider ml-1">Titre de la réunion</label>
              <Input 
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Cours de Mathématiques"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider ml-1">Plateforme</label>
                <select 
                  value={formData.platform}
                  onChange={(e) => setFormData({ ...formData, platform: e.target.value as any })}
                  className="input-standard"
                >
                  <option value="Google Meet">Google Meet</option>
                  <option value="Zoom">Zoom</option>
                  <option value="Teams">Teams</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider ml-1">Date & Heure</label>
                <input 
                  type="datetime-local"
                  required
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  className="input-standard"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider ml-1">URL de la réunion</label>
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
            >
              Annuler
            </Button>
            <Button 
              type="submit"
              className="flex-1"
            >
              {editingMeet ? "Mettre à jour" : "Enregistrer"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
