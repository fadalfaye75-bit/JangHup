import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useTable } from '../lib/hooks';
import { Announcement, Exam, MeetLink, Poll, ActivityLog, UserRole } from '../types';
import { Badge, Skeleton, GlassCard, Button, AppCard, AutoGrid, Avatar } from '../components/ui';
import { 
  Megaphone, 
  Calendar,
  Clock,
  ArrowRight,
  Plus,
  Users,
  BarChart3,
  BookOpen,
  ExternalLink,
  ChevronRight,
  Shield,
  Mail,
  User,
  Activity,
  TrendingUp,
  MessageSquare,
  ArrowUpRight,
  Bell,
  X
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { fmtDate, daysLeft } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { where, orderBy, query, collection, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { cn } from '../lib/utils';
import { notificationService } from '../services/notificationService';

const DashboardSkeleton = () => (
  <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto px-4">
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
  const [showNotifBanner, setShowNotifBanner] = React.useState(false);
  const [notifError, setNotifError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if ('Notification' in window) {
      if (Notification.permission === 'default') {
        setShowNotifBanner(true);
      } else if (Notification.permission === 'denied') {
        // Optionally show a small hint that notifications are blocked
      }
    }
  }, []);

  const handleEnableNotifs = async () => {
    setNotifError(null);
    try {
      const granted = await notificationService.requestPermission();
      if (granted) {
        setShowNotifBanner(false);
      } else {
        if (Notification.permission === 'denied') {
          setNotifError("Les notifications sont bloquées par votre navigateur. Veuillez les autoriser dans les paramètres du site.");
        } else {
          setNotifError("Impossible d'activer les notifications. Assurez-vous d'être sur un navigateur compatible.");
        }
      }
    } catch (err) {
      setNotifError("Une erreur est survenue lors de l'activation.");
    }
  };

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

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="max-w-5xl mx-auto space-y-8 pb-20 px-4"
    >
      
      {/* Notification Permission Banner */}
      <AnimatePresence>
        {showNotifBanner && (
          <motion.div
            initial={{ height: 0, opacity: 0, marginBottom: 0 }}
            animate={{ height: 'auto', opacity: 1, marginBottom: 32 }}
            exit={{ height: 0, opacity: 0, marginBottom: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
                    <Bell size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[var(--text-main)]">Activer les notifications</h4>
                    <p className="text-xs text-[var(--text-secondary)] font-medium">Ne manquez plus aucune annonce, examen ou mention importante.</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={handleEnableNotifs} className="text-[10px] px-4">Activer</Button>
                  <button onClick={() => setShowNotifBanner(false)} className="p-2 text-[var(--text-muted)] hover:text-danger transition-colors">
                    <X size={18} />
                  </button>
                </div>
              </div>
              {notifError && (
                <div className="text-[10px] font-bold text-danger bg-danger/10 p-2 rounded-lg border border-danger/20 animate-in fade-in slide-in-from-top-1">
                  {notifError}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.header variants={itemVariants} className="space-y-2">
        <div className="flex items-center gap-2 text-gray-500 mb-1">
          <Badge variant="primary" className="text-[10px] font-bold uppercase tracking-wider">
            Tableau de bord
          </Badge>
          <ChevronRight size={14} />
          <span className="text-[10px] font-bold text-gray-500 tracking-wider uppercase">{user?.class_name || 'Ma Classe'}</span>
        </div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white tracking-tight">
          Bienvenue, {user?.name}
        </h1>
        <p className="text-[14px] text-gray-500 dark:text-gray-400">
          Voici un aperçu de l'activité récente dans votre nexus académique.
        </p>
      </motion.header>

      {/* Stats Grid */}
      <motion.div variants={itemVariants}>
        <AutoGrid minWidth="200px">
          {[
            { icon: BarChart3, label: 'Sondages', value: activePollsCount, unit: 'actifs', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
            { icon: Megaphone, label: 'Annonces', value: announcements.length, unit: 'récentes', color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
            { icon: Clock, label: 'Prochain Cours', value: nextMeeting ? nextMeeting.title : 'Aucun', unit: nextMeeting ? fmtDate(nextMeeting.time) : 'Planifié', color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
            { icon: Users, label: 'Ma Classe', value: studentCount, unit: 'étudiants', color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/20' }
          ].map((stat, i) => (
            <AppCard key={stat.label} variant="compact" className="group active:scale-[0.98] transition-transform cursor-pointer">
              <div className="flex items-center justify-between mb-4">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 border border-transparent dark:border-white/5", stat.bg, stat.color)}>
                  <stat.icon size={20} />
                </div>
                <div className="flex items-center gap-1 text-emerald-500 text-[11px] font-semibold">
                  <ArrowUpRight size={14} />
                  Live
                </div>
              </div>
              <div>
                <p className="text-[24px] font-semibold text-gray-900 dark:text-white tracking-tight">{stat.value}</p>
                <p className="text-[12px] font-medium text-gray-500">{stat.label}</p>
              </div>
            </AppCard>
          ))}
        </AutoGrid>
      </motion.div>

      {/* Main Content Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column - Announcements & Exams */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Recent Announcements */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[16px] font-semibold text-gray-900 dark:text-white flex items-center gap-2 tracking-tight">
                <Megaphone size={18} className="text-gray-400" />
                Annonces récentes
              </h2>
              <Link to="/announcements">
                <Button variant="secondary" size="sm" className="text-[12px]">Voir tout</Button>
              </Link>
            </div>
            <div className="space-y-4">
              {announcements.map(ann => {
                const isRead = readStatuses[ann.id];
                return (
                  <Link key={ann.id} to="/announcements">
                    <AppCard 
                      title={ann.title}
                      icon={!isRead ? <div className="w-2 h-2 rounded-full bg-blue-500" /> : <Megaphone size={16} className="text-gray-400" />}
                      className="active:scale-[0.98] transition-transform cursor-pointer"
                    badge={
                      <Badge variant={ann.priority === 'urgent' ? 'danger' : ann.priority === 'important' ? 'warning' : 'primary'}>
                        {ann.priority}
                      </Badge>
                    }
                    footer={
                      <div className="flex items-center justify-between w-full pt-2">
                        <div className="flex items-center gap-2">
                          <Avatar 
                            src={ann.authorAvatar} 
                            name={ann.author} 
                            size="xs" 
                          />
                          <span className="text-[13px] font-medium text-gray-700 dark:text-gray-300">{ann.author}</span>
                        </div>
                        <span className="text-[12px] text-gray-500">{fmtDate(ann.createdAt)}</span>
                      </div>
                    }
                  >
                    <p className="text-[14px] text-gray-600 dark:text-gray-400 leading-relaxed">
                      {ann.content}
                    </p>
                  </AppCard>
                  </Link>
                );
              })}
              {announcements.length === 0 && (
                <div className="p-12 text-center border border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
                  <p className="text-gray-500 text-[13px]">Aucune annonce récente.</p>
                </div>
              )}
            </div>
          </section>

          {/* Upcoming Exams */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[16px] font-semibold text-gray-900 dark:text-white flex items-center gap-2 tracking-tight">
                <Calendar size={18} className="text-gray-400" />
                Prochains Examens
              </h2>
              <Link to="/exams">
                <Button variant="secondary" size="sm" className="text-[12px]">Calendrier</Button>
              </Link>
            </div>
            <AutoGrid minWidth="200px">
              {exams.map(exam => {
                const days = daysLeft(exam.date);
                return (
                  <Link key={exam.id} to="/exams">
                    <AppCard 
                      variant="compact"
                      title={exam.subject}
                      className="active:scale-[0.98] transition-transform cursor-pointer"
                      badge={
                      <Badge variant={days <= 3 ? 'danger' : 'warning'}>
                        {days === 0 ? "Aujourd'hui" : days === 1 ? "Demain" : `J-${days}`}
                      </Badge>
                    }
                  >
                    <div className="flex items-center gap-3 mt-2">
                      <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 flex items-center justify-center shrink-0">
                        <Calendar size={14} />
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Date</p>
                        <div className="flex items-center gap-1.5 text-[13px] font-medium text-gray-900 dark:text-white">
                          <Clock size={12} className="text-gray-400" />
                          {new Date(exam.date).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </AppCard>
                  </Link>
                );
              })}
              {exams.length === 0 && (
                <div className="col-span-full p-12 text-center border border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
                  <p className="text-gray-500 text-[13px]">Aucun examen planifié.</p>
                </div>
              )}
            </AutoGrid>
          </section>
        </div>

        {/* Right Column - Activity & Quick Links */}
        <div className="space-y-8">
          {/* Quick Links */}
          <section className="space-y-4">
            <h2 className="text-[16px] font-semibold text-gray-900 dark:text-white flex items-center gap-2 tracking-tight">
              <TrendingUp size={18} className="text-gray-400" />
              Raccourcis
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {[
                { to: '/forum', icon: MessageSquare, label: 'Forum', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
                { to: '/resources', icon: BookOpen, label: 'Cours', color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
                { to: '/meetings', icon: ExternalLink, label: 'Meet', color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
                { to: '/class', icon: Shield, label: 'Classe', color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' }
              ].map((link, i) => (
                <Link key={i} to={link.to}>
                  <AppCard variant="compact" className="flex flex-col items-center gap-3 active:scale-[0.98] cursor-pointer hover:shadow-lg transition-all text-center group">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 border border-transparent dark:border-white/5", link.bg, link.color)}>
                      <link.icon size={20} />
                    </div>
                    <span className="text-[12px] font-medium text-gray-700 dark:text-gray-300">{link.label}</span>
                  </AppCard>
                </Link>
              ))}
            </div>
          </section>

          {/* Activity Feed */}
          <section className="space-y-4">
            <h2 className="text-[16px] font-semibold text-gray-900 dark:text-white flex items-center gap-2 tracking-tight">
              <Activity size={18} className="text-gray-400" />
              Votre Activité
            </h2>
            <div className="space-y-3">
              {activities.slice(0, 5).map(log => (
                <motion.div 
                  key={log.id} 
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className="flex gap-3 p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm cursor-pointer"
                >
                  <Avatar 
                    src={log.userAvatar} 
                    name={log.userName || log.actor} 
                    size="xs" 
                    className="shrink-0"
                  />
                  <div className="space-y-0.5">
                    <p className="text-[13px] font-medium text-gray-900 dark:text-white leading-tight">{log.action}</p>
                    <p className="text-[11px] text-gray-500">{fmtDate(log.createdAt)}</p>
                  </div>
                </motion.div>
              ))}
              {activities.length === 0 && (
                <div className="p-8 text-center border border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
                  <p className="text-gray-500 text-[13px]">Aucune activité.</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </motion.div>
    </motion.div>
  );
};
