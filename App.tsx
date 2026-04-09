import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './lib/AuthContext';
import { Login } from './components/Login';
import { Layout } from './components/Layout';
import { UserRole } from './types';
import { Loader2 } from 'lucide-react';
import { ThemeProvider } from './src/theme/theme';

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

const ProtectedRoute: React.FC<{ children: React.ReactNode; roles?: UserRole[] }> = ({ children, roles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0f1115]">
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

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <Layout>{children}</Layout>;
};

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0f1115]">
        <Loader2 className="animate-spin text-primary" size={48} />
      </div>
    );
  }

  return (
    <ThemeProvider>
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0f1115]">
          <Loader2 className="animate-spin text-primary" size={48} />
        </div>
      }>
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login onLogin={() => {}} />} />
          
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/announcements" element={<ProtectedRoute><Announcements /></ProtectedRoute>} />
          <Route path="/exams" element={<ProtectedRoute><Exams /></ProtectedRoute>} />
          <Route path="/resources" element={<ProtectedRoute><Resources /></ProtectedRoute>} />
          <Route path="/forum" element={<ProtectedRoute><Forum /></ProtectedRoute>} />
          <Route path="/meetings" element={<ProtectedRoute><Meet /></ProtectedRoute>} />
          <Route path="/polls" element={<ProtectedRoute><Polls /></ProtectedRoute>} />
          <Route path="/class" element={<ProtectedRoute><Class /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute roles={[UserRole.ADMIN]}>
                <Admin />
              </ProtectedRoute>
            } 
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </ThemeProvider>
  );
}

export default App;
