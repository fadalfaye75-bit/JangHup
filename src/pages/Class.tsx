import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { User, UserRole, SchoolClass } from '../../types';
import { Card, Badge, Spinner, ErrBox, Modal, Btn, ConfirmModal } from '../../components/ui';
import { GlassCard } from '../components/ui/GlassCard';
import { 
  Users, 
  UserPlus, 
  Key, 
  LogOut, 
  Shield, 
  Mail, 
  MoreVertical,
  Search,
  Copy,
  Check,
  RefreshCw
} from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  updateDoc,
  getDoc,
  getDocs,
  limit,
  writeBatch
} from 'firebase/firestore';
import { db } from '../../firebase';
import { motion, AnimatePresence } from 'motion/react';

export const Class: React.FC = () => {
  const { user } = useAuth();
  const [members, setMembers] = useState<User[]>([]);
  const [classInfo, setClassInfo] = useState<SchoolClass | null>(null);
  const [classSecret, setClassSecret] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [copied, setCopied] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isConfirmLeaveOpen, setIsConfirmLeaveOpen] = useState(false);

  useEffect(() => {
    if (!user?.class_name) {
      setLoading(false);
      return;
    }

    // Listen to class members
    const membersQ = query(
      collection(db, 'users_public'),
      where('class_name', '==', user.class_name)
    );

    const unsubscribeMembers = onSnapshot(membersQ, (snapshot) => {
      const membersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
      setMembers(membersData);
      setLoading(false);
    }, (err) => {
      console.error("🔥 Class Members Snapshot Error:", err);
      setError(err.message);
      setLoading(false);
    });

    // Listen to class info
    const classQ = query(
      collection(db, 'classes'),
      where('name', '==', user.class_name),
      limit(1)
    );

    const unsubscribeClass = onSnapshot(classQ, (snapshot) => {
      if (!snapshot.empty) {
        setClassInfo({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as SchoolClass);
      }
    }, (err) => {
      console.error("🔥 Class Info Snapshot Error:", err);
    });

    return () => {
      unsubscribeMembers();
      unsubscribeClass();
    };
  }, [user?.class_name]);

  useEffect(() => {
    if (classInfo?.id && (user?.role === UserRole.ADMIN || user?.role === UserRole.DELEGATE)) {
      const secretRef = doc(db, 'class_secrets', classInfo.id);
      getDoc(secretRef).then(snap => {
        if (snap.exists()) {
          setClassSecret(snap.data());
        }
      });
    }
  }, [classInfo?.id, user?.role]);

  const handleCopyCode = () => {
    const code = classSecret?.delegate_code || classInfo?.delegate_code;
    if (code) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleGenerateNewCode = async () => {
    if (!classInfo || (user?.role !== UserRole.ADMIN && user?.role !== UserRole.DELEGATE)) return;
    
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const prefix = classInfo.name ? classInfo.name.substring(0, 3).toUpperCase() : 'DEL';
    const newCode = `${prefix}-${random}`;

    try {
      const batch = writeBatch(db);
      
      // Update secret
      const secretRef = doc(db, 'class_secrets', classInfo.id);
      batch.set(secretRef, {
        delegate_code: newCode,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // Update reverse lookup
      const delCodeRef = doc(db, 'delegate_codes', newCode.toUpperCase().trim());
      batch.set(delCodeRef, { classId: classInfo.id, className: classInfo.name });

      await batch.commit();
      setClassSecret({ ...classSecret, delegate_code: newCode });
    } catch (err) {
      console.error(err);
    }
  };

  const handleLeaveClass = async () => {
    try {
      await updateDoc(doc(db, 'users', user!.id), {
        class_name: '',
        role: UserRole.STUDENT // Reset to student if they were delegate
      });
      // Redirect or refresh will happen via AuthContext
    } catch (err) {
      console.error(err);
    }
  };

  const filteredMembers = members.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="flex justify-center py-20"><Spinner size={48} /></div>;
  if (!user?.class_name) return (
      <div className="max-w-2xl mx-auto text-center py-20 space-y-6">
      <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-400">
        <Users size={40} />
      </div>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Vous n'avez pas encore de classe</h1>
      <p className="text-slate-500 dark:text-slate-400">Rejoignez une classe depuis votre profil pour voir vos camarades.</p>
      <Link to="/profile" className="inline-block px-6 py-2 bg-primary text-white rounded-xl font-bold">Aller au profil</Link>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 pb-20 space-y-12">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
        <div className="space-y-1">
          <h1 className="heading-futuristic">Nexus de Classe</h1>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
            {user.class_name} • {members.length} Unités Connectées
          </p>
        </div>
        
        <div className="flex gap-4 w-full lg:w-auto">
          <button 
            onClick={() => setIsInviteModalOpen(true)}
            className="btn-futuristic-primary px-10 py-4 flex items-center justify-center gap-3 flex-1 lg:flex-none"
          >
            <UserPlus size={20} />
            <span className="font-black uppercase tracking-widest text-xs">Inviter</span>
          </button>
          {user.role === UserRole.STUDENT && (
            <button 
              onClick={() => setIsConfirmLeaveOpen(true)}
              className="px-10 py-4 bg-danger/10 text-danger border border-danger/20 rounded-[24px] font-black uppercase tracking-widest text-xs hover:bg-danger/20 transition-all flex items-center justify-center gap-3 flex-1 lg:flex-none"
            >
              <LogOut size={20} />
              Quitter
            </button>
          )}
        </div>
      </div>

      <ConfirmModal 
        isOpen={isConfirmLeaveOpen}
        onClose={() => setIsConfirmLeaveOpen(false)}
        onConfirm={handleLeaveClass}
        title="Rupture de Connexion"
        message="Êtes-vous sûr de vouloir quitter cette classe ? Vous perdrez l'accès aux transmissions et ressources de ce nexus."
        type="danger"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Left Column: Members List */}
        <div className="lg:col-span-2 space-y-8">
          <div className="relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors" size={20} />
            <input 
              type="text" 
              placeholder="Rechercher un membre du nexus..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-14 pr-6 py-5 bg-white/5 border border-white/10 rounded-[24px] outline-none focus:ring-2 focus:ring-primary/50 transition-all text-white placeholder:text-slate-700 font-medium"
            />
          </div>

          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {filteredMembers.map((member) => (
                <motion.div 
                  key={member.id}
                  layout
                  initial={{ opacity: 0, x: -20, filter: 'blur(10px)' }}
                  animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
                  transition={{ type: "spring", stiffness: 200, damping: 25 }}
                >
                  <GlassCard className="p-5 border-white/5 hover:border-primary/30 transition-all duration-500 group" tilt={false}>
                    <div className="flex items-center justify-between relative z-10">
                      <div className="flex items-center gap-5">
                        <div className="relative">
                          <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-white/10 shadow-2xl group-hover:border-primary/50 transition-all duration-500">
                            <img 
                              src={member.avatar || `https://ui-avatars.com/api/?name=${member.name}&background=random`} 
                              alt={member.name} 
                              className="w-full h-full object-cover"
                              loading="lazy"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          {member.role === UserRole.ADMIN && (
                            <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary text-white rounded-lg flex items-center justify-center border-2 border-[#0F0F1A] shadow-lg">
                              <Shield size={12} />
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-3">
                            <h3 className="font-black text-white tracking-tight group-hover:text-primary transition-colors">{member.name} {member.id === user.id && "(Moi)"}</h3>
                            <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${
                              member.role === UserRole.ADMIN 
                                ? 'bg-danger/10 text-danger border-danger/20' 
                                : member.role === UserRole.DELEGATE 
                                  ? 'bg-warning/10 text-warning border-warning/20' 
                                  : 'bg-primary/10 text-primary border-primary/20'
                            }`}>
                              {member.role}
                            </div>
                          </div>
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 mt-1">
                            <Mail size={12} className="text-primary opacity-50" />
                            {member.email}
                          </p>
                        </div>
                      </div>
                      <button className="p-3 bg-white/5 hover:bg-white/10 text-slate-500 hover:text-white rounded-xl transition-all opacity-0 group-hover:opacity-100">
                        <MoreVertical size={20} />
                      </button>
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </AnimatePresence>
            {filteredMembers.length === 0 && (
              <div className="text-center py-20 glass-ultra rounded-[40px] border-2 border-dashed border-white/5">
                <Users size={64} className="mx-auto text-slate-800 mb-6" />
                <p className="text-slate-500 font-black uppercase tracking-widest text-xs">Aucun membre détecté dans ce secteur.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Class Info & Actions */}
        <div className="space-y-10">
          <GlassCard className="p-8 space-y-8 border-white/5 hover:border-primary/30 transition-all duration-500" tilt={true}>
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center border border-primary/20">
                <Key size={24} />
              </div>
              <h2 className="text-xl font-black text-white tracking-tight">Accès Délégué</h2>
            </div>
            
            <p className="text-xs text-slate-500 font-medium leading-relaxed relative z-10">
              Le protocole délégué autorise l'accès aux outils de gestion stratégique du nexus.
            </p>

            <div className="p-6 bg-white/5 rounded-[32px] border border-white/5 space-y-4 relative z-10">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em]">Code de Liaison</span>
                {(user.role === UserRole.ADMIN || user.role === UserRole.DELEGATE) && (
                  <button 
                    onClick={handleGenerateNewCode}
                    className="p-2 bg-white/5 hover:bg-white/10 text-primary rounded-xl transition-all"
                    title="Régénérer"
                  >
                    <RefreshCw size={14} />
                  </button>
                )}
              </div>
              <div className="flex items-center justify-between gap-4">
                <code className="text-3xl font-black text-white tracking-[0.2em] font-mono">
                  {(user.role === UserRole.ADMIN || user.role === UserRole.DELEGATE) 
                    ? (classSecret?.delegate_code || classInfo?.delegate_code || '------') 
                    : '••••••'}
                </code>
                {(user.role === UserRole.ADMIN || user.role === UserRole.DELEGATE) && (
                  <button 
                    onClick={handleCopyCode}
                    className={`p-4 rounded-2xl transition-all shadow-2xl ${copied ? 'bg-success text-white' : 'bg-primary text-white hover:scale-110'}`}
                  >
                    {copied ? <Check size={20} /> : <Copy size={20} />}
                  </button>
                )}
              </div>
            </div>

            <div className="pt-8 border-t border-white/5 relative z-10">
              <div className="flex items-center justify-between text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] mb-6">
                <span>Métriques du Nexus</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-5 bg-white/5 rounded-[24px] border border-white/5">
                  <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">Étudiants</p>
                  <p className="text-2xl font-black text-white tracking-tight">{members.filter(m => m.role === UserRole.STUDENT).length}</p>
                </div>
                <div className="p-5 bg-white/5 rounded-[24px] border border-white/5">
                  <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">Délégués</p>
                  <p className="text-2xl font-black text-white tracking-tight">{members.filter(m => m.role === UserRole.DELEGATE).length}</p>
                </div>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-8 bg-gradient-to-br from-primary to-accent text-white border-none shadow-[0_0_50px_rgba(108,99,255,0.3)] group overflow-hidden" tilt={true}>
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none" />
            <div className="space-y-6 relative z-10">
              <h3 className="text-2xl font-black tracking-tight">Assistance Nexus</h3>
              <p className="text-white/70 text-sm font-medium leading-relaxed">
                En cas de désynchronisation ou de besoin de transfert de nexus, contactez le centre de contrôle.
              </p>
              <button className="w-full py-5 bg-white/10 hover:bg-white/20 rounded-[24px] font-black text-[10px] uppercase tracking-[0.3em] transition-all border border-white/20 backdrop-blur-md">
                Ouvrir un Canal de Support
              </button>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Invite Modal */}
      <Modal 
        isOpen={isInviteModalOpen} 
        onClose={() => setIsInviteModalOpen(false)}
        title="Synchronisation du Nexus"
      >
        <div className="space-y-8 p-2">
          <div className="p-8 bg-white/5 rounded-[32px] border border-white/10 text-center space-y-6">
            <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto border border-primary/20">
              <UserPlus size={40} />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-white tracking-tight">Inviter des Unités</h3>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">
                Les étudiants peuvent rejoindre ce nexus en utilisant le code d'identification lors de leur phase d'initialisation.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] ml-1">Identifiant du Nexus</label>
            <div className="flex gap-3">
              <div className="flex-1 p-5 bg-white/5 rounded-[24px] font-mono font-black text-white border border-white/10 tracking-widest">
                {user.class_name}
              </div>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(user.class_name);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className={`px-6 rounded-[24px] font-black transition-all shadow-2xl ${copied ? 'bg-success text-white' : 'bg-primary text-white hover:scale-105'}`}
              >
                {copied ? <Check size={24} /> : <Copy size={24} />}
              </button>
            </div>
          </div>

          <button onClick={() => setIsInviteModalOpen(false)} className="w-full py-5 bg-white/5 hover:bg-white/10 text-slate-500 hover:text-white rounded-[24px] font-black text-[10px] uppercase tracking-[0.3em] transition-all border border-white/10">Fermer le Canal</button>
        </div>
      </Modal>
    </div>
  );
};
