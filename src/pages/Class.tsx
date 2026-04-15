import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { User, UserRole, SchoolClass } from '../types';
import { Badge, Spinner, ErrBox, Modal, ConfirmModal, GlassCard, Button, Input } from '../components/ui';
import { 
  Users, 
  UserPlus, 
  Key, 
  LogOut, 
  Shield, 
  Mail, 
  Search,
  Copy,
  Check,
  RefreshCw,
  ChevronRight
} from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  updateDoc,
  getDoc,
  limit,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

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
      
      const secretRef = doc(db, 'class_secrets', classInfo.id);
      batch.set(secretRef, {
        delegate_code: newCode,
        updatedAt: new Date().toISOString()
      }, { merge: true });

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
        role: UserRole.STUDENT
      });
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
      <div className="w-20 h-20 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-full flex items-center justify-center mx-auto text-[var(--text-muted)] shadow-sm">
        <Users size={40} />
      </div>
      <h1 className="text-2xl font-bold text-[var(--text-main)]">Vous n'avez pas encore de classe</h1>
      <p className="text-[var(--text-secondary)]">Rejoignez une classe depuis votre profil pour voir vos camarades.</p>
      <Link to="/profile">
        <Button>Aller au profil</Button>
      </Link>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 px-4">
      <ConfirmModal 
        isOpen={isConfirmLeaveOpen}
        onClose={() => setIsConfirmLeaveOpen(false)}
        onConfirm={handleLeaveClass}
        title="Quitter la classe"
        message="Êtes-vous sûr de vouloir quitter cette classe ? Vous perdrez l'accès aux ressources partagées."
        type="danger"
      />

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[var(--text-muted)] mb-1">
            <Badge variant="primary" className="text-[10px] font-bold uppercase tracking-wider">Ma Classe</Badge>
            <ChevronRight size={14} />
            <span className="text-[10px] font-bold uppercase tracking-wider">{user.class_name}</span>
          </div>
          <h1 className="text-3xl font-bold text-[var(--text-main)] tracking-tight">Membres de la Classe</h1>
          <p className="text-xs font-medium text-[var(--text-secondary)]">
            {members.length} étudiant{members.length > 1 ? 's' : ''} inscrit{members.length > 1 ? 's' : ''} dans votre nexus.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            onClick={() => setIsInviteModalOpen(true)}
            variant="secondary"
            className="flex items-center gap-2"
          >
            <UserPlus size={18} />
            <span className="font-bold uppercase tracking-wider text-xs">Inviter</span>
          </Button>
          {user.role === UserRole.STUDENT && (
            <Button 
              onClick={() => setIsConfirmLeaveOpen(true)}
              variant="danger"
              className="flex items-center gap-2"
            >
              <LogOut size={18} />
              <span className="font-bold uppercase tracking-wider text-xs">Quitter</span>
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Members List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
            <input 
              type="text"
              placeholder="Rechercher un membre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-standard pl-12 py-3"
            />
          </div>

          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {filteredMembers.map((member) => (
                <motion.div 
                  key={member.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                >
                  <GlassCard className="p-4 group">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className="w-12 h-12 rounded-xl overflow-hidden border border-[var(--border-main)] shadow-sm">
                            <img 
                              src={member.avatar || `https://ui-avatars.com/api/?name=${member.name}&background=random`} 
                              alt={member.name} 
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          {member.role === UserRole.ADMIN && (
                            <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-primary text-white rounded-lg flex items-center justify-center border-2 border-[var(--bg-card)] shadow-sm">
                              <Shield size={10} />
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-[var(--text-main)] text-sm">{member.name} {member.id === user.id && "(Moi)"}</h3>
                            <Badge variant={
                              member.role === UserRole.ADMIN ? 'danger' : 
                              member.role === UserRole.DELEGATE ? 'warning' : 'primary'
                            } className="text-[8px] px-1.5 py-0">
                              {member.role}
                            </Badge>
                          </div>
                          <p className="text-[10px] font-medium text-[var(--text-muted)] flex items-center gap-1.5 mt-0.5">
                            <Mail size={12} className="text-primary/50"/>
                            {member.email}
                          </p>
                        </div>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </AnimatePresence>
            {filteredMembers.length === 0 && (
              <div className="text-center py-16 border-2 border-dashed border-[var(--border-main)] rounded-[32px]">
                <Users size={48} className="mx-auto text-[var(--text-muted)] mb-4"/>
                <p className="text-[var(--text-secondary)] font-bold uppercase tracking-wider text-[10px]">Aucun membre trouvé.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Class Info & Actions */}
        <div className="space-y-6">
          <GlassCard className="p-6 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center border border-primary/10">
                <Key size={20} />
              </div>
              <h2 className="text-lg font-bold text-[var(--text-main)] tracking-tight">Code Délégué</h2>
            </div>
            
            <p className="text-xs text-[var(--text-secondary)] font-medium leading-relaxed">
              Le code délégué permet à un étudiant de devenir délégué de la classe et d'accéder aux outils de gestion.
            </p>

            <div className="p-4 bg-[var(--bg-main)] rounded-2xl border border-[var(--border-main)] space-y-4">
              <div className="flex flex-col items-center justify-center py-4 space-y-2">
                <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Code Actuel</span>
                <span className="text-2xl font-mono font-bold text-primary tracking-widest">
                  {user.role === UserRole.ADMIN || user.role === UserRole.DELEGATE 
                    ? (classSecret?.delegate_code || classInfo?.delegate_code || '----')
                    : '••••-••••'
                  }
                </span>
              </div>

              {(user.role === UserRole.ADMIN || user.role === UserRole.DELEGATE) && (
                <div className="flex gap-2">
                  <Button 
                    variant="secondary" 
                    onClick={handleCopyCode}
                    className="flex-1 flex items-center justify-center gap-2 py-2"
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    <span className="text-[10px] font-bold uppercase tracking-wider">{copied ? 'Copié' : 'Copier'}</span>
                  </Button>
                  <Button 
                    variant="secondary" 
                    onClick={handleGenerateNewCode}
                    className="flex-1 flex items-center justify-center gap-2 py-2"
                  >
                    <RefreshCw size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Régénérer</span>
                  </Button>
                </div>
              )}
            </div>
            
            {user.role === UserRole.STUDENT && (
              <div className="p-4 bg-warning/5 border border-warning/10 rounded-xl">
                <p className="text-[10px] text-warning font-medium leading-relaxed">
                  Si vous êtes le délégué, demandez le code à l'administrateur pour activer vos privilèges.
                </p>
              </div>
            )}
          </GlassCard>
        </div>
      </div>

      {/* Invite Modal */}
      <Modal 
        isOpen={isInviteModalOpen} 
        onClose={() => setIsInviteModalOpen(false)} 
        title="Inviter des camarades"
      >
        <div className="space-y-6">
          <div className="p-6 bg-[var(--bg-main)] rounded-2xl border border-[var(--border-main)] text-center space-y-4">
            <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto">
              <UserPlus size={32} />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-[var(--text-main)]">Lien d'invitation</h3>
              <p className="text-xs text-[var(--text-secondary)]">Partagez ce lien pour inviter vos camarades à rejoindre le nexus.</p>
            </div>
            <div className="flex items-center gap-2 p-2 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl">
              <code className="flex-1 text-xs text-primary font-mono truncate px-2">
                {window.location.origin}/register?class={user.class_name}
              </code>
              <Button 
                size="sm" 
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/register?class=${user.class_name}`);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="shrink-0"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </Button>
            </div>
          </div>
          <Button onClick={() => setIsInviteModalOpen(false)} className="w-full">Fermer</Button>
        </div>
      </Modal>
    </div>
  );
};
