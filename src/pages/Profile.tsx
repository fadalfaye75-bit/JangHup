import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Badge, Spinner, ErrBox, Modal, Toast, ToastType, GlassCard, Button, Input, Avatar } from '../components/ui';
import { 
  User as UserIcon, 
  Mail, 
  Shield, 
  Lock, 
  Camera,
  LogOut,
  Key,
  Calendar,
  BarChart3,
  Award,
  Edit3,
  ChevronRight,
  Activity,
  Eye,
  EyeOff,
  Bell
} from 'lucide-react';
import { db, auth as firebaseAuth } from '../firebase';
import { doc, updateDoc, query, collection, where, limit, orderBy, onSnapshot, writeBatch, getCountFromServer } from 'firebase/firestore';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { UserRole, ActivityLog } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { isValidDate, fmtDate } from '../lib/utils';
import { authService } from '../services/authService';
import { notificationService } from '../services/notificationService';
import { cn } from '../lib/utils';

export const Profile: React.FC = () => {
  const { user, logout } = useAuth();
  
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [className, setClassName] = useState(user?.class_name || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [toastType, setToastType] = useState<ToastType>('success');

  // Password Change State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Delegate Code State
  const [delegateCode, setDelegateCode] = useState('');
  const [isClaiming, setIsClaiming] = useState(false);

  // Avatar Upload State
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Notification Permission State
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
    'Notification' in window ? Notification.permission : 'denied'
  );

  // Activity Stats
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [stats, setStats] = useState({
    pollsVoted: 0,
    announcementsRead: 0,
    resourcesAccessed: 0
  });

  useEffect(() => {
    if (!user) return;

    // Fetch total stats
    const fetchStats = async () => {
      try {
        const pollsQ = query(collection(db, 'poll_votes'), where('userId', '==', user.id));
        const annQ = query(collection(db, 'announcement_read_statuses'), where('userId', '==', user.id));
        const resQ = query(collection(db, 'activity_logs'), where('userId', '==', user.id), where('type', '==', 'resource_access'));

        const [pollsSnap, annSnap, resSnap] = await Promise.all([
          getCountFromServer(pollsQ),
          getCountFromServer(annQ),
          getCountFromServer(resQ)
        ]);

        setStats({
          pollsVoted: pollsSnap.data().count,
          announcementsRead: annSnap.data().count,
          resourcesAccessed: resSnap.data().count
        });
      } catch (err) {
        console.error("Error fetching stats:", err);
      }
    };

    fetchStats();

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
      fetchStats();
    });

    return () => unsubscribe();
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const batch = writeBatch(db);
      
      batch.update(doc(db, 'users', user.id), {
        name,
        class_name: className,
        updatedAt: new Date().toISOString()
      });

      batch.set(doc(db, 'users_public', user.id), {
        name,
        class_name: className,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      await batch.commit();
      
      setIsEditing(false);
      setSuccess("Profil mis à jour avec succès !");
      setToastType('success');
    } catch (err: any) {
      setError(err.message);
      setSuccess(err.message);
      setToastType('error');
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
      
      await updateDoc(doc(db, 'users', user.id), {
        password_changed: true,
        updatedAt: new Date().toISOString()
      });
      
      setIsChangingPass(false);
      setOldPassword('');
      setNewPassword('');
      setSuccess("Mot de passe modifié avec succès !");
      setToastType('success');
    } catch (err: any) {
      setError("Ancien mot de passe incorrect.");
      setSuccess("Erreur lors de la modification du mot de passe.");
      setToastType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleClaimDelegate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.class_name) return;
    setIsClaiming(true);
    setError(null);
    try {
      await authService.claimDelegate(user.id, user.class_name, delegateCode);
      setSuccess("Félicitations ! Vous êtes maintenant Délégué.");
      setToastType('success');
      setDelegateCode('');
    } catch (err: any) {
      setError(err.message || "Code invalide.");
      setSuccess("Code invalide.");
      setToastType('error');
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

    if (file.size > 2 * 1024 * 1024) {
      setError("L'image ne doit pas dépasser 2 Mo.");
      return;
    }

    setIsUploadingAvatar(true);
    setError(null);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        const batch = writeBatch(db);
        const userRef = doc(db, 'users', user.id);
        const publicRef = doc(db, 'users_public', user.id);
        
        const updateData = {
          avatar: base64String,
          updated_at: new Date().toISOString()
        };

        batch.update(userRef, updateData);
        batch.set(publicRef, updateData, { merge: true });

        await batch.commit();
        
        setSuccess("Photo de profil mise à jour !");
        setToastType('success');
        setIsUploadingAvatar(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setError("Erreur lors de la mise à jour de la photo.");
      setSuccess("Erreur lors de la mise à jour de la photo.");
      setToastType('error');
      setIsUploadingAvatar(false);
    }
  };

  const handleRequestNotifPermission = async () => {
    setError(null);
    try {
      const granted = await notificationService.requestPermission();
      if (granted) {
        setNotifPermission('granted');
        setSuccess("Notifications activées !");
        setToastType('success');
      } else {
        if (Notification.permission === 'denied') {
          setError("Notifications bloquées par le navigateur. Veuillez les autoriser dans les paramètres.");
        } else {
          setError("Impossible d'activer les notifications.");
        }
        setSuccess("Erreur d'activation.");
        setToastType('error');
      }
    } catch (err) {
      setError("Une erreur est survenue.");
      setSuccess("Erreur d'activation.");
      setToastType('error');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 px-4">
      <Toast 
        isVisible={!!success} 
        message={success || ''} 
        type={toastType}
        onClose={() => setSuccess(null)} 
      />

      {/* Profile Header Card */}
      <div className="overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm">
        <div className="h-32 bg-gradient-to-r from-blue-500/80 to-purple-500/80" />
        <div className="px-8 pb-8 -mt-12">
          <div className="flex flex-col md:flex-row items-end gap-6">
            <div className="relative group">
              <Avatar 
                src={user?.avatar} 
                name={user?.name} 
                size="xl" 
                className="border-4 border-white dark:border-gray-900 shadow-sm"
              />
              <label className={cn(
                "absolute bottom-2 right-2 p-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer",
                isUploadingAvatar && "opacity-50 cursor-not-allowed"
              )}>
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
            <div className="flex-1 space-y-2 mb-2">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold text-gray-900 dark:text-white tracking-tight">{user?.name}</h1>
                <Badge variant={user?.role === UserRole.ADMIN ? 'danger' : user?.role === UserRole.DELEGATE ? 'warning' : 'primary'}>
                  {user?.role}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-[13px] text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-1.5">
                  <Mail size={14} />
                  {user?.email}
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar size={14} />
                  Membre depuis {user?.created_at && isValidDate(new Date(user.created_at)) ? new Date(user.created_at).getFullYear() : '2024'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 mb-2">
              <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)} className="flex items-center gap-2">
                <Edit3 size={14} />
                <span>Modifier</span>
              </Button>
              <Button variant="danger" size="sm" onClick={logout} className="flex items-center gap-2">
                <LogOut size={14} />
                <span>Déconnexion</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Stats & Activity */}
        <div className="lg:col-span-2 space-y-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm space-y-3">
              <div className="w-8 h-8 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-500 flex items-center justify-center border border-blue-100 dark:border-blue-800/30">
                <BarChart3 size={16} />
              </div>
              <div>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{stats.pollsVoted}</p>
                <p className="text-[12px] text-gray-500 dark:text-gray-400">Sondages votés</p>
              </div>
            </div>
            <div className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm space-y-3">
              <div className="w-8 h-8 rounded-md bg-amber-50 dark:bg-amber-900/20 text-amber-500 flex items-center justify-center border border-amber-100 dark:border-amber-800/30">
                <Award size={16} />
              </div>
              <div>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{stats.announcementsRead}</p>
                <p className="text-[12px] text-gray-500 dark:text-gray-400">Annonces lues</p>
              </div>
            </div>
            <div className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm space-y-3">
              <div className="w-8 h-8 rounded-md bg-purple-50 dark:bg-purple-900/20 text-purple-500 flex items-center justify-center border border-purple-100 dark:border-purple-800/30">
                <Activity size={16} />
              </div>
              <div>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{stats.resourcesAccessed}</p>
                <p className="text-[12px] text-gray-500 dark:text-gray-400">Ressources vues</p>
              </div>
            </div>
          </div>

          {/* Activity Log */}
          <div className="space-y-4">
            <h2 className="text-[16px] font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Activity size={18} className="text-gray-400" />
              Activité Récente
            </h2>
            <div className="space-y-3">
              {activities.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-500">
                      <ChevronRight size={16} />
                    </div>
                    <div>
                      <p className="text-[14px] font-medium text-gray-900 dark:text-white">{log.action}</p>
                      <p className="text-[12px] text-gray-500 dark:text-gray-400">{fmtDate(log.createdAt)}</p>
                    </div>
                  </div>
                </div>
              ))}
              {activities.length === 0 && (
                <div className="text-center py-10 border border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
                  <p className="text-[13px] text-gray-500 dark:text-gray-400">Aucune activité récente.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Settings & Security */}
        <div className="space-y-6">
          {/* Security Card */}
          <div className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-500 flex items-center justify-center border border-blue-100 dark:border-blue-800/30">
                <Shield size={16} />
              </div>
              <h2 className="text-[16px] font-semibold text-gray-900 dark:text-white">Sécurité</h2>
            </div>
            
            <div className="space-y-3">
              <Button 
                variant="secondary" 
                onClick={() => setIsChangingPass(true)}
                className="w-full flex items-center justify-between group"
              >
                <div className="flex items-center gap-2">
                  <Lock size={16} className="text-gray-400" />
                  <span className="font-normal">Changer le mot de passe</span>
                </div>
                <ChevronRight size={16} className="text-gray-400 group-hover:translate-x-1 transition-transform" />
              </Button>

              {user?.role === UserRole.STUDENT && (
                <Button 
                  variant="secondary" 
                  onClick={() => setIsClaiming(true)}
                  className="w-full flex items-center justify-between group"
                >
                  <div className="flex items-center gap-2">
                    <Key size={16} className="text-gray-400" />
                    <span className="font-normal">Devenir Délégué</span>
                  </div>
                  <ChevronRight size={16} className="text-gray-400 group-hover:translate-x-1 transition-transform" />
                </Button>
              )}
            </div>
          </div>

          {/* Preferences Card */}
          <div className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-md bg-amber-50 dark:bg-amber-900/20 text-amber-500 flex items-center justify-center border border-amber-100 dark:border-amber-800/30">
                <Bell size={16} />
              </div>
              <h2 className="text-[16px] font-semibold text-gray-900 dark:text-white">Préférences</h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="space-y-0.5">
                  <p className="text-[13px] font-medium text-gray-900 dark:text-white">Notifications Push</p>
                  <p className="text-[12px] text-gray-500 dark:text-gray-400">Alertes en temps réel</p>
                </div>
                <Button 
                  size="sm" 
                  variant={notifPermission === 'granted' ? 'secondary' : 'primary'}
                  onClick={handleRequestNotifPermission}
                  disabled={notifPermission === 'granted'}
                >
                  {notifPermission === 'granted' ? 'Activé' : 'Activer'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <Modal isOpen={isEditing} onClose={() => setIsEditing(false)} title="Modifier le profil">
        <form onSubmit={handleUpdateProfile} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider ml-1">Nom complet</label>
              <Input 
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Votre nom"
                className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg py-2.5 px-3 text-[13px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-gray-400"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider ml-1">Classe</label>
              <Input 
                required
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                placeholder="Ex: L3 Informatique"
                className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg py-2.5 px-3 text-[13px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-gray-400"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsEditing(false)} className="flex-1">Annuler</Button>
            <Button type="submit" isLoading={loading} className="flex-1">Enregistrer</Button>
          </div>
        </form>
      </Modal>

      {/* Change Password Modal */}
      <Modal isOpen={isChangingPass} onClose={() => setIsChangingPass(false)} title="Changer le mot de passe">
        <form onSubmit={handleChangePassword} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider ml-1">Ancien mot de passe</label>
              <div className="relative">
                <Input 
                  type={showOldPassword ? "text" : "password"}
                  required
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg py-2.5 px-3 text-[13px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-gray-400"
                />
                <button 
                  type="button" 
                  onClick={() => setShowOldPassword(!showOldPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                  {showOldPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider ml-1">Nouveau mot de passe</label>
              <div className="relative">
                <Input 
                  type={showNewPassword ? "text" : "password"}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg py-2.5 px-3 text-[13px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-gray-400"
                />
                <button 
                  type="button" 
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                  {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsChangingPass(false)} className="flex-1">Annuler</Button>
            <Button type="submit" isLoading={loading} className="flex-1">Modifier</Button>
          </div>
        </form>
      </Modal>

      {/* Claim Delegate Modal */}
      <Modal isOpen={isClaiming} onClose={() => setIsClaiming(false)} title="Devenir Délégué">
        <form onSubmit={handleClaimDelegate} className="space-y-6">
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 rounded-xl text-center space-y-2">
              <Key size={24} className="mx-auto text-blue-500" />
              <p className="text-[13px] text-gray-600 dark:text-gray-400">
                Saisissez le code fourni par l'administrateur pour activer vos privilèges de délégué pour la classe <span className="font-semibold text-gray-900 dark:text-white">{user?.class_name}</span>.
              </p>
            </div>
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider ml-1">Code Délégué</label>
              <Input 
                required
                value={delegateCode}
                onChange={(e) => setDelegateCode(e.target.value.toUpperCase())}
                placeholder="EX: ABC-1234"
                className="text-center font-mono tracking-widest w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg py-2.5 px-3 text-[13px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-gray-400"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsClaiming(false)} className="flex-1">Annuler</Button>
            <Button type="submit" isLoading={loading} className="flex-1">Activer</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
