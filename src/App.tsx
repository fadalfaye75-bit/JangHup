import React from 'react';
import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Login } from './pages/Login';
import { Layout } from './components/Layout';
import { UserRole } from './types';
import { Loader2 } from 'lucide-react';
import { ThemeProvider } from './theme/theme';
import { ErrorBoundary } from './components/ErrorBoundary';
import { NotificationListener } from './components/NotificationListener';
import { AnimatePresence, motion } from 'motion/react';

// Standard imports for instant tab switching (no network delay)
import { Dashboard } from './pages/Dashboard';
import { Announcements } from './pages/Announcements';
import { Exams } from './pages/Exams';
import { Meet } from './pages/Meet';
import { Class } from './pages/Class';
import { Profile } from './pages/Profile';
import { Admin } from './pages/Admin';
import { Sondages as Polls } from './pages/Sondages';
import { Resources } from './pages/Resources';
import { Forum } from './pages/Forum';
import { Notifications } from './pages/Notifications';
import { PollAnalyticsPage } from './pages/PollAnalyticsPage';

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
      <Outlet />
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
        initial={{ opacity: 0, x: 20, filter: 'blur(10px)' }}
        animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
        exit={{ opacity: 0, x: -20, filter: 'blur(10px)' }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
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
