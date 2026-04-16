import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTable, insertRow, updateRow, deleteRow } from '../lib/hooks';
import { Exam, UserRole } from '../types';
import { Badge, Spinner, ErrBox, Modal, ConfirmModal, GlassCard, Button, Input, AppCard, AutoGrid, Avatar } from '../components/ui';
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
import { activityService } from '../services/activityService';
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
  const [submitting, setSubmitting] = useState(false);
  
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
    setSubmitting(true);
    try {
      if (editingExam) {
        await updateRow('exams', editingExam.id, formData);
      } else {
        await insertRow('exams', {
          ...formData,
          userId: user?.id,
          authorAvatar: user?.avatar || null,
          className: user?.class_name
        });

        // Close modal immediately
        setIsModalOpen(false);
        setEditingExam(null);
        setFormData({ subject: '', date: '', duration: '', room: '', notes: '' });
        setSubmitting(false);

        if (user?.class_name) {
          notificationService.notifyClass(
            user.class_name,
            `Nouvel examen: ${formData.subject}`,
            `Un examen de ${formData.subject} est prévu le ${new Date(formData.date).toLocaleDateString()}.`,
            'warning',
            '/exams'
          ).catch(err => console.error("Notification error:", err));
        }

        if (user) {
          activityService.logActivity(
            user,
            `A ajouté un examen: ${formData.subject}`,
            'new_exam',
            'exam_create'
          ).catch(err => console.error("Activity log error:", err));
        }
        
        return;
      }
      setIsModalOpen(false);
      setEditingExam(null);
      setFormData({ subject: '', date: '', duration: '', room: '', notes: '' });
      setSubmitting(false);
    } catch (err) {
      console.error(err);
      setSubmitting(false);
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
      url: window.location.origin + '/exams',
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
      url: window.location.origin + '/exams',
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
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <Badge variant="warning" className="text-[10px] font-bold uppercase tracking-wider">Examens</Badge>
            <ChevronRight size={14} />
            <span className="text-[10px] font-bold uppercase tracking-wider">{user?.class_name || 'Ma Classe'}</span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white tracking-tight">Calendrier des Examens</h1>
          <p className="text-[14px] text-gray-500 dark:text-gray-400">
            Consultez et partagez les dates importantes de vos évaluations.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {canManage && (
            <Button 
              onClick={() => { setEditingExam(null); setFormData({ subject: '', date: '', duration: '', room: '', notes: '' }); setIsModalOpen(true); }}
              className="flex items-center gap-2"
            >
              <Plus size={16} />
              <span>Ajouter un examen</span>
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
                    <div className="flex justify-between items-start w-full gap-3">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-8 h-8 rounded-md flex items-center justify-center border",
                          isPast ? "bg-gray-50 text-gray-400 border-gray-200 dark:bg-gray-800 dark:border-gray-700" : 
                          left <= 2 ? "bg-red-50 text-red-500 border-red-100 dark:bg-red-900/20 dark:border-red-800/30" : "bg-amber-50 text-amber-500 border-amber-100 dark:bg-amber-900/20 dark:border-amber-800/30"
                        )}>
                          <GraduationCap size={16} />
                        </div>
                        <h3 className={cn("text-[16px] font-semibold leading-tight", isPast ? "text-gray-500 dark:text-gray-400" : "text-gray-900 dark:text-white")}>
                          {exam.subject}
                        </h3>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="sm" onClick={() => handleShareWhatsApp(exam)} className="px-2 py-1 h-auto text-gray-500 hover:text-[#25D366]">
                          <Share2 size={14} />
                        </Button>
                        {canManage && !isPast && (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(exam)} className="px-2 py-1 h-auto text-gray-500 hover:text-gray-900 dark:hover:text-white">
                              <Edit2 size={14} />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(exam.id)} className="px-2 py-1 h-auto text-gray-500 hover:text-red-500">
                              <Trash2 size={14} />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  }
                  footer={
                    <div className="flex flex-col w-full gap-3">
                      {!isPast && (
                        <div className="w-full h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.max(5, Math.min(100, (14 - left) * 7))}%` }}
                            className={cn("h-full transition-all", left <= 2 ? "bg-red-500" : "bg-amber-500")}
                          />
                        </div>
                      )}
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <Avatar 
                            src={exam.authorAvatar} 
                            name="Délégué" 
                            size="xs" 
                          />
                          <span className="text-[12px] text-gray-500 dark:text-gray-400">{fmtDate(exam.date)}</span>
                        </div>
                        <Badge variant={isPast ? 'secondary' : left <= 2 ? 'danger' : 'warning'}>
                          {isPast ? 'Terminé' : `J-${left}`}
                        </Badge>
                      </div>
                    </div>
                  }
                >
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-[13px] text-gray-600 dark:text-gray-300">
                        <Clock size={14} className="text-gray-400" />
                        <div className="flex gap-2">
                          <span className="text-gray-400">Durée:</span>
                          <span className="font-medium">{exam.duration}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-[13px] text-gray-600 dark:text-gray-300">
                        <MapPin size={14} className="text-gray-400" />
                        <div className="flex gap-2">
                          <span className="text-gray-400">Salle:</span>
                          <span className="font-medium">{exam.room}</span>
                        </div>
                      </div>
                    </div>

                    {exam.notes && (
                      <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 text-[13px] text-gray-600 dark:text-gray-300 leading-relaxed border border-gray-100 dark:border-gray-800 flex gap-2">
                        <FileText size={14} className="shrink-0 text-gray-400 mt-0.5"/>
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
        <div className="text-center py-16 border border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
          <Calendar size={32} className="mx-auto text-gray-400 mb-4"/>
          <h3 className="text-[16px] font-semibold text-gray-900 dark:text-white tracking-tight">Aucun examen</h3>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1">Aucun examen n'a été planifié pour le moment.</p>
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
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider ml-1">Matière</label>
              <Input 
                required
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Ex: Mathématiques"
                className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg py-2.5 px-3 text-[13px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-gray-400"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider ml-1">Date</label>
                <Input 
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg py-2.5 px-3 text-[13px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-gray-400"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider ml-1">Durée</label>
                <Input 
                  required
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  placeholder="Ex: 2h00"
                  className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg py-2.5 px-3 text-[13px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-gray-400"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider ml-1">Salle / Lieu</label>
              <Input 
                required
                value={formData.room}
                onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                placeholder="Ex: Amphi A"
                className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg py-2.5 px-3 text-[13px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-gray-400"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider ml-1">Notes (Facultatif)</label>
              <textarea 
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg py-2.5 px-3 text-[13px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-gray-400 resize-none"
                placeholder="Précisions sur le programme..."
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)} className="flex-1" disabled={submitting}>Annuler</Button>
            <Button type="submit" className="flex-1" isLoading={submitting}>
              {editingExam ? "Mettre à jour" : "Ajouter au calendrier"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
