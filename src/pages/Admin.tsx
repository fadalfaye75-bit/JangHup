import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTable, usePaginatedTable, deleteRow, updateRow, insertRow } from '../lib/hooks';
import { User, SchoolClass, Poll, Announcement, ActivityLog, UserRole } from '../types';
import { Badge, Spinner, ErrBox, Modal, ConfirmModal, GlassCard, Button, Input } from '../components/ui';
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
  Plus,
  ArrowUpRight,
  Activity
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
import { fmtDate, cn } from '../lib/utils';
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
import { db } from '../firebase';

export const Admin: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'classes' | 'content' | 'logs'>('overview');
  
  // Data fetching
  const userConstraints = React.useMemo(() => [orderBy('created_at', 'desc')], []);
  const { 
    data: users, 
    error: usersError,
    loading: usersLoading, 
    loadMore: loadMoreUsers, 
    hasMore: hasMoreUsers,
    loadingMore: loadingMoreUsers
  } = usePaginatedTable<User>('users', userConstraints, 20, user?.role === UserRole.ADMIN && (activeTab === 'users' || activeTab === 'overview'));

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [classSecrets, setClassSecrets] = useState<Record<string, any>>({});
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role === UserRole.ADMIN && (activeTab === 'classes' || activeTab === 'overview')) {
      setLoadingClasses(true);
      
      const q = query(collection(db, 'classes'), orderBy('name', 'asc'));
      const unsubscribeClasses = onSnapshot(q, (snapshot) => {
        const classesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SchoolClass));
        setClasses(classesData);
        setLoadingClasses(false);
      }, (err) => {
        console.error("🔥 Error fetching classes:", err);
        setError("Erreur lors du chargement des classes.");
        setLoadingClasses(false);
      });

      const unsubscribeSecrets = onSnapshot(collection(db, 'class_secrets'), (snapshot) => {
        const secrets: Record<string, any> = {};
        snapshot.docs.forEach(doc => {
          secrets[doc.id] = doc.data();
        });
        setClassSecrets(secrets);
      }, (err) => {
        console.error("🔥 Error fetching class secrets:", err);
      });

      return () => {
        unsubscribeClasses();
        unsubscribeSecrets();
      };
    }
  }, [activeTab, user?.role]);

  const { data: polls, error: pollsError } = useTable<Poll>('polls', [], 10, user?.role === UserRole.ADMIN && (activeTab === 'content' || activeTab === 'overview'));
  const { data: announcements, error: announcementsError } = useTable<Announcement>('announcements', [], 10, user?.role === UserRole.ADMIN && (activeTab === 'content' || activeTab === 'overview'));
  
  const logConstraints = React.useMemo(() => [orderBy('createdAt', 'desc')], []);
  const { 
    data: logs, 
    error: logsError,
    loading: logsLoading, 
    loadMore: loadMoreLogs, 
    hasMore: hasMoreLogs,
    loadingMore: loadingMoreLogs
  } = usePaginatedTable<ActivityLog>('activity_logs', logConstraints, 50, user?.role === UserRole.ADMIN && (activeTab === 'logs' || activeTab === 'overview'));

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

  // Stats calculation
  const statsList = React.useMemo(() => [
    { label: 'Utilisateurs', value: users.length, icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Classes', value: classes.length, icon: Shield, color: 'text-warning', bg: 'bg-warning/10' },
    { label: 'Sondages', value: polls.length, icon: Vote, color: 'text-success', bg: 'bg-success/10' },
    { label: 'Annonces', value: announcements.length, icon: Megaphone, color: 'text-danger', bg: 'bg-danger/10' },
  ], [users.length, classes.length, polls.length, announcements.length]);

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
              batch.delete(doc(db, 'class_secrets', id));
              const regCodesSnap = await getDocs(query(collection(db, 'registration_codes'), where('classId', '==', id)));
              regCodesSnap.docs.forEach(d => batch.delete(d.ref));
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

  const handleSaveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const batch = writeBatch(db);
      const classId = editingClass ? editingClass.id : doc(collection(db, 'classes')).id;
      
      const classData = {
        name: newClassData.name,
        color: newClassData.color,
        class_email: newClassData.class_email,
        updatedAt: new Date().toISOString()
      };

      if (editingClass) {
        batch.update(doc(db, 'classes', classId), classData);
      } else {
        batch.set(doc(db, 'classes', classId), {
          ...classData,
          studentCount: 0,
          createdAt: new Date().toISOString()
        });
      }

      const secretRef = doc(db, 'class_secrets', classId);
      batch.set(secretRef, {
        delegate_code: newClassData.delegate_code,
        class_code: newClassData.class_code,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      const regCodeRef = doc(db, 'registration_codes', newClassData.class_code.toUpperCase().trim());
      batch.set(regCodeRef, { classId, className: newClassData.name });

      const delCodeRef = doc(db, 'delegate_codes', newClassData.delegate_code.toUpperCase().trim());
      batch.set(delCodeRef, { classId, className: newClassData.name });

      await batch.commit();
      setIsClassModalOpen(false);
      setEditingClass(null);
      setNewClassData({ name: '', delegate_code: '', class_code: '', color: '#6C63FF', class_email: '', studentCount: 0 });
    } catch (err) {
      console.error(err);
    }
  };

  if (user?.role !== UserRole.ADMIN) return <ErrBox message="Accès refusé. Privilèges administrateur requis." />;

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 px-4">
      <ConfirmModal 
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig({ ...confirmConfig, isOpen: false })}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        message={confirmConfig.message}
        type={confirmConfig.type}
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[var(--text-muted)] mb-1">
            <Badge variant="danger" className="text-[10px] font-bold uppercase tracking-wider">Administration</Badge>
            <ChevronRight size={14} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Nexus Central</span>
          </div>
          <h1 className="text-3xl font-bold text-[var(--text-main)] tracking-tight">Panneau de Contrôle</h1>
          <p className="text-xs font-medium text-[var(--text-secondary)]">
            Gérez les utilisateurs, les classes et le contenu de la plateforme.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" className="flex items-center gap-2">
            <Settings size={18} />
            <span className="font-bold uppercase tracking-wider text-xs">Paramètres</span>
          </Button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1 bg-[var(--bg-card)] border border-[var(--border-main)] p-1 rounded-2xl shadow-sm overflow-x-auto no-scrollbar">
        {[
          { id: 'overview', label: 'Vue d\'ensemble', icon: LayoutDashboard },
          { id: 'users', label: 'Utilisateurs', icon: Users },
          { id: 'classes', label: 'Classes', icon: Shield },
          { id: 'content', label: 'Contenu', icon: Megaphone },
          { id: 'logs', label: 'Logs', icon: Clock },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
              activeTab === tab.id ? 'bg-primary text-white shadow-md' : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-main)]'
            )}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {statsList.map((stat, i) => (
                <GlassCard key={i} className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", stat.bg, stat.color)}>
                      <stat.icon size={24} />
                    </div>
                    <div className="flex items-center gap-1 text-success text-[10px] font-bold">
                      <ArrowUpRight size={14} />
                      +12%
                    </div>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-[var(--text-main)]">{stat.value}</p>
                    <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">{stat.label}</p>
                  </div>
                </GlassCard>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Activity Chart */}
              <GlassCard className="lg:col-span-2 p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-[var(--text-main)] flex items-center gap-2">
                    <TrendingUp size={20} className="text-primary" />
                    Activité du Nexus
                  </h3>
                  <select className="bg-transparent text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] outline-none">
                    <option>7 derniers jours</option>
                    <option>30 derniers jours</option>
                  </select>
                </div>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorActivity" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-main)" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fontWeight: 600, fill: 'var(--text-muted)' }}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fontWeight: 600, fill: 'var(--text-muted)' }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'var(--bg-card)', 
                          borderColor: 'var(--border-main)',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 'bold'
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="activity" 
                        stroke="var(--primary)" 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorActivity)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </GlassCard>

              {/* Recent Logs Preview */}
              <GlassCard className="p-6 space-y-6">
                <h3 className="text-lg font-bold text-[var(--text-main)] flex items-center gap-2">
                  <Activity size={20} className="text-primary" />
                  Derniers Événements
                </h3>
                <div className="space-y-4">
                  {logs.slice(0, 6).map((log) => (
                    <div key={log.id} className="flex gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-[var(--text-main)] leading-tight">{log.action}</p>
                        <p className="text-[10px] text-[var(--text-muted)] font-medium">{fmtDate(log.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                  <Button variant="secondary" className="w-full text-[10px]" onClick={() => setActiveTab('logs')}>
                    Voir tous les logs
                  </Button>
                </div>
              </GlassCard>
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
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
                <input 
                  type="text"
                  placeholder="Rechercher un utilisateur (nom, email, classe)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-standard pl-12 py-3"
                />
              </div>
              <Button variant="secondary" className="flex items-center gap-2">
                <Filter size={18} />
                <span>Filtres</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {users.filter(u => 
                u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                u.class_name?.toLowerCase().includes(searchTerm.toLowerCase())
              ).map((u) => (
                <GlassCard key={u.id} className="p-4 group">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl overflow-hidden border border-[var(--border-main)]">
                        <img 
                          src={u.avatar || `https://ui-avatars.com/api/?name=${u.name}&background=random`} 
                          alt={u.name} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-[var(--text-main)]">{u.name}</h4>
                        <p className="text-[10px] text-[var(--text-muted)] font-medium">{u.email}</p>
                      </div>
                    </div>
                    <Badge variant={u.role === UserRole.ADMIN ? 'danger' : u.role === UserRole.DELEGATE ? 'warning' : 'primary'}>
                      {u.role}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-[var(--border-main)]">
                    <div className="flex items-center gap-2">
                      <GraduationCap size={14} className="text-primary/60" />
                      <span className="text-[10px] font-bold text-[var(--text-secondary)]">{u.class_name || 'Aucune classe'}</span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleToggleUserRole(u)}
                        className="p-2 text-[var(--text-muted)] hover:text-primary transition-colors"
                        title={u.role === UserRole.ADMIN ? "Rétrograder" : "Promouvoir Admin"}
                      >
                        {u.role === UserRole.ADMIN ? <UserX size={16} /> : <UserCheck size={16} />}
                      </button>
                      <button 
                        onClick={() => handleDeleteUser(u)}
                        className="p-2 text-[var(--text-muted)] hover:text-danger transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
            {hasMoreUsers && (
              <div className="flex justify-center pt-4">
                <Button variant="secondary" onClick={loadMoreUsers} isLoading={loadingMoreUsers}>Charger plus</Button>
              </div>
            )}
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
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-[var(--text-main)]">Gestion des Classes</h3>
              <Button onClick={() => { setEditingClass(null); setNewClassData({ name: '', delegate_code: generateDelegateCode(''), class_code: generateClassCode(''), color: '#6C63FF', class_email: '', studentCount: 0 }); setIsClassModalOpen(true); }} className="flex items-center gap-2">
                <Plus size={18} />
                <span>Nouvelle Classe</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {classes.map((cls) => {
                const secrets = classSecrets[cls.id] || {};
                return (
                  <GlassCard key={cls.id} className="p-6 space-y-6 group">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold" style={{ backgroundColor: cls.color || '#6C63FF' }}>
                          {cls.name?.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="text-base font-bold text-[var(--text-main)]">{cls.name}</h4>
                          <p className="text-[10px] text-[var(--text-muted)] font-medium">{cls.studentCount || 0} étudiants</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEditClass(cls)} className="p-2 text-[var(--text-muted)] hover:text-primary transition-colors">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDeleteContent('classes', cls.id)} className="p-2 text-[var(--text-muted)] hover:text-danger transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="p-3 bg-[var(--bg-main)] rounded-xl border border-[var(--border-main)] flex items-center justify-between">
                        <div className="space-y-0.5">
                          <p className="text-[8px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Code Inscription</p>
                          <p className="text-sm font-mono font-bold text-primary">{secrets.class_code || '---'}</p>
                        </div>
                        <button onClick={() => handleCopyCode(secrets.class_code)} className="p-2 text-[var(--text-muted)] hover:text-primary">
                          <Copy size={14} />
                        </button>
                      </div>
                      <div className="p-3 bg-[var(--bg-main)] rounded-xl border border-[var(--border-main)] flex items-center justify-between">
                        <div className="space-y-0.5">
                          <p className="text-[8px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Code Délégué</p>
                          <p className="text-sm font-mono font-bold text-warning">{secrets.delegate_code || '---'}</p>
                        </div>
                        <button onClick={() => handleCopyCode(secrets.delegate_code)} className="p-2 text-[var(--text-muted)] hover:text-warning">
                          <Copy size={14} />
                        </button>
                      </div>
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          </motion.div>
        )}

        {activeTab === 'content' && (
          <motion.div 
            key="content"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-8"
          >
            {/* Polls Management */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-[var(--text-main)] flex items-center gap-2">
                  <Vote size={20} className="text-success" />
                  Sondages
                </h3>
                <Link to="/sondages">
                  <Button variant="secondary" size="sm">Gérer</Button>
                </Link>
              </div>
              <div className="space-y-3">
                {polls.map((poll) => (
                  <GlassCard key={poll.id} className="p-4 flex items-center justify-between group">
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-[var(--text-main)] line-clamp-1">{poll.question}</h4>
                      <p className="text-[10px] text-[var(--text-muted)] font-medium">{poll.totalVotes} votes • {poll.className}</p>
                    </div>
                    <button onClick={() => handleDeleteContent('polls', poll.id)} className="p-2 text-[var(--text-muted)] hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 size={16} />
                    </button>
                  </GlassCard>
                ))}
              </div>
            </div>

            {/* Announcements Management */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-[var(--text-main)] flex items-center gap-2">
                  <Megaphone size={20} className="text-danger" />
                  Annonces
                </h3>
                <Link to="/announcements">
                  <Button variant="secondary" size="sm">Gérer</Button>
                </Link>
              </div>
              <div className="space-y-3">
                {announcements.map((ann) => (
                  <GlassCard key={ann.id} className="p-4 flex items-center justify-between group">
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-[var(--text-main)] line-clamp-1">{ann.title}</h4>
                      <p className="text-[10px] text-[var(--text-muted)] font-medium">{ann.className} • {fmtDate(ann.createdAt)}</p>
                    </div>
                    <button onClick={() => handleDeleteContent('announcements', ann.id)} className="p-2 text-[var(--text-muted)] hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 size={16} />
                    </button>
                  </GlassCard>
                ))}
              </div>
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
            <GlassCard className="overflow-hidden border-none shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[var(--bg-main)]/50 border-b border-[var(--border-main)]">
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Utilisateur</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Action</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Détails</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-main)]">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-[var(--bg-main)]/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                              {log.userName?.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-[var(--text-main)]">{log.userName}</p>
                              <p className="text-[8px] text-[var(--text-muted)] font-bold uppercase tracking-wider">{log.userRole}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="primary" className="text-[8px]">{log.action}</Badge>
                        </td>
                        <td className="px-6 py-4 text-xs text-[var(--text-secondary)] font-medium">
                          {log.details || '---'}
                        </td>
                        <td className="px-6 py-4 text-[10px] text-[var(--text-muted)] font-bold">
                          {fmtDate(log.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>
            {hasMoreLogs && (
              <div className="flex justify-center pt-4">
                <Button variant="secondary" onClick={loadMoreLogs} isLoading={loadingMoreLogs}>Charger plus</Button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Class Modal */}
      <Modal 
        isOpen={isClassModalOpen} 
        onClose={() => setIsClassModalOpen(false)} 
        title={editingClass ? "Modifier la Classe" : "Nouvelle Classe"}
      >
        <form onSubmit={handleSaveClass} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider ml-1">Nom de la classe</label>
              <Input 
                required
                value={newClassData.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setNewClassData({ 
                    ...newClassData, 
                    name,
                    delegate_code: generateDelegateCode(name),
                    class_code: generateClassCode(name)
                  });
                }}
                placeholder="Ex: L3 Informatique"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider ml-1">Code Inscription</label>
                <div className="relative">
                  <Input 
                    required
                    value={newClassData.class_code}
                    onChange={(e) => setNewClassData({ ...newClassData, class_code: e.target.value.toUpperCase() })}
                    className="font-mono"
                  />
                  <button type="button" onClick={() => setNewClassData({...newClassData, class_code: generateClassCode(newClassData.name)})} className="absolute right-3 top-1/2 -translate-y-1/2 text-primary">
                    <RefreshCw size={14} />
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider ml-1">Code Délégué</label>
                <div className="relative">
                  <Input 
                    required
                    value={newClassData.delegate_code}
                    onChange={(e) => setNewClassData({ ...newClassData, delegate_code: e.target.value.toUpperCase() })}
                    className="font-mono"
                  />
                  <button type="button" onClick={() => setNewClassData({...newClassData, delegate_code: generateDelegateCode(newClassData.name)})} className="absolute right-3 top-1/2 -translate-y-1/2 text-warning">
                    <RefreshCw size={14} />
                  </button>
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider ml-1">Email de la classe (Facultatif)</label>
              <Input 
                type="email"
                value={newClassData.class_email}
                onChange={(e) => setNewClassData({ ...newClassData, class_email: e.target.value })}
                placeholder="classe@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider ml-1">Couleur thématique</label>
              <div className="flex items-center gap-3">
                <input 
                  type="color"
                  value={newClassData.color}
                  onChange={(e) => setNewClassData({ ...newClassData, color: e.target.value })}
                  className="w-10 h-10 rounded-lg cursor-pointer border-none bg-transparent"
                />
                <span className="text-xs font-mono font-bold text-[var(--text-muted)]">{newClassData.color}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsClassModalOpen(false)} className="flex-1">Annuler</Button>
            <Button type="submit" className="flex-1">Enregistrer</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
