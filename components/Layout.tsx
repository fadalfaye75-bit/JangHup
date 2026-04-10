import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Megaphone, 
  GraduationCap, 
  Video, 
  BarChart3, 
  Bell, 
  User, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  Users,
  ChevronLeft,
  ChevronRight,
  Search,
  BookOpen,
  Sun,
  Moon,
  Command,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../src/context/AuthContext';
import { UserRole } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { GlobalSearch } from './GlobalSearch';
import { NotificationBell } from './NotificationBell';
import { useTheme } from '../src/theme/theme';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: Users, label: 'Ma Classe', path: '/class' },
    { icon: Megaphone, label: 'Annonces', path: '/announcements' },
    { icon: GraduationCap, label: 'Examens', path: '/exams' },
    { icon: BookOpen, label: 'Ressources', path: '/resources' },
    { icon: Users, label: 'Forum', path: '/forum' },
    { icon: Video, label: 'Réunions', path: '/meetings' },
    { icon: BarChart3, label: 'Sondages', path: '/polls' },
    { icon: Bell, label: 'Notifications', path: '/notifications' },
    { icon: User, label: 'Profil', path: '/profile' },
  ];

  if (user?.role === UserRole.ADMIN) {
    menuItems.push({ icon: Settings, label: 'Administration', path: '/admin' });
  }

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-[#f5f7fb] dark:bg-[#0f1115] transition-colors duration-500">
      {/* Sidebar - Desktop */}
      <motion.aside 
        initial={{ x: -50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className={`hidden md:flex flex-col bg-white/40 dark:bg-[#161a22]/60 backdrop-blur-3xl border-r border-slate-200 dark:border-white/5 transition-all duration-300 z-50 ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}
      >
        <div className="p-6 flex items-center justify-between">
          {!isSidebarCollapsed ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#6C63FF] to-[#00C896] shadow-[0_0_20px_rgba(108,99,255,0.4)] flex items-center justify-center text-white font-bold text-lg">
                J
              </div>
              <span className="font-bold text-xl text-slate-800 dark:text-white tracking-tight">
                JangHup
              </span>
            </motion.div>
          ) : (
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#6C63FF] to-[#00C896] shadow-[0_0_20px_rgba(108,99,255,0.4)] flex items-center justify-center text-white font-bold text-lg mx-auto">
              J
            </div>
          )}
          <button 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 transition-colors"
          >
            {isSidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`relative flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-300 group ${
                  isActive 
                    ? 'text-white' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                }`}
                title={isSidebarCollapsed ? item.label : undefined}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-[#6C63FF] rounded-xl shadow-[0_0_15px_rgba(108,99,255,0.4)]"
                    initial={false}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon size={20} className="relative z-10" />
                {!isSidebarCollapsed && (
                  <span className="font-medium relative z-10">{item.label}</span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-white/5">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-3 w-full rounded-xl text-slate-500 dark:text-slate-400 hover:text-[#FF4757] hover:bg-[#FF4757]/10 transition-all duration-300"
            title={isSidebarCollapsed ? "Déconnexion" : undefined}
          >
            <LogOut size={20} />
            {!isSidebarCollapsed && <span className="font-medium">Déconnexion</span>}
          </button>
        </div>
      </motion.aside>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile Sidebar */}
      <motion.aside
        initial={{ x: '-100%' }}
        animate={{ x: isMobileMenuOpen ? 0 : '-100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed inset-y-0 left-0 w-64 bg-white/80 dark:bg-[#161a22]/90 backdrop-blur-3xl z-50 md:hidden flex flex-col border-r border-slate-200 dark:border-white/5"
      >
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#6C63FF] to-[#00C896] shadow-[0_0_20px_rgba(108,99,255,0.4)] flex items-center justify-center text-white font-bold text-lg">
              J
            </div>
            <span className="font-bold text-xl text-slate-800 dark:text-white tracking-tight">
              JangHup
            </span>
          </div>
          <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-slate-500 dark:text-slate-400">
            <X size={24} />
          </button>
        </div>
        <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-300 ${
                  isActive 
                    ? 'bg-[#6C63FF] text-white shadow-[0_0_15px_rgba(108,99,255,0.4)]' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                <Icon size={20} />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-slate-200 dark:border-white/5">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-3 w-full rounded-xl text-slate-500 dark:text-slate-400 hover:text-[#FF4757] hover:bg-[#FF4757]/10 transition-all duration-300"
          >
            <LogOut size={20} />
            <span className="font-medium">Déconnexion</span>
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {isOffline && (
          <div className="bg-warning text-warning-foreground px-4 py-2 text-sm font-medium text-center flex items-center justify-center gap-2">
            <AlertTriangle size={16} />
            Vous êtes hors ligne. Certaines fonctionnalités peuvent être indisponibles.
          </div>
        )}
        {/* Topbar */}
        <motion.header 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="sticky top-4 z-30 mx-4 lg:mx-8 px-6 py-3 bg-white/40 dark:bg-[#161a22]/60 backdrop-blur-2xl border border-slate-200 dark:border-white/5 rounded-2xl flex items-center justify-between shadow-sm dark:shadow-[0_8px_32px_rgba(0,0,0,0.2)]"
        >
          <div className="flex items-center gap-4 flex-1">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg transition-colors"
            >
              <Menu size={24} />
            </button>
            
            <button 
              onClick={() => setIsSearchOpen(true)}
              className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-100/50 dark:bg-black/20 border border-transparent hover:border-[#6C63FF]/50 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-all duration-300 w-64 group"
            >
              <Search size={18} className="group-hover:text-[#6C63FF] transition-colors" />
              <span className="text-sm">Rechercher...</span>
              <div className="ml-auto flex items-center gap-1 text-xs font-medium bg-white dark:bg-black/40 px-1.5 py-0.5 rounded-md border border-slate-200 dark:border-white/10">
                <Command size={12} /> K
              </div>
            </button>
          </div>

          <div className="flex items-center gap-3 md:gap-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleTheme}
              className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </motion.button>

            <NotificationBell />

            <div className="flex items-center gap-3 pl-2 md:pl-4 border-l border-slate-200 dark:border-white/10">
              <div className="hidden md:block text-right">
                <p className="text-sm font-bold text-slate-800 dark:text-white">{user?.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{user?.role.toLowerCase()}</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#6C63FF] to-[#00C896] p-[2px] cursor-pointer">
                <div className="w-full h-full rounded-full bg-[#161a22] border-2 border-transparent overflow-hidden">
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id}`} alt="User" className="w-full h-full object-cover" />
                </div>
              </div>
            </div>
          </div>
        </motion.header>

        {/* Page Content */}
        <div id="scroll-container" className="flex-1 p-4 lg:p-8 overflow-y-auto custom-scrollbar">
          <div className="max-w-[1400px] mx-auto">
            {children}
          </div>
        </div>
      </main>

      <GlobalSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </div>
  );
};
