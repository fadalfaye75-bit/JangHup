import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Badge, Spinner, ErrBox, Modal, Toast, ToastType, GlassCard, Button, Input } from '../components/ui';
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
import { doc, updateDoc, query, collection, where, limit, orderBy, onSnapshot, writeBatch } from 'firebase/firestore';
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
        await updateDoc(doc(db, 'users', user.id), {
          avatar: base64String,
          updatedAt: new Date().toISOString()
        });
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
      <GlassCard className="overflow-hidden p-0 border-none shadow-xl">
        <div className="h-32 bg-gradient-to-r from-primary/80 to-purple-600/80" />
        <div className="px-8 pb-8 -mt-12">
          <div className="flex flex-col md:flex-row items-end gap-6">
            <div className="relative group">
              <div className="w-32 h-32 rounded-3xl overflow-hidden border-4 border-[var(--bg-card)] shadow-xl bg-[var(--bg-card)]">
                <img 
                  src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.name}&background=random`} 
                  alt={user?.name} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <label className={cn(
                "absolute bottom-2 right-2 p-2 bg-primary text-white rounded-xl shadow-lg hover:scale-110 transition-transform cursor-pointer",
                isUploadingAvatar && "opacity-50 cursor-not-allowed"
              )}>
                {isUploadingAvatar ? <Spinner size={16} className="text-white" /> : <Camera size={16} />}
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
                <h1 className="text-3xl font-bold text-[var(--text-main)] tracking-tight">{user?.name}</h1>
                <Badge variant={user?.role === UserRole.ADMIN ? 'danger' : user?.role === UserRole.DELEGATE ? 'warning' : 'primary'}>
                  {user?.role}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--text-secondary)] font-medium">
                <div className="flex items-center gap-1.5">
                  <Mail size={14} className="text-[var(--text-muted)]" />
                  {user?.email}
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar size={14} className="text-[var(--text-muted)]" />
                  Membre depuis {user?.created_at && isValidDate(new Date(user.created_at)) ? new Date(user.created_at).getFullYear() : '2024'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 mb-2">
              <Button variant="secondary" onClick={() => setIsEditing(true)} className="flex items-center gap-2">
                <Edit3 size={16} />
                <span>Modifier</span>
              </Button>
              <Button variant="danger" onClick={logout} className="flex items-center gap-2">
                <LogOut size={16} />
                <span>Déconnexion</span>
              </Button>
            </div>
          </div>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Stats & Activity */}
        <div className="lg:col-span-2 space-y-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <GlassCard className="p-5 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <BarChart3 size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--text-main)]">{stats.pollsVoted}</p>
                <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Sondages votés</p>
              </div>
            </GlassCard>
            <GlassCard className="p-5 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-warning/10 text-warning flex items-center justify-center">
                <Award size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--text-main)]">{stats.announcementsRead}</p>
                <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Annonces lues</p>
              </div>
            </GlassCard>
            <GlassCard className="p-5 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center">
                <Activity size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--text-main)]">{stats.resourcesAccessed}</p>
                <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Ressources vues</p>
              </div>
            </GlassCard>
          </div>

          {/* Activity Log */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-[var(--text-main)] flex items-center gap-2">
              <Activity size={20} className="text-primary" />
              Activité Récente
            </h2>
            <div className="space-y-3">
              {activities.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-4 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-lg bg-[var(--bg-main)] flex items-center justify-center text-primary">
                      <ChevronRight size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[var(--text-main)]">{log.action}</p>
                      <p className="text-[10px] text-[var(--text-muted)] font-medium">{fmtDate(log.createdAt)}</p>
                    </div>
                  </div>
                </div>
              ))}
              {activities.length === 0 && (
                <div className="text-center py-10 border-2 border-dashed border-[var(--border-main)] rounded-2xl">
                  <p className="text-sm text-[var(--text-muted)] font-medium">Aucune activité récente.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Settings & Security */}
        <div className="space-y-8">
          {/* Security Card */}
          <GlassCard className="p-6 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Shield size={20} />
              </div>
              <h2 className="text-lg font-bold text-[var(--text-main)]">Sécurité</h2>
            </div>
            
            <div className="space-y-4">
              <Button 
                variant="secondary" 
                onClick={() => setIsChangingPass(true)}
                className="w-full flex items-center justify-between group"
              >
                <div className="flex items-center gap-2">
                  <Lock size={16} className="text-[var(--text-muted)]" />
                  <span>Changer le mot de passe</span>
                </div>
                <ChevronRight size={16} className="text-[var(--text-muted)] group-hover:translate-x-1 transition-transform" />
              </Button>

              {user?.role === UserRole.STUDENT && (
                <Button 
                  variant="secondary" 
                  onClick={() => setIsClaiming(true)}
                  className="w-full flex items-center justify-between group"
                >
                  <div className="flex items-center gap-2">
                    <Key size={16} className="text-[var(--text-muted)]" />
                    <span>Devenir Délégué</span>
                  </div>
                  <ChevronRight size={16} className="text-[var(--text-muted)] group-hover:translate-x-1 transition-transform" />
                </Button>
              )}
            </div>
          </GlassCard>

          {/* Preferences Card */}
          <GlassCard className="p-6 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Bell size={20} />
              </div>
              <h2 className="text-lg font-bold text-[var(--text-main)]">Préférences</h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-[var(--bg-main)] rounded-xl border border-[var(--border-main)]">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-[var(--text-main)]">Notifications Push</p>
                  <p className="text-[10px] text-[var(--text-muted)] font-medium">Alertes en temps réel</p>
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
          </GlassCard>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <Modal isOpen={isEditing} onClose={() => setIsEditing(false)} title="Modifier le profil">
        <form onSubmit={handleUpdateProfile} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider ml-1">Nom complet</label>
              <Input 
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Votre nom"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider ml-1">Classe</label>
              <Input 
                required
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                placeholder="Ex: L3 Informatique"
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
              <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider ml-1">Ancien mot de passe</label>
              <div className="relative">
                <Input 
                  type={showOldPassword ? "text" : "password"}
                  required
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <button 
                  type="button" 
                  onClick={() => setShowOldPassword(!showOldPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-primary transition-colors"
                >
                  {showOldPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider ml-1">Nouveau mot de passe</label>
              <div className="relative">
                <Input 
                  type={showNewPassword ? "text" : "password"}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <button 
                  type="button" 
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-primary transition-colors"
                >
                  {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
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
            <div className="p-4 bg-primary/5 border border-primary/10 rounded-xl text-center space-y-2">
              <Key size={32} className="mx-auto text-primary" />
              <p className="text-xs text-[var(--text-secondary)] font-medium">
                Saisissez le code fourni par l'administrateur pour activer vos privilèges de délégué pour la classe <span className="font-bold text-primary">{user?.class_name}</span>.
              </p>
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider ml-1">Code Délégué</label>
              <Input 
                required
                value={delegateCode}
                onChange={(e) => setDelegateCode(e.target.value.toUpperCase())}
                placeholder="EX: ABC-1234"
                className="text-center font-mono tracking-widest"
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
