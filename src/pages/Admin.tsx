import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTable, usePaginatedTable, deleteRow, updateRow, insertRow } from '../lib/hooks';
import { User, SchoolClass, Poll, Announcement, ActivityLog, UserRole } from '../types';
import { Badge, Spinner, ErrBox, Modal, ConfirmModal, GlassCard, Button, Input, Avatar } from '../components/ui';
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
  writeBatch,
  getCountFromServer 
} from 'firebase/firestore';
import { db } from '../firebase';

export const Admin: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'classes' | 'content' | 'logs'>('overview');
  const [counts, setCounts] = useState({ users: 0, classes: 0, polls: 0, announcements: 0 });
  const [classMemberCounts, setClassMemberCounts] = useState<Record<string, number>>({});
  
  // Data fetching
  const userConstraints = React.useMemo(() => [orderBy('created_at', 'desc')], []);
  const { 
    data: users, 
    error: usersError,
    loading: usersLoading, 
    loadMore: loadMoreUsers, 
    hasMore: hasMoreUsers,
    loadingMore: loadingMoreUsers,
    refetch: refetchUsers
  } = usePaginatedTable<User>('users', userConstraints, 20, user?.role === UserRole.ADMIN && (activeTab === 'users' || activeTab === 'overview'));

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [classSecrets, setClassSecrets] = useState<Record<string, any>>({});
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role === UserRole.ADMIN && (activeTab === 'classes' || activeTab === 'overview')) {
      const fetchTotalCounts = async () => {
        try {
          const [uSnap, cSnap, pSnap, aSnap] = await Promise.all([
            getCountFromServer(collection(db, 'users')).catch(e => { console.error("Count users failed:", e); throw e; }),
            getCountFromServer(collection(db, 'classes')).catch(e => { console.error("Count classes failed:", e); throw e; }),
            getCountFromServer(collection(db, 'polls')).catch(e => { console.error("Count polls failed:", e); throw e; }),
            getCountFromServer(collection(db, 'announcements')).catch(e => { console.error("Count announcements failed:", e); throw e; })
          ]);
          setCounts({
            users: uSnap.data().count,
            classes: cSnap.data().count,
            polls: pSnap.data().count,
            announcements: aSnap.data().count
          });
        } catch (err: any) {
          console.error("🔥 Error fetching counts:", err);
          // If it's a permission error, it might be due to the global nature of counts on filtered collections
        }
      };
      
      fetchTotalCounts();
    }
  }, [activeTab, user?.role]);

  useEffect(() => {
    if (user?.role === UserRole.ADMIN && classes.length > 0) {
      const fetchClassCounts = async () => {
        const countsMap: Record<string, number> = {};
        await Promise.all(classes.map(async (cls) => {
          try {
            const q = query(collection(db, 'users'), where('class_name', '==', cls.name));
            const snap = await getCountFromServer(q);
            countsMap[cls.id] = snap.data().count;
          } catch (err) {
            console.error(`🔥 Error fetching count for class ${cls.name}:`, err);
          }
        }));
        setClassMemberCounts(prev => ({ ...prev, ...countsMap }));
      };
      fetchClassCounts();
    }
  }, [classes, user?.role]);

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
  const [newClassData, setNewClassData] = useState({ name: '', delegate_code: '', class_code: '', color: '#6C63FF', class_email: '', studentCount: 0, capacity: 50 });
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
    { label: 'Utilisateurs', value: counts.users, icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Classes', value: counts.classes, icon: Shield, color: 'text-warning', bg: 'bg-warning/10' },
    { label: 'Sondages', value: counts.polls, icon: Vote, color: 'text-success', bg: 'bg-success/10' },
    { label: 'Annonces', value: counts.announcements, icon: Megaphone, color: 'text-danger', bg: 'bg-danger/10' },
  ], [counts]);

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
          refetchUsers();
          alert('Rôle mis à jour avec succès.');
        } catch (err: any) {
          console.error("🔥 Error toggling user role:", err);
          alert('Erreur lors du changement de rôle: ' + (err.message || err.toString()));
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
          refetchUsers();
          alert('Utilisateur supprimé avec succès.');
        } catch (err: any) {
          console.error("🔥 Error deleting user:", err);
          alert('Erreur lors de la suppression: ' + (err.message || "Permissions insuffisantes ou erreur réseau."));
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
      studentCount: cls.studentCount || 0,
      capacity: cls.capacity || 50
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
        capacity: Number(newClassData.capacity) || 50,
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
        capacity: Number(newClassData.capacity) || 50,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      const regCodeRef = doc(db, 'registration_codes', newClassData.class_code.toUpperCase().trim());
      batch.set(regCodeRef, { classId, className: newClassData.name, capacity: Number(newClassData.capacity) || 50 });

      const delCodeRef = doc(db, 'delegate_codes', newClassData.delegate_code.toUpperCase().trim());
      batch.set(delCodeRef, { classId, className: newClassData.name });

      await batch.commit();
      setIsClassModalOpen(false);
      setEditingClass(null);
      setNewClassData({ name: '', delegate_code: '', class_code: '', color: '#6C63FF', class_email: '', studentCount: 0, capacity: 50 });
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
          <div className="flex items-center gap-2 text-gray-400 mb-1">
            <Badge variant="danger" className="text-[10px] font-bold uppercase tracking-wider">Administration</Badge>
            <ChevronRight size={14} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Nexus Central</span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white tracking-tight">Panneau de Contrôle</h1>
          <p className="text-[14px] text-gray-500 dark:text-gray-400">
            Gérez les utilisateurs, les classes et le contenu de la plateforme.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" className="flex items-center gap-2">
            <Settings size={16} />
            <span className="font-medium text-[13px]">Paramètres</span>
          </Button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-1 rounded-lg shadow-sm overflow-x-auto no-scrollbar">
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
              "flex items-center gap-2 px-4 py-2 rounded-md text-[13px] font-medium transition-all whitespace-nowrap",
              activeTab === tab.id ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {statsList.map((stat, i) => (
                <div key={i} className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", stat.bg, stat.color)}>
                      <stat.icon size={20} />
                    </div>
                    <div className="flex items-center gap-1 text-green-500 text-[11px] font-medium">
                      <ArrowUpRight size={14} />
                      +12%
                    </div>
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stat.value}</p>
                    <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Activity Chart */}
              <div className="lg:col-span-2 p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-[16px] font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <TrendingUp size={18} className="text-gray-400" />
                    Activité du Nexus
                  </h3>
                  <select className="bg-transparent text-[12px] font-medium text-gray-500 outline-none">
                    <option>7 derniers jours</option>
                    <option>30 derniers jours</option>
                  </select>
                </div>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorActivity" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 12, fontWeight: 500, fill: '#6B7280' }}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 12, fontWeight: 500, fill: '#6B7280' }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#FFFFFF', 
                          borderColor: '#E5E7EB',
                          borderRadius: '8px',
                          fontSize: '13px',
                          fontWeight: '500',
                          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="activity" 
                        stroke="#3B82F6" 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#colorActivity)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Recent Logs Preview */}
              <div className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm space-y-6">
                <h3 className="text-[16px] font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Activity size={18} className="text-gray-400" />
                  Derniers Événements
                </h3>
                <div className="space-y-4">
                  {logs.slice(0, 6).map((log) => (
                    <div key={log.id} className="flex gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                      <div className="space-y-0.5">
                        <p className="text-[13px] font-medium text-gray-900 dark:text-white leading-tight">{log.action}</p>
                        <p className="text-[11px] text-gray-500">{fmtDate(log.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                  <Button variant="secondary" className="w-full text-[13px]" onClick={() => setActiveTab('logs')}>
                    Voir tous les logs
                  </Button>
                </div>
              </div>
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
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                  type="text"
                  placeholder="Rechercher un utilisateur (nom, email, classe)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg py-2.5 pl-11 pr-4 text-[13px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-gray-400"
                />
              </div>
              <Button variant="secondary" className="flex items-center gap-2">
                <Filter size={16} />
                <span>Filtres</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {users.filter(u => 
                u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                u.class_name?.toLowerCase().includes(searchTerm.toLowerCase())
              ).map((u) => (
                <div key={u.id} className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm group">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Avatar 
                        src={u.avatar} 
                        name={u.name} 
                        size="md" 
                      />
                      <div>
                        <h4 className="text-[14px] font-medium text-gray-900 dark:text-white">{u.name}</h4>
                        <p className="text-[12px] text-gray-500">{u.email}</p>
                      </div>
                    </div>
                    <span className={cn(
                      "px-2 py-0.5 rounded-md text-[10px] font-medium",
                      u.role === UserRole.ADMIN ? "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400" :
                      u.role === UserRole.DELEGATE ? "bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400" :
                      "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                    )}>
                      {u.role}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2 text-gray-500">
                      <GraduationCap size={14} />
                      <span className="text-[12px] font-medium">{u.class_name || 'Aucune classe'}</span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleToggleUserRole(u)}
                        className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
                        title={u.role === UserRole.ADMIN ? "Rétrograder" : "Promouvoir Admin"}
                      >
                        {u.role === UserRole.ADMIN ? <UserX size={14} /> : <UserCheck size={14} />}
                      </button>
                      <button 
                        onClick={() => handleDeleteUser(u)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
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
              <h3 className="text-[16px] font-semibold text-gray-900 dark:text-white">Gestion des Classes</h3>
              <Button onClick={() => { setEditingClass(null); setNewClassData({ name: '', delegate_code: generateDelegateCode(''), class_code: generateClassCode(''), color: '#6C63FF', class_email: '', studentCount: 0, capacity: 50 }); setIsClassModalOpen(true); }} className="flex items-center gap-2">
                <Plus size={16} />
                <span>Nouvelle Classe</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {classes.map((cls) => {
                const secrets = classSecrets[cls.id] || {};
                return (
                  <div key={cls.id} className="p-5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm space-y-5 group">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-medium text-[14px]" style={{ backgroundColor: cls.color || '#6C63FF' }}>
                          {cls.name?.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="text-[14px] font-medium text-gray-900 dark:text-white">{cls.name}</h4>
                          <p className="text-[12px] text-gray-500">{classMemberCounts[cls.id] || 0} / {cls.capacity || 50} étudiants</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEditClass(cls)} className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => handleDeleteContent('classes', cls.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="p-2.5 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-between">
                        <div className="space-y-0.5">
                          <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Code Inscription</p>
                          <p className="text-[13px] font-mono font-medium text-blue-600 dark:text-blue-400">{secrets.class_code || '---'}</p>
                        </div>
                        <button onClick={() => handleCopyCode(secrets.class_code)} className="p-1.5 text-gray-400 hover:text-blue-500 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                          <Copy size={14} />
                        </button>
                      </div>
                      <div className="p-2.5 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-between">
                        <div className="space-y-0.5">
                          <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Code Délégué</p>
                          <p className="text-[13px] font-mono font-medium text-yellow-600 dark:text-yellow-400">{secrets.delegate_code || '---'}</p>
                        </div>
                        <button onClick={() => handleCopyCode(secrets.delegate_code)} className="p-1.5 text-gray-400 hover:text-yellow-600 rounded-md hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors">
                          <Copy size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
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
                <h3 className="text-[16px] font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Vote size={18} className="text-gray-400" />
                  Sondages
                </h3>
                <Link to="/sondages">
                  <Button variant="secondary" size="sm">Gérer</Button>
                </Link>
              </div>
              <div className="space-y-3">
                {polls.map((poll) => (
                  <div key={poll.id} className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm flex items-center justify-between group">
                    <div className="space-y-1">
                      <h4 className="text-[14px] font-medium text-gray-900 dark:text-white line-clamp-1">{poll.question}</h4>
                      <p className="text-[12px] text-gray-500">{poll.totalVotes} votes • {poll.className}</p>
                    </div>
                    <button onClick={() => handleDeleteContent('polls', poll.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md opacity-0 group-hover:opacity-100 transition-all">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Announcements Management */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-[16px] font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Megaphone size={18} className="text-gray-400" />
                  Annonces
                </h3>
                <Link to="/announcements">
                  <Button variant="secondary" size="sm">Gérer</Button>
                </Link>
              </div>
              <div className="space-y-3">
                {announcements.map((ann) => (
                  <div key={ann.id} className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm flex items-center justify-between group">
                    <div className="space-y-1">
                      <h4 className="text-[14px] font-medium text-gray-900 dark:text-white line-clamp-1">{ann.title}</h4>
                      <p className="text-[12px] text-gray-500">{ann.className} • {fmtDate(ann.createdAt)}</p>
                    </div>
                    <button onClick={() => handleDeleteContent('announcements', ann.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md opacity-0 group-hover:opacity-100 transition-all">
                      <Trash2 size={14} />
                    </button>
                  </div>
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
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                      <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Utilisateur</th>
                      <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Action</th>
                      <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Détails</th>
                      <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar 
                              src={log.userAvatar} 
                              name={log.userName} 
                              size="sm" 
                            />
                            <div>
                              <p className="text-[13px] font-medium text-gray-900 dark:text-white">{log.userName}</p>
                              <p className="text-[11px] text-gray-500 uppercase tracking-wider">{log.userRole}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-md text-[11px] font-medium">
                            {log.action}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-[13px] text-gray-600 dark:text-gray-400">
                          {log.details || '---'}
                        </td>
                        <td className="px-6 py-4 text-[12px] text-gray-500">
                          {fmtDate(log.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
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
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider ml-1">Nom de la classe</label>
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
                className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg py-2.5 px-3 text-[13px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-gray-400"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider ml-1">Code Inscription</label>
                <div className="relative">
                  <Input 
                    required
                    value={newClassData.class_code}
                    onChange={(e) => setNewClassData({ ...newClassData, class_code: e.target.value.toUpperCase() })}
                    className="font-mono text-[13px] bg-gray-50 dark:bg-gray-800/50 w-full border border-gray-200 dark:border-gray-800 rounded-lg py-2.5 px-3 outline-none"
                  />
                  <button type="button" onClick={() => setNewClassData({...newClassData, class_code: generateClassCode(newClassData.name)})} className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-500 hover:text-blue-600 transition-colors">
                    <RefreshCw size={14} />
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider ml-1">Code Délégué</label>
                <div className="relative">
                  <Input 
                    required
                    value={newClassData.delegate_code}
                    onChange={(e) => setNewClassData({ ...newClassData, delegate_code: e.target.value.toUpperCase() })}
                    className="font-mono text-[13px] bg-gray-50 dark:bg-gray-800/50 w-full border border-gray-200 dark:border-gray-800 rounded-lg py-2.5 px-3 outline-none"
                  />
                  <button type="button" onClick={() => setNewClassData({...newClassData, delegate_code: generateDelegateCode(newClassData.name)})} className="absolute right-3 top-1/2 -translate-y-1/2 text-yellow-600 hover:text-yellow-700 transition-colors">
                    <RefreshCw size={14} />
                  </button>
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider ml-1">Email de la classe (Facultatif)</label>
              <Input 
                type="email"
                value={newClassData.class_email}
                onChange={(e) => setNewClassData({ ...newClassData, class_email: e.target.value })}
                placeholder="classe@example.com"
                className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg py-2.5 px-3 text-[13px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-gray-400"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider ml-1">Effectif de la classe (Prévisionnel)</label>
              <Input 
                type="number"
                min="1"
                max="500"
                required
                value={newClassData.capacity}
                onChange={(e) => setNewClassData({ ...newClassData, capacity: parseInt(e.target.value, 10) || 1 })}
                placeholder="Ex: 50"
                className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg py-2.5 px-3 text-[13px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-gray-400"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider ml-1">Couleur thématique</label>
              <div className="flex items-center gap-3">
                <input 
                  type="color"
                  value={newClassData.color}
                  onChange={(e) => setNewClassData({ ...newClassData, color: e.target.value })}
                  className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0 bg-transparent"
                />
                <span className="text-[13px] font-mono text-gray-500">{newClassData.color}</span>
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
