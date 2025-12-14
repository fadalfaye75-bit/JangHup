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
import { Loader2 } from 'lucide-react';
import { supabase } from './lib/supabaseClient';

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
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) {
             console.error("Profile fetch error:", error);
             // Fallback minimal
             setUser({
                id: userId,
                name: email.split('@')[0],
                email: email,
                role: UserRole.STUDENT, 
                classLevel: 'Licence 2 - Info',
                avatar: `https://ui-avatars.com/api/?name=${email.split('@')[0]}&background=random`
            });
        } else if (data) {
            setUser({
                id: data.id,
                name: data.full_name || email,
                email: data.email || email,
                role: (data.role as UserRole) || UserRole.STUDENT,
                classLevel: data.class_level || 'Licence 2 - Info',
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
    
    try {
        const annQuery = supabase.from('announcements').select('*').order('date', { ascending: false });
        const examQuery = supabase.from('exams').select('*').order('date', { ascending: true });
        const meetQuery = supabase.from('meetings').select('*').order('date', { ascending: true });
        const schedQuery = supabase.from('schedules').select('*').order('uploaded_at', { ascending: false });
        // Fetch polls with options
        const pollQuery = supabase.from('polls').select('*, poll_options(*)').order('created_at', { ascending: false });
        
        // Fetch votes de l'utilisateur courant pour marquer ses choix
        const userVotesQuery = supabase.from('poll_votes').select('*').eq('user_id', user.id);

        const [annResult, examResult, meetResult, pollResult, schedResult, userVotesResult] = await Promise.all([
            annQuery, examQuery, meetQuery, pollQuery, schedQuery, userVotesQuery
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
            version: d.version
        })));

        if (pollResult.data) {
            const userVotes = userVotesResult.data || [];
            const formattedPolls = pollResult.data.map((p: any) => {
                const myVote = userVotes.find((v: any) => v.poll_id === p.id);
                return {
                    id: p.id,
                    question: p.question,
                    classLevel: p.class_level,
                    authorId: p.author_id,
                    active: p.active,
                    options: p.poll_options ? p.poll_options.sort((a: any, b: any) => a.id.localeCompare(b.id)) : [],
                    totalVotes: p.poll_options ? p.poll_options.reduce((acc: number, opt: any) => acc + opt.votes, 0) : 0,
                    userVoteOptionId: myVote?.option_id
                };
            });
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

  // --- CRUD HANDLERS ---
  const handleAddAnnouncement = async (a: Announcement) => {
      setAnnouncements([a, ...announcements]);
      await supabase.from('announcements').insert({
          author_id: user?.id,
          author_name: user?.name,
          class_level: a.classLevel,
          content: a.content,
          links: a.links,
          images: a.images,
          attachments: a.attachments
      });
      fetchData();
  };

  const handleUpdateAnnouncement = async (a: Announcement) => {
      setAnnouncements(announcements.map(item => item.id === a.id ? a : item));
      await supabase.from('announcements').update({
          content: a.content,
          class_level: a.classLevel,
          links: a.links
      }).eq('id', a.id);
  };

  const handleDeleteAnnouncement = async (id: string) => {
      setAnnouncements(announcements.filter(a => a.id !== id));
      await supabase.from('announcements').delete().eq('id', id);
  };

  const handleAddExam = async (e: Exam) => {
      setExams([...exams, e]);
      await supabase.from('exams').insert({
          subject: e.subject,
          class_level: e.classLevel,
          date: e.date,
          duration: e.duration,
          room: e.room,
          notes: e.notes,
          author_id: user?.id
      });
      fetchData();
  };

  const handleUpdateExam = async (e: Exam) => {
      setExams(exams.map(item => item.id === e.id ? e : item));
      await supabase.from('exams').update({
          subject: e.subject,
          date: e.date,
          duration: e.duration,
          room: e.room,
          notes: e.notes
      }).eq('id', e.id);
  };

  const handleDeleteExam = async (id: string) => {
      setExams(exams.filter(e => e.id !== id));
      await supabase.from('exams').delete().eq('id', id);
  };

  const handleAddMeeting = async (m: Meeting) => {
      setMeetings([...meetings, m]);
      await supabase.from('meetings').insert({
          title: m.title,
          class_level: m.classLevel,
          date: m.date,
          time: m.time,
          link: m.link,
          platform: m.platform,
          author_id: user?.id,
          author_name: user?.name
      });
      fetchData();
  };

  const handleAddPoll = async (p: Poll) => {
      setPolls([p, ...polls]);
      const { data } = await supabase.from('polls').insert({
          id: p.id, // Explicitly send ID since we generate it in Polls.tsx as Date.now().toString()
          question: p.question,
          class_level: p.classLevel,
          author_id: user?.id
      }).select().single();

      if (data) {
          const optionsToInsert = p.options.map(opt => ({
              id: opt.id,
              poll_id: data.id,
              text: opt.text,
              votes: 0
          }));
          await supabase.from('poll_options').insert(optionsToInsert);
          fetchData();
      }
  };

  const handleUpdatePoll = async (p: Poll) => {
      // Optimistic Update
      setPolls(polls.map(item => item.id === p.id ? p : item));
      
      // 1. Update Question
      await supabase.from('polls').update({
          question: p.question,
          active: p.active
      }).eq('id', p.id);

      // 2. Synchronize Options
      try {
        // Fetch existing DB options to know what to delete
        const { data: dbOptions } = await supabase.from('poll_options').select('id').eq('poll_id', p.id);
        
        if (dbOptions) {
            const dbIds = dbOptions.map(o => o.id);
            const currentIds = p.options.map(o => o.id);
            
            // Delete removed options
            const idsToDelete = dbIds.filter(id => !currentIds.includes(id));
            if (idsToDelete.length > 0) {
                await supabase.from('poll_options').delete().in('id', idsToDelete);
            }
        }

        // Upsert (Update existing + Insert new)
        const optionsToUpsert = p.options.map(opt => ({
            id: opt.id,
            poll_id: p.id,
            text: opt.text,
            votes: opt.votes // Keep votes safe
        }));

        await supabase.from('poll_options').upsert(optionsToUpsert);

      } catch (e) {
        console.error("Error updating poll options", e);
      }
      
      fetchData();
  };

  const handleDeletePoll = async (id: string) => {
      setPolls(polls.filter(p => p.id !== id));
      await supabase.from('polls').delete().eq('id', id);
  };

  const handleVotePoll = async (pollId: string, optionId: string) => {
      if (!user) return;
      
      const poll = polls.find(p => p.id === pollId);
      if (!poll) return;

      const previousOptionId = poll.userVoteOptionId;
      if (previousOptionId === optionId) return; // Déjà voté pour cette option

      // 1. Mise à jour Optimiste de l'UI
      const newPolls = polls.map(p => {
          if (p.id !== pollId) return p;
          
          const newOptions = p.options.map(o => {
             if (o.id === previousOptionId) return { ...o, votes: o.votes - 1 }; // Enlever l'ancien vote
             if (o.id === optionId) return { ...o, votes: o.votes + 1 }; // Ajouter le nouveau
             return o;
          });

          // Si changement de vote, le total reste le même. Si nouveau vote, +1.
          const totalChange = previousOptionId ? 0 : 1; 

          return {
              ...p,
              options: newOptions,
              totalVotes: p.totalVotes + totalChange,
              userVoteOptionId: optionId
          };
      });
      setPolls(newPolls);

      try {
        // 2. Mise à jour Base de Données
        
        // a. Enregistrer que l'utilisateur a voté pour cette option (Upsert sur la table de liaison)
        const { error: voteError } = await supabase.from('poll_votes').upsert({
             poll_id: pollId,
             user_id: user.id,
             option_id: optionId
        });
        
        if (voteError) {
             console.error("Erreur lors de l'enregistrement du vote:", voteError);
             throw voteError;
        }

        // b. Mettre à jour les compteurs via RPC (Remote Procedure Call) pour l'atomicité
        if (previousOptionId) {
            const { error: rpcError } = await supabase.rpc('decrement_poll_option', { option_id_input: previousOptionId });
            if (rpcError) console.error("Erreur decrement:", rpcError);
        }
        
        const { error: rpcError2 } = await supabase.rpc('increment_poll_option', { option_id_input: optionId });
        if (rpcError2) console.error("Erreur increment:", rpcError2);

      } catch (err: any) {
          console.error("Erreur critique vote:", JSON.stringify(err, null, 2) || err);
          // Re-fetch data to sync with server state in case of error
          fetchData(); 
      }
  };

  const handleAddSchedule = async (s: ScheduleItem) => {
    setSchedules([s, ...schedules]);
    await supabase.from('schedules').insert({
        title: s.title,
        class_level: s.classLevel,
        semester: s.semester,
        url: s.url,
        uploaded_at: s.uploadedAt,
        version: s.version
    });
    fetchData();
  };

  const handleDeleteSchedule = async (id: string) => {
    setSchedules(schedules.filter(s => s.id !== id));
    await supabase.from('schedules').delete().eq('id', id);
  };

  // Filtering
  const getFilteredData = <T extends { classLevel?: string }>(data: T[]) => {
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
                <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">Chargement du campus...</p>
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
            addAnnouncement={handleAddAnnouncement} 
            updateAnnouncement={handleUpdateAnnouncement}
            deleteAnnouncement={handleDeleteAnnouncement} 
        />
      )}
      {currentView === 'SCHEDULE' && (
        <Schedule 
            user={user} 
            schedules={getFilteredData(schedules)} 
            addSchedule={handleAddSchedule}
            deleteSchedule={handleDeleteSchedule}
        />
      )}
      {currentView === 'EXAMS' && (
        <Exams 
            user={user} 
            exams={getFilteredData(exams)} 
            addExam={handleAddExam}
            updateExam={handleUpdateExam}
            deleteExam={handleDeleteExam} 
        />
      )}
      {currentView === 'POLLS' && (
        <Polls 
            user={user} 
            polls={getFilteredData(polls)} 
            addPoll={handleAddPoll}
            updatePoll={handleUpdatePoll}
            deletePoll={handleDeletePoll}
            votePoll={handleVotePoll} 
        />
      )}
      {currentView === 'MEET' && (
        <Meet 
            user={user}
            meetings={getFilteredData(meetings)}
            addMeeting={handleAddMeeting}
            updateMeeting={(m) => setMeetings(meetings.map(item => item.id === m.id ? m : item))} 
            deleteMeeting={(id) => {
                 setMeetings(meetings.filter(m => m.id !== id));
                 supabase.from('meetings').delete().eq('id', id).then();
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