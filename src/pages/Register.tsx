import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
 Loader2, 
 ArrowRight, 
 Mail, 
 Lock, 
 Eye, 
 EyeOff, 
 AlertCircle,
 User,
 School,
 ArrowLeft,
 KeyRound
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { SchoolClass } from '../../types';

import { GlassCard } from '../components/ui/GlassCard';
import { Button } from '../components/ui/Button';

export const Register: React.FC<{ onBack: () => void }> = ({ onBack }) => {
 const { registerUser } = useAuth();
 const [name, setName] = useState('');
 const [email, setEmail] = useState('');
 const [password, setPassword] = useState('');
 const [classCode, setClassCode] = useState('');
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState<string | null>(null);
 const [showPassword, setShowPassword] = useState(false);

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 setLoading(true);
 setError(null);

 if (password.length < 6) {
 setError("Le mot de passe doit contenir au moins 6 caractères.");
 setLoading(false);
 return;
 }

 try {
 await registerUser(email.toLowerCase().trim(), password, name, classCode);
 } catch (err: any) {
 console.error("Registration error:", err);
 let msg ="Erreur lors de l'inscription.";
 if (err.code === 'auth/email-already-in-use') {
 msg ="Cet email est déjà utilisé.";
 } else if (err.code === 'auth/invalid-email') {
 msg ="Email invalide.";
 } else if (err.message) {
 msg = err.message;
 }
 setError(msg);
 } finally {
 setLoading(false);
 }
 };

 return (
 <motion.div 
 initial={{ opacity: 0, x: 20 }}
 animate={{ opacity: 1, x: 0 }}
 className="space-y-6"
 >
 <button 
 onClick={onBack}
 className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-primary transition-all font-black text-[9px] uppercase tracking-[0.3em] mb-4 group"
 >
 <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform"/> 
 Retour
 </button>

 <div className="text-center mb-8">
 <h2 className="text-2xl font-black text-[var(--text-main)] tracking-tighter">Nouveau Profil</h2>
 <p className="text-[var(--text-secondary)] font-bold uppercase tracking-[0.3em] text-[9px] mt-1">Initialisation de l'identité</p>
 </div>

 <form onSubmit={handleSubmit} className="space-y-5">
 <AnimatePresence mode="wait">
 {error && (
 <motion.div 
 initial={{ opacity: 0, height: 0, filter: 'blur(10px)' }}
 animate={{ opacity: 1, height: 'auto', filter: 'blur(0px)' }}
 exit={{ opacity: 0, height: 0, filter: 'blur(10px)' }}
 className="p-4 bg-danger/10 text-danger border border-danger/20 rounded-2xl text-[9px] font-black uppercase tracking-widest flex items-center gap-3 shadow-lg overflow-hidden"
 >
 <AlertCircle size={16} className="shrink-0"/> 
 <span className="leading-relaxed">{error}</span>
 </motion.div>
 )}
 </AnimatePresence>

 <div className="space-y-4">
 <div className="space-y-2">
 <label className="block text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-[0.4em] ml-1">Nom Complet</label>
 <div className="relative group">
 <User className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] group-focus-within:text-primary transition-colors duration-300"size={18} />
 <input 
 type="text"
 required
 placeholder="Prénom Nom"
 value={name}
 onChange={(e) => setName(e.target.value)}
 className="w-full pl-14 pr-6 py-4 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-2xl outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all text-[var(--text-main)] text-sm font-medium placeholder:text-[var(--text-secondary)]"
 />
 </div>
 </div>

 <div className="space-y-2">
 <label className="block text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-[0.4em] ml-1">Email</label>
 <div className="relative group">
 <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] group-focus-within:text-primary transition-colors duration-300"size={18} />
 <input 
 type="email"
 required
 placeholder="votre@email.com"
 value={email}
 onChange={(e) => setEmail(e.target.value)}
 className="w-full pl-14 pr-6 py-4 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-2xl outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all text-[var(--text-main)] text-sm font-medium placeholder:text-[var(--text-secondary)]"
 />
 </div>
 </div>

 <div className="space-y-2">
 <label className="block text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-[0.4em] ml-1">Code d'Inscription</label>
 <div className="relative group">
 <KeyRound className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] group-focus-within:text-primary transition-colors duration-300"size={18} />
 <input 
 type="text"
 required
 placeholder="Code fourni par votre délégué"
 value={classCode}
 onChange={(e) => setClassCode(e.target.value)}
 className="w-full pl-14 pr-6 py-4 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-2xl outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all text-[var(--text-main)] text-sm font-medium placeholder:text-[var(--text-secondary)]"
 />
 </div>
 </div>

 <div className="space-y-2">
 <label className="block text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-[0.4em] ml-1">Mot de passe</label>
 <div className="relative group">
 <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] group-focus-within:text-primary transition-colors duration-300"size={18} />
 <input 
 type={showPassword ?"text":"password"}
 required
 placeholder="••••••••"
 value={password}
 onChange={(e) => setPassword(e.target.value)}
 className="w-full pl-14 pr-14 py-4 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-2xl outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all text-[var(--text-main)] text-sm font-medium placeholder:text-[var(--text-secondary)]"
 />
 <button
 type="button"
 onClick={() => setShowPassword(!showPassword)}
 className="absolute right-5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-primary transition-colors duration-300"
 >
 {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
 </button>
 </div>
 </div>
 </div>

 <Button
 type="submit"
 isLoading={loading}
 className="w-full py-4 flex items-center justify-center gap-3 group mt-4"
 >
 <span className="font-black uppercase tracking-[0.2em] text-[11px]">Finaliser l'inscription</span>
 {!loading && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform"/>}
 </Button>
 </form>
 </motion.div>
 );
};
