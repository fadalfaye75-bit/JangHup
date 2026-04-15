import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  ArrowRight, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  AlertCircle,
  User,
  ArrowLeft,
  KeyRound
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../components/ui';

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
      let msg = "Erreur lors de l'inscription.";
      if (err.code === 'auth/email-already-in-use') {
        msg = "Cet email est déjà utilisé.";
      } else if (err.code === 'auth/invalid-email') {
        msg = "Email invalide.";
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
        className="flex items-center gap-2 text-gray-500 hover:text-blue-500 transition-all font-semibold text-[11px] uppercase tracking-wider mb-4 group"
      >
        <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform"/> 
        Retour
      </button>

      <div className="text-center mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white tracking-tight">Nouveau Profil</h2>
        <p className="text-[14px] text-gray-500 dark:text-gray-400 mt-1">Créez votre compte étudiant</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <AnimatePresence mode="wait">
          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-3 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/20 rounded-lg text-[12px] font-medium flex items-center gap-3 overflow-hidden"
            >
              <AlertCircle size={14} className="shrink-0"/> 
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider ml-1">Nom Complet</label>
            <div className="relative group">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={16} />
              <input 
                type="text"
                required
                placeholder="Prénom Nom"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg pl-10 pr-4 py-2 text-[14px] outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider ml-1">Email</label>
            <div className="relative group">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={16} />
              <input 
                type="email"
                required
                placeholder="votre@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg pl-10 pr-4 py-2 text-[14px] outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider ml-1">Code d'Inscription</label>
            <div className="relative group">
              <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={16} />
              <input 
                type="text"
                required
                placeholder="Code fourni par votre délégué"
                value={classCode}
                onChange={(e) => setClassCode(e.target.value)}
                className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg pl-10 pr-4 py-2 text-[14px] outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider ml-1">Mot de passe</label>
            <div className="relative group">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={16} />
              <input 
                type={showPassword ? "text" : "password"}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg pl-10 pr-10 py-2 text-[14px] outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-500 transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        </div>

        <Button
          type="submit"
          isLoading={loading}
          className="w-full py-2.5 flex items-center justify-center gap-2 group mt-4"
        >
          <span className="text-[13px] font-medium">Finaliser l'inscription</span>
          {!loading && <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform"/>}
        </Button>
      </form>
    </motion.div>
  );
};
