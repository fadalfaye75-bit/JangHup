import React from 'react';
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

// Standard imports for instant tab switching (no network delay)
import { Dashboard } from './src/pages/Dashboard';
import { Announcements } from './src/pages/Announcements';
import { Exams } from './src/pages/Exams';
import { Meet } from './src/pages/Meet';
import { Class } from './src/pages/Class';
import { Profile } from './src/pages/Profile';
import { Admin } from './src/pages/Admin';
import { Sondages as Polls } from './src/pages/Sondages';
import { Resources } from './src/pages/Resources';
import { Forum } from './src/pages/Forum';
import { Notifications } from './src/pages/Notifications';

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
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
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
