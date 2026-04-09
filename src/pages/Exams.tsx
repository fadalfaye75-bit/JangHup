import React, { useState } from 'react';
import { useAuth } from '../../lib/AuthContext';
import { useTable, insertRow, updateRow, deleteRow } from '../../lib/hooks';
import { Exam, UserRole } from '../../types';
import { Card, Badge, SecHdr, Spinner, ErrBox, Btn, Modal, ConfirmModal } from '../../components/ui';
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
  Mail
} from 'lucide-react';
import { fmtDate, daysLeft } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

import { where, orderBy } from 'firebase/firestore';

const ShareButtons = ({ onWhatsApp, onEmail }: { onWhatsApp: () => void, onEmail: () => void }) => {
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <button
        onClick={onWhatsApp}
        style={{
          background: "#25D366",
          color: "white",
          border: "none",
          padding: "6px 10px",
          borderRadius: 8,
          cursor: "pointer",
        }}
      >
        WhatsApp
      </button>

      <button
        onClick={onEmail}
        style={{
          background: "#6C63FF",
          color: "white",
          border: "none",
          padding: "6px 10px",
          borderRadius: 8,
          cursor: "pointer",
        }}
      >
        Email
      </button>
    </div>
  );
};

export const Exams: React.FC = () => {
  const { user } = useAuth();
  const { data: exams, loading, error } = useTable<Exam>(
    'exams',
    [where('className', '==', user?.className || ''), orderBy('date', 'asc')]
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

  const sortedExams = [...exams].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingExam) {
        await updateRow('exams', editingExam.id, formData);
      } else {
        await insertRow('exams', {
          ...formData,
          userId: user?.id,
          className: user?.className
        });
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
      subject: exam.subject,
      date: exam.date,
      duration: exam.duration,
      room: exam.room,
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
    const text = `📚 Examen JangHup\nMatière: ${exam.subject}\nDate: ${fmtDate(exam.date)}\nSalle: ${exam.room}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleShareEmail = (exam: Exam) => {
    const subject = `Examen JangHup: ${exam.subject}`;
    const body = `📚 Examen JangHup\nMatière: ${exam.subject}\nDate: ${fmtDate(exam.date)}\nSalle: ${exam.room}`;
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  const shareScheduleWhatsApp = () => {
    const text = `📅 Emploi du temps JangHup\n\nVoir planning complet: ${window.location.href}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const shareScheduleEmail = () => {
    const subject = `Emploi du temps JangHup`;
    const body = `📅 Emploi du temps JangHup\n\nVoir planning complet: ${window.location.href}`;
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
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
        title="Calendrier des Examens" 
        subtitle="Suivez vos prochaines évaluations"
        action={
          <div className="flex items-center gap-4">
            <ShareButtons onWhatsApp={shareScheduleWhatsApp} onEmail={shareScheduleEmail} />
            {canManage && (
              <Btn onClick={() => { setEditingExam(null); setFormData({ subject: '', date: '', duration: '', room: '', notes: '' }); setIsModalOpen(true); }}>
                <Plus size={20} /> Ajouter un Examen
              </Btn>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
              >
                <Card className={`relative overflow-hidden h-full flex flex-col ${isPast ? 'opacity-60 grayscale' : ''}`}>
                  <div className="flex justify-between items-start mb-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                      isPast ? 'bg-slate-100 text-slate-400' : 
                      left <= 2 ? 'bg-danger/10 text-danger' : 'bg-primary/10 text-primary'
                    }`}>
                      <GraduationCap size={24} />
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => handleShareWhatsApp(exam)} className="p-1.5 text-slate-400 hover:text-[#25D366] transition-colors" title="Partager sur WhatsApp">
                        <Share2 size={16} />
                      </button>
                      <button onClick={() => handleShareEmail(exam)} className="p-1.5 text-slate-400 hover:text-primary transition-colors" title="Partager par Email">
                        <Mail size={16} />
                      </button>
                      {canManage && !isPast && (
                        <>
                          <button onClick={() => handleEdit(exam)} className="p-1.5 text-slate-400 hover:text-primary transition-colors">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => handleDelete(exam.id)} className="p-1.5 text-slate-400 hover:text-danger transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-slate-800 mb-4">{exam.subject}</h3>

                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-3 text-sm text-slate-600 font-medium">
                      <Calendar size={16} className="text-slate-400" />
                      <span>{fmtDate(exam.date)}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-600 font-medium">
                      <Clock size={16} className="text-slate-400" />
                      <span>Durée: {exam.duration}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-600 font-medium">
                      <MapPin size={16} className="text-slate-400" />
                      <span>Salle: {exam.room}</span>
                    </div>
                    {exam.notes && (
                      <div className="flex items-start gap-3 text-sm text-slate-500 italic bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <FileText size={16} className="text-slate-400 mt-0.5 shrink-0" />
                        <span>{exam.notes}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between">
                    <Badge type={isPast ? 'info' : left <= 2 ? 'danger' : 'warning'}>
                      {isPast ? 'Terminé' : `J-${left}`}
                    </Badge>
                    {!isPast && (
                      <div className="flex-1 ml-4 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.max(0, Math.min(100, (10 - left) * 10))}%` }}
                          className={`h-full ${left <= 2 ? 'bg-danger' : 'bg-warning'}`}
                        />
                      </div>
                    )}
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {sortedExams.length === 0 && (
        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
          <Calendar size={48} className="mx-auto text-slate-200 mb-4" />
          <p className="text-slate-400 font-medium">Aucun examen programmé</p>
        </div>
      )}

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingExam ? "Modifier l'examen" : "Ajouter un examen"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Matière</label>
            <input 
              type="text" 
              required
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              className="input"
              placeholder="Ex: Mathématiques"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Date & Heure</label>
              <input 
                type="datetime-local" 
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Durée</label>
              <input 
                type="text" 
                required
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                className="input"
                placeholder="Ex: 2h 30min"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Salle</label>
            <input 
              type="text" 
              required
              value={formData.room}
              onChange={(e) => setFormData({ ...formData, room: e.target.value })}
              className="input"
              placeholder="Ex: Amphi A"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Notes (optionnel)</label>
            <textarea 
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="input resize-none"
              placeholder="Instructions particulières..."
            />
          </div>
          <div className="flex gap-3 pt-4">
            <Btn type="button" variant="secondary" className="flex-1" onClick={() => setIsModalOpen(false)}>Annuler</Btn>
            <Btn type="submit" className="flex-1">{editingExam ? "Enregistrer" : "Ajouter"}</Btn>
          </div>
        </form>
      </Modal>
    </div>
  );
};
