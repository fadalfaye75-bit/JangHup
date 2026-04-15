import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTable, insertRow, updateRow, deleteRow } from '../lib/hooks';
import { Exam, UserRole } from '../types';
import { Badge, Spinner, ErrBox, Modal, ConfirmModal, GlassCard, Button, Input, AppCard, AutoGrid } from '../components/ui';
import { 
  Plus, 
  Calendar, 
  Clock, 
  MapPin, 
  FileText,
  Edit2,
  Trash2,
  GraduationCap,
  Share2,
  Mail,
  ChevronRight
} from 'lucide-react';
import { generateSmartShare, shareToWhatsApp, shareToEmail } from '../lib/shareUtils';
import { fmtDate, daysLeft, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { notificationService } from '../services/notificationService';
import { where, orderBy } from 'firebase/firestore';

export const Exams: React.FC = () => {
  const { user, classInfo } = useAuth();
  const examConstraints = React.useMemo(() => {
    const constraints: any[] = [orderBy('date', 'asc')];
    if (user?.role !== UserRole.ADMIN) {
      constraints.unshift(where('className', '==', user?.class_name || ''));
    }
    return constraints;
  }, [user?.class_name, user?.role]);

  const { data: exams, loading, error } = useTable<Exam>(
    'exams',
    examConstraints,
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
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  
  const [formData, setFormData] = useState({
    subject: '',
    date: '',
    duration: '',
    room: '',
    notes: ''
  });

  const canManage = user?.role === UserRole.ADMIN || user?.role === UserRole.DELEGATE;

  const sortedExams = [...exams].sort((a, b) => {
    const timeA = new Date(a.date).getTime();
    const timeB = new Date(b.date).getTime();
    return (isNaN(timeA) ? 0 : timeA) - (isNaN(timeB) ? 0 : timeB);
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingExam) {
        await updateRow('exams', editingExam.id, formData);
      } else {
        await insertRow('exams', {
          ...formData,
          userId: user?.id,
          className: user?.class_name
        });

        if (user?.class_name) {
          await notificationService.notifyClass(
            user.class_name,
            `Nouvel examen: ${formData.subject}`,
            `Un examen de ${formData.subject} est prévu le ${new Date(formData.date).toLocaleDateString()}.`,
            'warning',
            '/exams'
          );
        }
      }
      setIsModalOpen(false);
      setEditingExam(null);
      setFormData({ subject: '', date: '', duration: '', room: '', notes: '' });
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = (exam: Exam) => {
    setEditingExam(exam);
    setFormData({
      subject: exam.subject || '',
      date: exam.date || '',
      duration: exam.duration || '',
      room: exam.room || '',
      notes: exam.notes || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Supprimer l\'examen',
      message: 'Êtes-vous sûr de vouloir supprimer cet examen ?',
      type: 'danger',
      onConfirm: async () => {
        await deleteRow('exams', id);
      }
    });
  };

  const handleShareWhatsApp = (exam: Exam) => {
    const { whatsapp } = generateSmartShare('examen', {
      subject: exam.subject,
      date: exam.date,
      room: exam.room,
      duration: exam.duration,
      className: exam.className,
      content: exam.notes,
      classEmail: classInfo?.class_email
    });
    shareToWhatsApp(whatsapp);
  };

  const handleShareEmail = (exam: Exam) => {
    const { emailSubject, emailBody, classEmail } = generateSmartShare('examen', {
      subject: exam.subject,
      date: exam.date,
      room: exam.room,
      duration: exam.duration,
      className: exam.className,
      content: exam.notes,
      classEmail: classInfo?.class_email
    });
    shareToEmail(emailSubject, emailBody, classEmail);
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
            <Badge variant="warning" className="text-[10px] font-bold uppercase tracking-wider">Examens</Badge>
            <ChevronRight size={14} />
            <span className="text-[10px] font-bold uppercase tracking-wider">{user?.class_name || 'Ma Classe'}</span>
          </div>
          <h1 className="text-3xl font-bold text-[var(--text-main)] tracking-tight">Calendrier des Examens</h1>
          <p className="text-xs font-medium text-[var(--text-secondary)]">
            Consultez et partagez les dates importantes de vos évaluations.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {canManage && (
            <Button 
              onClick={() => { setEditingExam(null); setFormData({ subject: '', date: '', duration: '', room: '', notes: '' }); setIsModalOpen(true); }}
              className="flex items-center gap-2"
            >
              <Plus size={18} />
              <span className="font-bold uppercase tracking-wider text-xs">Ajouter un examen</span>
            </Button>
          )}
        </div>
      </div>

      <AutoGrid minWidth="280px">
        <AnimatePresence mode="popLayout">
          {sortedExams.map((exam) => {
            const left = daysLeft(exam.date);
            const isPast = left < 0;
            
            return (
              <motion.div
                key={exam.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="group h-full"
              >
                <AppCard 
                  className={cn("h-full flex flex-col", isPast && "opacity-60")}
                  header={
                    <div className="flex justify-between items-center w-full">
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center border transition-transform group-hover:scale-110",
                        isPast ? "bg-[var(--bg-main)] text-[var(--text-muted)] border-[var(--border-main)]" : 
                        left <= 2 ? "bg-danger/10 text-danger border-danger/10" : "bg-warning/10 text-warning border-warning/10"
                      )}>
                        <GraduationCap size={24} />
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleShareWhatsApp(exam)} className="p-2 text-[var(--text-muted)] hover:text-[#25D366] transition-colors">
                          <Share2 size={16} />
                        </button>
                        {canManage && !isPast && (
                          <>
                            <button onClick={() => handleEdit(exam)} className="p-2 text-[var(--text-muted)] hover:text-primary transition-colors">
                              <Edit2 size={16} />
                            </button>
                            <button onClick={() => handleDelete(exam.id)} className="p-2 text-[var(--text-muted)] hover:text-danger transition-colors">
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  }
                  footer={
                    <div className="space-y-3">
                      {!isPast && (
                        <div className="w-full h-1.5 bg-[var(--bg-main)] rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.max(5, Math.min(100, (14 - left) * 7))}%` }}
                            className={cn("h-full transition-all", left <= 2 ? "bg-danger" : "bg-warning")}
                          />
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{fmtDate(exam.date)}</span>
                        <Badge variant={isPast ? 'secondary' : left <= 2 ? 'danger' : 'warning'} className="text-[8px] px-2 py-0.5 uppercase">
                          {isPast ? 'Terminé' : `J-${left}`}
                        </Badge>
                      </div>
                    </div>
                  }
                >
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-[var(--text-main)] tracking-tight group-hover:text-primary transition-colors leading-tight">{exam.subject}</h3>
                    
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)] font-medium">
                        <div className="w-8 h-8 rounded-lg bg-[var(--bg-main)] flex items-center justify-center text-[var(--text-muted)] border border-[var(--border-card)]">
                          <Clock size={14} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] font-bold uppercase text-[var(--text-muted)]">Durée</span>
                          <span>{exam.duration}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)] font-medium">
                        <div className="w-8 h-8 rounded-lg bg-[var(--bg-main)] flex items-center justify-center text-[var(--text-muted)] border border-[var(--border-card)]">
                          <MapPin size={14} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] font-bold uppercase text-[var(--text-muted)]">Salle</span>
                          <span>{exam.room}</span>
                        </div>
                      </div>
                    </div>

                    {exam.notes && (
                      <div className="p-3 rounded-xl bg-primary/5 text-[11px] text-[var(--text-secondary)] font-medium leading-relaxed border border-primary/10 flex gap-2">
                        <FileText size={14} className="shrink-0 text-primary/40 mt-0.5"/>
                        <p className="line-clamp-3">{exam.notes}</p>
                      </div>
                    )}
                  </div>
                </AppCard>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </AutoGrid>

      {sortedExams.length === 0 && (
        <div className="text-center py-16 border-2 border-dashed border-[var(--border-main)] rounded-[32px]">
          <Calendar size={48} className="mx-auto text-[var(--text-muted)] mb-4"/>
          <h3 className="text-lg font-bold text-[var(--text-main)] tracking-tight">Aucun examen</h3>
          <p className="text-[var(--text-secondary)] font-medium text-sm mt-1">Aucun examen n'a été planifié pour le moment.</p>
        </div>
      )}

      {/* New/Edit Exam Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingExam ? "Modifier l'examen" : "Ajouter un Examen"}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider ml-1">Matière</label>
              <Input 
                required
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Ex: Mathématiques"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider ml-1">Date</label>
                <Input 
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider ml-1">Durée</label>
                <Input 
                  required
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  placeholder="Ex: 2h00"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider ml-1">Salle / Lieu</label>
              <Input 
                required
                value={formData.room}
                onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                placeholder="Ex: Amphi A"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider ml-1">Notes (Facultatif)</label>
              <textarea 
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="input-standard resize-none py-3"
                placeholder="Précisions sur le programme..."
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)} className="flex-1">Annuler</Button>
            <Button type="submit" className="flex-1">
              {editingExam ? "Mettre à jour" : "Ajouter au calendrier"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
