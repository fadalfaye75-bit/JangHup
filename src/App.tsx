import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Login } from './pages/Login';
import { Layout } from './components/Layout';
import { UserRole } from './types';
import { Loader2, WifiOff } from 'lucide-react';
import { ThemeProvider } from './theme/theme';
import { ErrorBoundary } from './components/ErrorBoundary';
import { NotificationListener } from './components/NotificationListener';
import { AnimatePresence, motion } from 'motion/react';
import { useOnlineStatus } from './hooks/useOnlineStatus';

// Senior Architecture: Code Splitting (React.lazy)
// Reduces initial bundle size and improves performance Metrics (LCP/FID)
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Announcements = lazy(() => import('./pages/Announcements').then(m => ({ default: m.Announcements })));
const Exams = lazy(() => import('./pages/Exams').then(m => ({ default: m.Exams })));
const Meet = lazy(() => import('./pages/Meet').then(m => ({ default: m.Meet })));
const Class = lazy(() => import('./pages/Class').then(m => ({ default: m.Class })));
const Profile = lazy(() => import('./pages/Profile').then(m => ({ default: m.Profile })));
const Admin = lazy(() => import('./pages/Admin').then(m => ({ default: m.Admin })));
const Polls = lazy(() => import('./pages/Sondages').then(m => ({ default: m.Sondages })));
const Resources = lazy(() => import('./pages/Resources').then(m => ({ default: m.Resources })));
const Forum = lazy(() => import('./pages/Forum').then(m => ({ default: m.Forum })));
const Notifications = lazy(() => import('./pages/Notifications').then(m => ({ default: m.Notifications })));
const PollAnalyticsPage = lazy(() => import('./pages/PollAnalyticsPage').then(m => ({ default: m.PollAnalyticsPage })));

const PageFallback = () => (
  <div className="flex-1 flex items-center justify-center p-20">
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center gap-4"
    >
      <Loader2 className="animate-spin text-primary/30" size={32} />
      <span className="text-[10px] font-bold uppercase tracking-widest text-primary/40">Chargement...</span>
    </motion.div>
  </div>
);

const ProtectedLayout: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-main)]">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-6"
        >
          <Loader2 className="animate-spin text-primary" size={48} />
          <p className="text-primary font-bold tracking-wider uppercase text-xs">Initialisation de JangHup...</p>
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Layout>
      <Suspense fallback={<PageFallback />}>
        <Outlet />
      </Suspense>
    </Layout>
  );
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  if (user?.role !== UserRole.ADMIN) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

const AnimatedRoutes = () => {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15, ease: "easeInOut" }}
        className="h-full"
      >
        <Routes location={location}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/announcements" element={<Announcements />} />
          <Route path="/exams" element={<Exams />} />
          <Route path="/resources" element={<Resources />} />
          <Route path="/forum" element={<Forum />} />
          <Route path="/meetings" element={<Meet />} />
          <Route path="/polls" element={<Polls />} />
          <Route path="/polls/:id/analytics" element={<PollAnalyticsPage />} />
          <Route path="/class" element={<Class />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
};

function App() {
  const { user, loading } = useAuth();
  const isOnline = useOnlineStatus();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-main)]">
        <Loader2 className="animate-spin text-primary" size={48} />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <NotificationListener />
        
        {/* Offline Interaction Lock */}
        {!isOnline && (
          <motion.div 
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            className="fixed top-0 left-0 right-0 z-[200] bg-orange-500 text-white py-2 px-4 flex items-center justify-center gap-3 text-xs font-bold uppercase tracking-wider shadow-lg"
          >
            <WifiOff size={14} />
            Mode hors ligne — Certaines fonctionnalités sont limitées
          </motion.div>
        )}

        <Routes>
          <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
          <Route element={<ProtectedLayout />}>
            <Route path="*" element={<AnimatedRoutes />} />
          </Route>
        </Routes>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
