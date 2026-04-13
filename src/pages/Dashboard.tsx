import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useTable } from '../../lib/hooks';
import { Announcement, Exam, MeetLink, Poll, Resource, ActivityLog, User, UserRole } from '../../types';
import { Card, Badge, Skeleton } from '../../components/ui';
import { GlassCard } from '../components/ui/GlassCard';
import { 
 Megaphone, 
 Calendar,
 Clock,
 ArrowRight,
 Plus,
 Users,
 BarChart3,
 BookOpen,
 Video,
 ExternalLink,
 Activity,
 ChevronRight,
 Shield,
 Mail
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { fmtDate, daysLeft } from '../../lib/utils';
import { motion } from 'motion/react';
import { where, orderBy, query, collection, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';

const DashboardSkeleton = () => (
 <div className="space-y-8 animate-in fade-in duration-500 max-w-6xl mx-auto">
 <div className="space-y-2">
 <Skeleton className="h-10 w-64"/>
 <Skeleton className="h-4 w-48"/>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
 {[1, 2, 3, 4].map(i => (
 <Skeleton key={i} className="h-32 w-full rounded-xl"/>
 ))}
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
 <div className="lg:col-span-2 space-y-6">
 <Skeleton className="h-64 w-full rounded-xl"/>
 <Skeleton className="h-64 w-full rounded-xl"/>
 </div>
 <div className="space-y-6">
 <Skeleton className="h-96 w-full rounded-xl"/>
 </div>
 </div>
 </div>
);

export const Dashboard: React.FC = () => {
 const { user } = useAuth();
 
 // Memoized constraints to prevent unnecessary re-renders
 const classConstraints = React.useMemo(() => {
 const constraints: any[] = [orderBy('createdAt', 'desc')];
 if (user?.role !== UserRole.ADMIN) {
 constraints.unshift(where('className', '==', user?.class_name || ''));
 }
 return constraints;
 }, [user?.class_name, user?.role]);

 const examConstraints = React.useMemo(() => {
 const constraints: any[] = [orderBy('date', 'asc')];
 if (user?.role !== UserRole.ADMIN) {
 constraints.unshift(where('className', '==', user?.class_name || ''));
 }
 return constraints;
 }, [user?.class_name, user?.role]);

 const meetConstraints = React.useMemo(() => {
 const constraints: any[] = [orderBy('time', 'asc')];
 if (user?.role !== UserRole.ADMIN) {
 constraints.unshift(where('className', '==', user?.class_name || ''));
 }
 return constraints;
 }, [user?.class_name, user?.role]);

 const pollConstraints = React.useMemo(() => {
 const constraints: any[] = [where('isActive', '==', true)];
 if (user?.role !== UserRole.ADMIN) {
 constraints.unshift(where('className', '==', user?.class_name || ''));
 }
 return constraints;
 }, [user?.class_name, user?.role]);

 const activityConstraints = React.useMemo(() => [
 where('userId', '==', user?.id || ''),
 orderBy('createdAt', 'desc')
 ], [user?.id]);

 // Data Fetching
 const { data: announcements, loading: annLoading } = useTable<Announcement>(
 'announcements', 
 classConstraints,
 5,
 !!user?.class_name || user?.role === 'ADMIN'
 );
 
 const { data: exams, loading: examLoading } = useTable<Exam>(
 'exams', 
 examConstraints,
 5,
 !!user?.class_name || user?.role === 'ADMIN'
 );
 
 const { data: meetings, loading: meetLoading } = useTable<MeetLink>(
 'meetings', 
 meetConstraints,
 5,
 !!user?.class_name || user?.role === 'ADMIN'
 );
 
 const { data: polls, loading: pollLoading } = useTable<Poll>(
 'polls', 
 pollConstraints,
 10,
 !!user?.class_name || user?.role === 'ADMIN'
 );

 const [studentCount, setStudentCount] = React.useState(0);

 React.useEffect(() => {
 if (!user?.class_name) return;
 const q = query(collection(db, 'users_public'), where('class_name', '==', user.class_name));
 getDocs(q).then(snap => setStudentCount(snap.size));
 }, [user?.class_name]);

 const { data: activities, loading: activityLoading } = useTable<ActivityLog>(
 'activity_logs',
 activityConstraints,
 10,
 !!user?.id
 );

 const [readStatuses, setReadStatuses] = React.useState<Record<string, boolean>>({});

 React.useEffect(() => {
 if (!user) return;
 const statusQ = query(
 collection(db, 'announcement_read_statuses'),
 where('userId', '==', user.id)
 );
 const unsubscribe = onSnapshot(statusQ, (snapshot) => {
 const statuses: Record<string, boolean> = {};
 snapshot.docs.forEach(doc => {
 statuses[doc.data().announcementId] = true;
 });
 setReadStatuses(statuses);
 });
 return () => unsubscribe();
 }, [user]);

 const isLoading = annLoading || examLoading || meetLoading || pollLoading || activityLoading;

 const nextMeeting = React.useMemo(() => meetings.find(m => new Date(m.time) > new Date()), [meetings]);
 const activePollsCount = React.useMemo(() => polls.length, [polls]);

 if (isLoading) return <DashboardSkeleton />;

 const containerVariants: any = {
 hidden: { opacity: 0 },
 show: {
 opacity: 1,
 transition: {
 staggerChildren: 0.1,
 delayChildren: 0.3
 }
 }
 };

 const itemVariants: any = {
 hidden: { opacity: 0, y: 30, filter: 'blur(10px)' },
 show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { type:"spring", stiffness: 200, damping: 25 } }
 };

 return (
 <motion.div 
 variants={containerVariants}
 initial="hidden"
 animate="show"
 className="max-w-7xl mx-auto space-y-16 pb-20 px-4"
 >
 
 {/* Header - Immersive Style */}
 <motion.header variants={itemVariants} className="space-y-6 relative">
 <div className="absolute -top-20 -left-20 w-64 h-64 bg-primary/20 blur-[120px] rounded-full pointer-events-none"/>
 <div className="flex items-center gap-4 text-[var(--text-secondary)] mb-2">
 <div className="px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-[10px] font-black uppercase tracking-widest text-primary shadow-[0_0_15px_rgba(108,99,255,0.2)]">
 JàngHub v3.0
 </div>
 <ChevronRight size={14} className="text-[var(--text-secondary)]"/>
 <span className="text-[10px] font-black text-[var(--text-secondary)] tracking-[0.3em] uppercase">{user?.class_name || 'Ma Classe'}</span>
 </div>
 <h1 className="heading-futuristic">
 Tableau de bord
 </h1>
 <p className="text-[var(--text-secondary)] text-xl max-w-3xl font-medium leading-relaxed">
 Bienvenue dans votre espace immersif, <span className="text-[var(--text-main)] font-black">{user?.name}</span>. Votre parcours académique est synchronisé en temps réel.
 </p>
 </motion.header>

 {/* Stats Grid - 4 Futuristic Cards */}
 <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
 {[
 { icon: BarChart3, label: 'Sondages', value: activePollsCount, unit: 'actifs', color: 'primary' },
 { icon: Megaphone, label: 'Annonces', value: announcements.length, unit: 'récentes', color: 'accent' },
 { icon: Clock, label: 'Prochain Cours', value: nextMeeting ? nextMeeting.title : 'Aucun', unit: nextMeeting ? fmtDate(nextMeeting.time) : 'Planifié', color: 'warning' },
 { icon: Users, label: 'Ma Classe', value: studentCount, unit: 'étudiants', color: 'neon-blue' }
 ].map((stat, i) => (
 <GlassCard key={i} className="p-8 relative group overflow-hidden border-[var(--glass-border)] hover:border-[var(--glass-border)] transition-all duration-500"tilt={true}>
 <div className={`absolute -top-10 -right-10 w-32 h-32 bg-${stat.color}/10 blur-[60px] rounded-full group-hover:bg-${stat.color}/20 transition-colors duration-700`} />
 <div className="flex items-center gap-5 mb-8 relative z-10">
 <div className={`w-14 h-14 rounded-2xl bg-${stat.color}/10 text-${stat.color} flex items-center justify-center shadow-[inset_0_0_15px_rgba(255,255,255,0.05)] border border-${stat.color}/20 group-hover:scale-110 transition-transform duration-500`}>
 <stat.icon size={28} />
 </div>
 <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-secondary)]">{stat.label}</span>
 </div>
 <div className="flex flex-col gap-1 relative z-10">
 <span className="text-4xl font-black tracking-tighter text-[var(--text-main)] truncate group-hover:text-primary transition-colors duration-500">{stat.value}</span>
 <span className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest">{stat.unit}</span>
 </div>
 </GlassCard>
 ))}
 </motion.div>

 {/* Quick Actions - Floating Buttons */}
 <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-6">
 {[
 { to: '/polls', icon: BarChart3, label: 'Sondages', color: 'primary' },
 { to: '/exams', icon: Calendar, label: 'Emploi du temps', color: 'warning' },
 { to: '/announcements', icon: Megaphone, label: 'Annonces', color: 'accent' },
 { to: '/profile', icon: Plus, label: 'Rejoindre classe', color: 'danger' }
 ].map((action, i) => (
 <Link key={i} to={action.to} className="group">
 <GlassCard className="flex items-center gap-4 p-6 border-[var(--glass-border)] hover:border-primary/30 hover:-translate-y-2 transition-all duration-500 shadow-2xl"tilt={true}>
 <div className={`p-3 rounded-xl bg-${action.color}/10 text-${action.color} group-hover:scale-110 group-hover:rotate-6 transition-transform shadow-lg border border-${action.color}/20 relative z-10`}>
 <action.icon size={20} />
 </div>
 <span className="font-black text-xs uppercase tracking-widest text-[var(--text-secondary)] group-hover:text-[var(--text-main)] transition-colors relative z-10">{action.label}</span>
 </GlassCard>
 </Link>
 ))}
 </motion.div>

 {/* Main Content Grid */}
 <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-12">
 
 {/* Left Column - Announcements & Exams */}
 <div className="lg:col-span-2 space-y-12">
 
 {/* Recent Announcements */}
 <section className="space-y-8">
 <div className="flex items-center justify-between">
 <h2 className="text-2xl font-black text-[var(--text-main)] flex items-center gap-4">
 <div className="w-2 h-8 bg-primary rounded-full shadow-[0_0_15px_rgba(108,99,255,0.5)]"/>
 Annonces récentes
 </h2>
 <Link to="/announcements"className="text-[10px] font-black uppercase tracking-[0.2em] text-primary hover:text-[var(--text-main)] transition-colors">Voir tout</Link>
 </div>
 <div className="space-y-6">
 {announcements.map(ann => {
 const isRead = readStatuses[ann.id];
 return (
 <GlassCard key={ann.id} className={`p-8 group relative border-[var(--glass-border)] hover:border-primary/30 transition-all duration-500 ${!isRead ? 'shadow-[0_0_40px_rgba(108,99,255,0.05)]' : ''}`} tilt={false}>
 {!isRead && (
 <div className="absolute top-8 left-[-6px] w-3 h-3 rounded-full bg-primary shadow-[0_0_15px_rgba(108,99,255,0.8)] z-20"/>
 )}
 <div className="flex justify-between items-start mb-6 relative z-10">
 <h3 className="text-xl font-black text-[var(--text-main)] group-hover:text-primary transition-colors tracking-tight leading-tight max-w-[80%]">{ann.title}</h3>
 <div className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
 ann.priority === 'urgent' ? 'bg-danger/10 text-danger border-danger/20' : 
 ann.priority === 'important' ? 'bg-warning/10 text-warning border-warning/20' : 
 'bg-primary/10 text-primary border-primary/20'
 }`}>
 {ann.priority}
 </div>
 </div>
 <p className="text-[var(--text-secondary)] text-sm line-clamp-2 mb-8 leading-relaxed font-medium relative z-10">
 {ann.content}
 </p>
 <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)] relative z-10">
 <div className="flex items-center gap-3">
 <div className="w-8 h-8 rounded-full bg-[var(--glass-bg)] flex items-center justify-center text-primary border border-[var(--glass-border)]">
 <Users size={14} />
 </div>
 {ann.author}
 </div>
 <span>{fmtDate(ann.createdAt)}</span>
 </div>
 </GlassCard>
 );
 })}
 {announcements.length === 0 && (
 <div className="p-20 text-center glass-ultra rounded-[40px] border-2 border-dashed border-[var(--glass-border)]">
 <p className="text-[var(--text-secondary)] font-black uppercase tracking-[0.3em] text-xs">Aucune annonce détectée.</p>
 </div>
 )}
 </div>
 </section>

 {/* Upcoming Exams */}
 <section className="space-y-8">
 <div className="flex items-center justify-between">
 <h2 className="text-2xl font-black text-[var(--text-main)] flex items-center gap-4">
 <div className="w-2 h-8 bg-warning rounded-full shadow-[0_0_15px_rgba(255,184,0,0.5)]"/>
 Examens à venir
 </h2>
 <Link to="/exams"className="text-[10px] font-black uppercase tracking-[0.2em] text-warning hover:text-[var(--text-main)] transition-colors">Voir tout</Link>
 </div>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
 {exams.map(exam => {
 const left = daysLeft(exam.date);
 return (
 <GlassCard key={exam.id} className="p-8 border-[var(--glass-border)] hover:border-warning/40 transition-all duration-500 group"tilt={true}>
 <div className="flex justify-between items-start mb-8 relative z-10">
 <div className="w-14 h-14 rounded-2xl bg-warning/10 text-warning flex items-center justify-center group-hover:scale-110 transition-transform duration-500 border border-warning/20">
 <BookOpen size={28} />
 </div>
 <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
 left <= 2 ? 'bg-danger/10 text-danger border-danger/20' : 'bg-warning/10 text-warning border-warning/20'
 }`}>
 J-{left}
 </div>
 </div>
 <h3 className="text-xl font-black text-[var(--text-main)] mb-4 tracking-tight group-hover:text-warning transition-colors duration-500 relative z-10">{exam.subject}</h3>
 <div className="flex flex-col gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)] relative z-10">
 <span className="flex items-center gap-3"><Calendar size={16} className="text-warning"/> {fmtDate(exam.date)}</span>
 <span className="flex items-center gap-3"><Clock size={16} className="text-warning"/> {exam.duration}</span>
 </div>
 </GlassCard>
 );
 })}
 {exams.length === 0 && (
 <div className="col-span-full p-20 text-center glass-ultra rounded-[40px] border-2 border-dashed border-[var(--glass-border)]">
 <p className="text-[var(--text-secondary)] font-black uppercase tracking-[0.3em] text-xs">Aucun examen en vue.</p>
 </div>
 )}
 </div>
 </section>
 </div>

 {/* Right Column - Recent Activity */}
 <div className="space-y-12">
 <section className="space-y-8">
 <h2 className="text-2xl font-black text-[var(--text-main)] flex items-center gap-4">
 <div className="w-2 h-8 bg-danger rounded-full shadow-[0_0_15px_rgba(255,71,87,0.5)]"/>
 Activité
 </h2>
 <GlassCard className="p-10 space-y-10 relative overflow-hidden border-[var(--glass-border)] shadow-2xl"tilt={false}>
 <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-primary via-neon-blue to-accent animate-pulse z-20"/>
 {activities.map((activity, idx) => (
 <div key={activity.id} className="flex gap-6 relative group z-10">
 {idx !== activities.length - 1 && (
 <div className="absolute left-[23px] top-12 bottom-[-40px] w-[2px] bg-[var(--glass-bg)] group-hover:bg-primary/20 transition-colors duration-500"/>
 )}
 <div className="w-12 h-12 rounded-2xl bg-[var(--glass-bg)] border border-[var(--glass-border)] flex items-center justify-center z-10 shrink-0 group-hover:border-primary/40 transition-all duration-500">
 <div className="w-3 h-3 rounded-full bg-primary shadow-[0_0_15px_rgba(108,99,255,0.8)] group-hover:scale-125 transition-transform"/>
 </div>
 <div className="space-y-2 pt-1">
 <p className="text-sm font-black text-[var(--text-main)] leading-tight tracking-tight group-hover:text-primary transition-colors duration-500">
 {activity.action}
 </p>
 <p className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em]">
 {fmtDate(activity.createdAt)}
 </p>
 </div>
 </div>
 ))}
 {activities.length === 0 && (
 <div className="text-center py-16 relative z-10">
 <p className="text-[10px] text-[var(--text-secondary)] font-black uppercase tracking-[0.3em]">Silence radio...</p>
 </div>
 )}
 </GlassCard>
 </section>

 {/* Quick Links / Resources */}
 <section className="space-y-8">
 <h2 className="text-2xl font-black text-[var(--text-main)] flex items-center gap-4">
 <div className="w-2 h-8 bg-accent rounded-full shadow-[0_0_15px_rgba(0,200,150,0.5)]"/>
 Ressources
 </h2>
 <div className="space-y-4">
 {[
 { label:"Guide de l'étudiant", icon: BookOpen },
 { label:"Règlement intérieur", icon: Shield },
 { label:"Contact Administration", icon: Mail }
 ].map((res, i) => (
 <a key={i} href="#"className="block group">
 <GlassCard className="flex items-center justify-between p-6 rounded-[24px] hover:bg-[var(--glass-bg)] hover:-translate-x-3 transition-all duration-500 border-[var(--glass-border)] shadow-xl"tilt={true}>
 <div className="flex items-center gap-5 relative z-10">
 <div className="w-12 h-12 rounded-2xl bg-[var(--glass-bg)] flex items-center justify-center text-[var(--text-secondary)] group-hover:text-accent transition-colors duration-500 border border-[var(--glass-border)]">
 <res.icon size={20} />
 </div>
 <span className="text-sm font-black text-[var(--text-secondary)] group-hover:text-[var(--text-main)] transition-colors duration-500 uppercase tracking-widest">{res.label}</span>
 </div>
 <ExternalLink size={18} className="text-[var(--text-secondary)] group-hover:text-accent transition-colors duration-500 relative z-10"/>
 </GlassCard>
 </a>
 ))}
 </div>
 </section>
 </div>

 </motion.div>
 </motion.div>
 );
};
