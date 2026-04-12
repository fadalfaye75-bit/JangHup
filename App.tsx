import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './src/context/AuthContext';
import { Login } from './src/pages/Login';
import { Layout } from './components/Layout';
import { UserRole } from './types';
import { Loader2 } from 'lucide-react';
import { ThemeProvider } from './src/theme/theme';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { NotificationListener } from './src/components/NotificationListener';
import { AnimatePresence, motion } from 'motion/react';

// Lazy load components for performance
const Dashboard = lazy(() => import('./src/pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Announcements = lazy(() => import('./src/pages/Announcements').then(m => ({ default: m.Announcements })));
const Exams = lazy(() => import('./src/pages/Exams').then(m => ({ default: m.Exams })));
const Meet = lazy(() => import('./src/pages/Meet').then(m => ({ default: m.Meet })));
const Class = lazy(() => import('./src/pages/Class').then(m => ({ default: m.Class })));
const Profile = lazy(() => import('./src/pages/Profile').then(m => ({ default: m.Profile })));
const Admin = lazy(() => import('./src/pages/Admin').then(m => ({ default: m.Admin })));
const Polls = lazy(() => import('./src/pages/Sondages').then(m => ({ default: m.Sondages })));
const Resources = lazy(() => import('./src/pages/Resources').then(m => ({ default: m.Resources })));
const Forum = lazy(() => import('./src/pages/Forum').then(m => ({ default: m.Forum })));
const Notifications = lazy(() => import('./src/pages/Notifications').then(m => ({ default: m.Notifications })));

const ProtectedLayout: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-primary" size={48} />
          <p className="text-slate-500 font-medium">Chargement de JangHup...</p>
        </div>
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
        initial={{ opacity: 0, y: 15, filter: 'blur(4px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        exit={{ opacity: 0, y: -15, filter: 'blur(4px)' }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
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
      <div className="min-h-screen flex items-center justify-center bg-transparent">
        <Loader2 className="animate-spin text-primary" size={48} />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <NotificationListener />
        <Suspense fallback={
          <div className="min-h-screen flex items-center justify-center bg-transparent">
            <Loader2 className="animate-spin text-primary" size={48} />
          </div>
        }>
          <Routes>
            <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
            <Route element={<ProtectedLayout />}>
              <Route path="*" element={<AnimatedRoutes />} />
            </Route>
          </Routes>
        </Suspense>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
