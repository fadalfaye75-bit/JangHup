import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { User, UserRole, SchoolClass } from '../../types';
import { Card, Badge, Spinner, ErrBox, Modal, Btn, ConfirmModal } from '../../components/ui';
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
  getDocs,
  limit
} from 'firebase/firestore';
import { db } from '../../firebase';
import { motion, AnimatePresence } from 'motion/react';

export const Class: React.FC = () => {
  const { user } = useAuth();
  const [members, setMembers] = useState<User[]>([]);
  const [classInfo, setClassInfo] = useState<SchoolClass | null>(null);
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
      collection(db, 'users'),
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

  const handleCopyCode = () => {
    if (classInfo?.delegate_code) {
      navigator.clipboard.writeText(classInfo.delegate_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleGenerateNewCode = async () => {
    if (!classInfo || (user?.role !== UserRole.ADMIN && user?.role !== UserRole.DELEGATE)) return;
    
    const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    try {
      await updateDoc(doc(db, 'classes', classInfo.id), {
        delegate_code: newCode
      });
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
      <Link to="/profile" className="inline-block px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold">Aller au profil</Link>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Ma Classe : {user.class_name}</h1>
            <Badge type="primary" className="text-sm px-3 py-1">{members.length} membres</Badge>
          </div>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Gérez votre environnement de classe et collaborez avec vos camarades.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsInviteModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 dark:shadow-none hover:scale-105 transition-transform"
          >
            <UserPlus size={18} />
            Inviter
          </button>
          {user.role === UserRole.STUDENT && (
            <button 
              onClick={() => setIsConfirmLeaveOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-900 text-rose-500 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-sm hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
            >
              <LogOut size={18} />
              Quitter
            </button>
          )}
        </div>
      </div>

      <ConfirmModal 
        isOpen={isConfirmLeaveOpen}
        onClose={() => setIsConfirmLeaveOpen(false)}
        onConfirm={handleLeaveClass}
        title="Quitter la classe"
        message="Êtes-vous sûr de vouloir quitter cette classe ? Vous ne pourrez plus voir les annonces et les ressources de ce groupe."
        type="danger"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Members List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Rechercher un membre..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm shadow-sm"
            />
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="divide-y divide-slate-50 dark:divide-slate-800">
              <AnimatePresence mode="popLayout">
                {filteredMembers.map((member) => (
                  <motion.div 
                    key={member.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <img 
                          src={member.avatar || `https://ui-avatars.com/api/?name=${member.name}&background=random`} 
                          alt={member.name} 
                          className="w-12 h-12 rounded-full object-cover border-2 border-white dark:border-slate-800 shadow-sm"
                          loading="lazy"
                        />
                        {member.role === UserRole.ADMIN && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 text-white rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900">
                            <Shield size={10} />
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-slate-900 dark:text-white">{member.name} {member.id === user.id && "(Vous)"}</h3>
                          <Badge type={member.role === UserRole.ADMIN ? 'danger' : member.role === UserRole.DELEGATE ? 'warning' : 'primary'}>
                            {member.role}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Mail size={12} />
                          {member.email}
                        </p>
                      </div>
                    </div>
                    <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors opacity-0 group-hover:opacity-100">
                      <MoreVertical size={18} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            {filteredMembers.length === 0 && (
              <div className="p-12 text-center">
                <p className="text-slate-400 font-medium">Aucun membre trouvé.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Class Info & Actions */}
        <div className="space-y-6">
          <Card className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center">
                <Key size={20} />
              </div>
              <h2 className="font-bold text-slate-900 dark:text-white">Accès Délégué</h2>
            </div>
            
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Le code délégué permet à un étudiant de devenir délégué de cette classe et d'accéder aux outils de gestion.
            </p>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Code Actuel</span>
                {(user.role === UserRole.ADMIN || user.role === UserRole.DELEGATE) && (
                  <button 
                    onClick={handleGenerateNewCode}
                    className="text-indigo-600 hover:text-indigo-700 transition-colors"
                    title="Générer un nouveau code"
                  >
                    <RefreshCw size={14} />
                  </button>
                )}
              </div>
              <div className="flex items-center justify-between gap-4">
                <code className="text-xl font-black text-slate-900 dark:text-white tracking-widest font-mono">
                  {classInfo?.delegate_code || '------'}
                </code>
                <button 
                  onClick={handleCopyCode}
                  className={`p-2 rounded-lg transition-all ${copied ? 'bg-emerald-500 text-white' : 'bg-white dark:bg-slate-900 text-slate-400 hover:text-indigo-500 shadow-sm'}`}
                >
                  {copied ? <Check size={18} /> : <Copy size={18} />}
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
                <span>Statistiques</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Étudiants</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">{members.filter(m => m.role === UserRole.STUDENT).length}</p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Délégués</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">{members.filter(m => m.role === UserRole.DELEGATE).length}</p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="bg-indigo-600 text-white border-none shadow-xl shadow-indigo-200 dark:shadow-none">
            <div className="space-y-4">
              <h3 className="font-bold text-lg">Besoin d'aide ?</h3>
              <p className="text-indigo-100 text-sm leading-relaxed">
                Si vous rencontrez des problèmes avec votre classe ou si vous souhaitez changer de groupe, contactez l'administration.
              </p>
              <button className="w-full py-2.5 bg-white/10 hover:bg-white/20 rounded-xl font-bold text-sm transition-colors border border-white/20">
                Contacter le support
              </button>
            </div>
          </Card>
        </div>
      </div>

      {/* Invite Modal */}
      <Modal 
        isOpen={isInviteModalOpen} 
        onClose={() => setIsInviteModalOpen(false)}
        title="Inviter des camarades"
      >
        <div className="space-y-6">
          <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 text-center space-y-4">
            <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto">
              <UserPlus size={32} />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-slate-900 dark:text-white">Partager l'accès</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Les étudiants peuvent rejoindre cette classe en la sélectionnant lors de leur inscription ou depuis leur profil.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Nom de la classe à partager</label>
            <div className="flex gap-2">
              <div className="flex-1 p-3 bg-slate-100 dark:bg-slate-800 rounded-xl font-mono font-bold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                {user.class_name}
              </div>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(user.class_name);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="px-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors"
              >
                {copied ? <Check size={20} /> : <Copy size={20} />}
              </button>
            </div>
          </div>

          <Btn onClick={() => setIsInviteModalOpen(false)} className="w-full">Fermer</Btn>
        </div>
      </Modal>
    </div>
  );
};
