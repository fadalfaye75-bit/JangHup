import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/AuthContext';
import { Card, Badge, Spinner, ErrBox, Modal, Btn } from '../../components/ui';
import { 
  User as UserIcon, 
  Mail, 
  Shield, 
  Lock, 
  CheckCircle2, 
  Camera,
  LogOut,
  Key,
  Calendar,
  BarChart3,
  Award,
  Settings,
  Edit3,
  ChevronRight,
  Activity
} from 'lucide-react';
import { db, auth as firebaseAuth } from '../../firebase';
import { doc, updateDoc, getDocs, query, collection, where, limit, orderBy, onSnapshot } from 'firebase/firestore';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { UserRole, ActivityLog } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { fmtDate } from '../../lib/utils';

export const Profile: React.FC = () => {
  const { user, logout, refreshUser } = useAuth();
  
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [className, setClassName] = useState(user?.className || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Password Change State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);

  // Delegate Code State
  const [delegateCode, setDelegateCode] = useState('');
  const [isClaiming, setIsClaiming] = useState(false);

  // Avatar Upload State
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Activity Stats
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [stats, setStats] = useState({
    pollsVoted: 0,
    announcementsRead: 0,
    resourcesAccessed: 0
  });

  useEffect(() => {
    if (!user) return;

    // Fetch recent activity
    const activityQ = query(
      collection(db, 'activity_logs'),
      where('userId', '==', user.id),
      orderBy('createdAt', 'desc'),
      limit(5)
    );

    const unsubscribe = onSnapshot(activityQ, (snapshot) => {
      const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ActivityLog));
      setActivities(logs);
      
      // Calculate stats based on actual logs
      setStats({
        pollsVoted: logs.filter(l => l.action.includes('vote')).length,
        announcementsRead: logs.filter(l => l.action.includes('annonce')).length,
        resourcesAccessed: logs.filter(l => l.action.includes('ressource')).length
      });
    });

    return () => unsubscribe();
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      await updateDoc(doc(db, 'profiles', user.id), {
        name,
        className,
        updatedAt: new Date().toISOString()
      });
      await refreshUser();
      setIsEditing(false);
      setSuccess("Profil mis à jour avec succès !");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseAuth.currentUser || !user) return;
    setLoading(true);
    setError(null);
    try {
      const credential = EmailAuthProvider.credential(user.email, oldPassword);
      await reauthenticateWithCredential(firebaseAuth.currentUser, credential);
      await updatePassword(firebaseAuth.currentUser, newPassword);
      
      await updateDoc(doc(db, 'profiles', user.id), {
        passwordChanged: true,
        updatedAt: new Date().toISOString()
      });
      
      await refreshUser();
      setIsChangingPass(false);
      setOldPassword('');
      setNewPassword('');
      setSuccess("Mot de passe modifié ! 🔒 Sécurisé");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError("Ancien mot de passe incorrect ou erreur système.");
    } finally {
      setLoading(false);
    }
  };

  const handleClaimDelegate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsClaiming(true);
    setError(null);
    try {
      const q = query(collection(db, 'classes'), where('name', '==', user.className), where('delegateCode', '==', delegateCode));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        await updateDoc(doc(db, 'profiles', user.id), {
          role: UserRole.DELEGATE,
          updatedAt: new Date().toISOString()
        });
        await refreshUser();
        setSuccess("Félicitations ! Vous êtes maintenant Délégué.");
        setDelegateCode('');
      } else {
        setError("Code invalide pour cette classe.");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsClaiming(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      setError("Veuillez sélectionner une image valide.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) { // 2MB limit
      setError("L'image ne doit pas dépasser 2 Mo.");
      return;
    }

    setIsUploadingAvatar(true);
    setError(null);

    try {
      // Convert to base64 for simplicity in this environment (no storage configured yet)
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        await updateDoc(doc(db, 'profiles', user.id), {
          avatar: base64String,
          updatedAt: new Date().toISOString()
        });
        await refreshUser();
        setSuccess("Photo de profil mise à jour !");
        setTimeout(() => setSuccess(null), 3000);
        setIsUploadingAvatar(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setError("Erreur lors de la mise à jour de la photo.");
      setIsUploadingAvatar(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      {/* Header / Banner */}
      <div className="relative h-48 rounded-3xl bg-gradient-to-r from-indigo-600 to-purple-600 overflow-hidden shadow-lg">
        <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
        <div className="absolute bottom-0 left-0 w-full p-8 flex items-end justify-between bg-gradient-to-t from-black/50 to-transparent">
          <div className="flex items-center gap-6">
            <div className="relative group">
              <img 
                src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.name}&background=random`} 
                alt={user?.name} 
                className="w-24 h-24 rounded-2xl object-cover border-4 border-white dark:border-slate-900 shadow-xl"
                loading="lazy"
              />
              <label className={`absolute -bottom-2 -right-2 p-2 bg-white dark:bg-slate-800 text-indigo-600 rounded-xl shadow-lg hover:scale-110 transition-transform cursor-pointer ${isUploadingAvatar ? 'opacity-50 cursor-not-allowed' : ''}`}>
                {isUploadingAvatar ? <Spinner size={16} /> : <Camera size={16} />}
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleAvatarUpload}
                  disabled={isUploadingAvatar}
                />
              </label>
            </div>
            <div className="text-white mb-2">
              <h1 className="text-3xl font-black tracking-tight">{user?.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge type="primary" className="bg-white/20 border-none text-white backdrop-blur-md">{user?.role}</Badge>
                <span className="text-white/70 text-sm font-medium flex items-center gap-1">
                  <Calendar size={14} /> Membre depuis {user?.createdAt ? new Date(user.createdAt).getFullYear() : '2024'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-3 mb-2">
            <button 
              onClick={() => setIsEditing(!isEditing)}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-sm backdrop-blur-md border border-white/20 transition-all flex items-center gap-2"
            >
              <Edit3 size={16} />
              {isEditing ? 'Annuler' : 'Modifier'}
            </button>
            <button 
              onClick={logout}
              className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold text-sm shadow-lg transition-all flex items-center gap-2"
            >
              <LogOut size={16} />
              Déconnexion
            </button>
          </div>
        </div>
      </div>

      {success && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl flex items-center gap-3 font-bold text-sm"
        >
          <CheckCircle2 size={20} /> {success}
        </motion.div>
      )}

      {error && <ErrBox message={error} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Stats & Activity */}
        <div className="space-y-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 gap-4">
            <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center">
                  <BarChart3 size={20} />
                </div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Activité</span>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">Sondages votés</span>
                  <span className="text-sm font-black text-slate-900 dark:text-white">{stats.pollsVoted}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">Annonces lues</span>
                  <span className="text-sm font-black text-slate-900 dark:text-white">{stats.announcementsRead}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">Ressources</span>
                  <span className="text-sm font-black text-slate-900 dark:text-white">{stats.resourcesAccessed}</span>
                </div>
              </div>
            </div>

            <div className="p-6 bg-amber-500 text-white rounded-2xl shadow-lg shadow-amber-200 dark:shadow-none space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Award size={20} />
                </div>
                <span className="text-[10px] font-black text-white/70 uppercase tracking-widest">Niveau</span>
              </div>
              <div>
                <h3 className="text-xl font-black">Étudiant Actif</h3>
                <p className="text-white/80 text-xs font-medium mt-1">Vous faites partie des 10% les plus actifs !</p>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Activity size={20} className="text-indigo-500" />
              Activité récente
            </h2>
            <div className="space-y-3">
              {activities.map((log) => (
                <div key={log.id} className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl flex items-center gap-3 group hover:border-indigo-200 dark:hover:border-indigo-900 transition-all">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-indigo-500 transition-colors">
                    <ChevronRight size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{log.action}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{fmtDate(log.createdAt)}</p>
                  </div>
                </div>
              ))}
              {activities.length === 0 && (
                <p className="text-center py-8 text-slate-400 text-sm font-medium">Aucune activité récente.</p>
              )}
            </div>
          </section>
        </div>

        {/* Right Column: Forms & Settings */}
        <div className="lg:col-span-2 space-y-8">
          {/* General Info */}
          <Card>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center">
                <UserIcon size={20} />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Informations Générales</h2>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Nom Complet</label>
                  <div className="relative">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text" 
                      disabled={!isEditing}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-medium disabled:opacity-60"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Email (Non modifiable)</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="email" 
                      disabled
                      value={user?.email}
                      className="w-full pl-11 pr-4 py-3 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium opacity-60 cursor-not-allowed"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Classe</label>
                  <div className="relative">
                    <Award className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text" 
                      disabled={!isEditing}
                      value={className}
                      onChange={(e) => setClassName(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-medium disabled:opacity-60"
                      placeholder="Ex: GI3"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Rôle</label>
                  <div className="relative">
                    <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text" 
                      disabled
                      value={user?.role}
                      className="w-full pl-11 pr-4 py-3 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium opacity-60 cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>
              {isEditing && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <Btn type="submit" loading={loading} className="w-full">Enregistrer les modifications</Btn>
                </motion.div>
              )}
            </form>
          </Card>

          {/* Security */}
          <Card>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-xl flex items-center justify-center">
                <Lock size={20} />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Sécurité</h2>
            </div>

            {!isChangingPass ? (
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="space-y-1">
                  <p className="font-bold text-slate-800 dark:text-slate-100">Mot de passe</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Dernière modification : {user?.passwordChanged ? 'Récemment' : 'Jamais'}</p>
                </div>
                <button 
                  onClick={() => setIsChangingPass(true)}
                  className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm"
                >
                  Changer
                </button>
              </div>
            ) : (
              <form onSubmit={handleChangePassword} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Ancien mot de passe</label>
                    <input 
                      type="password" 
                      required
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Nouveau mot de passe</label>
                    <input 
                      type="password" 
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <button 
                    type="button" 
                    onClick={() => setIsChangingPass(false)}
                    className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                  >
                    Annuler
                  </button>
                  <Btn type="submit" loading={loading} className="flex-1">Mettre à jour</Btn>
                </div>
              </form>
            )}
          </Card>

          {/* Delegate Access */}
          {user?.role === UserRole.STUDENT && (
            <Card className="bg-indigo-50 dark:bg-indigo-900/10 border-2 border-dashed border-indigo-200 dark:border-indigo-900/30">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-none">
                  <Key size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Devenir Délégué</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Saisissez le code secret de votre classe pour obtenir les droits de gestion.</p>
                </div>
              </div>

              <form onSubmit={handleClaimDelegate} className="flex flex-col sm:flex-row gap-3">
                <input 
                  type="text" 
                  required
                  placeholder="Code secret (ex: GI3-2024)"
                  value={delegateCode}
                  onChange={(e) => setDelegateCode(e.target.value)}
                  className="flex-1 px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-mono"
                />
                <Btn type="submit" loading={isClaiming} className="px-8">Valider le code</Btn>
              </form>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
