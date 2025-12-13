import React from 'react';
import { User, Exam, Announcement, ViewState, UserRole } from '../types';
import { 
  Bell, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  Plus, 
  FileText, 
  Video, 
  BookOpen,
  ArrowRight,
  BarChart2,
  CheckCircle2,
  Search,
  Users
} from 'lucide-react';

interface DashboardProps {
  user: User;
  exams: Exam[];
  announcements: Announcement[];
  setView: (view: ViewState) => void;
  onOpenSearch: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, exams, announcements, setView, onOpenSearch }) => {
  const now = new Date();
  const nextWeek = new Date();
  nextWeek.setDate(now.getDate() + 7);

  const upcomingExams = exams.filter(e => {
    const examDate = new Date(e.date);
    return examDate >= now && examDate <= nextWeek;
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const quickActions = () => {
    const actions = [];
    
    actions.push({
      label: 'Visio',
      desc: 'Cours en ligne',
      icon: Video,
      color: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-800',
      action: () => setView('MEET')
    });

    if (user.role === UserRole.STUDENT) {
      actions.push({
        label: 'Emploi',
        desc: 'Mon planning',
        icon: Calendar,
        color: 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/20 border-sky-100 dark:border-sky-800',
        action: () => setView('SCHEDULE')
      });
      actions.push({
        label: 'Devoirs',
        desc: 'Prochains DS',
        icon: FileText,
        color: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-800',
        action: () => setView('EXAMS')
      });
       actions.push({
        label: 'Votes',
        desc: 'Consultations',
        icon: BarChart2,
        color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800',
        action: () => setView('POLLS')
      });
    } else {
      actions.push({
        label: 'Publier',
        desc: 'Nouvelle annonce',
        icon: Plus,
        color: 'text-university dark:text-sky-400 bg-university/10 dark:bg-sky-500/10 border-university/20 dark:border-sky-500/20',
        action: () => setView('ANNOUNCEMENTS')
      });
      actions.push({
        label: 'DS',
        desc: 'Gérer examens',
        icon: Clock,
        color: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-800',
        action: () => setView('EXAMS')
      });
       actions.push({
        label: 'Sondages',
        desc: 'Créer un vote',
        icon: BarChart2,
        color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800',
        action: () => setView('POLLS')
      });
    }

    return actions;
  };
  
  const formattedDate = new Intl.DateTimeFormat('fr-FR', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long',
    year: 'numeric'
  }).format(now);

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
      
      {/* Top Header (Desktop Only for date, Mobile has Sticky Header) */}
      <div className="hidden md:flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white tracking-tight mb-1">Tableau de Bord</h1>
            <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 font-medium text-sm">
                <span className="first-letter:uppercase">{formattedDate}</span>
                <span className="text-slate-300 dark:text-slate-600">|</span>
                <span className="flex items-center gap-1.5 text-university dark:text-sky-400 font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-0.5 rounded-md shadow-sm">
                    <Users size={14} /> {user.classLevel}
                </span>
            </div>
        </div>
        <div className="relative w-full md:w-auto" onClick={onOpenSearch}>
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
             <input 
                type="text" 
                readOnly
                placeholder="Rechercher (Ctrl+K)..." 
                className="w-full md:w-72 pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-university/20 dark:focus:ring-sky-500/20 focus:border-university dark:focus:border-sky-500 shadow-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
             />
        </div>
      </div>

      {/* --- MOBILE: UPCOMING EXAMS HORIZONTAL SCROLL --- */}
      {/* Show only on mobile/tablet to save vertical space */}
      <div className="lg:hidden">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-3 flex items-center gap-2">
             <AlertTriangle size={16} className="text-warning" /> Urgences (7 jours)
          </h3>
          {upcomingExams.length > 0 ? (
              <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 no-scrollbar snap-x">
                  {upcomingExams.map(exam => (
                      <div key={exam.id} className="snap-start min-w-[200px] bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-16 h-16 bg-warning/5 dark:bg-warning/10 rounded-bl-full -mr-4 -mt-4"></div>
                          <div>
                              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">{new Date(exam.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })}</p>
                              <h4 className="font-bold text-slate-800 dark:text-slate-100 leading-tight">{exam.subject}</h4>
                          </div>
                          <div className="mt-3 flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 py-1.5 px-2.5 rounded-lg w-fit">
                              <Clock size={12} /> {new Date(exam.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute:'2-digit' })}
                          </div>
                      </div>
                  ))}
                  {/* View All Card */}
                  <button onClick={() => setView('EXAMS')} className="snap-start min-w-[60px] flex items-center justify-center bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-university dark:hover:text-sky-400">
                      <ArrowRight size={24} />
                  </button>
              </div>
          ) : (
              <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-4 flex items-center justify-center gap-2 text-slate-400 dark:text-slate-500 text-xs font-medium">
                  <CheckCircle2 size={16} className="text-success" /> Rien de prévu cette semaine.
              </div>
          )}
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Welcome Card */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 md:p-8 shadow-card flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-university/5 to-transparent dark:from-sky-500/10 skew-x-12 translate-x-10 pointer-events-none"></div>
            
            <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                     <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-university/10 dark:bg-sky-500/20 text-university dark:text-sky-400">
                        <BookOpen size={14} />
                     </span>
                     <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Espace {user.role === UserRole.STUDENT ? 'Étudiant' : user.role === UserRole.RESPONSIBLE ? 'Délégué' : 'Admin'}
                     </span>
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white mb-2">Bonjour, {user.name.split(' ')[0]}</h2>
                <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed max-w-lg">
                    Vous avez <strong>{announcements.length} nouvelles annonces</strong> et <strong>{upcomingExams.length} examens</strong> à venir pour la classe {user.classLevel}.
                </p>
            </div>
            <div className="mt-6 relative z-10 flex gap-3">
                <button onClick={() => setView('SCHEDULE')} className="flex-1 md:flex-none bg-university hover:bg-university-dark dark:bg-sky-600 dark:hover:bg-sky-700 text-white px-5 py-3 rounded-xl font-bold text-sm shadow-sm transition-colors flex items-center justify-center gap-2 active:scale-95">
                    <Calendar size={16} /> <span className="hidden sm:inline">Mon emploi du temps</span><span className="sm:hidden">Planning</span>
                </button>
            </div>
          </div>

          {/* Quick Stats / Alerts (Desktop Side) */}
          <div className="hidden lg:flex bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-card flex-col">
              <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm uppercase tracking-wide">Prochains Examens</h3>
                  <Bell size={16} className="text-slate-400" />
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1 max-h-[180px]">
                  {upcomingExams.length > 0 ? (
                      upcomingExams.map(exam => (
                          <div key={exam.id} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                              <div className="mt-0.5 text-warning">
                                  <AlertTriangle size={16} />
                              </div>
                              <div>
                                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{exam.subject}</p>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                      {new Date(exam.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} à {new Date(exam.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute:'2-digit' })}
                                  </p>
                              </div>
                          </div>
                      ))
                  ) : (
                      <div className="flex flex-col items-center justify-center h-full py-4 text-slate-400">
                          <CheckCircle2 size={32} className="mb-2 text-success/50" />
                          <p className="text-xs font-medium">Aucun examen imminent.</p>
                      </div>
                  )}
              </div>
          </div>
      </div>

      {/* Quick Actions Grid */}
      <div>
        <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <ArrowRight size={18} className="text-university dark:text-sky-400" /> Accès Rapide
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {quickActions().map((action, idx) => (
                <button 
                    key={idx}
                    onClick={action.action}
                    className="flex flex-col md:flex-row items-center md:items-start gap-3 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl hover:border-university/50 dark:hover:border-sky-500/50 hover:shadow-md transition-all duration-200 group text-center md:text-left active:scale-95"
                >
                    <div className={`w-12 h-12 md:w-10 md:h-10 rounded-xl ${action.color} flex items-center justify-center transition-colors shadow-sm`}>
                        <action.icon size={22} className="md:w-5 md:h-5" />
                    </div>
                    <div>
                        <span className="block font-bold text-slate-700 dark:text-slate-200 text-sm group-hover:text-university dark:group-hover:text-sky-400">{action.label}</span>
                        <span className="hidden md:block text-[10px] text-slate-400 dark:text-slate-500 font-medium">{action.desc}</span>
                    </div>
                </button>
            ))}
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Feed */}
          <div className="lg:col-span-2 space-y-4">
              <div className="flex justify-between items-center bg-slate-100 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                  <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide ml-2">Dernières Actualités</h2>
                  <button onClick={() => setView('ANNOUNCEMENTS')} className="text-xs text-university dark:text-sky-400 font-bold hover:underline px-2">Tout voir</button>
              </div>

              <div className="space-y-4">
                  {announcements.slice(0, 3).map((ann) => (
                      <div key={ann.id} className="bg-white dark:bg-slate-900 p-5 md:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
                          <div className="flex justify-between items-start mb-3">
                              <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-sm font-bold text-slate-600 dark:text-slate-300 shadow-sm">
                                      {ann.authorName.charAt(0)}
                                  </div>
                                  <div>
                                      <p className="font-bold text-slate-800 dark:text-white text-sm">{ann.authorName}</p>
                                      <p className="text-xs text-slate-500 dark:text-slate-400">{new Date(ann.date).toLocaleDateString('fr-FR', {day: 'numeric', month: 'long'})}</p>
                                  </div>
                              </div>
                              <span className={`px-2 py-1 rounded-lg border text-[10px] font-bold uppercase
                                  ${ann.authorName.includes('Admin') ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-100 dark:border-purple-800' : 'bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300 border-sky-100 dark:border-sky-800'}`}>
                                  {ann.authorName.includes('Admin') ? 'Admin' : 'Délégué'}
                              </span>
                          </div>
                          <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed pl-1">
                              {ann.content.length > 150 ? ann.content.substring(0, 150) + '...' : ann.content}
                          </p>
                      </div>
                  ))}
                   {announcements.length === 0 && (
                      <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl text-center border border-dashed border-slate-300 dark:border-slate-700">
                          <BookOpen size={32} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Aucune annonce publiée pour le moment.</p>
                      </div>
                  )}
              </div>
          </div>

          {/* Side Panel (Desktop Compact Calendar List) */}
          <div className="hidden lg:block space-y-4">
              <div className="flex justify-between items-center bg-slate-100 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                  <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide ml-2">Agenda</h2>
                  <button onClick={() => setView('EXAMS')} className="text-xs text-university dark:text-sky-400 font-bold hover:underline px-2">Calendrier</button>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-0 overflow-hidden">
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {upcomingExams.length > 0 ? upcomingExams.map((exam) => (
                          <div key={exam.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                              <div className="flex items-center gap-3 mb-1">
                                  <div className="w-1.5 h-1.5 rounded-full bg-warning"></div>
                                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                                      {new Date(exam.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })}
                                  </span>
                              </div>
                              <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm ml-4.5">{exam.subject}</h4>
                              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 ml-4.5 mt-1">
                                  <Clock size={12} /> {new Date(exam.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute:'2-digit' })}
                              </div>
                          </div>
                      )) : (
                          <div className="p-6 text-center">
                               <p className="text-slate-400 text-xs italic">Aucun événement à venir.</p>
                          </div>
                      )}
                  </div>
                   <div className="p-3 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
                      <button onClick={() => setView('SCHEDULE')} className="w-full py-2 flex items-center justify-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-university dark:hover:text-sky-400 transition-colors">
                          Voir l'emploi du temps complet
                      </button>
                   </div>
              </div>
          </div>
      </div>
    </div>
  );
};