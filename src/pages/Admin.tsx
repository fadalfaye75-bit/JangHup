import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTable, deleteRow, updateRow, insertRow } from '../../lib/hooks';
import { User, SchoolClass, Poll, Announcement, ActivityLog, UserRole } from '../../types';
import { Card, Badge, Spinner, ErrBox, Btn, Modal, ConfirmModal } from '../../components/ui';
import { 
  Users, 
  Shield, 
  BarChart3, 
  Megaphone, 
  Vote, 
  Trash2, 
  Edit2,
  Search, 
  Filter,
  MoreVertical,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Clock,
  Settings,
  LayoutDashboard,
  UserCheck,
  UserX,
  GraduationCap,
  ChevronRight,
  Copy,
  RefreshCw,
  Eye,
  EyeOff,
  Bell,
  Plus
} from 'lucide-react';
import { authService } from '../services/authService';
import { notificationService } from '../services/notificationService';
import { Link } from 'react-router-dom';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { fmtDate } from '../../lib/utils';
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  where, 
  getDocs, 
  doc, 
  updateDoc, 
  writeBatch 
} from 'firebase/firestore';
import { db } from '../../firebase';

export const Admin: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'classes' | 'content' | 'logs'>('overview');
  
  // Data fetching
  const userConstraints = React.useMemo(() => [orderBy('created_at', 'desc')], []);
  const { data: users, loading: usersLoading } = useTable<User>('users', userConstraints);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [classSecrets, setClassSecrets] = useState<Record<string, any>>({});
  const [loadingClasses, setLoadingClasses] = useState(false);

  useEffect(() => {
    if (activeTab === 'classes') {
      setLoadingClasses(true);
      const q = query(collection(db, 'classes'), orderBy('name', 'asc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const classesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SchoolClass));
        setClasses(classesData);
        
        // Fetch secrets for these classes
        getDocs(collection(db, 'class_secrets')).then(secretsSnap => {
          const secrets: Record<string, any> = {};
          secretsSnap.docs.forEach(doc => {
            secrets[doc.id] = doc.data();
          });
          setClassSecrets(secrets);
          setLoadingClasses(false);
        }).catch(err => {
          console.error("🔥 Error fetching class secrets:", err);
          setLoadingClasses(false);
        });
      });
      return () => unsubscribe();
    }
  }, [activeTab]);
  const { data: polls } = useTable<Poll>('polls');
  const { data: announcements } = useTable<Announcement>('announcements');
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<SchoolClass | null>(null);
  const [newClassData, setNewClassData] = useState({ name: '', delegate_code: '', class_code: '', color: '#6C63FF', class_email: '', studentCount: 0 });
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const generateDelegateCode = (className: string) => {
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const prefix = className ? className.substring(0, 3).toUpperCase() : 'DEL';
    return `${prefix}-${random}`;
  };

  const generateClassCode = (className: string) => {
    const random = Math.floor(1000 + Math.random() * 9000);
    const prefix = className ? className.substring(0, 2).toUpperCase() : 'CL';
    return `${prefix}-${random}`;
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  useEffect(() => {
    const logsQ = query(collection(db, 'activity_logs'), orderBy('createdAt', 'desc'), limit(50));
    const unsubscribe = onSnapshot(logsQ, (snapshot) => {
      setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ActivityLog)));
    });
    return () => unsubscribe();
  }, []);

  // Stats calculation
  const stats = [
    { label: 'Utilisateurs', value: users.length, icon: Users, color: 'primary' },
    { label: 'Classes', value: classes.length, icon: Shield, color: 'amber' },
    { label: 'Sondages', value: polls.length, icon: Vote, color: 'emerald' },
    { label: 'Annonces', value: announcements.length, icon: Megaphone, color: 'rose' },
  ];

  // Activity chart data (aggregated from logs)
  const chartData = React.useMemo(() => {
    const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    const data = days.map(day => ({ name: day, activity: 0 }));
    
    logs.forEach(log => {
      if (!log.createdAt) return;
      const date = new Date(log.createdAt);
      const dayIndex = date.getDay();
      if (!isNaN(dayIndex) && data[dayIndex]) {
        data[dayIndex].activity += 1;
      }
    });

    // Reorder to start from Monday or current day? Let's just keep it simple.
    return data;
  }, [logs]);

  const handleToggleUserRole = (targetUser: User) => {
    const newRole = targetUser.role === UserRole.ADMIN ? UserRole.STUDENT : UserRole.ADMIN;
    setConfirmConfig({
      isOpen: true,
      title: 'Changer le rôle',
      message: `Voulez-vous vraiment changer le rôle de ${targetUser.name} en ${newRole} ?`,
      type: 'warning',
      onConfirm: async () => {
        try {
          const batch = writeBatch(db);
          batch.update(doc(db, 'users', targetUser.id), { role: newRole });
          batch.update(doc(db, 'users_public', targetUser.id), { role: newRole });
          await batch.commit();
        } catch (err) {
          console.error(err);
        }
      }
    });
  };

  const handleDeleteUser = (targetUser: User) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Supprimer l\'utilisateur',
      message: `Voulez-vous vraiment supprimer définitivement ${targetUser.name} ? Cette action est irréversible.`,
      type: 'danger',
      onConfirm: async () => {
        try {
          const batch = writeBatch(db);
          batch.delete(doc(db, 'users', targetUser.id));
          batch.delete(doc(db, 'users_public', targetUser.id));
          await batch.commit();
        } catch (err) {
          console.error(err);
        }
      }
    });
  };

  const handleEditClass = (cls: SchoolClass) => {
    const secrets = classSecrets[cls.id] || {};
    setEditingClass(cls);
    setNewClassData({ 
      name: cls.name || '', 
      delegate_code: secrets.delegate_code || '', 
      class_code: secrets.class_code || '',
      color: cls.color || '#6C63FF', 
      class_email: cls.class_email || '', 
      studentCount: cls.studentCount || 0
    });
    setIsClassModalOpen(true);
  };

  const handleSendTestNotification = async () => {
    if (!user) return;
    await notificationService.notifyUser(
      user.id,
      "Test de Notification",
      "Ceci est une notification de test pour vérifier le fonctionnement du système.",
      'info'
    );
    alert("Notification de test envoyée !");
  };

  const handleDeleteContent = (collectionName: string, id: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Supprimer le contenu',
      message: 'Êtes-vous sûr de vouloir supprimer définitivement ce contenu ? Cette action est irréversible.',
      type: 'danger',
      onConfirm: async () => {
        try {
          const batch = writeBatch(db);
          
          if (collectionName === 'polls') {
            const optionsSnap = await getDocs(query(collection(db, 'poll_options'), where('pollId', '==', id)));
            optionsSnap.docs.forEach(d => batch.delete(d.ref));
            const votesSnap = await getDocs(query(collection(db, 'poll_votes'), where('pollId', '==', id)));
            votesSnap.docs.forEach(d => batch.delete(d.ref));
          } else if (collectionName === 'announcements') {
            const statusSnap = await getDocs(query(collection(db, 'announcement_read_statuses'), where('announcementId', '==', id)));
            statusSnap.docs.forEach(d => batch.delete(d.ref));
          } else if (collectionName === 'classes') {
            const classDoc = classes.find(c => c.id === id);
            if (classDoc) {
              // Delete secrets
              batch.delete(doc(db, 'class_secrets', id));
              
              // Delete registration codes
              const regCodesSnap = await getDocs(query(collection(db, 'registration_codes'), where('classId', '==', id)));
              regCodesSnap.docs.forEach(d => batch.delete(d.ref));

              // Delete delegate codes
              const delCodesSnap = await getDocs(query(collection(db, 'delegate_codes'), where('className', '==', classDoc.name)));
              delCodesSnap.docs.forEach(d => batch.delete(d.ref));
            }
          }
          
          batch.delete(doc(db, collectionName, id));
          await batch.commit();
        } catch (err) {
          console.error("🔥 Erreur lors de la suppression du contenu:", err);
        }
      }
    });
  };

  if (user?.role !== UserRole.ADMIN) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <XCircle size={64} className="text-rose-500" />
        <h1 className="text-2xl font-bold">Accès Refusé</h1>
        <p className="text-slate-500">Vous n'avez pas les droits nécessaires pour accéder à cette page.</p>
        <Link to="/" className="px-6 py-2 bg-primary text-white rounded-xl font-bold">Retour au Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-8 pb-20">
      {/* Admin Sidebar */}
      <aside className="lg:w-64 space-y-2">
        <div className="p-4 mb-4">
          <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Shield className="text-primary" size={24} />
            Admin Panel
          </h1>
        </div>
        
        <button 
          onClick={() => setActiveTab('overview')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'overview' ? 'bg-primary text-white shadow-lg shadow-primary/20 dark:shadow-none' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
        >
          <LayoutDashboard size={18} />
          Vue d'ensemble
        </button>
        <button 
          onClick={() => setActiveTab('users')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'users' ? 'bg-primary text-white shadow-lg shadow-primary/20 dark:shadow-none' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
        >
          <Users size={18} />
          Utilisateurs
        </button>
        <button 
          onClick={() => setActiveTab('classes')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'classes' ? 'bg-primary text-white shadow-lg shadow-primary/20 dark:shadow-none' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
        >
          <GraduationCap size={18} />
          Classes
        </button>
        <button 
          onClick={() => setActiveTab('content')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'content' ? 'bg-primary text-white shadow-lg shadow-primary/20 dark:shadow-none' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
        >
          <Megaphone size={18} />
          Contenu
        </button>
        <button 
          onClick={() => setActiveTab('logs')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'logs' ? 'bg-primary text-white shadow-lg shadow-primary/20 dark:shadow-none' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
        >
          <Clock size={18} />
          Logs d'activité
        </button>
        
        <div className="pt-8 mt-8 border-t border-slate-100 dark:border-slate-800">
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
            <Settings size={18} />
            Paramètres
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 space-y-8">
        <ConfirmModal 
          isOpen={confirmConfig.isOpen}
          onClose={() => setConfirmConfig({ ...confirmConfig, isOpen: false })}
          onConfirm={confirmConfig.onConfirm}
          title={confirmConfig.title}
          message={confirmConfig.message}
          type={confirmConfig.type}
        />
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div 
              key="overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                {stats.map((stat) => (
                  <Card 
                    key={stat.label} 
                    className="relative overflow-hidden group cursor-pointer hover:border-primary/50 transition-all border-2 border-transparent"
                    onClick={() => {
                      if (stat.label === 'Utilisateurs') setActiveTab('users');
                      if (stat.label === 'Classes') setActiveTab('classes');
                      if (stat.label === 'Sondages' || stat.label === 'Annonces') setActiveTab('content');
                    }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className={`p-3 rounded-2xl bg-${stat.color}-50 dark:bg-${stat.color}-900/20 text-${stat.color}-600 dark:text-${stat.color}-400 group-hover:scale-110 transition-transform`}>
                        <stat.icon size={24} />
                      </div>
                    </div>
                    <h3 className="text-3xl font-black text-slate-900 dark:text-white">{stat.value}</h3>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">{stat.label}</p>
                    
                    {/* Visual indicator for clickability */}
                    <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ChevronRight size={16} className="text-primary" />
                    </div>
                  </Card>
                ))}
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                <Card className="h-[400px] flex flex-col">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <BarChart3 size={18} className="text-primary" />
                      Activité de la plateforme
                    </h3>
                    <select className="text-xs font-bold bg-slate-50 dark:bg-slate-800 border-none rounded-lg p-1 px-2 outline-none">
                      <option>7 derniers jours</option>
                      <option>30 derniers jours</option>
                    </select>
                  </div>
                  <div className="flex-1 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorActivity" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6C63FF" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#6C63FF" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                        <Tooltip 
                          contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        />
                        <Area type="monotone" dataKey="activity" stroke="#6C63FF" strokeWidth={3} fillOpacity={1} fill="url(#colorActivity)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                <Card className="space-y-6">
                  <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Clock size={18} className="text-amber-500" />
                    Actions récentes
                  </h3>
                  <div className="space-y-4">
                    {logs.slice(0, 6).map((log) => (
                      <div key={log.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                          <Users size={14} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">
                            <span className="text-primary">{log.actor}</span> {log.action}
                          </p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">{fmtDate(log.createdAt)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </motion.div>
          )}

          {activeTab === 'users' && (
            <motion.div 
              key="users"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Gestion des Utilisateurs</h2>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="text" 
                    placeholder="Rechercher..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50">
                      <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Utilisateur</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Classe</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Rôle</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Inscription</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                    {users.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase())).map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <img src={u.avatar || `https://ui-avatars.com/api/?name=${u.name}`} className="w-8 h-8 rounded-full" alt="" loading="lazy" />
                            <div>
                              <p className="text-sm font-bold text-slate-900 dark:text-white">{u.name}</p>
                              <p className="text-xs text-slate-500">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge type="primary">{u.class_name || 'N/A'}</Badge>
                        </td>
                        <td className="px-6 py-4">
                          <Badge type={u.role === UserRole.ADMIN ? 'danger' : u.role === UserRole.DELEGATE ? 'warning' : 'primary'}>
                            {u.role}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-xs font-bold text-slate-500">
                          {fmtDate(u.created_at)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => handleToggleUserRole(u)}
                              className={`p-2 rounded-lg transition-colors ${u.role === UserRole.ADMIN ? 'text-rose-500 bg-rose-50' : 'text-primary bg-primary/10'}`}
                              title={u.role === UserRole.ADMIN ? "Rétrograder" : "Promouvoir Admin"}
                            >
                              {u.role === UserRole.ADMIN ? <UserX size={16} /> : <UserCheck size={16} />}
                            </button>
                            <button 
                              onClick={() => handleDeleteUser(u)}
                              className="p-2 text-rose-500 bg-rose-50 rounded-lg hover:bg-rose-100 transition-colors"
                              title="Supprimer l'utilisateur"
                            >
                              <Trash2 size={16} />
                            </button>
                            <button className="p-2 text-slate-400 hover:text-slate-600">
                              <MoreVertical size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === 'classes' && (
            <motion.div 
              key="classes"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Gestion des Classes</h2>
                <div className="flex gap-3">
                  <button 
                    onClick={handleSendTestNotification}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                  >
                    <Bell size={18} />
                    Tester les Notifications
                  </button>
                  <Btn onClick={() => setIsClassModalOpen(true)}>
                    Ajouter une classe
                  </Btn>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {classes.map((cls) => (
                  <Card key={cls.id} className="relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: cls.color }} />
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-xl" style={{ backgroundColor: cls.color }}>
                        {cls.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => handleEditClass(cls)}
                          className="p-2 text-slate-300 hover:text-primary transition-colors"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => handleDeleteContent('classes', cls.id)}
                          className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white">{cls.name}</h3>
                    <div className="mt-4 space-y-2">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-slate-400 uppercase">Email</span>
                        <span className="text-slate-700 dark:text-slate-300">{cls.class_email}</span>
                      </div>
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-slate-400 uppercase">Code Délégué</span>
                        <div className="flex items-center gap-2">
                          <code className="text-primary bg-primary/10 px-2 py-0.5 rounded">
                            {classSecrets[cls.id]?.delegate_code || '------'}
                          </code>
                          <button 
                            onClick={() => handleCopyCode(classSecrets[cls.id]?.delegate_code)}
                            className="text-slate-400 hover:text-primary transition-colors"
                            title="Copier le code délégué"
                          >
                            {copiedCode === classSecrets[cls.id]?.delegate_code ? <CheckCircle2 size={14} className="text-emerald-500" /> : <Copy size={14} />}
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-slate-400 uppercase">Code Inscription</span>
                        <div className="flex items-center gap-2">
                          <code className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">{cls.class_code}</code>
                          <button 
                            onClick={() => handleCopyCode(cls.class_code)}
                            className="text-slate-400 hover:text-emerald-600 transition-colors"
                            title="Copier le code d'inscription"
                          >
                            {copiedCode === cls.class_code ? <CheckCircle2 size={14} className="text-emerald-500" /> : <Copy size={14} />}
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-slate-400 uppercase">Étudiants</span>
                        <span className="text-slate-700 dark:text-slate-300">{cls.studentCount || 0}</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              <Modal 
                isOpen={isClassModalOpen} 
                onClose={() => {
                  setIsClassModalOpen(false);
                  setEditingClass(null);
                  setNewClassData({ name: '', delegate_code: '', class_code: '', color: '#6C63FF', class_email: '', studentCount: 0 });
                }} 
                title={editingClass ? "Modifier la classe" : "Ajouter une nouvelle classe"}
              >
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    const trimmedName = newClassData.name.trim();
                    const trimmedClassCode = newClassData.class_code.trim().toUpperCase();
                    const trimmedDelegateCode = newClassData.delegate_code.trim().toUpperCase();

                    const dataToSave = {
                      name: trimmedName,
                      color: newClassData.color,
                      class_email: newClassData.class_email.trim(),
                      studentCount: newClassData.studentCount,
                      created_by: user?.id || 'system',
                      created_at: editingClass ? (editingClass.created_at || (editingClass as any).createdAt || new Date().toISOString()) : new Date().toISOString()
                    };

                    let classId = editingClass?.id;
                    if (editingClass) {
                      await updateRow('classes', editingClass.id, dataToSave);
                    } else {
                      const newClass = await insertRow('classes', dataToSave);
                      classId = (newClass as any).id;
                    }

                    // Save codes in separate collections for security
                    if (classId) {
                      const batch = writeBatch(db);
                      
                      // Registration code
                      if (trimmedClassCode) {
                        const regCodeRef = doc(db, 'registration_codes', trimmedClassCode);
                        batch.set(regCodeRef, { classId, className: trimmedName });
                      }

                      // Delegate code
                      if (trimmedDelegateCode) {
                        const delCodeRef = doc(db, 'delegate_codes', trimmedDelegateCode);
                        batch.set(delCodeRef, { classId, className: trimmedName });
                      }

                      // Class secrets (for Admin to see the codes)
                      const secretRef = doc(db, 'class_secrets', classId);
                      batch.set(secretRef, {
                        class_code: trimmedClassCode,
                        delegate_code: trimmedDelegateCode,
                        updatedAt: new Date().toISOString()
                      });

                      await batch.commit();
                    }
                    setIsClassModalOpen(false);
                    setEditingClass(null);
                    setNewClassData({ name: '', delegate_code: '', class_code: '', color: '#6C63FF', class_email: '', studentCount: 0 });
                  } catch (err) {
                    console.error(err);
                  }
                }} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Nom de la classe</label>
                    <input 
                      type="text" 
                      required
                      value={newClassData.name}
                      onChange={(e) => setNewClassData({ ...newClassData, name: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Ex: GI3"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Code Délégué</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        required
                        value={newClassData.delegate_code}
                        onChange={(e) => setNewClassData({ ...newClassData, delegate_code: e.target.value })}
                        className="flex-1 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Ex: DEL-GI3-2024"
                      />
                      <button 
                        type="button"
                        onClick={() => setNewClassData({ ...newClassData, delegate_code: generateDelegateCode(newClassData.name) })}
                        className="px-3 bg-primary/10 text-primary rounded-xl hover:bg-primary/20 transition-colors"
                        title="Générer un code délégué"
                      >
                        <RefreshCw size={18} />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Code d'Inscription (Étudiants)</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        required
                        value={newClassData.class_code}
                        onChange={(e) => setNewClassData({ ...newClassData, class_code: e.target.value })}
                        className="flex-1 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Ex: GI3-2024"
                      />
                      <button 
                        type="button"
                        onClick={() => setNewClassData({ ...newClassData, class_code: generateClassCode(newClassData.name) })}
                        className="px-3 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-colors"
                        title="Générer un code d'inscription"
                      >
                        <RefreshCw size={18} />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Email de la classe</label>
                    <input 
                      type="email" 
                      required
                      value={newClassData.class_email}
                      onChange={(e) => setNewClassData({ ...newClassData, class_email: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Ex: gi3@janghup.com"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Nombre d'étudiants</label>
                    <input 
                      type="number" 
                      required
                      min="0"
                      value={newClassData.studentCount}
                      onChange={(e) => setNewClassData({ ...newClassData, studentCount: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Ex: 30"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Couleur</label>
                    <input 
                      type="color" 
                      value={newClassData.color}
                      onChange={(e) => setNewClassData({ ...newClassData, color: e.target.value })}
                      className="w-full h-10 p-1 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl outline-none"
                    />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <Btn type="button" variant="ghost" className="flex-1" onClick={() => {
                      setIsClassModalOpen(false);
                      setEditingClass(null);
                      setNewClassData({ name: '', delegate_code: '', class_code: '', color: '#6C63FF', class_email: '', studentCount: 0 });
                    }}>Annuler</Btn>
                    <Btn type="submit" className="flex-1">{editingClass ? "Enregistrer" : "Créer la classe"}</Btn>
                  </div>
                </form>
              </Modal>
            </motion.div>
          )}

          {activeTab === 'content' && (
            <motion.div 
              key="content"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {/* Polls Management */}
                <Card className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Vote size={18} className="text-emerald-500" />
                      Derniers Sondages
                    </h3>
                    <Link to="/polls" className="text-xs font-bold text-primary hover:underline">Gérer tout</Link>
                  </div>
                  <div className="space-y-3">
                    {polls.slice(0, 5).map((poll) => (
                      <div key={poll.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl flex items-center justify-between group">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{poll.question}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">{poll.className} • {poll.totalVotes} votes</p>
                        </div>
                        <button 
                          onClick={() => handleDeleteContent('polls', poll.id)}
                          className="p-2 text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Announcements Management */}
                <Card className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Megaphone size={18} className="text-rose-500" />
                      Dernières Annonces
                    </h3>
                    <Link to="/announcements" className="text-xs font-bold text-primary hover:underline">Gérer tout</Link>
                  </div>
                  <div className="space-y-3">
                    {announcements.slice(0, 5).map((ann) => (
                      <div key={ann.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl flex items-center justify-between group">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{ann.title}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">{ann.author} • {ann.priority}</p>
                        </div>
                        <button 
                          onClick={() => handleDeleteContent('announcements', ann.id)}
                          className="p-2 text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </motion.div>
          )}

          {activeTab === 'logs' && (
            <motion.div 
              key="logs"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Logs d'activité système</h2>
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="divide-y divide-slate-50 dark:divide-slate-800">
                  {logs.map((log) => (
                    <div key={log.id} className="p-4 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                        <Clock size={18} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                            <span className="text-indigo-600">{log.actor}</span> {log.action}
                          </p>
                          <span className="text-[10px] font-bold text-slate-400 uppercase">{fmtDate(log.createdAt)}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">ID Utilisateur: {log.userId}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};
