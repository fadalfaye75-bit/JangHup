import React, { useState } from 'react';
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
  Filter,
  Menu,
  X,
  ChevronRight
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // LOGO COMPONENT
  const JangHubLogo = ({ className = "w-8 h-8" }: { className?: string }) => (
    <div className={className}>
        <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <circle cx="20" cy="10" r="4" className="fill-university" />
            <path d="M20 16H10C7.79086 16 6 17.7909 6 20V32C6 33.1046 6.89543 34 8 34H20V16Z" className="fill-university" />
            <path d="M20 16H30C32.2091 16 34 17.7909 34 20V32C34 33.1046 33.1046 34 32 34H20V16Z" className="fill-brand" />
            <path d="M20 16V34" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
    </div>
  );

  const handleMobileNav = (view: ViewState) => {
      setView(view);
      setIsMobileMenuOpen(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const NavItem = ({ view, icon: Icon, label, mobileHidden = false, onClick }: { view: ViewState, icon: any, label: string, mobileHidden?: boolean, onClick?: () => void }) => {
    if (view === 'ADMIN' && user.role !== UserRole.ADMIN) return null;

    const isActive = currentView === view;
    return (
      <button
        onClick={() => onClick ? onClick() : setView(view)}
        className={`
          flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 w-full group relative font-medium
          ${isActive 
            ? 'bg-university text-white shadow-md shadow-university/20' 
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}
          ${mobileHidden ? 'hidden md:flex' : ''}
        `}
      >
        <Icon size={20} className={isActive ? 'stroke-[2.5px]' : 'stroke-[2px]'} />
        <span className="text-sm tracking-tight">{label}</span>
        {isActive && <ChevronRight size={16} className="absolute right-4 opacity-50" />}
      </button>
    );
  };

  const MobileNavItem = ({ view, icon: Icon, label }: { view: ViewState, icon: any, label: string }) => {
    if (view === 'ADMIN' && user.role !== UserRole.ADMIN) return null;
    const isActive = currentView === view;
    return (
        <button 
            onClick={() => handleMobileNav(view)}
            className={`flex flex-col items-center justify-center w-full pt-3 pb-1 transition-all duration-200 relative`}
        >
            <div className={`p-1.5 rounded-xl mb-1 transition-all ${isActive ? 'bg-university text-white shadow-md transform -translate-y-1' : 'text-slate-400'}`}>
                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
            </div>
            <span className={`text-[10px] font-bold ${isActive ? 'text-university' : 'text-slate-400'}`}>
                {label}
            </span>
        </button>
    )
  }

  return (
    <div className="min-h-screen bg-[#F4F6F8] flex font-sans text-slate-800">
      
      {/* --- DESKTOP SIDEBAR --- */}
      <aside className="hidden md:flex flex-col w-72 bg-white border-r border-slate-200 fixed h-full z-30">
        <div className="flex flex-col h-full">
            <div className="p-6 border-b border-slate-100">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 flex items-center justify-center">
                        <JangHubLogo className="w-10 h-10" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800 tracking-tight leading-none">JàngHub</h1>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">Université</p>
                    </div>
                </div>
            </div>

            {/* Admin Supervision Filter */}
            {user.role === UserRole.ADMIN && availableClasses && setAdminClassFilter && (
                <div className="px-4 py-4 border-b border-slate-100 bg-slate-50/50">
                    <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 px-1">
                        <Filter size={10} /> Vue Supervision
                    </label>
                    <select 
                        value={adminClassFilter}
                        onChange={(e) => setAdminClassFilter(e.target.value)}
                        className="w-full bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-lg p-2.5 outline-none focus:border-university focus:ring-1 focus:ring-university"
                    >
                        <option value="ALL">Toutes les classes</option>
                        {availableClasses.map(cls => (
                            <option key={cls} value={cls}>{cls}</option>
                        ))}
                    </select>
                </div>
            )}

            <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1.5 custom-scrollbar">
              <NavItem view="HOME" icon={Home} label="Tableau de bord" />
              <NavItem view="ANNOUNCEMENTS" icon={Megaphone} label="Avis & Annonces" />
              <NavItem view="SCHEDULE" icon={Calendar} label="Emploi du temps" />
              <NavItem view="EXAMS" icon={FileText} label="Examens & DS" />
              <NavItem view="MEET" icon={Video} label="Visioconférences" />
              <NavItem view="POLLS" icon={BarChart2} label="Consultations" />
              
              <div className="my-6 border-t border-slate-100 mx-2"></div>
              
              <NavItem view="PROFILE" icon={UserIcon} label="Dossier Étudiant" />
              <NavItem view="ADMIN" icon={Shield} label="Administration" />
            </nav>

            <div className="p-4 border-t border-slate-200 bg-slate-50">
              <div className="flex items-center gap-3 mb-4 px-2">
                 <img src={user.avatar} alt="User" className="w-9 h-9 rounded-full border border-slate-200 bg-white" />
                 <div className="overflow-hidden">
                    <p className="text-sm font-bold text-slate-700 truncate">{user.name}</p>
                    <p className="text-xs text-slate-500 truncate">{user.email}</p>
                 </div>
              </div>
              <button 
                onClick={onLogout}
                className="flex items-center justify-center gap-2 p-2.5 w-full text-slate-600 hover:text-alert-text hover:bg-alert-light hover:border-alert/20 border border-slate-200 rounded-lg transition-all font-bold text-xs"
              >
                <LogOut size={16} />
                <span>Déconnexion</span>
              </button>
            </div>
        </div>
      </aside>

      {/* --- MAIN CONTENT WRAPPER --- */}
      <main className="flex-1 md:ml-72 w-full relative min-h-screen pb-24 md:pb-10">
        
        {/* MOBILE HEADER (Sticky) */}
        <header className="md:hidden bg-white/90 backdrop-blur-md sticky top-0 z-30 border-b border-slate-200 px-4 py-3 flex justify-between items-center shadow-sm transition-all">
            <div className="flex items-center gap-2.5">
                <JangHubLogo className="w-8 h-8" />
                <div>
                  <h1 className="text-lg font-bold text-slate-800 leading-none">JàngHub</h1>
                  <p className="text-[10px] text-slate-500 font-medium">Portail {user.classLevel}</p>
                </div>
            </div>
            <button 
                onClick={() => setIsMobileMenuOpen(true)} 
                className="relative p-0.5 rounded-full border border-slate-200 hover:border-university transition-colors"
            >
                 <img src={user.avatar} alt="User" className="w-8 h-8 rounded-full object-cover" />
                 {/* Online Dot */}
                 <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></div>
            </button>
        </header>

        {/* MOBILE DRAWER (Off-canvas Menu) */}
        {isMobileMenuOpen && (
            <div className="md:hidden fixed inset-0 z-50 flex justify-end">
                {/* Backdrop */}
                <div 
                    className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={() => setIsMobileMenuOpen(false)}
                ></div>
                
                {/* Menu Content */}
                <div className="relative w-[80%] max-w-sm bg-white h-full shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
                    <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <img src={user.avatar} alt="Profile" className="w-12 h-12 rounded-full border-2 border-white shadow-sm" />
                            <div>
                                <h3 className="font-bold text-slate-800 text-sm truncate max-w-[140px]">{user.name}</h3>
                                <p className="text-xs text-slate-500">{user.classLevel}</p>
                            </div>
                        </div>
                        <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-white rounded-full text-slate-400 hover:text-slate-600 shadow-sm border border-slate-100">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2 mb-2">Navigation</p>
                        <NavItem view="HOME" icon={Home} label="Tableau de bord" onClick={() => handleMobileNav('HOME')} />
                        <NavItem view="ANNOUNCEMENTS" icon={Megaphone} label="Avis & Annonces" onClick={() => handleMobileNav('ANNOUNCEMENTS')} />
                        <NavItem view="SCHEDULE" icon={Calendar} label="Emploi du temps" onClick={() => handleMobileNav('SCHEDULE')} />
                        <NavItem view="EXAMS" icon={FileText} label="Examens & DS" onClick={() => handleMobileNav('EXAMS')} />
                        
                        <div className="h-4"></div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2 mb-2">Autres Modules</p>
                        <NavItem view="MEET" icon={Video} label="Visioconférences" onClick={() => handleMobileNav('MEET')} />
                        <NavItem view="POLLS" icon={BarChart2} label="Consultations (Votes)" onClick={() => handleMobileNav('POLLS')} />
                        <NavItem view="PROFILE" icon={UserIcon} label="Mon Profil" onClick={() => handleMobileNav('PROFILE')} />
                        <NavItem view="ADMIN" icon={Shield} label="Administration" onClick={() => handleMobileNav('ADMIN')} />
                    </div>

                    <div className="p-6 border-t border-slate-100">
                         <button 
                            onClick={onLogout}
                            className="w-full py-3.5 flex items-center justify-center gap-2 text-alert font-bold bg-alert-light rounded-xl transition-all"
                         >
                            <LogOut size={18} /> Déconnexion
                         </button>
                    </div>
                </div>
            </div>
        )}

        <div className="p-4 md:p-8 max-w-7xl mx-auto">
            {children}
        </div>
      </main>

      {/* MOBILE BOTTOM NAV (Glassmorphism) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-200/60 flex justify-around items-end z-40 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.03)]">
        <MobileNavItem view="HOME" icon={Home} label="Accueil" />
        <MobileNavItem view="SCHEDULE" icon={Calendar} label="Planning" />
        <MobileNavItem view="ANNOUNCEMENTS" icon={Megaphone} label="Avis" />
        <MobileNavItem view="EXAMS" icon={FileText} label="DS" />
      </nav>
    </div>
  );
};