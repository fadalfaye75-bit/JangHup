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
import { supabase } from './lib/supabaseClient';
import { Loader2 } from 'lucide-react';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<ViewState>('HOME');
  
  // Admin Filter State
  const [adminClassFilter, setAdminClassFilter] = useState<string>('ALL');

  // App State Data
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);

  // --- Auth & Initial Load ---
  useEffect(() => {
    // 1. Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchUserProfile(session.user.id);
      else setLoading(false);
    });

    // 2. Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
          if (!user || user.id !== session.user.id) {
            fetchUserProfile(session.user.id);
          }
      } else {
        if (user && !user.id.startsWith('demo-')) {
            setUser(null);
        }
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

  const fetchUserProfile = async (userId: string) => {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (data) {
            setUser({
                id: data.id,
                name: data.full_name || data.email,
                email: data.email,
                role: data.role as UserRole,
                classLevel: data.class_level || '2nde S',
                avatar: data.avatar_url || 'https://ui-avatars.com/api/?name=' + (data.full_name || 'User')
            });
        } else {
            console.log("Profile not found or tables missing, using fallback.");
            setUser({
                id: userId,
                name: session?.user?.email?.split('@')[0] || 'Utilisateur',
                email: session?.user?.email || '',
                role: UserRole.RESPONSIBLE, 
                classLevel: '2nde S', 
                avatar: 'https://ui-avatars.com/api/?name=User&background=87CEEB&color=fff'
            });
        }
    } catch (e) {
        console.error("Error fetching profile", e);
        setUser({
            id: userId,
            name: 'Utilisateur (Erreur)',
            email: session?.user?.email || '',
            role: UserRole.RESPONSIBLE, 
            classLevel: '2nde S', 
            avatar: 'https://ui-avatars.com/api/?name=Error'
        });
    } finally {
        setLoading(false);
    }
  };

  const fetchData = async () => {
    if (!user) return;
    const isGlobalAdmin = user.role === UserRole.ADMIN;
    if (user.id.startsWith('demo-')) return;

    try {
        const annQuery = supabase.from('announcements').select('*').order('date', { ascending: false });
        const examQuery = supabase.from('exams').select('*').order('date', { ascending: true });
        const meetQuery = supabase.from('meetings').select('*').order('date', { ascending: true });
        const pollQuery = supabase.from('polls').select('*, poll_options(*)');

        if (!isGlobalAdmin) {
            annQuery.eq('class_level', user.classLevel);
            examQuery.eq('class_level', user.classLevel);
            meetQuery.eq('class_level', user.classLevel);
            pollQuery.eq('class_level', user.classLevel);
        }

        const [annResult, examResult, meetResult, pollResult] = await Promise.all([
            annQuery, examQuery, meetQuery, pollQuery
        ]);

        if (annResult.data) setAnnouncements(annResult.data.map((d: any) => ({
            id: d.id,
            authorId: d.author_id,
            authorName: d.author_name,
            classLevel: d.class_level,
            content: d.content,
            date: d.date,
            links: d.links,
            images: d.images,
            attachments: d.attachments
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

        if (pollResult.data) {
            const formattedPolls = pollResult.data.map((p: any) => ({
                id: p.id,
                question: p.question,
                classLevel: p.class_level,
                authorId: p.author_id,
                active: p.active,
                options: p.poll_options || [],
                totalVotes: p.poll_options.reduce((acc: number, opt: any) => acc + opt.votes, 0)
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

  // --- Filtering Logic for Admin Supervision ---
  const getFilteredData = <T extends { classLevel: string }>(data: T[]) => {
      if (user?.role !== UserRole.ADMIN || adminClassFilter === 'ALL') return data;
      return data.filter(item => item.classLevel === adminClassFilter);
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
        <div className="min-h-screen flex items-center justify-center bg-[#F6F9FC]">
            <Loader2 className="animate-spin text-brand" size={48} />
        </div>
    );
  }

  if (!user) {
    return <Login onLogin={(u) => setUser(u)} />;
  }

  return (
    <Layout 
      currentView={currentView} 
      setView={setCurrentView} 
      user={user} 
      onLogout={handleLogout}
      adminClassFilter={adminClassFilter}
      setAdminClassFilter={setAdminClassFilter}
      availableClasses={availableClasses}
    >
      {currentView === 'HOME' && (
        <Dashboard 
            user={user} 
            exams={getFilteredData(exams)} 
            announcements={getFilteredData(announcements)} 
            setView={setCurrentView} 
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
            deleteAnnouncement={(id) => {
                setAnnouncements(announcements.filter(a => a.id !== id));
                fetchData();
            }} 
        />
      )}
      {currentView === 'SCHEDULE' && <Schedule user={user} />}
      {currentView === 'EXAMS' && (
        <Exams 
            user={user} 
            exams={getFilteredData(exams)} 
            addExam={(e) => {
                setExams([...exams, e]);
                fetchData();
            }} 
            deleteExam={(id) => {
                setExams(exams.filter(e => e.id !== id));
                fetchData();
            }} 
        />
      )}
      {currentView === 'POLLS' && (
        <Polls 
            user={user} 
            polls={getFilteredData(polls)} 
            addPoll={(p) => {
                setPolls([...polls, p]);
                fetchData();
            }} 
            votePoll={() => fetchData()}
        />
      )}
      {currentView === 'MEET' && (
        <Meet 
            user={user}
            meetings={getFilteredData(meetings)}
            addMeeting={(m) => {
                setMeetings([...meetings, m]);
                fetchData();
            }}
            deleteMeeting={(id) => {
                setMeetings(meetings.filter(m => m.id !== id));
                fetchData();
            }}
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
                files: 100 // Mock value as file count isn't in top state
            }}
        />
      )}
    </Layout>
  );
}

export default App;