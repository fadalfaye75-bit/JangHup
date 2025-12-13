import React, { useState, useEffect } from 'react';
import { User, UserRole, SchoolClass, AuditLog } from '../types';
import { supabase } from '../lib/supabaseClient';
import { 
  UserPlus, Users, Shield, CheckCircle2, AlertCircle, Loader2, Search, 
  School, Mail, Info, BarChart2, Activity, Database, FileText, Trash2, Edit
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line } from 'recharts';

interface AdminPanelProps {
  currentUser: User;
  globalStats?: {
    announcements: number;
    exams: number;
    files: number;
  }
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ currentUser, globalStats }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'classes' | 'users' | 'logs'>('dashboard');
  
  // Data States
  const [usersList, setUsersList] = useState<User[]>([]);
  const [classesList, setClassesList] = useState<SchoolClass[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Form States - Default password set to 'passer25'
  const [newUser, setNewUser] = useState({ name: '', email: '', role: UserRole.STUDENT, classLevel: '', password: 'passer25' });
  const [newClass, setNewClass] = useState({ name: '', delegateId: '' });

  useEffect(() => {
    fetchAdminData();
  }, [activeTab]);

  const fetchAdminData = async () => {
    // 1. Fetch Users (Profiles)
    const { data: users } = await supabase.from('profiles').select('*');
    if (users) {
        setUsersList(users.map((u: any) => ({
            id: u.id,
            name: u.full_name,
            email: u.email,
            role: u.role,
            classLevel: u.class_level,
            avatar: u.avatar_url
        })));
    }

    // 2. Mock Fetch Classes (In real app, fetch from 'classes' table)
    // Here we derive from users + mock data for demo
    const derivedClasses = Array.from(new Set(users?.map((u:any) => u.class_level).filter(Boolean))) as string[];
    const mockClasses: SchoolClass[] = derivedClasses.map((cls, idx) => ({
        id: `class-${idx}`,
        name: cls,
        email: `${cls.toLowerCase().replace(/[^a-z0-9]/g, '.')}@janghub.sn`,
        studentCount: users?.filter((u:any) => u.class_level === cls && u.role === UserRole.STUDENT).length || 0,
        delegateName: users?.find((u:any) => u.class_level === cls && u.role === UserRole.RESPONSIBLE)?.full_name || 'Non assigné',
        createdAt: new Date().toISOString()
    }));
    setClassesList(mockClasses);

    // 3. Mock Logs
    setLogs([
        { id: '1', actorName: 'Admin', actorRole: UserRole.ADMIN, action: 'CREATE_USER', targetClass: 'Tle S2', details: 'Ajout de Moussa Diop', timestamp: new Date().toISOString() },
        { id: '2', actorName: 'Fatou Ndiaye', actorRole: UserRole.RESPONSIBLE, action: 'POST_ANNOUNCEMENT', targetClass: '1ere L', details: 'Message urgent', timestamp: new Date(Date.now() - 86400000).toISOString() },
        { id: '3', actorName: 'Admin', actorRole: UserRole.ADMIN, action: 'CREATE_CLASS', targetClass: '2nde S', details: 'Création de la classe', timestamp: new Date(Date.now() - 172800000).toISOString() },
    ]);
  };

  const handleCreateClass = async (e: React.FormEvent) => {
      e.preventDefault();
      // Logic to create class in DB
      const generatedEmail = `${newClass.name.trim().toLowerCase().replace(/[^a-z0-9]/g, '.')}@janghub.sn`;
      
      // Mock update
      const cls: SchoolClass = {
          id: `new-${Date.now()}`,
          name: newClass.name,
          email: generatedEmail,
          studentCount: 0,
          delegateName: 'À assigner',
          createdAt: new Date().toISOString()
      };
      setClassesList([...classesList, cls]);
      setNewClass({ name: '', delegateId: '' });
      setMessage({ type: 'success', text: `Classe ${cls.name} créée avec l'email ${cls.email}` });
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
        const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(newUser.name)}&background=random`;
        // Call Supabase Auth & DB
        const { error } = await supabase.rpc('create_user_by_admin', {
            email: newUser.email,
            password: newUser.password || 'passer25', // Force default password if empty
            full_name: newUser.name,
            role: newUser.role,
            class_level: newUser.classLevel,
            avatar_url: avatarUrl
        });

        if (error) throw error;
        setMessage({ type: 'success', text: `Utilisateur créé. Mot de passe par défaut : passer25` });
        fetchAdminData();
        setNewUser({ name: '', email: '', role: UserRole.STUDENT, classLevel: '', password: 'passer25' });
    } catch (err: any) {
        setMessage({ type: 'error', text: err.message || "Erreur création." });
    } finally {
        setIsLoading(false);
    }
  };

  // --- SUB-COMPONENTS ---

  const StatCard = ({ title, value, icon: Icon, color }: any) => (
      <div className="bg-white p-6 rounded-[2rem] shadow-soft border border-slate-50 flex items-center gap-5">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${color} text-white shadow-md`}>
              <Icon size={24} />
          </div>
          <div>
              <p className="text-slate-400 font-bold text-xs uppercase tracking-wider mb-1">{title}</p>
              <h3 className="text-3xl font-bold text-slate-800">{value}</h3>
          </div>
      </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
            <h2 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
                <Shield className="text-brand" size={32} /> Administration
            </h2>
            <p className="text-slate-500 font-medium mt-1">Supervision globale et gestion des accès.</p>
        </div>
        
        {/* Navigation Tabs */}
        <div className="bg-white p-1.5 rounded-2xl border border-slate-100 flex shadow-sm overflow-x-auto max-w-full">
            {[
                { id: 'dashboard', label: 'Tableau de bord', icon: BarChart2 },
                { id: 'classes', label: 'Classes & Mails', icon: School },
                { id: 'users', label: 'Utilisateurs', icon: Users },
                { id: 'logs', label: 'Journal Audit', icon: Activity },
            ].map(tab => (
                <button 
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap
                        ${activeTab === tab.id 
                            ? 'bg-slate-800 text-white shadow-md' 
                            : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    <tab.icon size={18} /> {tab.label}
                </button>
            ))}
        </div>
      </div>

      {message && (
          <div className={`p-4 rounded-2xl flex items-center gap-3 text-sm font-bold animate-in slide-in-from-top-2 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
              {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
              {message.text}
          </div>
      )}

      {/* --- DASHBOARD TAB --- */}
      {activeTab === 'dashboard' && (
          <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatCard title="Total Utilisateurs" value={usersList.length} icon={Users} color="bg-brand" />
                  <StatCard title="Classes Actives" value={classesList.length} icon={School} color="bg-emerald-500" />
                  <StatCard title="Contenus Publiés" value={(globalStats?.announcements || 0) + (globalStats?.exams || 0)} icon={FileText} color="bg-purple-500" />
                  <StatCard title="Stockage (Est.)" value="1.2 GB" icon={Database} color="bg-orange-500" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Activity Chart */}
                  <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] shadow-soft border border-slate-50">
                      <h3 className="font-bold text-slate-800 mb-6">Activité de la plateforme (7 jours)</h3>
                      <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={[
                                  { day: 'Lun', actions: 12 }, { day: 'Mar', actions: 19 }, { day: 'Mer', actions: 3 }, 
                                  { day: 'Jeu', actions: 25 }, { day: 'Ven', actions: 15 }, { day: 'Sam', actions: 8 }, { day: 'Dim', actions: 2 }
                              ]}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                                  <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                                  <Line type="monotone" dataKey="actions" stroke="#87CEEB" strokeWidth={4} dot={{r: 4, fill: '#87CEEB', strokeWidth: 2, stroke: '#fff'}} />
                              </LineChart>
                          </ResponsiveContainer>
                      </div>
                  </div>

                  {/* Distribution by Role */}
                  <div className="bg-white p-8 rounded-[2.5rem] shadow-soft border border-slate-50">
                      <h3 className="font-bold text-slate-800 mb-6">Répartition</h3>
                      <div className="space-y-4">
                          {[
                              { label: 'Élèves', count: usersList.filter(u => u.role === UserRole.STUDENT).length, color: 'bg-sky-500' },
                              { label: 'Délégués', count: usersList.filter(u => u.role === UserRole.RESPONSIBLE).length, color: 'bg-emerald-500' },
                              { label: 'Admins', count: usersList.filter(u => u.role === UserRole.ADMIN).length, color: 'bg-purple-500' }
                          ].map(item => (
                              <div key={item.label}>
                                  <div className="flex justify-between text-sm font-bold text-slate-600 mb-1">
                                      <span>{item.label}</span>
                                      <span>{item.count}</span>
                                  </div>
                                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                      <div className={`h-full ${item.color}`} style={{ width: `${(item.count / usersList.length) * 100}%` }}></div>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* --- CLASSES TAB --- */}
      {activeTab === 'classes' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Create Class Form */}
              <div className="bg-white p-8 rounded-[2.5rem] shadow-soft border border-slate-50 lg:col-span-1 h-fit">
                  <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
                      <School size={20} className="text-brand" /> Nouvelle Classe
                  </h3>
                  <form onSubmit={handleCreateClass} className="space-y-4">
                      <div>
                          <label className="text-sm font-bold text-slate-600 mb-1 block">Nom de la classe</label>
                          <input 
                              value={newClass.name}
                              onChange={e => setNewClass({...newClass, name: e.target.value})}
                              placeholder="ex: 1ere S2"
                              className="w-full p-3 bg-slate-50 rounded-xl font-medium outline-none focus:ring-2 focus:ring-brand"
                              required
                          />
                      </div>
                      
                      {/* Live Email Preview */}
                      <div className="bg-sky-50 p-4 rounded-xl border border-sky-100">
                          <p className="text-[10px] font-bold text-sky-700 uppercase mb-1">Mail Unique (Généré)</p>
                          <p className="font-bold text-slate-700 flex items-center gap-2 text-sm">
                              <Mail size={14} className="text-brand" />
                              {newClass.name ? `${newClass.name.trim().toLowerCase().replace(/[^a-z0-9]/g, '.')}@janghub.sn` : '...'}
                          </p>
                      </div>

                      <button className="w-full py-3 bg-brand text-white font-bold rounded-xl shadow-lg shadow-sky-200 hover:bg-sky-400 transition-all active:scale-95">
                          Créer la classe
                      </button>
                  </form>
              </div>

              {/* Classes List */}
              <div className="lg:col-span-2 space-y-4">
                  {classesList.map(cls => (
                      <div key={cls.id} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-500 font-bold">
                                  {cls.name.substring(0, 2)}
                              </div>
                              <div>
                                  <h4 className="font-bold text-slate-800 text-lg">{cls.name}</h4>
                                  <div className="flex items-center gap-3 text-xs font-bold text-slate-400">
                                      <span className="flex items-center gap-1"><Mail size={12} /> {cls.email}</span>
                                      <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                      <span className="flex items-center gap-1"><Users size={12} /> {cls.studentCount} élèves</span>
                                  </div>
                              </div>
                          </div>
                          <div className="flex items-center gap-3 w-full md:w-auto bg-slate-50 p-3 rounded-xl">
                              <div className="text-right">
                                  <p className="text-[10px] font-bold text-slate-400 uppercase">Délégué</p>
                                  <p className="text-sm font-bold text-emerald-600">{cls.delegateName}</p>
                              </div>
                              <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center">
                                  <CheckCircle2 size={16} className="text-emerald-500" />
                              </div>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {/* --- USERS TAB --- */}
      {activeTab === 'users' && (
          <div className="bg-white rounded-[2.5rem] p-8 shadow-soft border border-slate-50">
               <div className="flex justify-between items-center mb-8">
                   <h3 className="font-bold text-xl text-slate-800">Gestion des Utilisateurs</h3>
                   <div className="relative">
                       <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                       <input placeholder="Rechercher..." className="pl-9 pr-4 py-2 bg-slate-50 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-brand/20" />
                   </div>
               </div>

               {/* Simple Creation Form Inline */}
               <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                   <input 
                      placeholder="Nom complet" 
                      className="p-3 bg-white rounded-xl text-sm font-medium outline-none border border-slate-200 focus:border-brand"
                      value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} required
                   />
                   <input 
                      placeholder="Email" 
                      className="p-3 bg-white rounded-xl text-sm font-medium outline-none border border-slate-200 focus:border-brand"
                      value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} required
                   />
                   <select 
                      className="p-3 bg-white rounded-xl text-sm font-medium outline-none border border-slate-200 focus:border-brand"
                      value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as UserRole})}
                   >
                       <option value={UserRole.STUDENT}>Élève</option>
                       <option value={UserRole.RESPONSIBLE}>Délégué</option>
                       <option value={UserRole.ADMIN}>Admin</option>
                   </select>
                   <select 
                      className="p-3 bg-white rounded-xl text-sm font-medium outline-none border border-slate-200 focus:border-brand"
                      value={newUser.classLevel} onChange={e => setNewUser({...newUser, classLevel: e.target.value})} required
                   >
                       <option value="">Choisir Classe</option>
                       {classesList.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                   </select>
                   <button disabled={isLoading} className="bg-slate-800 text-white font-bold rounded-xl hover:bg-black transition-colors flex items-center justify-center gap-2">
                       {isLoading ? <Loader2 className="animate-spin" size={16} /> : <UserPlus size={18} />} Ajouter
                   </button>
               </form>

               {/* Table */}
               <div className="overflow-x-auto">
                   <table className="w-full text-left text-sm text-slate-600">
                      <thead className="bg-slate-50 text-slate-800 font-bold uppercase text-xs tracking-wider">
                          <tr>
                              <th className="p-4 rounded-l-xl">Utilisateur</th>
                              <th className="p-4">Rôle</th>
                              <th className="p-4">Classe</th>
                              <th className="p-4 rounded-r-xl">Actions</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                          {usersList.map((u, i) => (
                              <tr key={i} className="hover:bg-sky-50/30 transition-colors">
                                  <td className="p-4 font-bold text-slate-700 flex items-center gap-3">
                                      <img src={u.avatar} className="w-8 h-8 rounded-full" alt="" />
                                      {u.name}
                                  </td>
                                  <td className="p-4">
                                      <span className={`px-2 py-1 rounded-lg text-xs font-bold uppercase ${
                                          u.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-700' :
                                          u.role === UserRole.RESPONSIBLE ? 'bg-emerald-100 text-emerald-700' : 'bg-sky-100 text-sky-700'
                                      }`}>{u.role === UserRole.RESPONSIBLE ? 'Délégué' : u.role}</span>
                                  </td>
                                  <td className="p-4 font-medium">{u.classLevel}</td>
                                  <td className="p-4 flex gap-2">
                                      <button className="p-2 text-slate-400 hover:text-brand bg-slate-50 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg transition-all"><Edit size={16}/></button>
                                      <button className="p-2 text-slate-400 hover:text-alert bg-slate-50 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg transition-all"><Trash2 size={16}/></button>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                   </table>
               </div>
          </div>
      )}

      {/* --- LOGS TAB --- */}
      {activeTab === 'logs' && (
          <div className="bg-white rounded-[2.5rem] p-8 shadow-soft border border-slate-50">
               <h3 className="font-bold text-xl text-slate-800 mb-6 flex items-center gap-2">
                   <Activity className="text-brand" /> Journal d'Audit (Supervision)
               </h3>
               <div className="space-y-4">
                   {logs.map(log => (
                       <div key={log.id} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                           <div className={`p-3 rounded-xl ${log.actorRole === UserRole.ADMIN ? 'bg-purple-100 text-purple-600' : 'bg-sky-100 text-sky-600'}`}>
                               <Shield size={20} />
                           </div>
                           <div className="flex-1">
                               <p className="text-sm text-slate-800">
                                   <span className="font-bold">{log.actorName}</span> ({log.actorRole}) a effectué 
                                   <span className="font-bold font-mono text-xs bg-slate-200 px-1 py-0.5 rounded mx-1">{log.action}</span>
                                   sur la classe <strong>{log.targetClass}</strong>
                               </p>
                               <p className="text-xs text-slate-400 mt-1">{log.details}</p>
                           </div>
                           <div className="text-xs font-bold text-slate-400 bg-white px-3 py-1 rounded-lg border border-slate-200">
                               {new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString()}
                           </div>
                       </div>
                   ))}
               </div>
          </div>
      )}
    </div>
  );
};