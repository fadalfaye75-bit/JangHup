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
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { GlobalSearch } from './GlobalSearch';
import { NotificationBell } from './NotificationBell';
import { Badge, Avatar, ConfirmModal } from './ui';
import { useTheme } from '../theme/theme';
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
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
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
    <div className="flex h-[100dvh] bg-[var(--bg-main)] transition-colors duration-300 overflow-hidden hide-scrollbar">
      {/* Sidebar - Desktop */}
      <motion.aside 
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className={`hidden md:flex flex-col bg-[var(--bg-card)] border-r border-[var(--border-main)] transition-all duration-300 z-50 ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}
      >
        <div className="p-6 flex items-center justify-between">
          {!isSidebarCollapsed ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-lg">
                J
              </div>
              <span className="font-bold text-xl tracking-tight text-[var(--text-main)]">
                JangHup
              </span>
            </motion.div>
          ) : (
            <div className="w-8 h-8 rounded-lg bg-primary mx-auto flex items-center justify-center text-white font-bold text-lg">
              J
            </div>
          )}
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={isMobileMenuOpen ? () => setIsMobileMenuOpen(false) : undefined}
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group active:scale-95 ${
                  isActive 
                    ? 'text-primary bg-primary/5' 
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-[var(--bg-main)]'
                }`}
                title={isSidebarCollapsed ? item.label : undefined}
              >
                <Icon size={20} className={cn("relative z-10", isActive && "text-primary")} />
                {!isSidebarCollapsed && (
                  <span className="font-medium text-sm relative z-10">{item.label}</span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[var(--border-main)]">
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-[var(--text-secondary)] hover:text-danger hover:bg-danger/5 transition-all duration-200 group"
            title={isSidebarCollapsed ? "Déconnexion" : undefined}
          >
            <LogOut size={20} />
            {!isSidebarCollapsed && <span className="font-medium text-sm">Déconnexion</span>}
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
          className="h-16 px-6 lg:px-8 bg-[var(--bg-card)] border-b border-[var(--border-main)] flex items-center justify-between z-40"
        >
          <div className="flex items-center gap-4 flex-1">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-main)] rounded-lg transition-colors"
            >
              <Menu size={20} />
            </button>
            
            <button 
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="hidden md:flex p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-main)] rounded-lg transition-colors"
            >
              <Menu size={20} />
            </button>
            
            <button 
              onClick={() => setIsSearchOpen(true)}
              className="flex items-center gap-3 px-4 py-2 bg-[var(--bg-main)] border border-[var(--border-main)] hover:border-primary/40 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-all duration-200 w-full max-w-sm group"
            >
              <Search size={16} className="group-hover:text-primary transition-colors" />
              <span className="text-sm">Recherche...</span>
              <div className="ml-auto hidden sm:flex items-center gap-1 text-[10px] font-bold bg-[var(--bg-card)] px-1.5 py-0.5 rounded border border-[var(--border-main)]">
                <Command size={10} /> K
              </div>
            </button>
          </div>

          <div className="flex items-center gap-3 md:gap-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleTheme}
              className="p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-main)] transition-colors"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </motion.button>

            <NotificationBell />

            <div className="flex items-center gap-3 pl-4 border-l border-[var(--border-main)]">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-bold leading-none mb-1 text-[var(--text-main)]">{user?.name}</p>
                <Badge variant="primary" className="text-[10px] px-1.5 py-0">{user?.role}</Badge>
              </div>
              <Avatar 
                src={user?.avatar} 
                name={user?.name} 
                size="sm" 
                className="cursor-pointer"
                onClick={() => navigate('/profile')}
              />
            </div>
          </div>
        </motion.header>

        {/* Page Content */}
        <div 
          id="scroll-container" 
          className={cn(
            "flex-1 custom-scrollbar",
            location.pathname === '/forum' ? "p-0 overflow-hidden" : "p-4 lg:p-8 overflow-y-auto"
          )}
        >
          <div className={cn(
            "mx-auto",
            location.pathname === '/forum' ? "max-w-full h-full pb-16 md:pb-0" : "max-w-full pb-24 md:pb-0"
          )}>
            {children}
          </div>
        </div>

        {/* Mobile Bottom Navigation */}
        <motion.nav 
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="md:hidden fixed bottom-0 left-0 right-0 h-auto bg-[var(--bg-card)] border-t border-[var(--border-main)] flex items-center justify-around px-4 z-50 pb-[env(safe-area-inset-bottom)]"
        >
          {menuItems.slice(0, 4).map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex flex-col items-center justify-center min-h-[56px] min-w-[56px] gap-1 transition-all duration-200 active:scale-95",
                  isActive ? "text-primary" : "text-[var(--text-secondary)]"
                )}
              >
                <Icon size={20} />
                <span className="text-[10px] font-medium">{item.label.split(' ')[0]}</span>
              </Link>
            );
          })}
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="flex flex-col items-center justify-center min-h-[56px] min-w-[56px] gap-1 text-[var(--text-secondary)] active:scale-95 transition-transform"
          >
            <Menu size={20} />
            <span className="text-[10px] font-medium">Menu</span>
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
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60] md:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              drag="x"
              dragConstraints={{ left: -100, right: 0 }}
              dragElastic={0.1}
              onDragEnd={(e, { offset, velocity }) => {
                if (offset.x < -50 || velocity.x < -500) {
                  setIsMobileMenuOpen(false);
                }
              }}
              className="fixed inset-y-0 left-0 w-72 bg-[var(--bg-card)] z-[70] md:hidden flex flex-col shadow-xl"
            >
              <div className="p-6 flex items-center justify-between border-b border-[var(--border-main)]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-lg">
                    J
                  </div>
                  <span className="font-bold text-xl tracking-tight text-[var(--text-main)]">JangHup</span>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-main)] rounded-lg">
                  <X size={20} />
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
                        "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
                        isActive 
                          ? 'bg-primary/10 text-primary' 
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-[var(--bg-main)]'
                      )}
                    >
                      <Icon size={20} />
                      <span className="font-medium text-sm">{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
              <div className="p-4 border-t border-[var(--border-main)]">
                <button
                  onClick={() => setShowLogoutConfirm(true)}
                  className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-danger hover:bg-danger/5 transition-all duration-200"
                >
                  <LogOut size={20} />
                  <span className="font-medium text-sm">Déconnexion</span>
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <GlobalSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      
      <ConfirmModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
        title="Déconnexion"
        message="Êtes-vous sûr de vouloir vous déconnecter ? Vous devrez vous reconnecter pour accéder à votre espace."
        confirmText="Se déconnecter"
        cancelText="Rester connecté"
        type="danger"
      />
    </div>
  );
};
