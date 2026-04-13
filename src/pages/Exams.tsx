import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTable, insertRow, updateRow, deleteRow } from '../../lib/hooks';
import { Exam, UserRole } from '../../types';
import { Card, Badge, SecHdr, Spinner, ErrBox, Btn, Modal, ConfirmModal } from '../../components/ui';
import { GlassCard } from '../components/ui/GlassCard';
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
import { generateSmartShare, shareToWhatsApp, shareToEmail } from '../lib/shareUtils';
import { fmtDate, daysLeft } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { notificationService } from '../services/notificationService';

import { where, orderBy } from 'firebase/firestore';

const ShareButtons = ({ onWhatsApp, onEmail }: { onWhatsApp: () => void, onEmail: () => void }) => {
 return (
 <div style={{ display:"flex", gap: 8 }}>
 <button
 onClick={onWhatsApp}
 style={{
 background:"#25D366",
 color:"white",
 border:"none",
 padding:"6px 10px",
 borderRadius: 8,
 cursor:"pointer",
 }}
 >
 WhatsApp
 </button>

 <button
 onClick={onEmail}
 style={{
 background:"#6C63FF",
 color:"white",
 border:"none",
 padding:"6px 10px",
 borderRadius: 8,
 cursor:"pointer",
 }}
 >
 Email
 </button>
 </div>
 );
};

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

 // Notify all students in the class
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

 const shareScheduleWhatsApp = () => {
 const text = `📅 Emploi du temps JangHup\n\nVoir planning complet: ${window.location.href}`;
 window.open(`https://wa.me/?text=${encodeURIComponent(text)}`,"_blank");
 };

 const shareScheduleEmail = () => {
 const subject = `Emploi du temps JangHup`;
 const body = `📅 Emploi du temps JangHup\n\nVoir planning complet: ${window.location.href}`;
 window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
 };

 if (loading) return <div className="flex justify-center py-20"><Spinner size={48} /></div>;
 if (error) return <ErrBox message={error} />;

 return (
 <div className="space-y-10 pb-20">
 <ConfirmModal 
 isOpen={confirmConfig.isOpen}
 onClose={() => setConfirmConfig({ ...confirmConfig, isOpen: false })}
 onConfirm={confirmConfig.onConfirm}
 title={confirmConfig.title}
 message={confirmConfig.message}
 type={confirmConfig.type}
 />
 
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-4 md:px-0">
 <div className="space-y-1">
 <h1 className="heading-futuristic">Chronologie des Évaluations</h1>
 <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-secondary)]">
 Planification stratégique des examens
 </p>
 </div>
 <div className="flex items-center gap-4">
 <div className="flex items-center gap-2 glass-ultra p-2 rounded-2xl border border-[var(--glass-border)]">
 <button
 onClick={shareScheduleWhatsApp}
 className="p-3 bg-[#25D366]/10 text-[#25D366] rounded-xl hover:bg-[#25D366] hover:text-[var(--text-main)] transition-all"
 title="Diffuser sur WhatsApp"
 >
 <Share2 size={18} />
 </button>
 <button
 onClick={shareScheduleEmail}
 className="p-3 bg-primary/10 text-primary rounded-xl hover:bg-primary hover:text-[var(--text-main)] transition-all"
 title="Diffuser par Email"
 >
 <Mail size={18} />
 </button>
 </div>
 {canManage && (
 <button 
 onClick={() => { setEditingExam(null); setFormData({ subject: '', date: '', duration: '', room: '', notes: '' }); setIsModalOpen(true); }}
 className="btn-futuristic-primary px-6 py-4 flex items-center gap-3"
 >
 <Plus size={20} />
 <span className="font-black uppercase tracking-widest text-xs">Nouvel Examen</span>
 </button>
 )}
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 px-4 md:px-0">
 <AnimatePresence mode="popLayout">
 {sortedExams.map((exam) => {
 const left = daysLeft(exam.date);
 const isPast = left < 0;
 
 return (
 <motion.div
 key={exam.id}
 layout
 initial={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
 animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
 exit={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
 transition={{ type:"spring", stiffness: 200, damping: 25 }}
 >
 <GlassCard className={`relative overflow-hidden h-full flex flex-col group border-[var(--glass-border)] hover:border-primary/30 transition-all duration-500 ${isPast ? 'opacity-40 grayscale' : ''}`} tilt={true}>
 <div className="flex justify-between items-start mb-6 relative z-10">
 <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border border-[var(--glass-border)] ${
 isPast ? 'bg-[var(--glass-bg)] text-[var(--text-secondary)]' : 
 left <= 2 ? 'bg-danger/20 text-danger shadow-[0_0_20px_rgba(255,71,87,0.3)]' : 'bg-primary/20 text-primary shadow-[0_0_20px_rgba(108,99,255,0.3)]'
 }`}>
 <GraduationCap size={28} />
 </div>
 <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
 <button onClick={() => handleShareWhatsApp(exam)} className="p-2.5 bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)] text-[var(--text-secondary)] hover:text-[#25D366] rounded-xl transition-all">
 <Share2 size={18} />
 </button>
 <button onClick={() => handleShareEmail(exam)} className="p-2.5 bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)] text-[var(--text-secondary)] hover:text-primary rounded-xl transition-all">
 <Mail size={18} />
 </button>
 {canManage && !isPast && (
 <>
 <button onClick={() => handleEdit(exam)} className="p-2.5 bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)] text-[var(--text-secondary)] hover:text-primary rounded-xl transition-all">
 <Edit2 size={18} />
 </button>
 <button onClick={() => handleDelete(exam.id)} className="p-2.5 bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)] text-[var(--text-secondary)] hover:text-danger rounded-xl transition-all">
 <Trash2 size={18} />
 </button>
 </>
 )}
 </div>
 </div>

 <h3 className="text-xl font-black text-[var(--text-main)] mb-6 tracking-tight group-hover:text-primary transition-colors duration-500 relative z-10">{exam.subject}</h3>

 <div className="space-y-4 flex-1 relative z-10">
 <div className="flex items-center gap-4 text-sm text-[var(--text-secondary)] font-medium group-hover:text-[var(--text-main)] transition-colors">
 <div className="w-8 h-8 rounded-lg bg-[var(--glass-bg)] flex items-center justify-center text-[var(--text-secondary)] group-hover:text-primary transition-colors border border-[var(--glass-border)]">
 <Calendar size={16} />
 </div>
 <span className="tracking-tight">{fmtDate(exam.date)}</span>
 </div>
 <div className="flex items-center gap-4 text-sm text-[var(--text-secondary)] font-medium group-hover:text-[var(--text-main)] transition-colors">
 <div className="w-8 h-8 rounded-lg bg-[var(--glass-bg)] flex items-center justify-center text-[var(--text-secondary)] group-hover:text-primary transition-colors border border-[var(--glass-border)]">
 <Clock size={16} />
 </div>
 <span className="tracking-tight">Durée: {exam.duration}</span>
 </div>
 <div className="flex items-center gap-4 text-sm text-[var(--text-secondary)] font-medium group-hover:text-[var(--text-main)] transition-colors">
 <div className="w-8 h-8 rounded-lg bg-[var(--glass-bg)] flex items-center justify-center text-[var(--text-secondary)] group-hover:text-primary transition-colors border border-[var(--glass-border)]">
 <MapPin size={16} />
 </div>
 <span className="tracking-tight">Localisation: {exam.room}</span>
 </div>
 {exam.notes && (
 <div className="mt-4 p-4 rounded-2xl bg-[var(--glass-bg)] border border-[var(--glass-border)] text-xs text-[var(--text-secondary)] italic font-medium leading-relaxed group-hover:border-primary/20 transition-all">
 <div className="flex gap-3">
 <FileText size={14} className="shrink-0 text-primary opacity-50"/>
 <span>{exam.notes}</span>
 </div>
 </div>
 )}
 </div>

 <div className="mt-8 pt-6 border-t border-[var(--glass-border)] flex items-center justify-between relative z-10">
 <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] ${
 isPast ? 'bg-[var(--glass-bg)] text-[var(--text-secondary)]' : 
 left <= 2 ? 'bg-danger/20 text-danger' : 'bg-warning/20 text-warning'
 }`}>
 {isPast ? 'Archives' : `Impact dans ${left} Jours`}
 </div>
 {!isPast && (
 <div className="flex-1 ml-6 h-1 bg-[var(--glass-bg)] rounded-full overflow-hidden">
 <motion.div 
 initial={{ width: 0 }}
 animate={{ width: `${Math.max(0, Math.min(100, (10 - left) * 10))}%` }}
 className={`h-full shadow-[0_0_10px_currentColor] ${left <= 2 ? 'bg-danger text-danger' : 'bg-warning text-warning'}`}
 />
 </div>
 )}
 </div>
 </GlassCard>
 </motion.div>
 );
 })}
 </AnimatePresence>
 </div>

 {sortedExams.length === 0 && (
 <div className="text-center py-24 glass-ultra rounded-[40px] border-2 border-dashed border-[var(--glass-border)] mx-4 md:mx-0">
 <Calendar size={64} className="mx-auto text-[var(--text-main)] mb-6"/>
 <h3 className="text-xl font-black text-[var(--text-main)] tracking-tight">Aucun examen programmé</h3>
 <p className="text-[var(--text-secondary)] font-medium mt-2">Le calme avant la tempête...</p>
 </div>
 )}

 <Modal 
 isOpen={isModalOpen} 
 onClose={() => setIsModalOpen(false)} 
 title={editingExam ?"Modifier l'évaluation":"Nouvelle évaluation"}
 >
 <form onSubmit={handleSubmit} className="space-y-8 p-2">
 <div className="space-y-6">
 <div>
 <label className="block text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.3em] mb-3 ml-1">Matière</label>
 <input 
 type="text"
 required
 value={formData.subject}
 onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
 className="w-full p-5 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-2xl outline-none focus:ring-2 focus:ring-primary/50 transition-all text-[var(--text-main)] font-medium placeholder:text-[var(--text-secondary)]"
 placeholder="Ex: Intelligence Artificielle"
 />
 </div>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div>
 <label className="block text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.3em] mb-3 ml-1">Date & Heure</label>
 <input 
 type="datetime-local"
 required
 value={formData.date}
 onChange={(e) => setFormData({ ...formData, date: e.target.value })}
 className="w-full p-5 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-2xl outline-none focus:ring-2 focus:ring-primary/50 transition-all text-[var(--text-main)] font-medium appearance-none"
 />
 </div>
 <div>
 <label className="block text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.3em] mb-3 ml-1">Durée</label>
 <input 
 type="text"
 required
 value={formData.duration}
 onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
 className="w-full p-5 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-2xl outline-none focus:ring-2 focus:ring-primary/50 transition-all text-[var(--text-main)] font-medium placeholder:text-[var(--text-secondary)]"
 placeholder="Ex: 3h 00min"
 />
 </div>
 </div>
 <div>
 <label className="block text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.3em] mb-3 ml-1">Localisation / Salle</label>
 <input 
 type="text"
 required
 value={formData.room}
 onChange={(e) => setFormData({ ...formData, room: e.target.value })}
 className="w-full p-5 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-2xl outline-none focus:ring-2 focus:ring-primary/50 transition-all text-[var(--text-main)] font-medium placeholder:text-[var(--text-secondary)]"
 placeholder="Ex: Labo 404"
 />
 </div>
 <div>
 <label className="block text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.3em] mb-3 ml-1">Notes stratégiques</label>
 <textarea 
 rows={3}
 value={formData.notes}
 onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
 className="w-full p-5 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-2xl outline-none focus:ring-2 focus:ring-primary/50 transition-all text-[var(--text-main)] font-medium placeholder:text-[var(--text-secondary)] resize-none"
 placeholder="Instructions particulières..."
 />
 </div>
 </div>
 <div className="flex gap-4 pt-4">
 <button 
 type="button"
 onClick={() => setIsModalOpen(false)}
 className="flex-1 py-5 text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] hover:text-[var(--text-main)] transition-colors"
 >
 Annuler
 </button>
 <button 
 type="submit"
 className="btn-futuristic-primary flex-1 py-5"
 >
 <span className="font-black uppercase tracking-widest text-xs">
 {editingExam ?"Mettre à jour":"Programmer l'examen"}
 </span>
 </button>
 </div>
 </form>
 </Modal>
 </div>
 );
};
