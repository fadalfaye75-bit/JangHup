import React, { useState, useEffect } from 'react';
import { User, UserRole, SchoolClass, AuditLog, Announcement, Exam } from '../types';
import { supabase, supabaseUrl, supabaseAnonKey } from '../lib/supabaseClient';
import { createClient } from '@supabase/supabase-js';
import { 
  UserPlus, Users, Shield, CheckCircle2, AlertCircle, Loader2, 
  School, Database, FileText, Trash2, Edit, Activity, Save, AlertOctagon, X, Copy, Eye, EyeOff, Megaphone, Calendar, Plus, AtSign, Key, Info, Lock
} from 'lucide-react';

interface AdminPanelProps {
  currentUser: User;
  allAnnouncements: Announcement[];
  allExams: Exam[];
  globalStats?: {
    announcements: number;
    exams: number;
    files: number;
  }
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ currentUser, allAnnouncements, allExams, globalStats }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'classes' | 'users' | 'logs'>('dashboard');
  
  // Data States
  const [usersList, setUsersList] = useState<User[]>([]);
  const [classesList, setClassesList] = useState<SchoolClass[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Delete Confirmation State
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ type: 'USER' | 'CLASS', id: string, name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Edit States
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  
  // Form States
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: UserRole.STUDENT, classLevel: '' });
  const [newClass, setNewClass] = useState({ name: '', email: '' });

  useEffect(() => {
    fetchAdminData();
  }, [activeTab]);

  const fetchAdminData = async () => {
    setIsLoading(true);
    try {
        // Fetch Users (Profiles)
        const { data: profiles, error: profilesError } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
        if (profiles) {
            setUsersList(profiles.map((p: any) => ({
                id: p.id,
                name: p.full_name || p.email,
                email: p.email,
                role: p.role as UserRole,
                classLevel: p.class_level,
                avatar: p.avatar_url || `https://ui-avatars.com/api/?name=${p.full_name}&background=random`
            })));
        }

        // Fetch Classes
        const { data: classes, error: classesError } = await supabase.from('classes').select('*').order('name', { ascending: true });
        if (classes) {
            setClassesList(classes.map((c: any) => ({
                id: c.id,
                name: c.name,
                email: c.email,
                studentCount: c.student_count || 0,
                createdAt: c.created_at
            })));
        }
    } catch (e) {
        console.error("Erreur chargement admin", e);
    } finally {
        setIsLoading(false);
    }
  };

  // --- DELETE LOGIC ---
  const requestDeleteClass = (cls: SchoolClass) => {
      setDeleteConfirmation({ type: 'CLASS', id: cls.id, name: cls.name });
  };

  const requestDeleteUser = (user: User) => {
      setDeleteConfirmation({ type: 'USER', id: user.id, name: user.name });
  };

  const executeDelete = async () => {
      if (!deleteConfirmation) return;
      setIsDeleting(true);
      setMessage(null);

      try {
          if (deleteConfirmation.type === 'CLASS') {
              await supabase.from('classes').delete().eq('id', deleteConfirmation.id);
              setClassesList(classesList.filter(c => c.id !== deleteConfirmation.id));
              setMessage({ type: 'success', text: `Classe "${deleteConfirmation.name}" supprimée.` });
          } else {
              // Note: Supprimer le profil ne supprime pas l'utilisateur Auth Supabase (nécessite fonction backend).
              await supabase.from('profiles').delete().eq('id', deleteConfirmation.id);
              setUsersList(usersList.filter(u => u.id !== deleteConfirmation.id));
              setMessage({ type: 'success', text: `Accès révoqué pour "${deleteConfirmation.name}".` });
          }
      } catch (e) {
          setMessage({ type: 'error', text: "Erreur lors de la suppression." });
      } finally {
          setIsDeleting(false);
          setDeleteConfirmation(null);
      }
  };

  // --- CLASSES LOGIC ---
  const handleEditClass = (cls: SchoolClass) => {
      setEditingClassId(cls.id);
      setNewClass({ name: cls.name, email: cls.email });
      setMessage(null);
  };

  const handleSubmitClass = async (e: React.FormEvent) => {
      e.preventDefault();
      
      const emailClean = newClass.email.trim();

      const payload = {
          name: newClass.name,
          email: emailClean,
      };

      try {
          if (editingClassId) {
                await supabase.from('classes').update(payload).eq('id', editingClassId);
                setClassesList(classesList.map(c => c.id === editingClassId ? { ...c, ...payload } : c));
                setMessage({ type: 'success', text: 'Classe mise à jour.' });
          } else {
                const { data } = await supabase.from('classes').insert(payload).select().single();
                if (data) {
                    setClassesList([...classesList, { 
                        id: data.id, name: data.name, email: data.email, studentCount: 0, createdAt: data.created_at 
                    }]);
                    setMessage({ type: 'success', text: 'Classe créée.' });
                }
          }
      } catch (e) {
          setMessage({ type: 'error', text: "Erreur lors de l'enregistrement de la classe." });
      }
      
      setNewClass({ name: '', email: '' });
      setEditingClassId(null);
  };

  // --- USERS LOGIC ---
  const handleEditUser = (user: User) => {
      setEditingUserId(user.id);
      setNewUser({ 
          name: user.name, 
          email: user.email,
          password: '',
          role: user.role, 
          classLevel: user.classLevel,
      });
      setMessage(null);
  };

  const handleCancelUserEdit = () => {
      setEditingUserId(null);
      setNewUser({ name: '', email: '', password: '', role: UserRole.STUDENT, classLevel: '' });
  };

  const handleSubmitUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    // Sanitize email: remove ALL whitespace and invisible characters
    const emailClean = newUser.email.toLowerCase().replace(/[\s\u200b\u00a0]/g, '').replace(/['"]/g, '');

    try {
        // Sanitize Input for DB Constraints
        const sanitizedClassLevel = newUser.classLevel && newUser.classLevel.trim() !== '' ? newUser.classLevel : null;

        if (editingUserId) {
            // Update Existing User
            const { error } = await supabase.from('profiles').update({
                full_name: newUser.name, 
                role: newUser.role,
                class_level: sanitizedClassLevel
            }).eq('id', editingUserId);

            if (error) throw error;

            setUsersList(usersList.map(u => u.id === editingUserId ? {
                ...u,
                name: newUser.name,
                role: newUser.role,
                classLevel: sanitizedClassLevel || 'Non assigné'
            } : u));
            setMessage({ type: 'success', text: "Droits utilisateur mis à jour." });
            setEditingUserId(null);
            setNewUser({ name: '', email: '', password: '', role: UserRole.STUDENT, classLevel: '' });
        } else {
            // Create User using temporary client to avoid logging out admin
            if (!emailClean || !newUser.password || newUser.password.length < 6) {
                setMessage({ type: 'error', text: "Email requis et mot de passe de 6 caractères min." });
                setIsLoading(false);
                return;
            }

            const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
                auth: {
                    persistSession: false,
                    autoRefreshToken: false,
                    detectSessionInUrl: false
                }
            });

            const { data, error } = await tempClient.auth.signUp({
                email: emailClean,
                password: newUser.password,
                options: {
                    data: {
                        full_name: newUser.name,
                        role: newUser.role,
                        class_level: sanitizedClassLevel
                    }
                }
            });

            if (error) throw error;

            if (data.user) {
                // IMPORTANT : Insertion explicite dans la table profiles
                // On utilise tempClient si disponible (session active) pour respecter RLS "insert own profile"
                const clientForProfile = data.session ? tempClient : supabase;

                const { error: profileError } = await clientForProfile.from('profiles').upsert({
                    id: data.user.id,
                    email: emailClean,
                    full_name: newUser.name,
                    role: newUser.role,
                    class_level: sanitizedClassLevel,
                    avatar_url: `https://ui-avatars.com/api/?name=${newUser.name}&background=random`,
                    updated_at: new Date().toISOString()
                });

                if (profileError) {
                    console.error("Erreur insertion profil:", profileError);
                    throw new Error("Erreur profil: " + (profileError.message || JSON.stringify(profileError)));
                }

                setTimeout(() => fetchAdminData(), 1000);
                
                setMessage({ type: 'success', text: "Utilisateur créé et profil enregistré avec succès." });
                setNewUser({ name: '', email: '', password: '', role: UserRole.STUDENT, classLevel: '' });
            }
        }
    } catch (e: any) {
        console.error(e);
        // Translate common Supabase/Postgres errors
        let msg = e.message || "Erreur lors de l'opération.";
        if (msg.includes("Database error saving new user")) msg = "Erreur base de données : Vérifiez que la classe existe et que les données sont valides.";
        if (msg.toLowerCase().includes("email address") && msg.toLowerCase().includes("invalid")) msg = "Adresse email invalide.";
        if (msg.includes("User already registered")) msg = "Un utilisateur avec cet email existe déjà.";
        if (msg.includes("weak_password")) msg = "Mot de passe trop faible (6 caractères minimum).";
        
        setMessage({ type: 'error', text: msg });
    } finally {
        setIsLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, color }: any) => (
      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color} text-white`}>
              <Icon size={20} />
          </div>
          <div>
              <p className="text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-wider">{title}</p>
              <h3 className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{value}</h3>
          </div>
      </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm animate-in fade-in" onClick={() => setDeleteConfirmation(null)}></div>
              <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-sm w-full p-6 animate-in zoom-in-95 duration-200">
                  <div className="flex flex-col items-center text-center">
                      <div className="w-12 h-12 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mb-4">
                          <AlertOctagon size={24} />
                      </div>
                      <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Confirmer la suppression</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                          Êtes-vous sûr de vouloir supprimer <strong className="text-slate-800 dark:text-white">{deleteConfirmation.name}</strong> ? 
                          <br/><span className="text-xs mt-1 block text-red-500">Cela révoquera l'accès immédiatement.</span>
                      </p>
                      
                      <div className="flex gap-3 w-full">
                          <button 
                              onClick={() => setDeleteConfirmation(null)}
                              className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm"
                          >
                              Annuler
                          </button>
                          <button 
                              onClick={executeDelete}
                              disabled={isDeleting}
                              className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition-colors shadow-sm flex items-center justify-center gap-2 text-sm disabled:opacity-70"
                          >
                              {isDeleting ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                              Supprimer
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
                <Shield className="text-university dark:text-sky-400" size={24} /> Panneau Administration
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Supervision globale et gestion des accès.</p>
        </div>
        
        <div className="bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800 flex shadow-sm">
            {[
                { id: 'dashboard', label: 'Tableau de Bord', icon: Activity },
                { id: 'classes', label: 'Gestion Classes', icon: School },
                { id: 'users', label: 'Utilisateurs', icon: Users },
            ].map(tab => (
                <button 
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-4 py-2 rounded-md text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap
                        ${activeTab === tab.id 
                            ? 'bg-university dark:bg-sky-600 text-white shadow-sm' 
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                >
                    <tab.icon size={16} /> <span className="hidden sm:inline">{tab.label}</span>
                </button>
            ))}
        </div>
      </div>

      {message && (
          <div className={`p-3 rounded-lg flex items-center gap-3 text-sm font-bold animate-in slide-in-from-top-2 ${message.type === 'success' ? 'bg-success-light dark:bg-success/20 text-success dark:text-green-400 border border-success/20' : 'bg-alert-light dark:bg-alert/20 text-alert dark:text-red-400 border border-alert/20'}`}>
              {message.type === 'success' ? <CheckCircle2 size={18} className="animate-in zoom-in duration-200" /> : <AlertCircle size={18} />}
              {message.text}
              <button onClick={() => setMessage(null)} className="ml-auto opacity-50 hover:opacity-100"><X size={16}/></button>
          </div>
      )}

      {/* --- DASHBOARD TAB --- */}
      {activeTab === 'dashboard' && (
          <div className="space-y-8">
              {/* Global Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard title="Utilisateurs" value={usersList.length} icon={Users} color="bg-university dark:bg-sky-600" />
                  <StatCard title="Classes" value={classesList.length} icon={School} color="bg-emerald-600" />
                  <StatCard title="Publications" value={(globalStats?.announcements || 0) + (globalStats?.exams || 0)} icon={FileText} color="bg-purple-600" />
                  <StatCard title="Connnexions" value={usersList.length} icon={Activity} color="bg-orange-600" />
              </div>

              {/* Class Specific Stats Grid */}
              <div className="border-t border-slate-200 dark:border-slate-800 pt-6">
                 <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                     <Activity size={18} className="text-university dark:text-sky-400" /> Statistiques par Classe
                 </h3>
                 {classesList.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        {classesList.map(cls => {
                            // Calculate metrics on the fly
                            const studentCount = usersList.filter(u => u.classLevel === cls.name && u.role === UserRole.STUDENT).length;
                            const annCount = allAnnouncements.filter(a => a.classLevel === cls.name).length;
                            const examCount = allExams.filter(e => e.classLevel === cls.name).length;

                            return (
                                <div key={cls.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                                    <div className="p-4 border-b border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center">
                                        <div className="flex items-center gap-2.5">
                                            <div className="bg-white dark:bg-slate-800 p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-university dark:text-sky-400 font-bold text-xs shadow-sm">
                                                {cls.name.substring(0, 3)}
                                            </div>
                                            <h4 className="font-bold text-slate-700 dark:text-slate-200 text-sm">{cls.name}</h4>
                                        </div>
                                    </div>
                                    <div className="p-4 grid grid-cols-3 gap-2 text-center divide-x divide-slate-100 dark:divide-slate-800">
                                        <div>
                                            <div className="text-slate-400 dark:text-slate-500 mb-1 flex justify-center"><Users size={14} /></div>
                                            <p className="text-sm font-bold text-slate-800 dark:text-white">{studentCount}</p>
                                            <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold">Élèves</p>
                                        </div>
                                        <div>
                                            <div className="text-slate-400 dark:text-slate-500 mb-1 flex justify-center"><Megaphone size={14} /></div>
                                            <p className="text-sm font-bold text-slate-800 dark:text-white">{annCount}</p>
                                            <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold">Avis</p>
                                        </div>
                                        <div>
                                            <div className="text-slate-400 dark:text-slate-500 mb-1 flex justify-center"><Calendar size={14} /></div>
                                            <p className="text-sm font-bold text-slate-800 dark:text-white">{examCount}</p>
                                            <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold">Exams</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                 ) : (
                     <div className="text-center py-10 bg-slate-50 dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-sm">
                         Aucune classe configurée. Ajoutez des classes dans l'onglet "Gestion Classes".
                     </div>
                 )}
              </div>
          </div>
      )}

      {/* --- CLASSES TAB --- */}
      {activeTab === 'classes' && (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-card p-6">
              <div className="flex justify-between items-center mb-6">
                 <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <School className="text-university dark:text-sky-400" size={20} /> Gestion des Classes
                 </h3>
                 {editingClassId && (
                     <button onClick={() => { setEditingClassId(null); setNewClass({name: '', email: ''}); }} className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-1">
                         <X size={14} /> Annuler
                     </button>
                 )}
              </div>
              
              <form onSubmit={handleSubmitClass} className="mb-8 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row gap-3 items-end">
                  <div className="flex-1 w-full">
                      <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Nom de la Classe</label>
                      <input 
                         placeholder="ex: Tle S2, L1 Informatique..." 
                         className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:border-university dark:focus:border-sky-500 font-medium text-slate-800 dark:text-white"
                         value={newClass.name} onChange={e => setNewClass({...newClass, name: e.target.value})} required
                      />
                  </div>
                  <div className="flex-1 w-full">
                      <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Email du groupe (Optionnel)</label>
                      <div className="relative">
                          <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                          <input 
                             placeholder="ex: tle.s2@janghub.sn" 
                             className="w-full pl-9 p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:border-university dark:focus:border-sky-500 font-medium text-slate-800 dark:text-white"
                             value={newClass.email} onChange={e => setNewClass({...newClass, email: e.target.value})}
                          />
                      </div>
                  </div>
                  <button className="w-full md:w-auto bg-university dark:bg-sky-600 text-white font-bold rounded-lg hover:bg-university-dark dark:hover:bg-sky-700 transition-colors px-6 py-2.5 text-xs shadow-sm flex items-center justify-center gap-2">
                      {editingClassId ? <Save size={14} /> : <Plus size={14} />} 
                      {editingClassId ? 'Mettre à jour' : 'Ajouter Classe'}
                  </button>
              </form>

              <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600 dark:text-slate-400">
                     <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase border-b border-slate-200 dark:border-slate-700">
                         <tr>
                             <th className="p-4">Nom</th>
                             <th className="p-4">Email</th>
                             <th className="p-4">Effectif</th>
                             <th className="p-4">Création</th>
                             <th className="p-4 text-right">Actions</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                         {classesList.map(cls => (
                             <tr key={cls.id} className={`transition-colors ${editingClassId === cls.id ? 'bg-university/5 dark:bg-sky-500/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                                 <td className="p-4 font-bold text-slate-700 dark:text-slate-200 text-sm">
                                     {cls.name}
                                 </td>
                                 <td className="p-4 text-slate-500 font-medium">
                                     {cls.email}
                                 </td>
                                 <td className="p-4">
                                     <div className="flex items-center gap-1 font-medium text-slate-600 dark:text-slate-300">
                                         <Users size={14} /> {usersList.filter(u => u.classLevel === cls.name && u.role === UserRole.STUDENT).length} inscrits
                                     </div>
                                 </td>
                                 <td className="p-4 text-slate-500 font-mono text-[10px]">
                                     {new Date(cls.createdAt).toLocaleDateString()}
                                 </td>
                                 <td className="p-4 flex gap-1 justify-end items-center">
                                     <button onClick={() => handleEditClass(cls)} className="p-1.5 text-slate-400 hover:text-university dark:hover:text-sky-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-all">
                                         <Edit size={14}/>
                                     </button>
                                     <button onClick={() => requestDeleteClass(cls)} className="p-1.5 text-slate-400 hover:text-alert hover:bg-alert-light dark:hover:bg-alert/10 rounded transition-all">
                                         <Trash2 size={14}/>
                                     </button>
                                 </td>
                             </tr>
                         ))}
                         {classesList.length === 0 && (
                             <tr>
                                 <td colSpan={5} className="p-8 text-center text-slate-400 italic">Aucune classe pour le moment.</td>
                             </tr>
                         )}
                     </tbody>
                  </table>
              </div>
          </div>
      )}

      {/* --- USERS TAB --- */}
      {activeTab === 'users' && (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-card overflow-hidden">
               
               <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                   <div className="flex justify-between items-center mb-4">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                            {editingUserId ? `Modifier ${newUser.name}` : 'Nouveau compte utilisateur'}
                        </span>
                        {editingUserId && (
                            <button onClick={handleCancelUserEdit} className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-1">
                                <X size={14} /> Annuler
                            </button>
                        )}
                   </div>
                   
                   {!editingUserId && (
                       <div className="flex items-start gap-3 p-4 mb-4 bg-sky-50 dark:bg-sky-900/10 text-sky-700 dark:text-sky-300 rounded-lg border border-sky-100 dark:border-sky-900/20 text-sm">
                           <Info size={20} className="shrink-0 mt-0.5" />
                           <p>
                               <strong>Création manuelle :</strong> Remplissez le formulaire ci-dessous pour créer un nouvel utilisateur. Un email de confirmation sera envoyé si la configuration Supabase l'exige.
                           </p>
                       </div>
                   )}

                    <form onSubmit={handleSubmitUser} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                        <div className="md:col-span-1">
                            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Nom Complet</label>
                            <input 
                                className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:border-university dark:focus:border-sky-500 font-medium text-slate-800 dark:text-white"
                                value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})}
                                required={!editingUserId}
                            />
                        </div>
                        
                        {/* Email field needed for creation, and read-only for edit usually, but simple input here */}
                        {!editingUserId && (
                             <div>
                                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Email</label>
                                <input 
                                    type="email"
                                    className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:border-university dark:focus:border-sky-500 font-medium text-slate-800 dark:text-white"
                                    value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})}
                                    required
                                />
                             </div>
                        )}

                        {/* Password field only for creation */}
                        {!editingUserId && (
                             <div>
                                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Mot de passe</label>
                                <div className="relative">
                                    <input 
                                        type="password"
                                        className="w-full p-2.5 pr-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:border-university dark:focus:border-sky-500 font-medium text-slate-800 dark:text-white"
                                        value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})}
                                        placeholder="Min 6 car."
                                        required
                                    />
                                    <Lock size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" />
                                </div>
                             </div>
                        )}
                        
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Rôle</label>
                            <select 
                                className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:border-university dark:focus:border-sky-500 font-medium text-slate-800 dark:text-white"
                                value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as UserRole})}
                            >
                                <option value={UserRole.STUDENT}>Élève</option>
                                <option value={UserRole.RESPONSIBLE}>Délégué</option>
                                <option value={UserRole.ADMIN}>Admin</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Classe</label>
                            <select
                                    className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:border-university dark:focus:border-sky-500 font-medium text-slate-800 dark:text-white"
                                    value={newUser.classLevel} 
                                    onChange={e => setNewUser({...newUser, classLevel: e.target.value})}
                                >
                                    <option value="">-- Non assigné --</option>
                                    <option value="ADMINISTRATION" className="font-bold bg-slate-100 dark:bg-slate-700">ADMINISTRATION</option>
                                    {classesList.map(cls => (
                                        <option key={cls.id} value={cls.name}>{cls.name}</option>
                                    ))}
                            </select>
                        </div>
                        
                        <button disabled={isLoading} className="bg-university dark:bg-sky-600 text-white font-bold rounded-lg hover:bg-university-dark dark:hover:bg-sky-700 transition-colors px-4 py-2.5 flex items-center justify-center gap-2 text-xs shadow-sm min-w-[120px]">
                            {isLoading ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} 
                            {editingUserId ? 'Mettre à jour' : 'Créer Compte'}
                        </button>
                    </form>
               </div>

               <div className="overflow-x-auto">
                   <table className="w-full text-left text-xs text-slate-600 dark:text-slate-400">
                      <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase border-b border-slate-200 dark:border-slate-700">
                          <tr>
                              <th className="p-4">Identité</th>
                              <th className="p-4">Rôle</th>
                              <th className="p-4">Classe</th>
                              <th className="p-4 text-right">Actions</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {usersList.map((u, i) => (
                              <tr key={i} className={`transition-colors ${editingUserId === u.id ? 'bg-university/5 dark:bg-sky-500/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                                  <td className="p-4 font-bold text-slate-700 dark:text-slate-200 flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                        <img src={u.avatar} className="w-full h-full object-cover" alt="" />
                                      </div>
                                      <div>
                                          <p>{u.name}</p>
                                          <p className="text-slate-400 font-normal">{u.email}</p>
                                      </div>
                                  </td>
                                  <td className="p-4">
                                      <span className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase ${
                                          u.role === UserRole.ADMIN ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-100 dark:border-purple-800' :
                                          u.role === UserRole.RESPONSIBLE ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-100 dark:border-emerald-800' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                                      }`}>{u.role === UserRole.RESPONSIBLE ? 'Délégué' : u.role}</span>
                                  </td>
                                  <td className="p-4 font-medium">{u.classLevel || 'Non assigné'}</td>
                                  <td className="p-4 flex gap-1 justify-end items-center">
                                      <button 
                                        onClick={() => handleEditUser(u)}
                                        className="p-1.5 text-slate-400 hover:text-university dark:hover:text-sky-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-all"
                                        title="Modifier les droits"
                                      >
                                          <Edit size={14}/>
                                      </button>
                                      <button 
                                        onClick={() => requestDeleteUser(u)}
                                        className="p-1.5 text-slate-400 hover:text-alert hover:bg-alert-light dark:hover:bg-alert/10 rounded transition-all"
                                        title="Révoquer l'accès"
                                      >
                                          <Trash2 size={14}/>
                                      </button>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                   </table>
               </div>
          </div>
      )}
    </div>
  );
};