import React from 'react';
import { ViewState, User, UserRole } from '../types';
import { 
  Home, 
  Megaphone, 
  Calendar, 
  FileText, 
  BarChart2, 
  Video, 
  LogOut, 
  Shield,
  User as UserIcon,
  Filter
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  currentView: ViewState;
  setView: (view: ViewState) => void;
  user: User;
  onLogout: () => void;
  adminClassFilter?: string;
  setAdminClassFilter?: (c: string) => void;
  availableClasses?: string[];
}

export const Layout: React.FC<LayoutProps> = ({ 
  children, currentView, setView, user, onLogout, 
  adminClassFilter, setAdminClassFilter, availableClasses 
}) => {
  
  const NavItem = ({ view, icon: Icon, label, mobileHidden = false }: { view: ViewState, icon: any, label: string, mobileHidden?: boolean }) => {
    if (view === 'ADMIN' && user.role !== UserRole.ADMIN) return null;

    const isActive = currentView === view;
    return (
      <button
        onClick={() => setView(view)}
        className={`
          flex items-center gap-4 p-4 rounded-3xl transition-all duration-300 w-full group relative overflow-hidden
          ${isActive 
            ? 'bg-brand text-white shadow-glow' 
            : 'text-slate-500 hover:bg-white hover:text-brand hover:shadow-card'}
          ${mobileHidden ? 'hidden md:flex' : ''}
        `}
      >
        <Icon size={22} className={`relative z-10 ${isActive ? 'stroke-[2.5px]' : 'stroke-[2px]'}`} />
        <span className={`text-sm font-semibold tracking-wide relative z-10`}>{label}</span>
      </button>
    );
  };

  const MobileNavItem = ({ view, icon: Icon, label }: { view: ViewState, icon: any, label: string }) => {
    if (view === 'ADMIN' && user.role !== UserRole.ADMIN) return null;
    const isActive = currentView === view;
    return (
        <button 
            onClick={() => setView(view)}
            className={`flex flex-col items-center justify-center w-full py-4 transition-all duration-300 relative group`}
        >
            <div className={`p-2 rounded-2xl mb-1 transition-all duration-300 ${isActive ? 'bg-brand/10 text-brand transform -translate-y-1' : 'text-slate-400 group-hover:text-slate-600'}`}>
                <Icon size={24} className={isActive ? 'stroke-[2.5px]' : 'stroke-[2px]'} />
            </div>
            <span className={`text-[10px] font-bold transition-colors duration-300 ${isActive ? 'text-brand' : 'text-slate-300'}`}>
                {label}
            </span>
        </button>
    )
  }

  return (
    <div className="min-h-screen bg-[#F6F9FC] flex font-sans text-slate-800">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-80 bg-[#F6F9FC] fixed h-full z-30 p-6">
        <div className="bg-white rounded-[2.5rem] h-full shadow-soft flex flex-col p-6 border border-white relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-brand/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>

            <div className="flex items-center gap-3 mb-6 px-2 relative z-10">
                <div className="w-12 h-12 bg-gradient-to-br from-brand to-sky-400 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-sky-200">
                    J
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">JàngHub</h1>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Education</p>
                </div>
            </div>

            {/* Admin Supervision Filter */}
            {user.role === UserRole.ADMIN && availableClasses && setAdminClassFilter && (
                <div className="mb-6 bg-slate-50 p-4 rounded-3xl border border-slate-100 relative z-10">
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        <Filter size={12} /> Supervision
                    </label>
                    <select 
                        value={adminClassFilter}
                        onChange={(e) => setAdminClassFilter(e.target.value)}
                        className="w-full bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-brand/50"
                    >
                        <option value="ALL">Toutes les classes</option>
                        {availableClasses.map(cls => (
                            <option key={cls} value={cls}>{cls}</option>
                        ))}
                    </select>
                </div>
            )}

            <nav className="flex-1 space-y-2 overflow-y-auto custom-scrollbar pr-2 relative z-10">
              <NavItem view="HOME" icon={Home} label="Accueil" />
              <NavItem view="ANNOUNCEMENTS" icon={Megaphone} label="Annonces" />
              <NavItem view="SCHEDULE" icon={Calendar} label="Emploi du temps" />
              <NavItem view="EXAMS" icon={FileText} label="DS & Évaluations" />
              <NavItem view="MEET" icon={Video} label="Visioconférence" />
              <NavItem view="POLLS" icon={BarChart2} label="Sondages" />
              <div className="my-6 border-t border-slate-100 mx-4"></div>
              <NavItem view="PROFILE" icon={UserIcon} label="Mon Profil" />
              <NavItem view="ADMIN" icon={Shield} label="Administration" />
            </nav>

            <div className="mt-6 pt-6 border-t border-slate-50 relative z-10">
              <button 
                onClick={onLogout}
                className="flex items-center gap-3 p-4 w-full text-slate-400 hover:text-alert hover:bg-red-50 rounded-3xl transition-all font-bold text-sm group"
              >
                <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
                <span>Déconnexion</span>
              </button>
            </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-80 w-full relative">
        {/* Mobile Header */}
        <header className="md:hidden bg-white/90 backdrop-blur-lg sticky top-0 z-20 border-b border-slate-100 px-6 py-4 flex justify-between items-center shadow-sm">
            <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-brand rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm">
                    J
                </div>
                <h1 className="text-lg font-bold text-slate-800">JàngHub</h1>
            </div>
            <button onClick={() => setView('PROFILE')} className="p-1 rounded-full border-2 border-white shadow-md active:scale-95 transition-transform">
                 <img src={user.avatar} alt="User" className="w-8 h-8 rounded-full object-cover" />
            </button>
        </header>

        <div className="p-5 md:p-10 pb-32 md:pb-10 max-w-7xl mx-auto">
            {children}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-slate-100 flex justify-around items-center z-40 pb-safe shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.05)] rounded-t-[2.5rem]">
        <MobileNavItem view="HOME" icon={Home} label="Accueil" />
        <MobileNavItem view="ANNOUNCEMENTS" icon={Megaphone} label="Actu" />
        <MobileNavItem view="EXAMS" icon={FileText} label="DS" />
        <MobileNavItem view="SCHEDULE" icon={Calendar} label="Planning" />
        <MobileNavItem view="MEET" icon={Video} label="Meet" />
      </nav>
    </div>
  );
};