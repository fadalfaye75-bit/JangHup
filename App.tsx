import React, { useState, useEffect } from 'react';
import { User, ViewState, Announcement, Exam, Poll, Meeting, UserRole, ScheduleItem } from './types';
import { Login } from './components/Login';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Announcements } from './components/Announcements';
import { Schedule } from './components/Schedule';
import { Exams } from './components/Exams';
import { Polls } from './components/Polls';
import { Meet } from './components/Meet';
import { Profile } from './components/Profile';
import { AdminPanel } from './components/AdminPanel';
import { GlobalSearch } from './components/GlobalSearch';
import { supabase } from './lib/supabaseClient';
import { Loader2 } from 'lucide-react';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<ViewState>('HOME');
  
  // Theme State
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('theme');
        if (stored) return stored === 'dark';
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Admin Filter State
  const [adminClassFilter, setAdminClassFilter] = useState<string>('ALL');
  
  // Global Search State
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // App State Data
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);

  // Apply Theme
  useEffect(() => {
    if (darkMode) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
    } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const toggleTheme = () => setDarkMode(!darkMode);

  // --- Auth & Initial Load ---
  useEffect(() => {
    // 1. Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
          fetchUserProfile(session.user.id, session.user.email || '');
      } else {
          setLoading(false);
      }
    });

    // 2. Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
          if (!user || user.id !== session.user.id) {
            fetchUserProfile(session.user.id, session.user.email || '');
          }
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- Data Fetching ---
  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchUserProfile = async (userId: string, email: string) => {
    try {
        // En mode offline/backdoor, on ignore le fetch Supabase
        if (userId === 'admin-preview-id') {
            setLoading(false);
            return;
        }

        const normalizedEmail = email.toLowerCase().trim();
        const isAdminEmail = normalizedEmail === 'faye@janghup.sn' || normalizedEmail === 'faye@janghub.sn';

        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error || !data) {
             console.warn("Profil introuvable, tentative de création automatique...", error);
             
             // LOGIQUE D'AUTO-GUÉRISON (SELF-HEALING) AVEC GESTION ADMIN
             const newProfile = {
                 id: userId,
                 email: email,
                 full_name: email.split('@')[0], 
                 // Force le rôle ADMIN si c'est l'email spécifié
                 role: isAdminEmail ? 'ADMIN' : 'STUDENT', 
                 class_level: isAdminEmail ? 'ADMINISTRATION' : 'Non assigné',
                 avatar_url: `https://ui-avatars.com/api/?name=${email.split('@')[0]}&background=random`
             };

             const { error: insertError } = await supabase.from('profiles').insert(newProfile);
             
             if (!insertError) {
                 setUser({
                    id: userId,
                    name: newProfile.full_name,
                    email: newProfile.email,
                    role: newProfile.role as UserRole,
                    classLevel: newProfile.class_level,
                    avatar: newProfile.avatar_url
                 });
             } else {
                 console.error("Échec de la création automatique du profil", insertError);
                 // Fallback ultime
                 setUser({
                    id: userId,
                    name: email.split('@')[0],
                    email: email,
                    role: isAdminEmail ? UserRole.ADMIN : UserRole.STUDENT,
                    classLevel: 'Non assigné',
                    avatar: `https://ui-avatars.com/api/?name=${email.split('@')[0]}&background=random`
                });
             }
        } else {
            // Profil trouvé normalement
            // CORRECTION AUTOMATIQUE: Si c'est l'admin Faye mais qu'il n'a pas le rôle en DB, on corrige.
            if (isAdminEmail && data.role !== 'ADMIN') {
                await supabase.from('profiles').update({ role: 'ADMIN', class_level: 'ADMINISTRATION' }).eq('id', userId);
                data.role = 'ADMIN';
                data.class_level = 'ADMINISTRATION';
            }

            setUser({
                id: data.id,
                name: data.full_name || email,
                email: data.email || email,
                role: (data.role as UserRole) || UserRole.STUDENT,
                classLevel: data.class_level || 'Non assigné',
                avatar: data.avatar_url || `https://ui-avatars.com/api/?name=${data.full_name || email}&background=random`
            });
        }
    } catch (e) {
        console.error("Critical error fetching profile", e);
    } finally {
        setLoading(false);
    }
  };

  const fetchData = async () => {
    if (!user) return;
    
    // Si c'est l'admin démo/offline, on ne fetch pas les données pour éviter les erreurs
    if (user.id === 'admin-preview-id') return;

    try {
        const annQuery = supabase.from('announcements').select('*').order('date', { ascending: false });
        const examQuery = supabase.from('exams').select('*').order('date', { ascending: true });
        const meetQuery = supabase.from('meetings').select('*').order('date', { ascending: true });
        const scheduleQuery = supabase.from('schedules').select('*').order('uploaded_at', { ascending: false });
        
        // Pour les sondages, on récupère aussi les options
        const pollQuery = supabase.from('polls').select('*, poll_options(*)').order('created_at', { ascending: false });

        const [annResult, examResult, meetResult, pollResult, schedResult] = await Promise.all([
            annQuery, examQuery, meetQuery, pollQuery, scheduleQuery
        ]);

        if (annResult.data) setAnnouncements(annResult.data.map((d: any) => ({
            id: d.id,
            authorId: d.author_id,
            authorName: d.author_name,
            classLevel: d.class_level,
            content: d.content,
            date: d.date,
            links: d.links || [],
            images: d.images || [],
            attachments: d.attachments || []
        })));
        
        if (examResult.data) setExams(examResult.data.map((d: any) => ({
            id: d.id,
            subject: d.subject,
            classLevel: d.class_level,
            date: d.date,
            duration: d.duration,
            room: d.room,
            notes: d.notes,
            authorId: d.author_id
        })));

        if (meetResult.data) setMeetings(meetResult.data.map((d: any) => ({
            id: d.id,
            title: d.title,
            classLevel: d.class_level,
            date: d.date,
            time: d.time,
            link: d.link,
            platform: d.platform,
            authorId: d.author_id,
            authorName: d.author_name
        })));

        if (schedResult.data) setSchedules(schedResult.data.map((d: any) => ({
            id: d.id, 
            title: d.title, 
            classLevel: d.class_level, 
            semester: d.semester, 
            url: d.url, 
            uploadedAt: d.uploaded_at, 
            version: d.version || 1
        })));

        if (pollResult.data) {
            const formattedPolls = pollResult.data.map((p: any) => ({
                id: p.id,
                question: p.question,
                classLevel: p.class_level,
                authorId: p.author_id,
                active: p.active,
                options: p.poll_options ? p.poll_options.sort((a: any, b: any) => a.id.localeCompare(b.id)) : [],
                totalVotes: p.poll_options ? p.poll_options.reduce((acc: number, opt: any) => acc + opt.votes, 0) : 0
            }));
            setPolls(formattedPolls);
        }
    } catch (err) {
        console.error("Error fetching data:", err);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  // --- Filtering Logic for Roles (Security & UX) ---
  const getFilteredData = <T extends { classLevel: string }>(data: T[]) => {
      // 1. ADMIN : Accès total, filtré par l'interface de supervision
      if (user?.role === UserRole.ADMIN) {
          if (adminClassFilter === 'ALL') return data;
          return data.filter(item => item.classLevel === adminClassFilter);
      }
      
      // 2. RESPONSABLE & ÉTUDIANT : Accès strict à leur classe uniquement
      // (Plus les items globaux si on en avait, mais ici classLevel est requis)
      return data.filter(item => item.classLevel === user?.classLevel);
  };

  // Compute available classes for Admin filter based on current data
  const availableClasses = Array.from(new Set([
      ...announcements.map(a => a.classLevel),
      ...exams.map(e => e.classLevel),
      ...meetings.map(m => m.classLevel),
      ...polls.map(p => p.classLevel)
  ])).filter(Boolean).sort();

  if (loading) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-[#F6F9FC] dark:bg-slate-950">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="animate-spin text-university dark:text-sky-400" size={48} />
                <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">Chargement sécurisé...</p>
            </div>
        </div>
    );
  }

  if (!user) {
    return <Login onLogin={(u) => setUser(u)} />;
  }

  return (
    <>
    <Layout 
      currentView={currentView} 
      setView={setCurrentView} 
      user={user} 
      onLogout={handleLogout}
      adminClassFilter={adminClassFilter}
      setAdminClassFilter={setAdminClassFilter}
      availableClasses={availableClasses}
      darkMode={darkMode}
      toggleTheme={toggleTheme}
      onOpenSearch={() => setIsSearchOpen(true)}
    >
      {currentView === 'HOME' && (
        <Dashboard 
            user={user} 
            exams={getFilteredData(exams)} 
            announcements={getFilteredData(announcements)} 
            setView={setCurrentView} 
            onOpenSearch={() => setIsSearchOpen(true)}
        />
      )}
      {currentView === 'ANNOUNCEMENTS' && (
        <Announcements 
            user={user} 
            announcements={getFilteredData(announcements)} 
            addAnnouncement={(a) => {
                setAnnouncements([a, ...announcements]);
                fetchData(); // Refresh to ensure sync
            }} 
            updateAnnouncement={(updated) => {
                setAnnouncements(announcements.map(a => a.id === updated.id ? updated : a));
            }}
            deleteAnnouncement={(id) => {
                setAnnouncements(announcements.filter(a => a.id !== id));
            }} 
        />
      )}
      {currentView === 'SCHEDULE' && (
        <Schedule 
            user={user} 
            schedules={getFilteredData(schedules)} 
            addSchedule={(s) => setSchedules([s, ...schedules])}
            deleteSchedule={(id) => setSchedules(schedules.filter(s => s.id !== id))}
        />
      )}
      {currentView === 'EXAMS' && (
        <Exams 
            user={user} 
            exams={getFilteredData(exams)} 
            addExam={(e) => setExams([...exams, e])}
            updateExam={(updated) => setExams(exams.map(e => e.id === updated.id ? updated : e))}
            deleteExam={(id) => setExams(exams.filter(e => e.id !== id))} 
        />
      )}
      {currentView === 'POLLS' && (
        <Polls 
            user={user} 
            polls={getFilteredData(polls)} 
            addPoll={(p) => setPolls([...polls, p])}
            updatePoll={(updated) => setPolls(polls.map(p => p.id === updated.id ? updated : p))}
            votePoll={() => fetchData()} // Reload to get latest votes
        />
      )}
      {currentView === 'MEET' && (
        <Meet 
            user={user}
            meetings={getFilteredData(meetings)}
            addMeeting={(m) => setMeetings([...meetings, m])}
            updateMeeting={(updated) => setMeetings(meetings.map(m => m.id === updated.id ? updated : m))}
            deleteMeeting={(id) => setMeetings(meetings.filter(m => m.id !== id))}
        />
      )}
      {currentView === 'PROFILE' && (
        <Profile user={user} onLogout={handleLogout} />
      )}
      {currentView === 'ADMIN' && (
        <AdminPanel 
            currentUser={user}
            allAnnouncements={announcements}
            allExams={exams}
            globalStats={{
                announcements: announcements.length,
                exams: exams.length,
                files: schedules.length 
            }}
        />
      )}
    </Layout>
    
    <GlobalSearch 
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onNavigate={setCurrentView}
        data={{
            announcements: getFilteredData(announcements),
            exams: getFilteredData(exams),
            meetings: getFilteredData(meetings),
            schedules: getFilteredData(schedules),
            polls: getFilteredData(polls)
        }}
    />
    </>
  );
}

export default App;