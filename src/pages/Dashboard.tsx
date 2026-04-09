import React from 'react';
import { useAuth } from '../../lib/AuthContext';
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
import { where, orderBy, query, collection, onSnapshot } from 'firebase/firestore';
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
  
  // Data Fetching
  const { data: announcements, loading: annLoading } = useTable<Announcement>(
    'announcements', 
    [where('className', '==', user?.className || ''), orderBy('createdAt', 'desc')],
    5
  );
  
  const { data: exams, loading: examLoading } = useTable<Exam>(
    'exams', 
    [where('className', '==', user?.className || ''), orderBy('date', 'asc')],
    5
  );
  
  const { data: meetings, loading: meetLoading } = useTable<MeetLink>(
    'meetings', 
    [where('className', '==', user?.className || ''), orderBy('time', 'asc')],
    5
  );
  
  const { data: polls, loading: pollLoading } = useTable<Poll>(
    'polls', 
    [where('className', '==', user?.className || ''), where('isActive', '==', true)],
    10
  );

  const { data: classUsers, loading: usersLoading } = useTable<User>(
    'profiles',
    [where('className', '==', user?.className || '')]
  );

  const { data: activities, loading: activityLoading } = useTable<ActivityLog>(
    'activity_logs',
    [where('userId', '==', user?.id || ''), orderBy('createdAt', 'desc')],
    10
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

  const isLoading = annLoading || examLoading || meetLoading || pollLoading || usersLoading || activityLoading;

  if (isLoading) return <DashboardSkeleton />;

  const nextMeeting = meetings.find(m => new Date(m.time) > new Date());
  const activePollsCount = polls.length;
  const recentAnn = announcements[0];

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Header - Notion Style */}
      <header className="space-y-2">
        <div className="flex items-center gap-3 text-slate-400 mb-2">
          <span className="text-sm font-medium">Workspace</span>
          <ChevronRight size={14} />
          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{user?.className || 'Ma Classe'}</span>
        </div>
        <h1 className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
          Tableau de bord
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-lg">
          Bienvenue, {user?.name}. Voici un résumé de votre activité universitaire.
        </p>
      </header>

      {/* Stats Grid - 4 Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <BarChart3 size={20} />
            </div>
            <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Sondages</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-white">{activePollsCount}</span>
            <span className="text-sm text-slate-400">actifs</span>
          </div>
        </Card>

        <Card className="p-6 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Megaphone size={20} />
            </div>
            <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Annonces</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-white">{announcements.length}</span>
            <span className="text-sm text-slate-400">récentes</span>
          </div>
        </Card>

        <Card className="p-6 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center">
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

        <Card className="p-6 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-lg bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <Users size={20} />
            </div>
            <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Ma Classe</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-white">{classUsers.length}</span>
            <span className="text-sm text-slate-400">étudiants</span>
          </div>
        </Card>
      </div>

      {/* Quick Actions - Notion Style Buttons */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link to="/polls" className="group">
          <div className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm">
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
              <BarChart3 size={18} />
            </div>
            <span className="font-semibold text-slate-700 dark:text-slate-200">Voir sondages</span>
          </div>
        </Link>
        <Link to="/exams" className="group">
          <div className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm">
            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
              <Calendar size={18} />
            </div>
            <span className="font-semibold text-slate-700 dark:text-slate-200">Voir emploi du temps</span>
          </div>
        </Link>
        <Link to="/announcements" className="group">
          <div className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm">
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
              <Megaphone size={18} />
            </div>
            <span className="font-semibold text-slate-700 dark:text-slate-200">Lire annonces</span>
          </div>
        </Link>
        <Link to="/profile" className="group">
          <div className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm">
            <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 group-hover:scale-110 transition-transform">
              <Plus size={18} />
            </div>
            <span className="font-semibold text-slate-700 dark:text-slate-200">Rejoindre classe</span>
          </div>
        </Link>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column - Announcements & Exams */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Recent Announcements */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Megaphone size={20} className="text-indigo-500" />
                Annonces récentes
              </h2>
              <Link to="/announcements" className="text-sm font-semibold text-indigo-600 hover:underline">Voir tout</Link>
            </div>
            <div className="space-y-3">
              {announcements.map(ann => {
                const isRead = readStatuses[ann.id];
                return (
                  <div key={ann.id} className={`p-5 rounded-2xl border bg-white dark:bg-slate-900/50 hover:border-indigo-200 dark:hover:border-indigo-900 transition-all group relative ${!isRead ? 'border-indigo-500/30' : 'border-slate-100 dark:border-slate-800'}`}>
                    {!isRead && (
                      <div className="absolute top-4 left-[-4px] w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                    )}
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 transition-colors">{ann.title}</h3>
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
                  </div>
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
                <Calendar size={20} className="text-amber-500" />
                Examens à venir
              </h2>
              <Link to="/exams" className="text-sm font-semibold text-amber-600 hover:underline">Voir tout</Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {exams.map(exam => {
                const left = daysLeft(exam.date);
                return (
                  <div key={exam.id} className="p-5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/50 hover:border-amber-200 dark:hover:border-amber-900 transition-all">
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                        <BookOpen size={20} />
                      </div>
                      <Badge type={left <= 2 ? 'danger' : 'warning'}>J-{left}</Badge>
                    </div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-1">{exam.subject}</h3>
                    <div className="flex flex-col gap-1 text-xs text-slate-400 font-medium">
                      <span className="flex items-center gap-1.5"><Calendar size={12} /> {fmtDate(exam.date)}</span>
                      <span className="flex items-center gap-1.5"><Clock size={12} /> {exam.duration}</span>
                    </div>
                  </div>
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
              <Activity size={20} className="text-rose-500" />
              Activité récente
            </h2>
            <div className="p-6 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/50 space-y-6">
              {activities.map((activity, idx) => (
                <div key={activity.id} className="flex gap-4 relative">
                  {idx !== activities.length - 1 && (
                    <div className="absolute left-[15px] top-8 bottom-[-24px] w-px bg-slate-100 dark:bg-slate-800" />
                  )}
                  <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center z-10 shrink-0">
                    <div className="w-2 h-2 rounded-full bg-indigo-500" />
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
            </div>
          </section>

          {/* Quick Links / Resources */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen size={20} className="text-emerald-500" />
              Ressources utiles
            </h2>
            <div className="space-y-2">
              <a href="#" className="flex items-center justify-between p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group">
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Guide de l'étudiant</span>
                <ExternalLink size={14} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
              </a>
              <a href="#" className="flex items-center justify-between p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group">
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Règlement intérieur</span>
                <ExternalLink size={14} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
              </a>
              <a href="#" className="flex items-center justify-between p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group">
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Contact Administration</span>
                <ExternalLink size={14} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
              </a>
            </div>
          </section>
        </div>

      </div>
    </div>
  );
};
