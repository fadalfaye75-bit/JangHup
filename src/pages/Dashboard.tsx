import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useTable } from '../../lib/hooks';
import { Announcement, Exam, MeetLink, Poll, Resource, ActivityLog, User } from '../../types';
import { Card, Badge, Skeleton } from '../../components/ui';
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
  ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { fmtDate, daysLeft } from '../../lib/utils';
import { motion } from 'motion/react';
import { where, orderBy, query, collection, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';

const DashboardSkeleton = () => (
  <div className="space-y-8 animate-in fade-in duration-500 max-w-6xl mx-auto">
    <div className="space-y-2">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-4 w-48" />
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map(i => (
        <Skeleton key={i} className="h-32 w-full rounded-xl" />
      ))}
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
      <div className="space-y-6">
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    </div>
  </div>
);

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  
  // Memoized constraints to prevent unnecessary re-renders
  const classConstraints = React.useMemo(() => [
    where('className', '==', user?.class_name || ''),
    orderBy('createdAt', 'desc')
  ], [user?.class_name]);

  const examConstraints = React.useMemo(() => [
    where('className', '==', user?.class_name || ''),
    orderBy('date', 'asc')
  ], [user?.class_name]);

  const meetConstraints = React.useMemo(() => [
    where('className', '==', user?.class_name || ''),
    orderBy('time', 'asc')
  ], [user?.class_name]);

  const pollConstraints = React.useMemo(() => [
    where('className', '==', user?.class_name || ''),
    where('isActive', '==', true)
  ], [user?.class_name]);

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

  if (isLoading) return <DashboardSkeleton />;

  const nextMeeting = meetings.find(m => new Date(m.time) > new Date());
  const activePollsCount = polls.length;
  const recentAnn = announcements[0];

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
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="max-w-6xl mx-auto space-y-10 pb-20"
    >
      
      {/* Header - Notion Style */}
      <motion.header variants={itemVariants} className="space-y-2">
        <div className="flex items-center gap-3 text-slate-400 mb-2">
          <span className="text-sm font-medium">Workspace</span>
          <ChevronRight size={14} />
          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{user?.class_name || 'Ma Classe'}</span>
        </div>
        <h1 className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
          Tableau de bord
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-lg">
          Bienvenue, {user?.name}. Voici un résumé de votre activité universitaire.
        </p>
      </motion.header>

      {/* Stats Grid - 4 Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 dark:bg-primary/20 text-primary flex items-center justify-center">
              <BarChart3 size={20} />
            </div>
            <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Sondages</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-white">{activePollsCount}</span>
            <span className="text-sm text-slate-400">actifs</span>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-lg bg-accent/10 dark:bg-accent/20 text-accent flex items-center justify-center">
              <Megaphone size={20} />
            </div>
            <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Annonces</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-white">{announcements.length}</span>
            <span className="text-sm text-slate-400">récentes</span>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-lg bg-warning/10 dark:bg-warning/20 text-warning flex items-center justify-center">
              <Clock size={20} />
            </div>
            <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Prochain Cours</span>
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold text-slate-900 dark:text-white truncate">
              {nextMeeting ? nextMeeting.title : 'Aucun cours'}
            </span>
            <span className="text-sm text-slate-400">
              {nextMeeting ? fmtDate(nextMeeting.time) : 'Planifié'}
            </span>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-lg bg-danger/10 dark:bg-danger/20 text-danger flex items-center justify-center">
              <Users size={20} />
            </div>
            <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Ma Classe</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-white">{studentCount}</span>
            <span className="text-sm text-slate-400">étudiants</span>
          </div>
        </Card>
      </motion.div>

      {/* Quick Actions - Notion Style Buttons */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link to="/polls" className="group">
          <Card className="flex items-center gap-3 p-4 hover:border-primary/30 hover:-translate-y-1 transition-all duration-300 shadow-sm hover:shadow-md">
            <div className="p-2 rounded-lg bg-primary/10 dark:bg-primary/20 text-primary group-hover:scale-110 transition-transform">
              <BarChart3 size={18} />
            </div>
            <span className="font-semibold text-slate-700 dark:text-slate-200">Voir sondages</span>
          </Card>
        </Link>
        <Link to="/exams" className="group">
          <Card className="flex items-center gap-3 p-4 hover:border-warning/30 hover:-translate-y-1 transition-all duration-300 shadow-sm hover:shadow-md">
            <div className="p-2 rounded-lg bg-warning/10 dark:bg-warning/20 text-warning group-hover:scale-110 transition-transform">
              <Calendar size={18} />
            </div>
            <span className="font-semibold text-slate-700 dark:text-slate-200">Voir emploi du temps</span>
          </Card>
        </Link>
        <Link to="/announcements" className="group">
          <Card className="flex items-center gap-3 p-4 hover:border-accent/30 hover:-translate-y-1 transition-all duration-300 shadow-sm hover:shadow-md">
            <div className="p-2 rounded-lg bg-accent/10 dark:bg-accent/20 text-accent group-hover:scale-110 transition-transform">
              <Megaphone size={18} />
            </div>
            <span className="font-semibold text-slate-700 dark:text-slate-200">Lire annonces</span>
          </Card>
        </Link>
        <Link to="/profile" className="group">
          <Card className="flex items-center gap-3 p-4 hover:border-danger/30 hover:-translate-y-1 transition-all duration-300 shadow-sm hover:shadow-md">
            <div className="p-2 rounded-lg bg-danger/10 dark:bg-danger/20 text-danger group-hover:scale-110 transition-transform">
              <Plus size={18} />
            </div>
            <span className="font-semibold text-slate-700 dark:text-slate-200">Rejoindre classe</span>
          </Card>
        </Link>
      </motion.div>

      {/* Main Content Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column - Announcements & Exams */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Recent Announcements */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Megaphone size={20} className="text-primary" />
                Annonces récentes
              </h2>
              <Link to="/announcements" className="text-sm font-semibold text-primary hover:underline">Voir tout</Link>
            </div>
            <div className="space-y-3">
              {announcements.map(ann => {
                const isRead = readStatuses[ann.id];
                return (
                  <Card key={ann.id} className={`p-5 group relative ${!isRead ? 'border-primary/50' : ''}`}>
                    {!isRead && (
                      <div className="absolute top-4 left-[-4px] w-2 h-2 rounded-full bg-primary shadow-[0_0_10px_rgba(108,99,255,0.5)]" />
                    )}
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-slate-800 dark:text-slate-100 group-hover:text-primary transition-colors">{ann.title}</h3>
                      <Badge type={ann.priority === 'urgent' ? 'danger' : ann.priority === 'important' ? 'warning' : 'primary'}>
                        {ann.priority}
                      </Badge>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-sm line-clamp-2 mb-4 leading-relaxed">
                      {ann.content}
                    </p>
                    <div className="flex items-center justify-between text-xs font-medium text-slate-400">
                      <span className="flex items-center gap-1.5"><Users size={12} /> {ann.author}</span>
                      <span>{fmtDate(ann.createdAt)}</span>
                    </div>
                  </Card>
                );
              })}
              {announcements.length === 0 && (
                <div className="p-10 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl">
                  <p className="text-slate-400 font-medium">Aucune annonce pour le moment.</p>
                </div>
              )}
            </div>
          </section>

          {/* Upcoming Exams */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar size={20} className="text-warning" />
                Examens à venir
              </h2>
              <Link to="/exams" className="text-sm font-semibold text-warning hover:underline">Voir tout</Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {exams.map(exam => {
                const left = daysLeft(exam.date);
                return (
                  <Card key={exam.id} className="p-5 hover:border-warning/30 transition-all">
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-10 h-10 rounded-xl bg-warning/10 dark:bg-warning/20 text-warning flex items-center justify-center">
                        <BookOpen size={20} />
                      </div>
                      <Badge type={left <= 2 ? 'danger' : 'warning'}>J-{left}</Badge>
                    </div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-1">{exam.subject}</h3>
                    <div className="flex flex-col gap-1 text-xs text-slate-400 font-medium">
                      <span className="flex items-center gap-1.5"><Calendar size={12} /> {fmtDate(exam.date)}</span>
                      <span className="flex items-center gap-1.5"><Clock size={12} /> {exam.duration}</span>
                    </div>
                  </Card>
                );
              })}
              {exams.length === 0 && (
                <div className="col-span-full p-10 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl">
                  <p className="text-slate-400 font-medium">Aucun examen prévu.</p>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Right Column - Recent Activity */}
        <div className="space-y-8">
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Activity size={20} className="text-danger" />
              Activité récente
            </h2>
            <Card className="p-6 space-y-6">
              {activities.map((activity, idx) => (
                <div key={activity.id} className="flex gap-4 relative">
                  {idx !== activities.length - 1 && (
                    <div className="absolute left-[15px] top-8 bottom-[-24px] w-px bg-slate-100 dark:bg-slate-800" />
                  )}
                  <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center z-10 shrink-0">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-tight">
                      {activity.action}
                    </p>
                    <p className="text-xs text-slate-400 font-medium">
                      {fmtDate(activity.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
              {activities.length === 0 && (
                <div className="text-center py-10">
                  <p className="text-sm text-slate-400 font-medium">Aucune activité récente.</p>
                </div>
              )}
            </Card>
          </section>

          {/* Quick Links / Resources */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen size={20} className="text-accent" />
              Ressources utiles
            </h2>
            <div className="space-y-2">
              <a href="#" className="flex items-center justify-between p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group">
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Guide de l'étudiant</span>
                <ExternalLink size={14} className="text-slate-300 group-hover:text-primary transition-colors" />
              </a>
              <a href="#" className="flex items-center justify-between p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group">
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Règlement intérieur</span>
                <ExternalLink size={14} className="text-slate-300 group-hover:text-primary transition-colors" />
              </a>
              <a href="#" className="flex items-center justify-between p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group">
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Contact Administration</span>
                <ExternalLink size={14} className="text-slate-300 group-hover:text-primary transition-colors" />
              </a>
            </div>
          </section>
        </div>

      </motion.div>
    </motion.div>
  );
};
