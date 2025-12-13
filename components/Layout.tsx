import React, { useState, useEffect } from 'react';
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
  ChevronRight,
  Moon,
  Sun,
  Search,
  HelpCircle
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
  darkMode: boolean;
  toggleTheme: () => void;
  onOpenSearch: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ 
  children, currentView, setView, user, onLogout, 
  adminClassFilter, setAdminClassFilter, availableClasses,
  darkMode, toggleTheme, onOpenSearch
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  
  // Shortcut listener for Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpenSearch();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpenSearch]);

  // LOGO COMPONENT
  const JangHubLogo = ({ className = "w-8 h-8" }: { className?: string }) => (
    <div className={className}>
        <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <circle cx="20" cy="10" r="4" className="fill-university dark:fill-sky-500" />
            <path d="M20 16H10C7.79086 16 6 17.7909 6 20V32C6 33.1046 6.89543 34 8 34H20V16Z" className="fill-university dark:fill-sky-500" />
            <path d="M20 16H30C32.2091 16 34 17.7909 34 20V32C34 33.1046 33.1046 34 32 34H20V16Z" className="fill-brand dark:fill-sky-300" />
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
            ? 'bg-university text-white shadow-md shadow-university/20 dark:bg-sky-600 dark:shadow-sky-900/20' 
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'}
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
            <div className={`p-1.5 rounded-xl mb-1 transition-all ${isActive ? 'bg-university text-white shadow-md transform -translate-y-1 dark:bg-sky-600' : 'text-slate-400 dark:text-slate-500'}`}>
                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
            </div>
            <span className={`text-[10px] font-bold ${isActive ? 'text-university dark:text-sky-400' : 'text-slate-400 dark:text-slate-600'}`}>
                {label}
            </span>
        </button>
    )
  }

  return (
    <div className="min-h-screen bg-[#F4F6F8] dark:bg-slate-950 flex font-sans text-slate-800 dark:text-slate-100 transition-colors duration-300">
      
      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm animate-in fade-in" onClick={() => setShowLogoutConfirm(false)}></div>
            <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-xs w-full p-6 animate-in zoom-in-95 duration-200">
                <div className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-full flex items-center justify-center mb-4">
                        <LogOut size={24} className="ml-0.5" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Déconnexion</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                        Êtes-vous sûr de vouloir vous déconnecter de JàngHub ?
                    </p>
                    
                    <div className="flex gap-3 w-full">
                        <button 
                            onClick={() => setShowLogoutConfirm(false)}
                            className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-xs uppercase tracking-wider"
                        >
                            Annuler
                        </button>
                        <button 
                            onClick={() => {
                                setShowLogoutConfirm(false);
                                onLogout();
                            }}
                            className="flex-1 py-2.5 rounded-xl bg-alert hover:bg-red-700 text-white font-bold transition-colors shadow-sm flex items-center justify-center gap-2 text-xs uppercase tracking-wider"
                        >
                            Confirmer
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* --- DESKTOP SIDEBAR --- */}
      <aside className="hidden md:flex flex-col w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 fixed h-full z-30 transition-colors duration-300">
        <div className="flex flex-col h-full">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 flex items-center justify-center">
                        <JangHubLogo className="w-10 h-10" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight leading-none">JàngHub</h1>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mt-1">Université</p>
                    </div>
                </div>
            </div>

            {/* Admin Supervision Filter */}
            {user.role === UserRole.ADMIN && availableClasses && setAdminClassFilter && (
                <div className="px-4 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                    <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 px-1">
                        <Filter size={10} /> Vue Supervision
                    </label>
                    <select 
                        value={adminClassFilter}
                        onChange={(e) => setAdminClassFilter(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg p-2.5 outline-none focus:border-university focus:ring-1 focus:ring-university dark:focus:border-sky-500"
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
              
              <div className="my-6 border-t border-slate-100 dark:border-slate-800 mx-2"></div>
              
              <NavItem view="PROFILE" icon={UserIcon} label="Dossier Étudiant" />
              <NavItem view="ADMIN" icon={Shield} label="Administration" />
            </nav>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 space-y-3">
              <button 
                  onClick={toggleTheme}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold hover:border-university dark:hover:border-sky-500 transition-all"
              >
                  <span className="flex items-center gap-2">
                      {darkMode ? <Moon size={14} /> : <Sun size={14} />} 
                      {darkMode ? 'Mode Sombre' : 'Mode Clair'}
                  </span>
                  <div className={`w-8 h-4 rounded-full relative transition-colors ${darkMode ? 'bg-sky-600' : 'bg-slate-300'}`}>
                      <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${darkMode ? 'translate-x-4' : ''}`}></div>
                  </div>
              </button>

              <div className="flex items-center gap-3 px-2">
                 <img src={user.avatar} alt="User" className="w-9 h-9 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800" />
                 <div className="overflow-hidden">
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{user.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-500 truncate">{user.email}</p>
                 </div>
              </div>
              <button 
                onClick={() => setShowLogoutConfirm(true)}
                className="flex items-center justify-center gap-2 p-2.5 w-full text-slate-600 dark:text-slate-400 hover:text-alert-text hover:bg-alert-light dark:hover:bg-alert/10 hover:border-alert/20 border border-slate-200 dark:border-slate-700 rounded-lg transition-all font-bold text-xs"
              >
                <LogOut size={16} />
                <span>Déconnexion</span>
              </button>
            </div>
        </div>
      </aside>

      {/* --- MAIN CONTENT WRAPPER --- */}
      <main className="flex-1 md:ml-72 w-full relative min-h-screen pb-24 md:pb-10 transition-colors duration-300">
        
        {/* MOBILE HEADER (Sticky) */}
        <header className="md:hidden bg-white/90 dark:bg-slate-900/90 backdrop-blur-md sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex justify-between items-center shadow-sm transition-all">
            <div className="flex items-center gap-2.5">
                <JangHubLogo className="w-8 h-8" />
                <div>
                  <h1 className="text-lg font-bold text-slate-800 dark:text-white leading-none">JàngHub</h1>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Portail {user.classLevel}</p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <button 
                    onClick={onOpenSearch} 
                    className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                    <Search size={20} />
                </button>
                <button 
                    onClick={() => setIsMobileMenuOpen(true)} 
                    className="relative p-0.5 rounded-full border border-slate-200 dark:border-slate-700 hover:border-university dark:hover:border-sky-500 transition-colors"
                >
                     <img src={user.avatar} alt="User" className="w-8 h-8 rounded-full object-cover" />
                     {/* Online Dot */}
                     <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full"></div>
                </button>
            </div>
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
                <div className="relative w-[80%] max-w-sm bg-white dark:bg-slate-900 h-full shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col border-l border-slate-200 dark:border-slate-800">
                    <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <img src={user.avatar} alt="Profile" className="w-12 h-12 rounded-full border-2 border-white dark:border-slate-700 shadow-sm" />
                            <div>
                                <h3 className="font-bold text-slate-800 dark:text-white text-sm truncate max-w-[140px]">{user.name}</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{user.classLevel}</p>
                            </div>
                        </div>
                        <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-white dark:bg-slate-800 rounded-full text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 shadow-sm border border-slate-100 dark:border-slate-700">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2 mb-2">Navigation</p>
                        <NavItem view="HOME" icon={Home} label="Tableau de bord" onClick={() => handleMobileNav('HOME')} />
                        <NavItem view="ANNOUNCEMENTS" icon={Megaphone} label="Avis & Annonces" onClick={() => handleMobileNav('ANNOUNCEMENTS')} />
                        <NavItem view="SCHEDULE" icon={Calendar} label="Emploi du temps" onClick={() => handleMobileNav('SCHEDULE')} />
                        <NavItem view="EXAMS" icon={FileText} label="Examens & DS" onClick={() => handleMobileNav('EXAMS')} />
                        
                        <div className="h-4"></div>
                        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2 mb-2">Autres Modules</p>
                        <NavItem view="MEET" icon={Video} label="Visioconférences" onClick={() => handleMobileNav('MEET')} />
                        <NavItem view="POLLS" icon={BarChart2} label="Consultations (Votes)" onClick={() => handleMobileNav('POLLS')} />
                        <NavItem view="PROFILE" icon={UserIcon} label="Mon Profil" onClick={() => handleMobileNav('PROFILE')} />
                        <NavItem view="ADMIN" icon={Shield} label="Administration" onClick={() => handleMobileNav('ADMIN')} />
                    </div>

                    <div className="p-6 border-t border-slate-100 dark:border-slate-800 space-y-3">
                         <button 
                            onClick={toggleTheme}
                            className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold border border-slate-200 dark:border-slate-700"
                         >
                            <span className="flex items-center gap-2">{darkMode ? <Moon size={16}/> : <Sun size={16}/>} Apparence</span>
                            <span className="text-slate-400">{darkMode ? 'Sombre' : 'Clair'}</span>
                         </button>

                         <button 
                            onClick={() => {
                                setIsMobileMenuOpen(false);
                                setShowLogoutConfirm(true);
                            }}
                            className="w-full py-3.5 flex items-center justify-center gap-2 text-alert font-bold bg-alert-light dark:bg-alert/10 rounded-xl transition-all"
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
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-t border-slate-200/60 dark:border-slate-800/60 flex justify-around items-end z-40 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.03)]">
        <MobileNavItem view="HOME" icon={Home} label="Accueil" />
        <MobileNavItem view="SCHEDULE" icon={Calendar} label="Planning" />
        <MobileNavItem view="ANNOUNCEMENTS" icon={Megaphone} label="Avis" />
      </nav>
    </div>
  );
};