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
          // Si on a une session mais pas d'user local, on charge
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
    // Définition des valeurs par défaut basées sur l'email
    const isAdminEmail = email.toLowerCase().includes('admin') || email === 'faye@janghub.sn';
    const defaultRole = isAdminEmail ? UserRole.ADMIN : UserRole.STUDENT;
    const defaultClass = isAdminEmail ? 'ADMINISTRATION' : 'Non assigné';
    const defaultName = email.split('@')[0];

    try {
        // 1. On essaie de récupérer le profil
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle();

        if (data) {
            // Profil trouvé : on l'utilise
            setUser({
                id: data.id,
                name: data.full_name || defaultName,
                email: data.email || email,
                role: (data.role as UserRole) || defaultRole,
                classLevel: data.class_level || defaultClass,
                avatar: data.avatar_url || `https://ui-avatars.com/api/?name=${data.full_name || defaultName}&background=random`
            });
        } else {
            // 2. Profil introuvable : On tente de le créer
            console.warn("Profil manquant. Tentative de création...");
            
            const newProfile = {
                id: userId,
                email: email,
                full_name: defaultName,
                role: defaultRole,
                class_level: defaultClass,
                avatar_url: `https://ui-avatars.com/api/?name=${defaultName}&background=random`
            };

            const { error: insertError } = await supabase.from('profiles').insert(newProfile);

            if (insertError) {
                console.error("Impossible de créer le profil en base:", insertError);
            }

            // 3. MODE SECOURS : Même si l'insertion échoue, on connecte l'utilisateur avec les données en mémoire
            // Cela permet de ne jamais bloquer l'utilisateur à l'entrée
            setUser({
                id: userId,
                name: defaultName,
                email: email,
                role: defaultRole,
                classLevel: defaultClass,
                avatar: newProfile.avatar_url
            });
        }
    } catch (e) {
        console.error("Erreur critique fetchProfile:", e);
        // 4. MODE ULTIME SECOURS
        setUser({
            id: userId,
            name: email.split('@')[0],
            email: email,
            role: defaultRole,
            classLevel: defaultClass,
            avatar: `https://ui-avatars.com/api/?name=${email}&background=random`
        });
    } finally {
        setLoading(false);
    }
  };

  const fetchData = async () => {
    if (!user) return;
    
    // On enveloppe tout dans un try/catch global pour éviter qu'une erreur de donnée ne crash l'app
    try {
        const annQuery = supabase.from('announcements').select('*').order('date', { ascending: false });
        const examQuery = supabase.from('exams').select('*').order('date', { ascending: true });
        const meetQuery = supabase.from('meetings').select('*').order('date', { ascending: true });
        const pollQuery = supabase.from('polls').select('*, poll_options(*)').order('created_at', { ascending: false });
        const scheduleQuery = supabase.from('schedules').select('*').order('uploaded_at', { ascending: false });

        const [annResult, examResult, meetResult, pollResult, schedResult] = await Promise.all([
            annQuery, examQuery, meetQuery, pollQuery, scheduleQuery
        ]);

        if (annResult.data) setAnnouncements(annResult.data.map((d: any) => ({
            id: d.id,
            authorId: d.author_id,
            authorName: d.author_name || 'Inconnu',
            classLevel: d.class_level || 'Général',
            content: d.content || '',
            date: d.date || new Date().toISOString(),
            links: d.links || [],
            images: d.images || [],
            attachments: d.attachments || []
        })));
        
        if (examResult.data) setExams(examResult.data.map((d: any) => ({
            id: d.id,
            subject: d.subject || 'Sujet inconnu',
            classLevel: d.class_level || 'Général',
            date: d.date || new Date().toISOString(),
            duration: d.duration || '2h',
            room: d.room || 'Salle inconnue',
            notes: d.notes,
            authorId: d.author_id
        })));

        if (meetResult.data) setMeetings(meetResult.data.map((d: any) => ({
            id: d.id,
            title: d.title || 'Réunion',
            classLevel: d.class_level,
            date: d.date,
            time: d.time,
            link: d.link,
            platform: d.platform || 'Autre',
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
        console.error("Erreur lors du chargement des données (non bloquant):", err);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const getFilteredData = <T extends { classLevel: string }>(data: T[]) => {
      if (user?.role === UserRole.ADMIN) {
          if (adminClassFilter === 'ALL') return data;
          return data.filter(item => item.classLevel === adminClassFilter);
      }
      return data.filter(item => item.classLevel === user?.classLevel);
  };

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
                <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">Connexion à JàngHub...</p>
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
                fetchData(); 
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
            votePoll={() => fetchData()} 
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