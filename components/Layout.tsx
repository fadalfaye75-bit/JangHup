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
  MessageSquare,
  Vote,
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
import { Badge } from './ui';
import { useTheme } from '../src/theme/theme';
import { cn } from '../lib/utils';

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
    { icon: MessageSquare, label: 'Forum', path: '/forum' },
    { icon: Video, label: 'Réunions', path: '/meetings' },
    { icon: Vote, label: 'Sondages', path: '/polls' },
    { icon: Bell, label: 'Notifications', path: '/notifications' },
    { icon: User, label: 'Profil', path: '/profile' },
  ];

  if (user?.role === UserRole.ADMIN) {
    menuItems.push({ icon: Settings, label: 'Admin', path: '/admin' });
  }

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-transparent transition-colors duration-500 overflow-hidden">
      {/* Sidebar - Desktop */}
      <motion.aside 
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className={`hidden md:flex flex-col glass-ultra m-6 mr-0 rounded-[32px] transition-all duration-500 z-50 ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}
      >
        <div className="p-8 flex items-center justify-between">
          {!isSidebarCollapsed ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-3"
            >
              <div className="relative group">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary via-neon-blue to-accent shadow-[0_0_20px_rgba(108,99,255,0.4)] flex items-center justify-center text-white font-black text-xl">
                  J
                </div>
                <div className="absolute inset-0 blur-xl bg-primary/30 group-hover:bg-primary/50 transition-colors" />
              </div>
              <span className="font-black text-2xl tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
                JangHup
              </span>
            </motion.div>
          ) : (
            <div className="relative group mx-auto">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary via-neon-blue to-accent shadow-[0_0_20px_rgba(108,99,255,0.4)] flex items-center justify-center text-white font-black text-xl">
                J
              </div>
              <div className="absolute inset-0 blur-xl bg-primary/30 group-hover:bg-primary/50 transition-colors" />
            </div>
          )}
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`relative flex items-center gap-4 px-4 py-3 rounded-2xl transition-all duration-500 group ${
                  isActive 
                    ? 'text-white' 
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
                title={isSidebarCollapsed ? item.label : undefined}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-gradient-to-r from-primary/20 to-neon-blue/20 rounded-2xl border border-primary/30 shadow-[0_0_15px_rgba(108,99,255,0.2)]"
                    initial={false}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon size={22} className={cn("relative z-10 transition-all duration-500 group-hover:scale-110 group-hover:rotate-3", isActive && "text-primary")} />
                {!isSidebarCollapsed && (
                  <span className="font-bold text-sm relative z-10 tracking-tight">{item.label}</span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-6 border-t border-white/5">
          <button
            onClick={handleLogout}
            className="flex items-center gap-4 px-4 py-3 w-full rounded-2xl text-slate-400 hover:text-danger hover:bg-danger/10 transition-all duration-500 group"
            title={isSidebarCollapsed ? "Déconnexion" : undefined}
          >
            <LogOut size={22} className="group-hover:-translate-x-1 transition-transform" />
            {!isSidebarCollapsed && <span className="font-bold text-sm">Déconnexion</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {isOffline && (
          <div className="bg-warning/10 backdrop-blur-md text-warning px-4 py-2 text-xs font-bold text-center flex items-center justify-center gap-2 border-b border-warning/20">
            <AlertTriangle size={14} />
            Mode hors ligne activé
          </div>
        )}
        
        {/* Topbar */}
        <motion.header 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mx-6 lg:mx-10 mt-6 px-8 py-4 glass-ultra rounded-[24px] flex items-center justify-between z-40"
        >
          <div className="flex items-center gap-6 flex-1">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2 text-slate-400 hover:bg-white/5 rounded-xl transition-colors"
            >
              <Menu size={24} />
            </button>
            
            <button 
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="hidden md:flex p-2 text-slate-400 hover:bg-white/5 rounded-xl transition-colors"
            >
              <Menu size={22} />
            </button>
            
            <button 
              onClick={() => setIsSearchOpen(true)}
              className="flex items-center gap-3 px-6 py-2.5 bg-white/5 border border-white/5 hover:border-primary/40 rounded-2xl text-slate-400 hover:text-slate-200 transition-all duration-500 w-full max-w-sm group"
            >
              <Search size={18} className="group-hover:text-primary transition-colors" />
              <span className="text-sm font-bold tracking-tight">Recherche intelligente...</span>
              <div className="ml-auto hidden sm:flex items-center gap-1.5 text-[10px] font-black bg-white/10 px-2 py-1 rounded-lg border border-white/10">
                <Command size={12} /> K
              </div>
            </button>
          </div>

          <div className="flex items-center gap-4 md:gap-6">
            <motion.button
              whileHover={{ scale: 1.15, rotate: 15 }}
              whileTap={{ scale: 0.9 }}
              onClick={toggleTheme}
              className="p-3 rounded-2xl text-slate-400 hover:bg-white/5 transition-colors"
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </motion.button>

            <NotificationBell />

            <div className="flex items-center gap-4 pl-6 border-l border-white/10">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-black leading-none mb-1.5 tracking-tight">{user?.name}</p>
                <Badge type="primary" className="text-[9px] px-2 py-0.5">{user?.role}</Badge>
              </div>
              <motion.div 
                whileHover={{ scale: 1.1 }}
                className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-primary via-neon-blue to-accent p-[2px] cursor-pointer shadow-lg shadow-primary/20"
              >
                <div className="w-full h-full rounded-2xl bg-slate-900 border-2 border-transparent overflow-hidden">
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id}`} alt="User" className="w-full h-full object-cover" />
                </div>
              </motion.div>
            </div>
          </div>
        </motion.header>

        {/* Page Content */}
        <div id="scroll-container" className="flex-1 p-4 lg:p-8 overflow-y-auto custom-scrollbar">
          <div className="max-w-[1400px] mx-auto pb-24 md:pb-0">
            {children}
          </div>
        </div>

        {/* Mobile Bottom Navigation */}
        <motion.nav 
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="md:hidden fixed bottom-6 left-6 right-6 h-16 glass rounded-[24px] flex items-center justify-around px-4 z-50 shadow-2xl"
        >
          {menuItems.slice(0, 4).map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex flex-col items-center gap-1 transition-all duration-300",
                  isActive ? "text-primary scale-110" : "text-slate-400"
                )}
              >
                <Icon size={20} />
                <span className="text-[10px] font-bold uppercase tracking-tighter">{item.label.split(' ')[0]}</span>
              </Link>
            );
          })}
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="flex flex-col items-center gap-1 text-slate-400 hover:text-primary transition-all"
          >
            <Menu size={20} />
            <span className="text-[10px] font-bold uppercase tracking-tighter">Menu</span>
          </button>
        </motion.nav>
      </main>

      {/* Mobile Sidebar Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-slate-950/40 backdrop-blur-md z-[60] md:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-72 glass z-[70] md:hidden flex flex-col m-4 rounded-[32px] overflow-hidden"
            >
              <div className="p-6 flex items-center justify-between border-b border-[var(--border-main)]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/20 flex items-center justify-center text-white font-bold text-xl">
                    J
                  </div>
                  <span className="font-bold text-xl tracking-tighter">JangHup</span>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-slate-500 dark:text-slate-400 hover:bg-black/5 rounded-full">
                  <X size={24} />
                </button>
              </div>
              <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                {menuItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300",
                        isActive 
                          ? 'bg-primary/10 text-primary border border-primary/20' 
                          : 'text-slate-500 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5'
                      )}
                    >
                      <Icon size={20} />
                      <span className="font-bold text-sm">{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
              <div className="p-4 border-t border-[var(--border-main)]">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-4 py-3 w-full rounded-2xl text-danger hover:bg-danger/10 transition-all duration-300"
                >
                  <LogOut size={20} />
                  <span className="font-bold text-sm">Déconnexion</span>
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <GlobalSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </div>
  );
};
