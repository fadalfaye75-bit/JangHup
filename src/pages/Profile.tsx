import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, Badge, Spinner, ErrBox, Modal, Btn, Toast, ToastType } from '../../components/ui';
import { GlassCard } from '../components/ui/GlassCard';
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
 Activity,
 Eye,
 EyeOff
} from 'lucide-react';
import { db, auth as firebaseAuth } from '../../firebase';
import { doc, updateDoc, getDocs, query, collection, where, limit, orderBy, onSnapshot, writeBatch } from 'firebase/firestore';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { UserRole, ActivityLog } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { isValidDate, fmtDate } from '../../lib/utils';
import { authService } from '../services/authService';
import { notificationService } from '../services/notificationService';

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
 const batch = writeBatch(db);
 
 batch.update(doc(db, 'users', user.id), {
 name,
 class_name: className,
 updatedAt: new Date().toISOString()
 });

 // Also update public profile
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
 setSuccess("Mot de passe modifié ! 🔒 Sécurisé");
 setToastType('success');
 } catch (err: any) {
 setError("Ancien mot de passe incorrect ou erreur système.");
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
 setError(err.message ||"Code invalide pour cette classe.");
 setSuccess("Code invalide pour cette classe.");
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
 const granted = await notificationService.requestPermission();
 if (granted) {
 setNotifPermission('granted');
 setSuccess("Notifications activées ! 🔔");
 setToastType('success');
 } else {
 setError("Permission de notification refusée.");
 setSuccess("Permission de notification refusée.");
 setToastType('error');
 }
 };

 return (
 <motion.div 
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 className="max-w-5xl mx-auto space-y-10 pb-20 px-4"
 >
 {/* Header / Banner - Futuristic Style */}
 <div className="relative h-64 rounded-[40px] overflow-hidden shadow-2xl group">
 <div className="absolute inset-0 bg-gradient-to-br from-primary via-purple-600 to-accent animate-gradient-xy"></div>
 <div className="absolute inset-0 opacity-30 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay"></div>
 <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]"></div>
 
 {/* Animated Orbs */}
 <div className="absolute -top-20 -right-20 w-64 h-64 bg-[var(--glass-bg-hover)] blur-[100px] rounded-full animate-pulse"/>
 <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-primary/20 blur-[100px] rounded-full animate-pulse delay-700"/>

 <div className="absolute bottom-0 left-0 w-full p-10 flex flex-col md:flex-row items-center md:items-end justify-between gap-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
 <div className="flex flex-col md:flex-row items-center gap-8">
 <div className="relative group/avatar">
 <div className="absolute inset-0 bg-primary blur-2xl opacity-0 group-hover/avatar:opacity-40 transition-opacity duration-500 rounded-full"/>
 <img 
 src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.name}&background=random`} 
 alt={user?.name} 
 className="w-32 h-32 rounded-[32px] object-cover border-4 border-[var(--glass-border)] shadow-2xl relative z-10 transition-transform duration-500 group-hover/avatar:scale-105"
 referrerPolicy="no-referrer"
 />
 <label className={`absolute -bottom-2 -right-2 p-3 bg-[var(--bg-card)] text-primary rounded-2xl shadow-2xl hover:scale-110 transition-transform cursor-pointer z-20 ${isUploadingAvatar ? 'opacity-50 cursor-not-allowed' : ''}`}>
 {isUploadingAvatar ? <Spinner size={18} /> : <Camera size={18} />}
 <input 
 type="file"
 accept="image/*"
 className="hidden"
 onChange={handleAvatarUpload}
 disabled={isUploadingAvatar}
 />
 </label>
 </div>
 <div className="text-center md:text-left space-y-2 relative z-10">
 <h1 className="text-4xl font-black tracking-tighter text-[var(--text-main)] drop-shadow-lg">{user?.name}</h1>
 <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
 <div className="px-3 py-1 bg-[var(--glass-bg-hover)] backdrop-blur-xl border border-[var(--glass-border)] rounded-full text-[10px] font-black uppercase tracking-widest text-[var(--text-main)]">
 {user?.role}
 </div>
 <span className="text-[var(--text-main)]/60 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
 <Calendar size={14} className="text-primary"/> Membre depuis {user?.created_at && isValidDate(new Date(user.created_at)) ? new Date(user.created_at).getFullYear() : '2024'}
 </span>
 </div>
 </div>
 </div>
 <div className="flex gap-4 relative z-10">
 <button 
 onClick={() => setIsEditing(!isEditing)}
 className="px-6 py-3 bg-[var(--glass-bg-hover)] hover:bg-[var(--bg-card)]/20 text-[var(--text-main)] rounded-2xl font-black text-[10px] uppercase tracking-widest backdrop-blur-xl border border-[var(--glass-border)] transition-all flex items-center gap-3 group/btn"
 >
 <Edit3 size={16} className="group-hover:rotate-12 transition-transform"/>
 {isEditing ? 'Annuler' : 'Modifier le profil'}
 </button>
 <button 
 onClick={logout}
 className="px-6 py-3 bg-rose-500/20 hover:bg-rose-500 text-[var(--text-main)] rounded-2xl font-black text-[10px] uppercase tracking-widest border border-rose-500/30 transition-all flex items-center gap-3 shadow-xl"
 >
 <LogOut size={16} />
 Déconnexion
 </button>
 </div>
 </div>
 </div>

 <Toast 
 isVisible={!!success} 
 message={success || ''} 
 type={toastType}
 onClose={() => setSuccess(null)} 
 />

 {error && <ErrBox message={error} />}

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
 {/* Left Column: Stats & Activity */}
 <div className="space-y-10">
 {/* Stats Grid */}
 <div className="grid grid-cols-1 gap-6">
 <GlassCard className="p-8 border-[var(--glass-border)] space-y-6 relative overflow-hidden group"tilt={true}>
 <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-[60px] -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/10 transition-colors"/>
 <div className="flex items-center justify-between relative z-10">
 <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center border border-primary/20">
 <BarChart3 size={24} />
 </div>
 <span className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.3em]">Statistiques</span>
 </div>
 <div className="space-y-4 relative z-10">
 {[
 { label: 'Sondages votés', value: stats.pollsVoted },
 { label: 'Annonces lues', value: stats.announcementsRead },
 { label: 'Ressources', value: stats.resourcesAccessed }
 ].map((s, i) => (
 <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] group/stat hover:border-primary/20 transition-all">
 <span className="text-xs text-[var(--text-secondary)] font-black uppercase tracking-widest">{s.label}</span>
 <span className="text-sm font-black text-[var(--text-main)] group-hover/stat:text-primary transition-colors">{s.value}</span>
 </div>
 ))}
 </div>
 </GlassCard>

 <GlassCard className="p-8 bg-gradient-to-br from-amber-500 to-orange-600 text-[var(--text-main)] rounded-[32px] shadow-2xl space-y-6 relative overflow-hidden group"tilt={true}>
 <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"/>
 <div className="flex items-center justify-between relative z-10">
 <div className="w-12 h-12 bg-[var(--bg-card)]/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30">
 <Award size={24} />
 </div>
 <span className="text-[10px] font-black text-[var(--text-main)]/70 uppercase tracking-[0.3em]">Badge</span>
 </div>
 <div className="relative z-10">
 <h3 className="text-2xl font-black tracking-tight">Étudiant Actif</h3>
 <p className="text-[var(--text-main)]/80 text-xs font-black uppercase tracking-widest mt-2">Top 10% de la communauté</p>
 </div>
 </GlassCard>
 </div>

 {/* Recent Activity */}
 <section className="space-y-6">
 <h2 className="text-xl font-black text-[var(--text-main)] flex items-center gap-4 uppercase tracking-widest">
 <div className="w-2 h-6 bg-primary rounded-full shadow-[0_0_15px_rgba(108,99,255,0.5)]"/>
 Activité
 </h2>
 <div className="space-y-4">
 {activities.map((log) => (
 <div key={log.id} className="p-5 glass-ultra border-[var(--glass-border)] rounded-2xl flex items-center gap-4 group hover:border-primary/30 transition-all duration-500">
 <div className="w-10 h-10 rounded-xl bg-[var(--glass-bg)] flex items-center justify-center text-[var(--text-secondary)] group-hover:text-primary transition-colors border border-[var(--glass-border)]">
 <ChevronRight size={18} />
 </div>
 <div className="flex-1 min-w-0">
 <p className="text-sm font-black text-[var(--text-secondary)] truncate group-hover:text-[var(--text-main)] transition-colors">{log.action}</p>
 <p className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest mt-1">{fmtDate(log.createdAt)}</p>
 </div>
 </div>
 ))}
 {activities.length === 0 && (
 <div className="p-10 text-center glass-ultra rounded-3xl border-2 border-dashed border-[var(--glass-border)]">
 <p className="text-[var(--text-secondary)] font-black uppercase tracking-widest text-xs">Aucune activité.</p>
 </div>
 )}
 </div>
 </section>
 </div>

 {/* Right Column: Forms & Settings */}
 <div className="lg:col-span-2 space-y-10">
 {/* General Info */}
 <GlassCard className="p-10 border-[var(--glass-border)] hover:border-[var(--glass-border)] transition-all duration-500 shadow-2xl"tilt={false}>
 <div className="flex items-center gap-4 mb-10 relative z-10">
 <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center border border-primary/20">
 <UserIcon size={24} />
 </div>
 <h2 className="text-2xl font-black text-[var(--text-main)] tracking-tight">Profil Utilisateur</h2>
 </div>

 <form onSubmit={handleUpdateProfile} className="space-y-8 relative z-10">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
 <div className="space-y-3">
 <label className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] ml-1">Nom Complet</label>
 <div className="relative group">
 <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] group-focus-within:text-primary transition-colors"size={20} />
 <input 
 type="text"
 disabled={!isEditing}
 value={name}
 onChange={(e) => setName(e.target.value)}
 className="w-full pl-12 pr-4 py-4 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-sm font-black text-[var(--text-main)] disabled:opacity-40 tracking-tight"
 />
 </div>
 </div>
 <div className="space-y-3">
 <label className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] ml-1">Email</label>
 <div className="relative">
 <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"size={20} />
 <input 
 type="email"
 disabled
 value={user?.email}
 className="w-full pl-12 pr-4 py-4 bg-black/20 border border-[var(--glass-border)] rounded-2xl text-sm font-black text-[var(--text-secondary)] cursor-not-allowed tracking-tight"
 />
 </div>
 </div>
 <div className="space-y-3">
 <label className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] ml-1">Classe</label>
 <div className="relative group">
 <Award className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] group-focus-within:text-primary transition-colors"size={20} />
 <input 
 type="text"
 disabled={!isEditing}
 value={className}
 onChange={(e) => setClassName(e.target.value)}
 className="w-full pl-12 pr-4 py-4 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-sm font-black text-[var(--text-main)] disabled:opacity-40 tracking-tight"
 placeholder="Ex: GI3"
 />
 </div>
 </div>
 <div className="space-y-3">
 <label className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] ml-1">Rôle</label>
 <div className="relative">
 <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"size={20} />
 <input 
 type="text"
 disabled
 value={user?.role}
 className="w-full pl-12 pr-4 py-4 bg-black/20 border border-[var(--glass-border)] rounded-2xl text-sm font-black text-[var(--text-secondary)] cursor-not-allowed tracking-tight"
 />
 </div>
 </div>
 </div>
 {isEditing && (
 <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
 <Btn type="submit"loading={loading} className="w-full py-4 text-[10px] font-black uppercase tracking-[0.2em]">Sauvegarder les modifications</Btn>
 </motion.div>
 )}
 </form>
 </GlassCard>

 {/* Security */}
 <GlassCard className="p-10 border-[var(--glass-border)] hover:border-[var(--glass-border)] transition-all duration-500 shadow-2xl"tilt={false}>
 <div className="flex items-center gap-4 mb-10 relative z-10">
 <div className="w-12 h-12 bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center border border-rose-500/20">
 <Lock size={24} />
 </div>
 <h2 className="text-2xl font-black text-[var(--text-main)] tracking-tight">Sécurité</h2>
 </div>

 {!isChangingPass ? (
 <div className="flex items-center justify-between p-6 bg-[var(--glass-bg)] rounded-[24px] border border-[var(--glass-border)] group hover:border-rose-500/30 transition-all duration-500 relative z-10">
 <div className="space-y-1">
 <p className="font-black text-[var(--text-main)] tracking-tight">Mot de passe</p>
 <p className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest">Dernière modification : {user?.password_changed ? 'Récemment' : 'Jamais'}</p>
 </div>
 <button 
 onClick={() => setIsChangingPass(true)}
 className="px-6 py-2 bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)] border border-[var(--glass-border)] rounded-xl font-black text-[10px] uppercase tracking-widest text-[var(--text-main)] transition-all"
 >
 Changer
 </button>
 </div>
 ) : (
 <form onSubmit={handleChangePassword} className="space-y-8 relative z-10">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
 <div className="space-y-3">
 <label className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] ml-1">Ancien mot de passe</label>
 <div className="relative group">
 <input 
 type={showOldPassword ?"text":"password"} 
 required
 value={oldPassword}
 onChange={(e) => setOldPassword(e.target.value)}
 className="w-full px-6 py-4 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-sm font-black text-[var(--text-main)] tracking-tight pr-14"
 />
 <button
 type="button"
 onClick={() => setShowOldPassword(!showOldPassword)}
 className="absolute right-5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-primary transition-colors"
 >
 {showOldPassword ? <EyeOff size={20} /> : <Eye size={20} />}
 </button>
 </div>
 </div>
 <div className="space-y-3">
 <label className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] ml-1">Nouveau mot de passe</label>
 <div className="relative group">
 <input 
 type={showNewPassword ?"text":"password"} 
 required
 value={newPassword}
 onChange={(e) => setNewPassword(e.target.value)}
 className="w-full px-6 py-4 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-sm font-black text-[var(--text-main)] tracking-tight pr-14"
 />
 <button
 type="button"
 onClick={() => setShowNewPassword(!showNewPassword)}
 className="absolute right-5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-primary transition-colors"
 >
 {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
 </button>
 </div>
 </div>
 </div>
 <div className="flex gap-4">
 <button 
 type="button"
 onClick={() => setIsChangingPass(false)}
 className="flex-1 py-4 bg-[var(--glass-bg)] text-[var(--text-secondary)] rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-[var(--glass-bg-hover)] transition-all border border-[var(--glass-border)]"
 >
 Annuler
 </button>
 <Btn type="submit"loading={loading} className="flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em]">Mettre à jour</Btn>
 </div>
 </form>
 )}
 </GlassCard>

 {/* Notifications Settings */}
 <GlassCard className="p-10 border-[var(--glass-border)] hover:border-[var(--glass-border)] transition-all duration-500 shadow-2xl"tilt={false}>
 <div className="flex items-center gap-4 mb-10 relative z-10">
 <div className="w-12 h-12 bg-accent/10 text-accent rounded-2xl flex items-center justify-center border border-accent/20">
 <Settings size={24} />
 </div>
 <h2 className="text-2xl font-black text-[var(--text-main)] tracking-tight">Préférences</h2>
 </div>

 <div className="flex flex-col gap-6 p-6 bg-[var(--glass-bg)] rounded-[32px] border border-[var(--glass-border)] relative z-10">
 <div className="flex items-center justify-between">
 <div className="space-y-1">
 <p className="font-black text-[var(--text-main)] tracking-tight">Notifications Push</p>
 <p className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest">
 {notifPermission === 'granted' 
 ? 'Activées sur cet appareil' 
 : notifPermission === 'denied' 
 ? 'Bloquées par le navigateur' 
 : 'Non configurées'}
 </p>
 </div>
 {notifPermission !== 'granted' && notifPermission !== 'denied' && (
 <button 
 onClick={handleRequestNotifPermission}
 className="px-6 py-2 bg-primary text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-primary/80 transition-all shadow-lg shadow-primary/20"
 >
 Activer
 </button>
 )}
 {notifPermission === 'granted' && (
 <div className="flex items-center gap-2 text-accent font-black text-[10px] uppercase tracking-widest">
 <CheckCircle2 size={18} />
 Actif
 </div>
 )}
 </div>
 
 {notifPermission === 'denied' && (
 <motion.div 
 initial={{ opacity: 0, height: 0 }}
 animate={{ opacity: 1, height: 'auto' }}
 className="p-5 bg-warning/10 border border-warning/20 rounded-2xl"
 >
 <p className="text-[11px] text-warning font-medium leading-relaxed">
 <span className="font-black block mb-2 uppercase tracking-widest">Comment réactiver :</span>
 1. Ouvrez l'application dans un <b className="text-[var(--text-main)]">nouvel onglet</b>.<br/>
 2. Cliquez sur l'icône de cadenas 🔒 dans la barre d'adresse.<br/>
 3. Réinitialisez la permission de notification pour ce site.
 </p>
 </motion.div>
 )}
 </div>
 </GlassCard>

 {/* Delegate Access */}
 {user?.role === UserRole.STUDENT && (
 <GlassCard className="p-10 bg-primary/5 border-2 border-dashed border-primary/20 hover:border-primary/40 transition-all duration-500 shadow-2xl relative overflow-hidden group"tilt={true}>
 <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/5 blur-[80px] rounded-full group-hover:bg-primary/10 transition-colors"/>
 <div className="flex items-center gap-6 mb-10 relative z-10">
 <div className="w-16 h-16 bg-primary text-white rounded-3xl flex items-center justify-center shadow-2xl shadow-primary/40 group-hover:scale-110 transition-transform duration-500">
 <Key size={32} />
 </div>
 <div>
 <h2 className="text-2xl font-black text-[var(--text-main)] tracking-tight">Devenir Délégué</h2>
 <p className="text-sm text-[var(--text-secondary)] font-medium mt-1">Accédez aux outils de gestion de votre classe.</p>
 </div>
 </div>

 <form onSubmit={handleClaimDelegate} className="flex flex-col sm:flex-row gap-4 relative z-10">
 <input 
 type="text"
 required
 placeholder="Code secret (ex: GI3-2024)"
 value={delegateCode}
 onChange={(e) => setDelegateCode(e.target.value)}
 className="flex-1 px-6 py-4 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-sm font-black text-[var(--text-main)] tracking-widest placeholder:text-[var(--text-secondary)]"
 />
 <Btn type="submit"loading={isClaiming} className="px-10 py-4 text-[10px] font-black uppercase tracking-[0.2em]">Valider</Btn>
 </form>
 </GlassCard>
 )}
 </div>
 </div>
 </motion.div>
 );
};
