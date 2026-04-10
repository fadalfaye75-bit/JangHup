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
import { motion, AnimatePresence } from 'motion/react';
import { where, orderBy } from 'firebase/firestore';
import { format, parseISO, isValid } from 'date-fns';
import { fr } from 'date-fns/locale';

export const Meet: React.FC = () => {
  const { user } = useAuth();
  const { data: meetings, loading, error } = useTable<MeetLink>(
    'meetings',
    [where('className', '==', user?.class_name || ''), orderBy('time', 'asc')],
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
    <div className="space-y-6">
      <ConfirmModal 
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig({ ...confirmConfig, isOpen: false })}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        message={confirmConfig.message}
        type={confirmConfig.type}
      />
      <SecHdr 
        title="Réunions & Cours en Ligne" 
        subtitle="Accédez à vos sessions virtuelles"
        action={canManage && (
          <Btn onClick={() => { setEditingMeet(null); setFormData({ title: '', platform: 'Google Meet', url: '', time: '' }); setIsModalOpen(true); }}>
            <Plus size={20} /> Nouveau Lien
          </Btn>
        )}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {meetings.map((meet) => {
            const timeInfo = formatMeetingTime(meet.time);
            const isFormatted = typeof timeInfo === 'object';

            return (
              <motion.div
                key={meet.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <Card className="flex flex-col h-full group relative overflow-hidden">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-white/5 flex items-center justify-center p-2.5">
                      {getPlatformIcon(meet.platform) ? (
                        <img src={getPlatformIcon(meet.platform)!} alt={meet.platform} className="w-full h-full object-contain" loading="lazy" />
                      ) : (
                        <Video className="text-slate-400" size={24} />
                      )}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => {
                        const text = `🤝 Réunion JangHup\nTitre: ${meet.title}\nDate: ${meet.time}\nLien: ${meet.url}`;
                        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                      }} className="p-1.5 text-slate-400 hover:text-[#25D366] transition-colors" title="Partager sur WhatsApp">
                        <Share2 size={16} />
                      </button>
                      <button onClick={() => {
                        const subject = `Réunion JangHup: ${meet.title}`;
                        const body = `🤝 Réunion JangHup\nTitre: ${meet.title}\nDate: ${meet.time}\nLien: ${meet.url}`;
                        window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
                      }} className="p-1.5 text-slate-400 hover:text-primary transition-colors" title="Partager par Email">
                        <Mail size={16} />
                      </button>
                      {canManage && (
                        <>
                          <button onClick={() => handleEdit(meet)} className="p-1.5 text-slate-400 hover:text-primary transition-colors">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => handleDelete(meet.id)} className="p-1.5 text-slate-400 hover:text-danger transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">{meet.title}</h3>
                  
                  <div className="space-y-2 mb-6">
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm font-medium">
                      <CalendarIcon size={16} className="text-primary" />
                      {isFormatted ? (
                        <span><span className="font-bold text-slate-700 dark:text-slate-200">{timeInfo.day}</span> {timeInfo.date}</span>
                      ) : (
                        <span>{meet.time}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm font-medium">
                      <Clock size={16} className="text-primary" />
                      {isFormatted ? (
                        <span>{timeInfo.time}</span>
                      ) : (
                        <span>Horaire non défini</span>
                      )}
                      <span className="mx-1">•</span>
                      <Badge type="info">{meet.platform}</Badge>
                    </div>
                  </div>

                  <div className="mt-auto">
                    <a 
                      href={meet.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="btn btn-primary w-full py-3 gap-2 shadow-lg shadow-primary/20"
                    >
                      Rejoindre <ExternalLink size={18} />
                    </a>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {meetings.length === 0 && (
        <div className="text-center py-20 bg-white dark:bg-white/5 rounded-2xl border border-dashed border-slate-200 dark:border-white/10">
          <Monitor size={48} className="mx-auto text-slate-200 dark:text-white/10 mb-4" />
          <p className="text-slate-400 dark:text-slate-500 font-medium">Aucune réunion programmée</p>
        </div>
      )}

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingMeet ? "Modifier le lien" : "Ajouter un lien"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Titre de la réunion</label>
            <input 
              type="text" 
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="input"
              placeholder="Ex: Cours de Programmation Web"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Plateforme</label>
            <select 
              value={formData.platform}
              onChange={(e) => setFormData({ ...formData, platform: e.target.value as any })}
              className="input"
            >
              <option value="Google Meet">Google Meet</option>
              <option value="Zoom">Zoom</option>
              <option value="Teams">Teams</option>
              <option value="Autre">Autre</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Lien URL</label>
            <input 
              type="url" 
              required
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              className="input"
              placeholder="https://meet.google.com/..."
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Date et Heure</label>
            <input 
              type="datetime-local" 
              required
              value={formData.time}
              onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              className="input"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <Btn type="button" variant="secondary" className="flex-1" onClick={() => setIsModalOpen(false)}>Annuler</Btn>
            <Btn type="submit" className="flex-1">{editingMeet ? "Enregistrer" : "Ajouter"}</Btn>
          </div>
        </form>
      </Modal>
    </div>
  );
};
