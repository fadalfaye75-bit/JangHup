import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTable, insertRow, updateRow, deleteRow } from '../../lib/hooks';
import { MeetLink, UserRole } from '../../types';
import { Card, Badge, SecHdr, Spinner, ErrBox, Btn, Modal, ConfirmModal } from '../../components/ui';
import { 
  Plus, 
  Video, 
  ExternalLink, 
  Clock, 
  Edit2, 
  Trash2,
  Monitor,
  Calendar as CalendarIcon,
  Share2,
  Mail
} from 'lucide-react';
import { generateSmartShare, shareToWhatsApp, shareToEmail } from '../lib/shareUtils';
import { motion, AnimatePresence } from 'motion/react';
import { where, orderBy } from 'firebase/firestore';
import { format, parseISO, isValid } from 'date-fns';
import { fr } from 'date-fns/locale';
import { notificationService } from '../services/notificationService';

import { GlassCard } from '../components/ui/GlassCard';

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

        // Notify all students in the class
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
    <div className="max-w-7xl mx-auto px-4 pb-20 space-y-12">
      <ConfirmModal 
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig({ ...confirmConfig, isOpen: false })}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        message={confirmConfig.message}
        type={confirmConfig.type}
      />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        <div className="space-y-1">
          <h1 className="heading-futuristic">Hub Virtuel</h1>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
            Sessions de streaming et visioconférences en direct
          </p>
        </div>
        
        {canManage && (
          <button 
            onClick={() => { setEditingMeet(null); setFormData({ title: '', platform: 'Google Meet', url: '', time: '' }); setIsModalOpen(true); }}
            className="btn-futuristic-primary px-10 py-4 flex items-center gap-3 self-start lg:self-center"
          >
            <Plus size={20} />
            <span className="font-black uppercase tracking-widest text-xs">Nouveau Lien</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        <AnimatePresence mode="popLayout">
          {meetings.map((meet) => {
            const timeInfo = formatMeetingTime(meet.time);
            const isFormatted = typeof timeInfo === 'object';

            return (
              <motion.div
                key={meet.id}
                layout
                initial={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
                transition={{ type: "spring", stiffness: 200, damping: 25 }}
                className="group"
              >
                <GlassCard className="flex flex-col h-full p-0 overflow-hidden border-white/5 hover:border-primary/30 transition-all duration-500" tilt={true}>
                  <div className="p-8 flex justify-between items-start border-b border-white/5 relative z-10">
                    <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center p-4 border border-white/10 shadow-inner group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(108,99,255,0.2)] transition-all duration-500">
                      {getPlatformIcon(meet.platform) ? (
                        <img src={getPlatformIcon(meet.platform)!} alt={meet.platform} className="w-full h-full object-contain" loading="lazy" />
                      ) : (
                        <Video className="text-slate-500" size={28} />
                      )}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <button 
                        onClick={() => handleShareWhatsApp(meet)} 
                        className="p-2.5 bg-white/5 hover:bg-white/10 text-slate-500 hover:text-[#25D366] rounded-xl transition-all" 
                        title="Partager sur WhatsApp"
                      >
                        <Share2 size={18} />
                      </button>
                      <button 
                        onClick={() => handleShareEmail(meet)} 
                        className="p-2.5 bg-white/5 hover:bg-white/10 text-slate-500 hover:text-primary rounded-xl transition-all" 
                        title="Partager par Email"
                      >
                        <Mail size={18} />
                      </button>
                      {canManage && (
                        <>
                          <button onClick={() => handleEdit(meet)} className="p-2.5 bg-white/5 hover:bg-white/10 text-slate-500 hover:text-primary rounded-xl transition-all">
                            <Edit2 size={18} />
                          </button>
                          <button onClick={() => handleDelete(meet.id)} className="p-2.5 bg-white/5 hover:bg-white/10 text-slate-500 hover:text-danger rounded-xl transition-all">
                            <Trash2 size={18} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="p-8 flex-1 relative z-10">
                    <h3 className="text-2xl font-black text-white mb-6 tracking-tight group-hover:text-primary transition-colors duration-500">{meet.title}</h3>
                    
                    <div className="space-y-4">
                      <div className="flex items-center gap-4 text-slate-400 text-sm font-medium">
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 shadow-inner">
                          <CalendarIcon size={16} className="text-primary" />
                        </div>
                        <div className="flex flex-col">
                          {isFormatted ? (
                            <>
                              <span className="font-black text-white uppercase tracking-widest text-[10px] leading-none mb-1">{timeInfo.day}</span>
                              <span className="text-slate-500 text-xs">{timeInfo.date}</span>
                            </>
                          ) : (
                            <span>{meet.time}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-slate-400 text-sm font-medium">
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 shadow-inner">
                          <Clock size={16} className="text-primary" />
                        </div>
                        <div className="flex flex-col">
                          {isFormatted ? (
                            <span className="font-black text-white text-lg tracking-tighter leading-none">{timeInfo.time}</span>
                          ) : (
                            <span>Horaire non défini</span>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">{meet.platform}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-8 pt-0 relative z-10">
                    <a 
                      href={meet.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="btn-futuristic-primary w-full py-5 flex items-center justify-center gap-3 group/btn relative overflow-hidden"
                    >
                      <span className="font-black uppercase tracking-widest text-xs relative z-10">Initialiser la Connexion</span>
                      <ExternalLink size={18} className="relative z-10 group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
                      <motion.div 
                        animate={{ x: ['-100%', '100%'] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none"
                      />
                    </a>
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {meetings.length === 0 && (
        <div className="text-center py-24 glass-ultra rounded-[40px] border-2 border-dashed border-white/5">
          <Monitor size={64} className="mx-auto text-slate-700 mb-6" />
          <h3 className="text-xl font-black text-white tracking-tight">Aucune session active</h3>
          <p className="text-slate-500 font-medium mt-2">Le hub virtuel est actuellement en veille.</p>
        </div>
      )}

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingMeet ? "Modifier la session" : "Nouvelle session"}
      >
        <form onSubmit={handleSubmit} className="space-y-8 p-2">
          <div className="space-y-3">
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-3 ml-1">Titre de la réunion</label>
            <input 
              type="text" 
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl outline-none focus:ring-2 focus:ring-primary/50 transition-all text-white font-medium placeholder:text-slate-600"
              placeholder="Ex: Cours de Programmation Web"
            />
          </div>
          <div className="space-y-3">
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-3 ml-1">Plateforme</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {(['Google Meet', 'Zoom', 'Teams', 'Autre'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setFormData({ ...formData, platform: p })}
                  className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-500 ${
                    formData.platform === p 
                      ? 'border-primary bg-primary/10 text-primary shadow-[0_0_15px_rgba(108,99,255,0.2)]' 
                      : 'border-white/5 bg-white/5 text-slate-500 hover:border-white/10'
                  }`}
                >
                  <span className="text-[10px] font-black uppercase tracking-widest">{p}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-3 ml-1">Lien URL</label>
            <input 
              type="url" 
              required
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl outline-none focus:ring-2 focus:ring-primary/50 transition-all text-white font-medium placeholder:text-slate-600"
              placeholder="https://meet.google.com/..."
            />
          </div>
          <div className="space-y-3">
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-3 ml-1">Date et Heure</label>
            <input 
              type="datetime-local" 
              required
              value={formData.time}
              onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl outline-none focus:ring-2 focus:ring-primary/50 transition-all text-white font-medium"
            />
          </div>
          <div className="flex gap-4 pt-4">
            <button 
              type="button" 
              className="flex-1 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors"
              onClick={() => setIsModalOpen(false)}
            >
              Annuler
            </button>
            <button type="submit" className="btn-futuristic-primary flex-1 py-5">
              <span className="font-black uppercase tracking-widest text-xs">
                {editingMeet ? "Enregistrer" : "Activer le lien"}
              </span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
