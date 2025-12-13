import React, { useState, useEffect } from 'react';
import { User, UserRole, SchoolClass, AuditLog, Announcement, Exam } from '../types';
import { supabase } from '../lib/supabaseClient';
import { 
  UserPlus, Users, Shield, CheckCircle2, AlertCircle, Loader2, Search, 
  School, Mail, Database, FileText, Trash2, Edit, Activity, Save, AlertOctagon, GraduationCap, X, Copy, Eye, EyeOff, Key, Megaphone, Calendar, Clock, Plus, AtSign
} from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';

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
  
  // UI States
  const [showPassword, setShowPassword] = useState(false);

  // New User Credentials Display (Temporary storage for copy)
  const [createdCredentials, setCreatedCredentials] = useState<{name: string, email: string, role: string, pass: string} | null>(null);

  // Form States
  const [newUser, setNewUser] = useState({ name: '', email: '', role: UserRole.STUDENT, classLevel: '', password: '' });
  // Simplification : Nom et Email seulement pour la classe
  const [newClass, setNewClass] = useState({ name: '', email: '' });

  // Mode Démo/Secours
  const isDemoMode = currentUser.id === 'admin-preview-id';

  useEffect(() => {
    fetchAdminData();
  }, [activeTab]);

  const fetchAdminData = async () => {
    setIsLoading(true);
    
    // Si mode démo, ne pas fetcher ou renvoyer des données vides pour éviter "failed to fetch"
    if (isDemoMode && classesList.length === 0 && usersList.length === 0) {
        setClassesList([
            { id: 'demo-1', name: 'Tle S2', email: 'tle.s2@janghub.sn', studentCount: 0, createdAt: new Date().toISOString() },
            { id: 'demo-2', name: 'L1 Info', email: 'l1.info@janghub.sn', studentCount: 0, createdAt: new Date().toISOString() }
        ]);
        setUsersList([
             { id: 'admin-preview-id', name: 'M. Faye (Admin)', email: currentUser.email, role: UserRole.ADMIN, classLevel: 'ADMINISTRATION', avatar: currentUser.avatar }
        ]);
        setIsLoading(false);
        return;
    } else if (isDemoMode) {
        setIsLoading(false);
        return; // Conserver l'état local en mémoire
    }

    try {
        // Fetch Users (Profiles)
        const { data: profiles, error: profilesError } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
        if (profilesError) throw profilesError;
        
        if (profiles) {
            setUsersList(profiles.map((p: any) => ({
                id: p.id,
                name: p.full_name || p.email,
                email: p.email,
                role: p.role,
                classLevel: p.class_level,
                avatar: p.avatar_url || `https://ui-avatars.com/api/?name=${p.full_name || 'U'}&background=random`
            })));
        }

        // Fetch Classes
        const { data: classesData, error: classesError } = await supabase.from('classes').select('*').order('name');
        if (!classesError && classesData) {
            setClassesList(classesData.map((c: any) => ({
                id: c.id,
                name: c.name,
                email: c.email || `${c.name.toLowerCase().replace(/[^a-z0-9]/g, '.')}@janghub.sn`,
                studentCount: c.student_count || 0,
                delegateId: c.delegate_id,
                delegateName: c.delegate_name || 'Non assigné',
                createdAt: c.created_at
            })));
        }

        // Fetch Logs
        const { data: logsData } = await supabase.from('audit_logs').select('*').order('timestamp', { ascending: false }).limit(50);
        if (logsData) {
            setLogs(logsData.map((l: any) => ({
                id: l.id,
                actorName: l.actor_name || 'System',
                actorRole: l.actor_role || UserRole.ADMIN,
                action: l.action,
                targetClass: l.target_class || 'Global',
                details: l.details,
                timestamp: l.timestamp
            })));
        }

    } catch (error: any) {
        console.error("Admin fetch error:", error);
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

      // Mode Démo
      if (isDemoMode) {
          await new Promise(r => setTimeout(r, 500));
          if (deleteConfirmation.type === 'CLASS') {
             setClassesList(classesList.filter(c => c.id !== deleteConfirmation.id));
          } else {
             setUsersList(usersList.filter(u => u.id !== deleteConfirmation.id));
          }
          setMessage({ type: 'success', text: 'Supprimé (Mode Local)' });
          setDeleteConfirmation(null);
          setIsDeleting(false);
          return;
      }

      try {
          if (deleteConfirmation.type === 'CLASS') {
              const { error } = await supabase.from('classes').delete().eq('id', deleteConfirmation.id);
              if (error) throw error;
              setClassesList(classesList.filter(c => c.id !== deleteConfirmation.id));
              setMessage({ type: 'success', text: `Classe "${deleteConfirmation.name}" supprimée.` });
          } else {
              const { error } = await supabase.from('profiles').delete().eq('id', deleteConfirmation.id);
              if (error) throw error;
              setUsersList(usersList.filter(u => u.id !== deleteConfirmation.id));
              setMessage({ type: 'success', text: `Utilisateur "${deleteConfirmation.name}" supprimé.` });
          }
      } catch (err: any) {
          console.error(err);
          setMessage({ type: 'error', text: "Impossible de supprimer. Vérifiez qu'il n'y a pas de données liées (examens, etc.)." });
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

  const handleCancelClassEdit = () => {
      setEditingClassId(null);
      setNewClass({ name: '', email: '' });
  };

  // Auto-fill email based on class name if email is empty
  const handleClassNameChange = (name: string) => {
      const generatedEmail = `${name.trim().toLowerCase().replace(/[^a-z0-9]/g, '.')}@janghub.sn`;
      // Only auto-update email if the user hasn't manually edited it significantly, or if it's new
      if (!editingClassId && (newClass.email === '' || newClass.email.includes('@janghub.sn'))) {
          setNewClass({ name, email: generatedEmail });
      } else {
          setNewClass({ ...newClass, name });
      }
  };

  const handleSubmitClass = async (e: React.FormEvent) => {
      e.preventDefault();
      
      const payload = {
          name: newClass.name,
          email: newClass.email,
          // On ne gère plus le délégué à la création
      };

      // Mode Démo : Simulation locale
      if (isDemoMode) {
          if (editingClassId) {
             setClassesList(classesList.map(c => c.id === editingClassId ? { ...c, ...payload } : c));
             setMessage({ type: 'success', text: 'Classe mise à jour (Local).' });
          } else {
             const newLocalClass: SchoolClass = {
                 id: `local-${Date.now()}`,
                 name: payload.name,
                 email: payload.email,
                 studentCount: 0,
                 createdAt: new Date().toISOString()
             };
             setClassesList([...classesList, newLocalClass]);
             setMessage({ type: 'success', text: 'Classe créée (Local).' });
          }
          setNewClass({ name: '', email: '' });
          setEditingClassId(null);
          return;
      }

      try {
          if (editingClassId) {
             const { error } = await supabase.from('classes').update(payload).eq('id', editingClassId);
             if (error) throw error;
             setMessage({ type: 'success', text: 'Classe mise à jour.' });
          } else {
             const { error } = await supabase.from('classes').insert(payload);
             if (error) throw error;
             setMessage({ type: 'success', text: 'Classe créée.' });
          }
          fetchAdminData();
          setNewClass({ name: '', email: '' });
          setEditingClassId(null);
      } catch (err: any) {
          setMessage({ type: 'error', text: err.message });
      }
  };

  // --- USERS LOGIC ---

  const handleEditUser = (user: User) => {
      setEditingUserId(user.id);
      setNewUser({ 
          name: user.name, 
          email: user.email, 
          role: user.role, 
          classLevel: user.classLevel, 
          password: '' 
      });
      setCreatedCredentials(null);
      setMessage(null);
      setShowPassword(false);
  };

  const handleCancelUserEdit = () => {
      setEditingUserId(null);
      setNewUser({ name: '', email: '', role: UserRole.STUDENT, classLevel: '', password: '' });
  };

  const handleSubmitUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    // Validation basique
    if (!newUser.classLevel) {
        setMessage({ type: 'error', text: "Veuillez sélectionner une classe." });
        setIsLoading(false);
        return;
    }

    // Mode Démo : Simulation locale
    if (isDemoMode) {
         await new Promise(r => setTimeout(r, 600)); // Fake network delay
         const simulatedUser: User = {
             id: editingUserId || `local-u-${Date.now()}`,
             name: newUser.name,
             email: newUser.email,
             role: newUser.role as UserRole,
             classLevel: newUser.classLevel,
             avatar: `https://ui-avatars.com/api/?name=${newUser.name}&background=random`
         };

         if (editingUserId) {
             setUsersList(usersList.map(u => u.id === editingUserId ? simulatedUser : u));
             setMessage({ type: 'success', text: "Profil mis à jour (Local)." });
         } else {
             setUsersList([simulatedUser, ...usersList]);
             setCreatedCredentials({
                name: newUser.name,
                email: newUser.email,
                role: newUser.role,
                pass: newUser.password || 'passer25'
             });
             setMessage({ type: 'success', text: "Utilisateur créé (Local)." });
         }
         
         if (!editingUserId) setNewUser({ name: '', email: '', role: UserRole.STUDENT, classLevel: '', password: '' });
         else setEditingUserId(null);

         setIsLoading(false);
         return;
    }

    try {
        if (editingUserId) {
            // 1. Update Profile Metadata
            const { error: profileError } = await supabase.from('profiles').update({
                full_name: newUser.name,
                role: newUser.role,
                class_level: newUser.classLevel
            }).eq('id', editingUserId);

            if (profileError) throw profileError;

            let successText = "Profil mis à jour.";

            // 2. Update Password if provided
            if (newUser.password && newUser.password.trim() !== '') {
                if (window.confirm("Attention : Vous êtes sur le point de changer le mot de passe de cet utilisateur. Confirmer ?")) {
                    const { error: pwdError } = await supabase.rpc('admin_reset_password', {
                        target_user_id: editingUserId,
                        new_password: newUser.password
                    });

                    if (pwdError) {
                        throw new Error(`Erreur mot de passe: ${pwdError.message}`);
                    }
                    successText = "Profil et mot de passe mis à jour.";
                }
            }

            setMessage({ type: 'success', text: successText });
            setEditingUserId(null);
            fetchAdminData();
        } else {
            // Create User via RPC
            const generatedPassword = newUser.password || 'passer25';
            
            const { data, error } = await supabase.rpc('create_user_with_profile', {
                user_email: newUser.email,
                user_password: generatedPassword,
                user_name: newUser.name,
                user_role: newUser.role,
                user_class: newUser.classLevel
            });

            if (error) throw error;

            setCreatedCredentials({
                name: newUser.name,
                email: newUser.email,
                role: newUser.role,
                pass: generatedPassword
            });
            
            setMessage({ type: 'success', text: `Utilisateur créé avec succès.` });
            fetchAdminData();
        }
        
        if (!createdCredentials) {
             setNewUser({ name: '', email: '', role: UserRole.STUDENT, classLevel: '', password: '' });
        }
    } catch (err: any) {
        console.error(err);
        setMessage({ type: 'error', text: err.message || "Erreur lors de l'opération." });
    } finally {
        setIsLoading(false);
    }
  };

  const copyCredentials = () => {
      if (!createdCredentials) return;
      const text = `
--------------------------------
JàngHub - Nouveaux Identifiants
--------------------------------
Nom: ${createdCredentials.name}
Email: ${createdCredentials.email}
Mot de passe: ${createdCredentials.pass}
Rôle: ${createdCredentials.role}
--------------------------------
`.trim();

      navigator.clipboard.writeText(text).then(() => {
          setMessage({ type: 'success', text: 'Coordonnées copiées !' });
      });
  };

  const copyUserCredentials = (u: User) => {
      const text = `Email: ${u.email}\nMot de passe: passer25`;
      navigator.clipboard.writeText(text).then(() => {
          setMessage({ type: 'success', text: 'Identifiants (défaut) copiés.' });
      });
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
      
      {isDemoMode && (
          <div className="bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 p-3 rounded-lg flex items-center gap-2 text-sm font-bold border border-orange-100 dark:border-orange-900/30">
              <AlertCircle size={18} /> Mode Démo / Hors Ligne actif. Les modifications sont locales et seront perdues au rechargement.
          </div>
      )}

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
                          <br/><span className="text-xs mt-1 block text-red-500">Cette action est irréversible.</span>
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
                { id: 'logs', label: 'Logs', icon: FileText },
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
              {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
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
                  <StatCard title="Logs (24h)" value={logs.length} icon={Database} color="bg-orange-600" />
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
                         Aucune classe configurée.
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
                     <button onClick={handleCancelClassEdit} className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-1">
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
                         value={newClass.name} onChange={e => handleClassNameChange(e.target.value)} required
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
               {/* New User Credentials Modal */}
               {createdCredentials && (
                   <div className="p-6 bg-emerald-50 dark:bg-emerald-900/20 border-b border-emerald-100 dark:border-emerald-900/50 flex flex-col md:flex-row items-center justify-between gap-4">
                       <div className="flex items-start gap-4">
                           <div className="bg-emerald-100 dark:bg-emerald-900/50 p-2.5 rounded-full mt-1 text-emerald-600 dark:text-emerald-400">
                               <CheckCircle2 size={24} />
                           </div>
                           <div>
                               <h4 className="font-bold text-slate-800 dark:text-white text-sm">Compte créé avec succès !</h4>
                               <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-2">Veuillez sauvegarder ces identifiants maintenant.</p>
                               <div className="flex flex-col gap-1">
                                    <code className="text-xs font-mono bg-white dark:bg-slate-800 px-3 py-1.5 rounded border border-emerald-100 dark:border-emerald-900 text-emerald-700 dark:text-emerald-400 font-bold select-all">{createdCredentials.email}</code>
                                    <code className="text-xs font-mono bg-white dark:bg-slate-800 px-3 py-1.5 rounded border border-emerald-100 dark:border-emerald-900 text-emerald-700 dark:text-emerald-400 font-bold select-all">Pass: {createdCredentials.pass}</code>
                               </div>
                           </div>
                       </div>
                       <div className="flex gap-2">
                           <button onClick={copyCredentials} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold">
                               <Copy size={16} /> Copier
                           </button>
                           <button onClick={() => setCreatedCredentials(null)} className="p-2.5 text-slate-400 hover:text-slate-600 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                               <X size={18} />
                           </button>
                       </div>
                   </div>
               )}

               <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                   <div className="flex justify-between items-center mb-4">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                            {editingUserId ? 'Modifier l\'utilisateur' : 'Créer un compte'}
                        </span>
                        {editingUserId && (
                            <button onClick={handleCancelUserEdit} className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-1">
                                <X size={14} /> Annuler
                            </button>
                        )}
                   </div>
                   
                   <form onSubmit={handleSubmitUser} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                       <input 
                          placeholder="Nom complet" 
                          className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:border-university dark:focus:border-sky-500 font-medium text-slate-800 dark:text-white"
                          value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} required
                       />
                       <input 
                          placeholder="Email" 
                          className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:border-university dark:focus:border-sky-500 font-medium text-slate-800 dark:text-white"
                          value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} required
                       />
                       
                       <div className="relative">
                           <input 
                              type={showPassword ? "text" : "password"}
                              placeholder={editingUserId ? "Nouveau pass (optionnel)" : "Mot de passe (défaut: passer25)"}
                              className="w-full p-2.5 pr-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:border-university dark:focus:border-sky-500 font-medium text-slate-800 dark:text-white"
                              value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})}
                           />
                           <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                           </button>
                       </div>

                       <select 
                          className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:border-university dark:focus:border-sky-500 font-medium text-slate-800 dark:text-white"
                          value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as UserRole})}
                       >
                           <option value={UserRole.STUDENT}>Élève</option>
                           <option value={UserRole.RESPONSIBLE}>Délégué</option>
                           <option value={UserRole.ADMIN}>Admin</option>
                       </select>
                       
                       <div className="flex gap-2">
                           <select
                                className="flex-1 p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:border-university dark:focus:border-sky-500 font-medium text-slate-800 dark:text-white"
                                value={newUser.classLevel} 
                                onChange={e => setNewUser({...newUser, classLevel: e.target.value})}
                                required
                            >
                                <option value="">-- Classe --</option>
                                <option value="ADMINISTRATION" className="font-bold bg-slate-100 dark:bg-slate-700">ADMINISTRATION</option>
                                {classesList.map(cls => (
                                    <option key={cls.id} value={cls.name}>{cls.name}</option>
                                ))}
                            </select>

                           <button disabled={isLoading} className="bg-slate-800 dark:bg-slate-700 text-white font-bold rounded-lg hover:bg-black dark:hover:bg-slate-600 transition-colors px-4 flex items-center justify-center gap-2 text-xs shadow-sm min-w-[100px]">
                               {isLoading ? <Loader2 className="animate-spin" size={14} /> : editingUserId ? <Save size={14} /> : <UserPlus size={14} />} 
                               {editingUserId ? 'MAJ' : 'Ajouter'}
                           </button>
                       </div>
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
                                  <td className="p-4 font-medium">{u.classLevel}</td>
                                  <td className="p-4 flex gap-1 justify-end items-center">
                                      <button 
                                        onClick={() => copyUserCredentials(u)}
                                        className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded transition-all"
                                        title="Copier les identifiants"
                                      >
                                          <Copy size={14}/>
                                      </button>
                                      <button 
                                        onClick={() => handleEditUser(u)}
                                        className="p-1.5 text-slate-400 hover:text-university dark:hover:text-sky-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-all"
                                      >
                                          <Edit size={14}/>
                                      </button>
                                      <button 
                                        onClick={() => requestDeleteUser(u)}
                                        className="p-1.5 text-slate-400 hover:text-alert hover:bg-alert-light dark:hover:bg-alert/10 rounded transition-all"
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

      {/* --- LOGS TAB --- */}
      {activeTab === 'logs' && (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-card p-6">
               <h3 className="font-bold text-sm text-slate-800 dark:text-white mb-4 uppercase flex items-center gap-2">
                   <Activity size={16} /> Journal d'Audit
               </h3>
               <div className="space-y-2">
                   {logs.map(log => (
                       <div key={log.id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                           <div className={`p-2 rounded-md ${log.actorRole === UserRole.ADMIN ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400' : 'bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400'}`}>
                               <Shield size={16} />
                           </div>
                           <div className="flex-1">
                               <p className="text-xs text-slate-800 dark:text-slate-200">
                                   <span className="font-bold">{log.actorName}</span> 
                                   <span className="text-slate-400 mx-1">•</span>
                                   <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded text-slate-600 dark:text-slate-300">{log.action}</span>
                               </p>
                               <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{log.details}</p>
                           </div>
                           <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
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