import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTable, usePaginatedTable, deleteRow, updateRow, insertRow } from '../../lib/hooks';
import { User, SchoolClass, Poll, Announcement, ActivityLog, UserRole } from '../../types';
import { Card, Badge, Spinner, ErrBox, Btn, Modal, ConfirmModal } from '../../components/ui';
import { GlassCard } from '../components/ui/GlassCard';
import { 
 Users, 
 Shield, 
 BarChart3, 
 Megaphone, 
 Vote, 
 Trash2, 
 Edit2,
 Search, 
 Filter,
 MoreVertical,
 CheckCircle2,
 XCircle,
 TrendingUp,
 Clock,
 Settings,
 LayoutDashboard,
 UserCheck,
 UserX,
 GraduationCap,
 ChevronRight,
 Copy,
 RefreshCw,
 Eye,
 EyeOff,
 Bell,
 Plus
} from 'lucide-react';
import { authService } from '../services/authService';
import { notificationService } from '../services/notificationService';
import { Link } from 'react-router-dom';
import { 
 LineChart, 
 Line, 
 XAxis, 
 YAxis, 
 CartesianGrid, 
 Tooltip, 
 ResponsiveContainer,
 AreaChart,
 Area
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { fmtDate, cn } from '../../lib/utils';
import { 
 collection, 
 query, 
 orderBy, 
 limit, 
 onSnapshot, 
 where, 
 getDocs, 
 doc, 
 updateDoc, 
 writeBatch 
} from 'firebase/firestore';
import { db } from '../../firebase';

export const Admin: React.FC = () => {
 const { user } = useAuth();
 const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'classes' | 'content' | 'logs'>('overview');
 
 // Data fetching
 const userConstraints = React.useMemo(() => [orderBy('created_at', 'desc')], []);
 const { 
 data: users, 
 error: usersError,
 loading: usersLoading, 
 loadMore: loadMoreUsers, 
 hasMore: hasMoreUsers,
 loadingMore: loadingMoreUsers
 } = usePaginatedTable<User>('users', userConstraints, 20, user?.role === UserRole.ADMIN && (activeTab === 'users' || activeTab === 'overview'));

 const [classes, setClasses] = useState<SchoolClass[]>([]);
 const [classSecrets, setClassSecrets] = useState<Record<string, any>>({});
 const [loadingClasses, setLoadingClasses] = useState(false);
 const [error, setError] = useState<string | null>(null);
 const [success, setSuccess] = useState<string | null>(null);

 useEffect(() => {
 if (user?.role === UserRole.ADMIN && (activeTab === 'classes' || activeTab === 'overview')) {
 setLoadingClasses(true);
 
 const q = query(collection(db, 'classes'), orderBy('name', 'asc'));
 const unsubscribeClasses = onSnapshot(q, (snapshot) => {
 const classesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SchoolClass));
 setClasses(classesData);
 setLoadingClasses(false);
 }, (err) => {
 console.error("🔥 Error fetching classes:", err);
 setError("Erreur lors du chargement des classes.");
 setLoadingClasses(false);
 });

 const unsubscribeSecrets = onSnapshot(collection(db, 'class_secrets'), (snapshot) => {
 const secrets: Record<string, any> = {};
 snapshot.docs.forEach(doc => {
 secrets[doc.id] = doc.data();
 });
 setClassSecrets(secrets);
 }, (err) => {
 console.error("🔥 Error fetching class secrets:", err);
 });

 return () => {
 unsubscribeClasses();
 unsubscribeSecrets();
 };
 }
 }, [activeTab, user?.role]);
 const { data: polls, error: pollsError } = useTable<Poll>('polls', [], 10, user?.role === UserRole.ADMIN && (activeTab === 'content' || activeTab === 'overview'));
 const { data: announcements, error: announcementsError } = useTable<Announcement>('announcements', [], 10, user?.role === UserRole.ADMIN && (activeTab === 'content' || activeTab === 'overview'));
 
 const logConstraints = React.useMemo(() => [orderBy('createdAt', 'desc')], []);
 const { 
 data: logs, 
 error: logsError,
 loading: logsLoading, 
 loadMore: loadMoreLogs, 
 hasMore: hasMoreLogs,
 loadingMore: loadingMoreLogs
 } = usePaginatedTable<ActivityLog>('activity_logs', logConstraints, 50, user?.role === UserRole.ADMIN && (activeTab === 'logs' || activeTab === 'overview'));

 const [searchTerm, setSearchTerm] = useState('');
 const [isClassModalOpen, setIsClassModalOpen] = useState(false);
 const [editingClass, setEditingClass] = useState<SchoolClass | null>(null);
 const [newClassData, setNewClassData] = useState({ name: '', delegate_code: '', class_code: '', color: '#6C63FF', class_email: '', studentCount: 0 });
 const [copiedCode, setCopiedCode] = useState<string | null>(null);

 const generateDelegateCode = (className: string) => {
 const random = Math.random().toString(36).substring(2, 6).toUpperCase();
 const prefix = className ? className.substring(0, 3).toUpperCase() : 'DEL';
 return `${prefix}-${random}`;
 };

 const generateClassCode = (className: string) => {
 const random = Math.floor(1000 + Math.random() * 9000);
 const prefix = className ? className.substring(0, 2).toUpperCase() : 'CL';
 return `${prefix}-${random}`;
 };

 const handleCopyCode = (code: string) => {
 navigator.clipboard.writeText(code);
 setCopiedCode(code);
 setTimeout(() => setCopiedCode(null), 2000);
 };
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

 useEffect(() => {
 // Overview tab might need a small subset of logs, which we already get from usePaginatedTable
 }, [activeTab]);

 // Stats calculation
 const stats = React.useMemo(() => [
 { label: 'Utilisateurs', value: users.length, icon: Users, color: 'primary' },
 { label: 'Classes', value: classes.length, icon: Shield, color: 'amber' },
 { label: 'Sondages', value: polls.length, icon: Vote, color: 'emerald' },
 { label: 'Annonces', value: announcements.length, icon: Megaphone, color: 'rose' },
 ], [users.length, classes.length, polls.length, announcements.length]);

 // Activity chart data (aggregated from logs)
 const chartData = React.useMemo(() => {
 const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
 const data = days.map(day => ({ name: day, activity: 0 }));
 
 logs.forEach(log => {
 if (!log.createdAt) return;
 const date = new Date(log.createdAt);
 const dayIndex = date.getDay();
 if (!isNaN(dayIndex) && data[dayIndex]) {
 data[dayIndex].activity += 1;
 }
 });

 // Reorder to start from Monday or current day? Let's just keep it simple.
 return data;
 }, [logs]);

 const handleToggleUserRole = (targetUser: User) => {
 const newRole = targetUser.role === UserRole.ADMIN ? UserRole.STUDENT : UserRole.ADMIN;
 setConfirmConfig({
 isOpen: true,
 title: 'Changer le rôle',
 message: `Voulez-vous vraiment changer le rôle de ${targetUser.name} en ${newRole} ?`,
 type: 'warning',
 onConfirm: async () => {
 try {
 const batch = writeBatch(db);
 batch.update(doc(db, 'users', targetUser.id), { role: newRole });
 batch.update(doc(db, 'users_public', targetUser.id), { role: newRole });
 await batch.commit();
 } catch (err) {
 console.error(err);
 }
 }
 });
 };

 const handleDeleteUser = (targetUser: User) => {
 setConfirmConfig({
 isOpen: true,
 title: 'Supprimer l\'utilisateur',
 message: `Voulez-vous vraiment supprimer définitivement ${targetUser.name} ? Cette action est irréversible.`,
 type: 'danger',
 onConfirm: async () => {
 try {
 const batch = writeBatch(db);
 batch.delete(doc(db, 'users', targetUser.id));
 batch.delete(doc(db, 'users_public', targetUser.id));
 await batch.commit();
 } catch (err) {
 console.error(err);
 }
 }
 });
 };

 const handleEditClass = (cls: SchoolClass) => {
 const secrets = classSecrets[cls.id] || {};
 setEditingClass(cls);
 setNewClassData({ 
 name: cls.name || '', 
 delegate_code: secrets.delegate_code || '', 
 class_code: secrets.class_code || '',
 color: cls.color || '#6C63FF', 
 class_email: cls.class_email || '', 
 studentCount: cls.studentCount || 0
 });
 setIsClassModalOpen(true);
 };

 const handleSendTestNotification = async () => {
 if (!user) return;
 await notificationService.notifyUser(
 user.id,
"Test de Notification",
"Ceci est une notification de test pour vérifier le fonctionnement du système.",
 'info'
 );
 alert("Notification de test envoyée !");
 };

 const handleDeleteContent = (collectionName: string, id: string) => {
 setConfirmConfig({
 isOpen: true,
 title: 'Supprimer le contenu',
 message: 'Êtes-vous sûr de vouloir supprimer définitivement ce contenu ? Cette action est irréversible.',
 type: 'danger',
 onConfirm: async () => {
 try {
 const batch = writeBatch(db);
 
 if (collectionName === 'polls') {
 const optionsSnap = await getDocs(query(collection(db, 'poll_options'), where('pollId', '==', id)));
 optionsSnap.docs.forEach(d => batch.delete(d.ref));
 const votesSnap = await getDocs(query(collection(db, 'poll_votes'), where('pollId', '==', id)));
 votesSnap.docs.forEach(d => batch.delete(d.ref));
 } else if (collectionName === 'announcements') {
 const statusSnap = await getDocs(query(collection(db, 'announcement_read_statuses'), where('announcementId', '==', id)));
 statusSnap.docs.forEach(d => batch.delete(d.ref));
 } else if (collectionName === 'classes') {
 const classDoc = classes.find(c => c.id === id);
 if (classDoc) {
 // Delete secrets
 batch.delete(doc(db, 'class_secrets', id));
 
 // Delete registration codes
 const regCodesSnap = await getDocs(query(collection(db, 'registration_codes'), where('classId', '==', id)));
 regCodesSnap.docs.forEach(d => batch.delete(d.ref));

 // Delete delegate codes
 const delCodesSnap = await getDocs(query(collection(db, 'delegate_codes'), where('className', '==', classDoc.name)));
 delCodesSnap.docs.forEach(d => batch.delete(d.ref));
 }
 }
 
 batch.delete(doc(db, collectionName, id));
 await batch.commit();
 } catch (err) {
 console.error("🔥 Erreur lors de la suppression du contenu:", err);
 }
 }
 });
 };

 if (user?.role !== UserRole.ADMIN) {
 return (
 <div className="flex flex-col items-center justify-center py-20 space-y-4">
 <XCircle size={64} className="text-rose-500"/>
 <h1 className="text-2xl font-bold">Accès Refusé</h1>
 <p className="text-[var(--text-secondary)]">Vous n'avez pas les droits nécessaires pour accéder à cette page.</p>
 <Link to="/"className="px-6 py-2 bg-primary text-white rounded-xl font-bold">Retour au Dashboard</Link>
 </div>
 );
 }

 return (
 <div className="max-w-7xl mx-auto px-4 pb-20">
 <div className="flex flex-col lg:flex-row gap-10">
 {/* Sidebar Navigation */}
 <aside className="lg:w-72 flex-shrink-0">
 <GlassCard className="p-4 sticky top-24 border-[var(--glass-border)]"tilt={false}>
 <div className="space-y-2 relative z-10">
 <div className="px-4 py-3 mb-4">
 <h2 className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.3em]">Centre de Contrôle</h2>
 </div>
 {[
 { id: 'overview', label: 'Analytiques', icon: LayoutDashboard },
 { id: 'users', label: 'Unités', icon: Users },
 { id: 'classes', label: 'Nexus', icon: GraduationCap },
 { id: 'content', label: 'Transmissions', icon: Megaphone },
 { id: 'logs', label: 'Logs d\'activité', icon: Clock },
 ].map((item) => (
 <button
 key={item.id}
 onClick={() => setActiveTab(item.id as any)}
 className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 group relative overflow-hidden ${
 activeTab === item.id 
 ? 'text-[var(--text-main)]' 
 : 'text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-[var(--glass-bg)]'
 }`}
 >
 {activeTab === item.id && (
 <motion.div 
 layoutId="adminSidebarTab"
 className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 border-l-4 border-primary"
 transition={{ type:"spring", stiffness: 300, damping: 30 }}
 />
 )}
 <item.icon size={20} className={`relative z-10 transition-transform duration-500 ${activeTab === item.id ? 'scale-110 text-primary' : 'group-hover:scale-110'}`} />
 <span className="relative z-10 font-black text-[10px] uppercase tracking-widest">{item.label}</span>
 </button>
 ))}
 
 <div className="pt-6 mt-6 border-t border-[var(--glass-border)]">
 <button className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-[var(--glass-bg)] transition-all group">
 <Settings size={20} className="group-hover:rotate-90 transition-transform duration-500"/>
 <span className="font-black text-[10px] uppercase tracking-widest">Système</span>
 </button>
 </div>
 </div>
 </GlassCard>
 </aside>

 {/* Main Content Area */}
 <main className="flex-1 space-y-8">
 {error && <ErrBox message={error} />}
 {usersError && <ErrBox message={`Erreur Utilisateurs: ${usersError}`} />}
 {pollsError && <ErrBox message={`Erreur Sondages: ${pollsError}`} />}
 {announcementsError && <ErrBox message={`Erreur Annonces: ${announcementsError}`} />}
 {logsError && <ErrBox message={`Erreur Logs: ${logsError}`} />}
 
 <ConfirmModal 
 isOpen={confirmConfig.isOpen}
 onClose={() => setConfirmConfig({ ...confirmConfig, isOpen: false })}
 onConfirm={confirmConfig.onConfirm}
 title={confirmConfig.title}
 message={confirmConfig.message}
 type={confirmConfig.type}
 />
 <AnimatePresence mode="popLayout">
 {activeTab === 'overview' && (
 <motion.div 
 key="overview"
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: -10 }}
 className="space-y-8"
 >
 {/* Stats Grid */}
 <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
 {stats.map((stat) => (
 <GlassCard key={stat.label} className="p-6 border-[var(--glass-border)] hover:border-primary/30 transition-all duration-500 group"tilt={true}>
 <div className="flex items-center justify-between relative z-10">
 <div className={`w-12 h-12 bg-${stat.color}/10 text-${stat.color} rounded-2xl flex items-center justify-center border border-[var(--glass-border)] group-hover:scale-110 transition-transform duration-500`}>
 <stat.icon size={24} />
 </div>
 <div className="text-right">
 <p className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-1">{stat.label}</p>
 <p className="text-3xl font-black text-[var(--text-main)] tracking-tight">{stat.value}</p>
 </div>
 </div>
 </GlassCard>
 ))}
 </div>

 {/* Charts Section */}
 <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
 <GlassCard className="h-[450px] flex flex-col border-[var(--glass-border)]"tilt={false}>
 <div className="flex items-center justify-between mb-8 relative z-10">
 <h3 className="text-xl font-black text-[var(--text-main)] tracking-tight flex items-center gap-3">
 <BarChart3 size={20} className="text-primary"/>
 Flux d'Engagement
 </h3>
 <select className="text-[10px] font-black uppercase tracking-widest bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl p-2 px-4 outline-none text-[var(--text-secondary)]">
 <option>7 derniers jours</option>
 <option>30 derniers jours</option>
 </select>
 </div>
 <div className="flex-1 w-full relative z-10">
 <ResponsiveContainer width="100%"height="100%">
 <AreaChart data={chartData}>
 <defs>
 <linearGradient id="colorActivity"x1="0"y1="0"x2="0"y2="1">
 <stop offset="5%"stopColor="#6C63FF"stopOpacity={0.3}/>
 <stop offset="95%"stopColor="#6C63FF"stopOpacity={0}/>
 </linearGradient>
 </defs>
 <CartesianGrid strokeDasharray="3 3"vertical={false} stroke="#ffffff05"/>
 <XAxis dataKey="name"axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b', fontWeight: '900'}} dy={10} />
 <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b', fontWeight: '900'}} />
 <Tooltip 
 contentStyle={{ backgroundColor: '#0F0F1A', border: '1px solid #ffffff10', borderRadius: '16px', fontSize: '10px', fontWeight: '900' }}
 itemStyle={{ color: '#6C63FF' }}
 />
 <Area type="monotone"dataKey="activity"stroke="#6C63FF"strokeWidth={4} fillOpacity={1} fill="url(#colorActivity)"/>
 </AreaChart>
 </ResponsiveContainer>
 </div>
 </GlassCard>

 <GlassCard className="p-8 space-y-6 border-[var(--glass-border)]"tilt={false}>
 <h3 className="text-xl font-black text-[var(--text-main)] tracking-tight flex items-center gap-3 relative z-10">
 <Clock size={20} className="text-warning"/>
 Dernières Transmissions
 </h3>
 <div className="space-y-4 relative z-10">
 {logs.slice(0, 6).map((log) => (
 <div key={log.id} className="flex items-center gap-4 p-4 rounded-2xl bg-[var(--glass-bg)] border border-[var(--glass-border)] hover:border-primary/20 hover:bg-[var(--glass-bg-hover)] transition-all group">
 <div className="w-10 h-10 rounded-xl bg-[var(--glass-bg)] flex items-center justify-center text-[var(--text-secondary)] group-hover:text-primary transition-colors">
 <Users size={18} />
 </div>
 <div className="flex-1 min-w-0">
 <p className="text-sm font-black text-[var(--text-main)] tracking-tight truncate">
 <span className="text-primary">{log.actor}</span> {log.action}
 </p>
 <p className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest mt-1">{fmtDate(log.createdAt)}</p>
 </div>
 </div>
 ))}
 </div>
 </GlassCard>
 </div>
 </motion.div>
 )}

 {activeTab === 'users' && (
 <motion.div 
 key="users"
 initial={{ opacity: 0, x: 20, filter: 'blur(10px)' }}
 animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
 exit={{ opacity: 0, x: -20, filter: 'blur(10px)' }}
 className="space-y-8"
 >
 <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
 <h2 className="text-2xl font-black text-[var(--text-main)] tracking-tight">Gestion des Unités</h2>
 <div className="relative group w-full md:w-80">
 <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] group-focus-within:text-primary transition-colors"size={20} />
 <input 
 type="text"
 placeholder="Rechercher une unité..."
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 className="w-full pl-14 pr-6 py-4 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-2xl outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm text-[var(--text-main)] placeholder:text-[var(--text-secondary)] font-medium"
 />
 </div>
 </div>

 <GlassCard className="overflow-hidden border-[var(--glass-border)]"tilt={false}>
 <div className="overflow-x-auto relative z-10">
 <table className="w-full text-left border-collapse">
 <thead>
 <tr className="bg-[var(--glass-bg)]">
 <th className="px-8 py-6 text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.3em]">Unité</th>
 <th className="px-8 py-6 text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.3em]">Nexus</th>
 <th className="px-8 py-6 text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.3em]">Rôle</th>
 <th className="px-8 py-6 text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.3em]">Initialisation</th>
 <th className="px-8 py-6 text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.3em] text-right">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-white/5">
 {users.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase())).map((u) => (
 <tr key={u.id} className="hover:bg-[var(--glass-bg)] transition-colors group">
 <td className="px-8 py-6">
 <div className="flex items-center gap-4">
 <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-[var(--glass-border)] group-hover:border-primary/50 transition-all duration-500">
 <img src={u.avatar || `https://ui-avatars.com/api/?name=${u.name}`} className="w-full h-full object-cover"alt=""loading="lazy"referrerPolicy="no-referrer"/>
 </div>
 <div>
 <p className="text-sm font-black text-[var(--text-main)] tracking-tight">{u.name}</p>
 <p className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest">{u.email}</p>
 </div>
 </div>
 </td>
 <td className="px-8 py-6">
 <div className="px-3 py-1 bg-[var(--glass-bg)] rounded-full text-[8px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] border border-[var(--glass-border)] inline-block">
 {u.class_name || 'NON-AFFILIÉ'}
 </div>
 </td>
 <td className="px-8 py-6">
 <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${
 u.role === UserRole.ADMIN ? 'bg-danger/10 text-danger border-danger/20' : u.role === UserRole.DELEGATE ? 'bg-warning/10 text-warning border-warning/20' : 'bg-primary/10 text-primary border-primary/20'
 }`}>
 {u.role}
 </div>
 </td>
 <td className="px-8 py-6 text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest">
 {fmtDate(u.created_at)}
 </td>
 <td className="px-8 py-6 text-right">
 <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
 <button 
 onClick={() => handleToggleUserRole(u)}
 className={`p-3 rounded-xl transition-all ${u.role === UserRole.ADMIN ? 'text-danger bg-danger/10 hover:bg-danger/20' : 'text-primary bg-primary/10 hover:bg-primary/20'}`}
 title={u.role === UserRole.ADMIN ?"Rétrograder":"Promouvoir Admin"}
 >
 {u.role === UserRole.ADMIN ? <UserX size={18} /> : <UserCheck size={18} />}
 </button>
 <button 
 onClick={() => handleDeleteUser(u)}
 className="p-3 text-danger bg-danger/10 rounded-xl hover:bg-danger/20 transition-all"
 title="Supprimer l'unité"
 >
 <Trash2 size={18} />
 </button>
 <button className="p-3 text-[var(--text-secondary)] hover:text-[var(--text-main)] bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)] rounded-xl transition-all">
 <MoreVertical size={18} />
 </button>
 </div>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 {hasMoreUsers && (
 <div className="p-8 border-t border-[var(--glass-border)] text-center relative z-10">
 <button 
 onClick={loadMoreUsers} 
 disabled={loadingMoreUsers}
 className="px-10 py-4 bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-main)] rounded-[24px] font-black text-[10px] uppercase tracking-[0.3em] transition-all border border-[var(--glass-border)] disabled:opacity-50"
 >
 {loadingMoreUsers ? <Spinner /> :"Charger plus d'unités"}
 </button>
 </div>
 )}
 </GlassCard>
 </motion.div>
 )}

 {activeTab === 'classes' && (
 <motion.div 
 key="classes"
 initial={{ opacity: 0, x: 20, filter: 'blur(10px)' }}
 animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
 exit={{ opacity: 0, x: -20, filter: 'blur(10px)' }}
 className="space-y-10"
 >
 <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
 <h2 className="text-2xl font-black text-[var(--text-main)] tracking-tight">Nexus de Formation</h2>
 <div className="flex gap-4 w-full md:w-auto">
 <button 
 onClick={handleSendTestNotification}
 className="p-4 bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:text-[var(--text-main)] rounded-2xl border border-[var(--glass-border)] transition-all flex items-center gap-3"
 >
 <Bell size={20} />
 <span className="font-black text-[10px] uppercase tracking-widest">Test Notifs</span>
 </button>
 <button 
 onClick={() => setIsClassModalOpen(true)}
 className="btn-futuristic-primary px-8 py-4 flex items-center gap-3 flex-1 md:flex-none"
 >
 <Plus size={20} />
 <span className="font-black text-[10px] uppercase tracking-widest">Nouveau Nexus</span>
 </button>
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
 {classes.map((cls) => (
 <GlassCard key={cls.id} className="p-8 border-[var(--glass-border)] hover:border-primary/30 transition-all duration-500 group"tilt={true}>
 <div className="absolute top-0 left-0 w-full h-1 opacity-50"style={{ backgroundColor: cls.color }} />
 <div className="flex items-start justify-between mb-8 relative z-10">
 <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-[var(--text-main)] font-black text-xl shadow-2xl group-hover:scale-110 transition-transform duration-500"style={{ backgroundColor: cls.color }}>
 {cls.name.substring(0, 2).toUpperCase()}
 </div>
 <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
 <button 
 onClick={() => handleEditClass(cls)}
 className="p-2.5 bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)] text-primary rounded-xl transition-all"
 >
 <Edit2 size={18} />
 </button>
 <button 
 onClick={() => handleDeleteContent('classes', cls.id)}
 className="p-2.5 bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)] text-danger rounded-xl transition-all"
 >
 <Trash2 size={18} />
 </button>
 </div>
 </div>
 
 <h3 className="text-2xl font-black text-[var(--text-main)] tracking-tight group-hover:text-primary transition-colors duration-500">{cls.name}</h3>
 <p className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.3em] mt-1">Nexus ID: {cls.id.slice(0, 8)}</p>

 <div className="mt-8 space-y-4 relative z-10">
 <div className="flex justify-between items-center p-3 bg-[var(--glass-bg)] rounded-xl border border-[var(--glass-border)]">
 <span className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest">Code Délégué</span>
 <div className="flex items-center gap-3">
 <code className="text-xs font-black text-primary tracking-widest font-mono">
 {classSecrets[cls.id]?.delegate_code || '------'}
 </code>
 <button 
 onClick={() => handleCopyCode(classSecrets[cls.id]?.delegate_code)}
 className="text-[var(--text-secondary)] hover:text-primary transition-colors"
 >
 {copiedCode === classSecrets[cls.id]?.delegate_code ? <CheckCircle2 size={16} className="text-success"/> : <Copy size={16} />}
 </button>
 </div>
 </div>
 <div className="flex justify-between items-center p-3 bg-[var(--glass-bg)] rounded-xl border border-[var(--glass-border)]">
 <span className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest">Code Inscription</span>
 <div className="flex items-center gap-3">
 <code className="text-xs font-black text-success tracking-widest font-mono">
 {classSecrets[cls.id]?.class_code || '------'}
 </code>
 <button 
 onClick={() => handleCopyCode(classSecrets[cls.id]?.class_code)}
 className="text-[var(--text-secondary)] hover:text-success transition-colors"
 >
 {copiedCode === classSecrets[cls.id]?.class_code ? <CheckCircle2 size={16} className="text-success"/> : <Copy size={16} />}
 </button>
 </div>
 </div>
 </div>

 <div className="mt-8 pt-6 border-t border-[var(--glass-border)] flex items-center justify-between relative z-10">
 <div className="flex items-center gap-2">
 <Users size={14} className="text-[var(--text-secondary)]"/>
 <span className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest">{cls.studentCount || 0} Unités Connectées</span>
 </div>
 <div className="w-2 h-2 rounded-full bg-success shadow-[0_0_10px_rgba(34,197,94,0.5)]"/>
 </div>
 </GlassCard>
 ))}
 </div>

 <Modal 
 isOpen={isClassModalOpen} 
 onClose={() => {
 setIsClassModalOpen(false);
 setEditingClass(null);
 setNewClassData({ name: '', delegate_code: '', class_code: '', color: '#6C63FF', class_email: '', studentCount: 0 });
 }} 
 title={editingClass ?"Modifier la classe":"Ajouter une nouvelle classe"}
 >
 <form onSubmit={async (e) => {
 e.preventDefault();
 try {
 const trimmedName = newClassData.name.trim();
 const trimmedClassCode = newClassData.class_code.trim().toUpperCase();
 const trimmedDelegateCode = newClassData.delegate_code.trim().toUpperCase();

 const dataToSave = {
 name: trimmedName,
 color: newClassData.color,
 class_email: newClassData.class_email.trim(),
 studentCount: newClassData.studentCount,
 created_by: user?.id || 'system',
 created_at: editingClass ? (editingClass.created_at || (editingClass as any).createdAt || new Date().toISOString()) : new Date().toISOString()
 };

 let classId = editingClass?.id;
 if (editingClass) {
 await updateRow('classes', editingClass.id, dataToSave);
 } else {
 const newClass = await insertRow('classes', dataToSave);
 classId = (newClass as any).id;
 }

 // Save codes in separate collections for security
 if (classId) {
 const batch = writeBatch(db);
 
 // If editing, check if codes changed and delete old ones
 if (editingClass && classSecrets[classId]) {
 const oldSecrets = classSecrets[classId];
 if (oldSecrets.class_code && oldSecrets.class_code !== trimmedClassCode) {
 batch.delete(doc(db, 'registration_codes', oldSecrets.class_code));
 }
 if (oldSecrets.delegate_code && oldSecrets.delegate_code !== trimmedDelegateCode) {
 batch.delete(doc(db, 'delegate_codes', oldSecrets.delegate_code));
 }
 }

 // Registration code
 if (trimmedClassCode) {
 const regCodeRef = doc(db, 'registration_codes', trimmedClassCode);
 batch.set(regCodeRef, { classId, className: trimmedName });
 }

 // Delegate code
 if (trimmedDelegateCode) {
 const delCodeRef = doc(db, 'delegate_codes', trimmedDelegateCode);
 batch.set(delCodeRef, { classId, className: trimmedName });
 }

 // Class secrets (for Admin to see the codes)
 const secretRef = doc(db, 'class_secrets', classId);
 batch.set(secretRef, {
 class_code: trimmedClassCode,
 delegate_code: trimmedDelegateCode,
 updatedAt: new Date().toISOString()
 });

 await batch.commit();
 }
 setIsClassModalOpen(false);
 setEditingClass(null);
 setNewClassData({ name: '', delegate_code: '', class_code: '', color: '#6C63FF', class_email: '', studentCount: 0 });
 setSuccess(editingClass ?"Classe modifiée avec succès":"Classe ajoutée avec succès");
 } catch (err: any) {
 console.error(err);
 setError(err.message ||"Erreur lors de l'enregistrement de la classe");
 }
 }} className="space-y-4">
 <div className="space-y-1">
 <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">Nom de la classe</label>
 <input 
 type="text"
 required
 value={newClassData.name}
 onChange={(e) => setNewClassData({ ...newClassData, name: e.target.value })}
 className="w-full px-4 py-2 bg-[var(--bg-secondary)] border border-[var(--glass-border)] rounded-xl outline-none focus:ring-2 focus:ring-primary"
 placeholder="Ex: GI3"
 />
 </div>
 <div className="space-y-1">
 <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">Code Délégué</label>
 <div className="flex gap-2">
 <input 
 type="text"
 required
 value={newClassData.delegate_code}
 onChange={(e) => setNewClassData({ ...newClassData, delegate_code: e.target.value })}
 className="flex-1 px-4 py-2 bg-[var(--bg-secondary)] border border-[var(--glass-border)] rounded-xl outline-none focus:ring-2 focus:ring-primary"
 placeholder="Ex: DEL-GI3-2024"
 />
 <button 
 type="button"
 onClick={() => setNewClassData({ ...newClassData, delegate_code: generateDelegateCode(newClassData.name) })}
 className="px-3 bg-primary/10 text-primary rounded-xl hover:bg-primary/20 transition-colors"
 title="Générer un code délégué"
 >
 <RefreshCw size={18} />
 </button>
 </div>
 </div>
 <div className="space-y-1">
 <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">Code d'Inscription (Étudiants)</label>
 <div className="flex gap-2">
 <input 
 type="text"
 required
 value={newClassData.class_code}
 onChange={(e) => setNewClassData({ ...newClassData, class_code: e.target.value })}
 className="flex-1 px-4 py-2 bg-[var(--bg-secondary)] border border-[var(--glass-border)] rounded-xl outline-none focus:ring-2 focus:ring-primary"
 placeholder="Ex: GI3-2024"
 />
 <button 
 type="button"
 onClick={() => setNewClassData({ ...newClassData, class_code: generateClassCode(newClassData.name) })}
 className="px-3 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-colors"
 title="Générer un code d'inscription"
 >
 <RefreshCw size={18} />
 </button>
 </div>
 </div>
 <div className="space-y-1">
 <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">Email de la classe</label>
 <input 
 type="email"
 required
 value={newClassData.class_email}
 onChange={(e) => setNewClassData({ ...newClassData, class_email: e.target.value })}
 className="w-full px-4 py-2 bg-[var(--bg-secondary)] border border-[var(--glass-border)] rounded-xl outline-none focus:ring-2 focus:ring-primary"
 placeholder="Ex: gi3@janghup.com"
 />
 </div>
 <div className="space-y-1">
 <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">Nombre d'étudiants</label>
 <input 
 type="number"
 required
 min="0"
 value={newClassData.studentCount}
 onChange={(e) => setNewClassData({ ...newClassData, studentCount: parseInt(e.target.value) || 0 })}
 className="w-full px-4 py-2 bg-[var(--bg-secondary)] border border-[var(--glass-border)] rounded-xl outline-none focus:ring-2 focus:ring-primary"
 placeholder="Ex: 30"
 />
 </div>
 <div className="space-y-1">
 <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">Couleur</label>
 <input 
 type="color"
 value={newClassData.color}
 onChange={(e) => setNewClassData({ ...newClassData, color: e.target.value })}
 className="w-full h-10 p-1 bg-[var(--bg-secondary)] border border-[var(--glass-border)] rounded-xl outline-none"
 />
 </div>
 <div className="flex gap-3 pt-4">
 <Btn type="button"variant="ghost"className="flex-1"onClick={() => {
 setIsClassModalOpen(false);
 setEditingClass(null);
 setNewClassData({ name: '', delegate_code: '', class_code: '', color: '#6C63FF', class_email: '', studentCount: 0 });
 }}>Annuler</Btn>
 <Btn type="submit"className="flex-1">{editingClass ?"Enregistrer":"Créer la classe"}</Btn>
 </div>
 </form>
 </Modal>
 </motion.div>
 )}

 {activeTab === 'content' && (
 <motion.div 
 key="content"
 initial={{ opacity: 0, x: 20, filter: 'blur(10px)' }}
 animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
 exit={{ opacity: 0, x: -20, filter: 'blur(10px)' }}
 className="space-y-10"
 >
 <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
 {/* Polls Management */}
 <GlassCard className="p-8 space-y-8 border-[var(--glass-border)]"tilt={false}>
 <div className="flex items-center justify-between relative z-10">
 <h3 className="text-xl font-black text-[var(--text-main)] tracking-tight flex items-center gap-3">
 <Vote size={22} className="text-success"/>
 Sondages Actifs
 </h3>
 <Link to="/polls"className="text-[10px] font-black text-primary uppercase tracking-widest hover:tracking-[0.2em] transition-all">Gérer tout</Link>
 </div>
 <div className="space-y-4 relative z-10">
 {polls.slice(0, 5).map((poll) => (
 <div key={poll.id} className="p-5 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-2xl flex items-center justify-between group hover:bg-[var(--glass-bg-hover)] transition-all">
 <div className="min-w-0 flex-1">
 <p className="text-sm font-black text-[var(--text-main)] tracking-tight truncate">{poll.question}</p>
 <p className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest mt-1">{poll.className} • {poll.totalVotes} votes</p>
 </div>
 <button 
 onClick={() => handleDeleteContent('polls', poll.id)}
 className="p-3 text-[var(--text-secondary)] hover:text-danger opacity-0 group-hover:opacity-100 transition-all bg-[var(--glass-bg)] rounded-xl"
 >
 <Trash2 size={18} />
 </button>
 </div>
 ))}
 </div>
 </GlassCard>

 {/* Announcements Management */}
 <GlassCard className="p-8 space-y-8 border-[var(--glass-border)]"tilt={false}>
 <div className="flex items-center justify-between relative z-10">
 <h3 className="text-xl font-black text-[var(--text-main)] tracking-tight flex items-center gap-3">
 <Megaphone size={22} className="text-danger"/>
 Annonces Globales
 </h3>
 <Link to="/announcements"className="text-[10px] font-black text-primary uppercase tracking-widest hover:tracking-[0.2em] transition-all">Gérer tout</Link>
 </div>
 <div className="space-y-4 relative z-10">
 {announcements.slice(0, 5).map((ann) => (
 <div key={ann.id} className="p-5 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-2xl flex items-center justify-between group hover:bg-[var(--glass-bg-hover)] transition-all">
 <div className="min-w-0 flex-1">
 <p className="text-sm font-black text-[var(--text-main)] tracking-tight truncate">{ann.title}</p>
 <p className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest mt-1">{ann.author} • {ann.priority}</p>
 </div>
 <button 
 onClick={() => handleDeleteContent('announcements', ann.id)}
 className="p-3 text-[var(--text-secondary)] hover:text-danger opacity-0 group-hover:opacity-100 transition-all bg-[var(--glass-bg)] rounded-xl"
 >
 <Trash2 size={18} />
 </button>
 </div>
 ))}
 </div>
 </GlassCard>
 </div>
 </motion.div>
 )}

 {activeTab === 'logs' && (
 <motion.div 
 key="logs"
 initial={{ opacity: 0, x: 20, filter: 'blur(10px)' }}
 animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
 exit={{ opacity: 0, x: -20, filter: 'blur(10px)' }}
 className="space-y-10"
 >
 <h2 className="text-2xl font-black text-[var(--text-main)] tracking-tight">Flux de Données Système</h2>
 <GlassCard className="overflow-hidden border-[var(--glass-border)]"tilt={false}>
 <div className="divide-y divide-white/5 relative z-10">
 {logs.map((log) => (
 <div key={log.id} className="p-6 flex items-center gap-6 hover:bg-[var(--glass-bg)] transition-all group">
 <div className="w-12 h-12 rounded-2xl bg-[var(--glass-bg)] border border-[var(--glass-border)] flex items-center justify-center text-[var(--text-secondary)] group-hover:text-primary transition-colors">
 <Clock size={20} />
 </div>
 <div className="flex-1">
 <div className="flex items-center justify-between">
 <p className="text-sm font-black text-[var(--text-main)] tracking-tight">
 <span className="text-primary">{log.actor}</span> {log.action}
 </p>
 <span className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest">{fmtDate(log.createdAt)}</span>
 </div>
 <p className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest mt-1">ID Séquence: {log.userId}</p>
 </div>
 </div>
 ))}
 </div>
 {hasMoreLogs && (
 <div className="p-8 border-t border-[var(--glass-border)] text-center relative z-10">
 <button 
 onClick={loadMoreLogs} 
 disabled={loadingMoreLogs}
 className="px-10 py-4 bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-main)] rounded-[24px] font-black text-[10px] uppercase tracking-[0.3em] transition-all border border-[var(--glass-border)] disabled:opacity-50"
 >
 {loadingMoreLogs ? <Spinner /> :"Charger plus de données"}
 </button>
 </div>
 )}
 </GlassCard>
 </motion.div>
 )}
 </AnimatePresence>
 </main>
 </div>
 </div>
);
};
