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
}

export const Dashboard: React.FC<DashboardProps> = ({ user, exams, announcements, setView }) => {
  const now = new Date();
  const nextWeek = new Date();
  nextWeek.setDate(now.getDate() + 7);

  // Filter is technically done in App.tsx, but good to be safe
  const upcomingExams = exams.filter(e => {
    const examDate = new Date(e.date);
    return examDate >= now && examDate <= nextWeek;
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const quickActions = () => {
    const actions = [];
    
    // Actions for Everyone
    actions.push({
      label: 'Visio',
      icon: Video,
      color: 'bg-indigo-50 text-indigo-500',
      action: () => setView('MEET')
    });

    if (user.role === UserRole.STUDENT) {
      actions.push({
        label: 'Emploi',
        icon: Calendar,
        color: 'bg-sky-50 text-sky-500',
        action: () => setView('SCHEDULE')
      });
      actions.push({
        label: 'Devoirs',
        icon: FileText,
        color: 'bg-emerald-50 text-emerald-500',
        action: () => setView('EXAMS')
      });
       actions.push({
        label: 'Sondages',
        icon: BarChart2,
        color: 'bg-orange-50 text-orange-500',
        action: () => setView('POLLS')
      });
    } else {
      // Teachers/Admin
      actions.push({
        label: 'Publier',
        icon: Plus,
        color: 'bg-sky-50 text-sky-500',
        action: () => setView('ANNOUNCEMENTS')
      });
      actions.push({
        label: 'DS',
        icon: Clock,
        color: 'bg-emerald-50 text-emerald-500',
        action: () => setView('EXAMS')
      });
       actions.push({
        label: 'Sondages',
        icon: BarChart2,
        color: 'bg-orange-50 text-orange-500',
        action: () => setView('POLLS')
      });
    }

    return actions;
  };
  
  const formattedDate = new Intl.DateTimeFormat('fr-FR', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long' 
  }).format(now);

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
            <h1 className="text-4xl font-bold text-slate-800 tracking-tight mb-1">Bonjour, {user.name.split(' ')[0]} 👋</h1>
            <div className="flex items-center gap-3 text-slate-500 font-medium text-sm">
                <span className="first-letter:uppercase">{formattedDate}</span>
                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                <span className="flex items-center gap-1 text-brand font-bold bg-sky-50 px-2 py-0.5 rounded-lg">
                    <Users size={14} /> Classe : {user.classLevel}
                </span>
            </div>
        </div>
        <div className="relative w-full md:w-auto">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
             <input 
                type="text" 
                placeholder="Rechercher..." 
                className="w-full md:w-80 pl-12 pr-6 py-4 bg-white border-0 rounded-full text-sm font-medium focus:outline-none focus:ring-4 focus:ring-brand/10 shadow-soft"
             />
        </div>
      </div>

      {/* Hero / Alerts Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 relative overflow-hidden bg-brand rounded-[2.5rem] p-10 text-white shadow-glow">
            <div className="absolute top-0 right-0 w-80 h-80 bg-white opacity-10 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-sky-900 opacity-10 rounded-full translate-y-1/3 -translate-x-1/4 blur-3xl"></div>
            
            <div className="relative z-10 h-full flex flex-col justify-between">
                <div>
                    <span className="inline-block px-4 py-1.5 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-wider mb-4 border border-white/20">
                        {user.role === UserRole.STUDENT ? 'Espace Élève' : 'Espace Délégué'}
                    </span>
                    <h2 className="text-3xl font-bold mb-3 leading-tight">Bienvenue sur JàngHub</h2>
                    <p className="text-sky-50 opacity-90 max-w-lg leading-relaxed text-lg">
                        Gérez vos activités scolaires pour la classe de <strong>{user.classLevel}</strong>.
                    </p>
                </div>
                <div className="mt-8">
                    <button onClick={() => setView('SCHEDULE')} className="bg-white text-brand px-8 py-3.5 rounded-2xl font-bold text-sm shadow-xl hover:bg-sky-50 transition-colors">
                        Consulter mon emploi du temps
                    </button>
                </div>
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] p-8 shadow-soft border border-white flex flex-col relative overflow-hidden">
              <div className="flex justify-between items-center mb-6 z-10">
                  <h3 className="font-bold text-slate-800 text-lg">Alertes & Rappels</h3>
                  <div className="w-10 h-10 rounded-2xl bg-alert/10 flex items-center justify-center text-alert">
                      <Bell size={20} />
                  </div>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-2 z-10">
                  {upcomingExams.length > 0 ? (
                      upcomingExams.map(exam => (
                          <div key={exam.id} className="flex items-start gap-4 p-4 rounded-3xl bg-white border border-slate-100 shadow-sm hover:border-alert/30 transition-colors group">
                              <div className="mt-1 bg-alert/10 p-2 rounded-xl text-alert group-hover:bg-alert group-hover:text-white transition-colors">
                                  <AlertTriangle size={18} />
                              </div>
                              <div>
                                  <p className="text-sm font-bold text-slate-800">{exam.subject}</p>
                                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                                      {new Date(exam.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })} • {new Date(exam.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute:'2-digit' })}
                                  </p>
                              </div>
                          </div>
                      ))
                  ) : (
                      <div className="h-full flex flex-col items-center justify-center text-slate-300 text-center py-4">
                          <CheckCircle2 size={40} className="mb-3 text-emerald-200" />
                          <p className="text-sm font-medium">Tout est calme.</p>
                      </div>
                  )}
              </div>
          </div>
      </div>

      {/* Quick Actions Grid */}
      <div>
        <h2 className="text-xl font-bold text-slate-800 mb-6 px-2">Accès Rapide</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {quickActions().map((action, idx) => (
                <button 
                    key={idx}
                    onClick={action.action}
                    className="flex flex-col items-center justify-center p-8 bg-white border border-white rounded-[2rem] shadow-soft hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group"
                >
                    <div className={`${action.color} p-5 rounded-[1.5rem] mb-4 transition-transform group-hover:scale-110 shadow-sm`}>
                        <action.icon size={28} />
                    </div>
                    <span className="font-bold text-slate-600 group-hover:text-slate-900">{action.label}</span>
                </button>
            ))}
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Feed */}
          <div className="lg:col-span-2 space-y-6">
              <div className="flex justify-between items-center px-2">
                  <h2 className="text-xl font-bold text-slate-800">Actualités - {user.classLevel}</h2>
                  <button onClick={() => setView('ANNOUNCEMENTS')} className="text-sm text-brand font-bold hover:text-sky-600 transition-colors">Voir tout</button>
              </div>

              <div className="space-y-5">
                  {announcements.slice(0, 3).map((ann) => (
                      <div key={ann.id} className="bg-white p-8 rounded-[2.5rem] shadow-soft border border-white hover:border-brand/20 transition-all cursor-pointer group">
                          <div className="flex justify-between items-start mb-4">
                              <div className="flex items-center gap-4">
                                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold text-white shadow-md
                                      ${ann.authorName.includes('Admin') ? 'bg-indigo-500' : 'bg-brand'}`}>
                                      {ann.authorName.charAt(0)}
                                  </div>
                                  <div>
                                      <p className="font-bold text-slate-800 text-base group-hover:text-brand transition-colors">{ann.authorName}</p>
                                      <p className="text-xs text-slate-400 font-medium">{new Date(ann.date).toLocaleDateString()}</p>
                                  </div>
                              </div>
                              <span className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wide
                                  ${ann.authorName.includes('Admin') ? 'bg-indigo-50 text-indigo-500' : 'bg-sky-50 text-sky-500'}`}>
                                  {ann.authorName.includes('Admin') ? 'Admin' : 'Délégué'}
                              </span>
                          </div>
                          <p className="text-slate-600 leading-relaxed pl-[4rem] line-clamp-3">
                              {ann.content}
                          </p>
                      </div>
                  ))}
                   {announcements.length === 0 && (
                      <div className="bg-white p-12 rounded-[2.5rem] text-center text-slate-300 border border-slate-100 border-dashed">
                          <BookOpen size={48} className="mx-auto mb-4 opacity-50" />
                          <p className="font-medium">Aucune actualité pour la classe {user.classLevel}.</p>
                      </div>
                  )}
              </div>
          </div>

          {/* Side Panel */}
          <div className="space-y-6">
              <div className="flex justify-between items-center px-2">
                  <h2 className="text-xl font-bold text-slate-800">À venir</h2>
                  <button onClick={() => setView('EXAMS')} className="text-sm text-brand font-bold hover:text-sky-600 transition-colors">Calendrier</button>
              </div>

              <div className="bg-white p-8 rounded-[2.5rem] shadow-soft border border-white h-full flex flex-col">
                  <div className="relative border-l-2 border-slate-100 ml-3 space-y-10 py-2 flex-1">
                      {upcomingExams.length > 0 ? upcomingExams.map((exam, i) => (
                          <div key={exam.id} className="relative pl-8">
                              <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white shadow-md bg-brand ring-4 ring-sky-50"></div>
                              <div>
                                  <span className="text-xs font-bold text-brand uppercase mb-1 block tracking-wider">
                                      {new Date(exam.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric' })}
                                  </span>
                                  <h4 className="font-bold text-slate-800 text-base mb-1">{exam.subject}</h4>
                                  <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                                      <span className="flex items-center gap-1"><Clock size={14} className="text-slate-400" /> {new Date(exam.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute:'2-digit' })}</span>
                                  </div>
                              </div>
                          </div>
                      )) : (
                          <div className="pl-8 relative">
                               <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white shadow-sm bg-slate-200"></div>
                               <p className="text-slate-400 text-sm font-medium">Aucun examen prévu.</p>
                          </div>
                      )}
                  </div>
                   <div className="mt-8 pt-6 border-t border-slate-50">
                      <button onClick={() => setView('SCHEDULE')} className="w-full py-4 flex items-center justify-center gap-2 text-sm font-bold text-slate-600 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors">
                          Voir l'emploi du temps <ArrowRight size={18} />
                      </button>
                   </div>
              </div>
          </div>
      </div>
    </div>
  );
};