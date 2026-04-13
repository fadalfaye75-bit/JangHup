import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTable, insertRow, deleteRow, updateRow } from '../../lib/hooks';
import { Resource, UserRole } from '../../types';
import { 
  Card, 
  Badge, 
  SecHdr, 
  Spinner, 
  ErrBox, 
  Btn, 
  Modal, 
  ConfirmModal,
  Skeleton 
} from '../../components/ui';
import { 
  Plus, 
  Search, 
  FileText, 
  Link as LinkIcon, 
  Video, 
  Image as ImageIcon,
  Download,
  ExternalLink,
  Trash2,
  Filter,
  BookOpen,
  Share2,
  Mail,
  Edit3,
  MoreVertical,
  Eye,
  FileEdit,
  X,
  DownloadCloud
} from 'lucide-react';
import { generateSmartShare, shareToWhatsApp, shareToEmail } from '../lib/shareUtils';
import { fmtDate } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { where, orderBy } from 'firebase/firestore';
import { notificationService } from '../services/notificationService';

import { GlassCard } from '../components/ui/GlassCard';

export const Resources: React.FC = () => {
  const { user, classInfo } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<Resource['type'] | 'all'>('all');
  const [filterSubject, setFilterSubject] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'pdf' as Resource['type'],
    url: '',
    subject: ''
  });

  const resourceConstraints = React.useMemo(() => {
    const constraints: any[] = [orderBy('createdAt', 'desc')];
    if (user?.role !== UserRole.ADMIN) {
      constraints.unshift(where('className', '==', user?.class_name || ''));
    }
    return constraints;
  }, [user?.class_name, user?.role]);

  const { data: resources, loading, error } = useTable<Resource>(
    'resources',
    resourceConstraints,
    50,
    !!user?.class_name || user?.role === 'ADMIN'
  );

  const subjects = useMemo(() => {
    const s = new Set(resources.map(r => r.subject));
    return Array.from(s).sort();
  }, [resources]);

  const filteredResources = resources.filter(res => {
    const matchesSearch = res.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          res.subject.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || res.type === filterType;
    const matchesSubject = filterSubject === 'all' || res.subject === filterSubject;
    return matchesSearch && matchesType && matchesSubject;
  });

  const canManage = user?.role === UserRole.ADMIN || user?.role === UserRole.DELEGATE;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.url.trim()) return;

    try {
      if (editingResource) {
        await updateRow('resources', editingResource.id, {
          ...formData,
          updatedAt: new Date().toISOString()
        });
      } else {
        await insertRow('resources', {
          ...formData,
          userId: user?.id,
          author: user?.name,
          className: user?.class_name
        });

        // Notify all students in the class
        if (user?.class_name) {
          await notificationService.notifyClass(
            user.class_name,
            `Nouvelle ressource: ${formData.title}`,
            `Une nouvelle ressource en ${formData.subject} a été ajoutée par ${user.name}.`,
            'info',
            '/resources'
          );
        }
      }
      setIsModalOpen(false);
      setEditingResource(null);
      setFormData({ title: '', description: '', type: 'pdf', url: '', subject: '' });
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = (res: Resource) => {
    setEditingResource(res);
    setFormData({
      title: res.title || '',
      description: res.description || '',
      type: res.type || 'pdf',
      url: res.url || '',
      subject: res.subject || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Supprimer la ressource',
      message: 'Êtes-vous sûr de vouloir supprimer cette ressource ? Cette action est irréversible.',
      type: 'danger',
      onConfirm: async () => {
        await deleteRow('resources', id);
      }
    });
  };

  const handleShareWhatsApp = (res: Resource) => {
    const { whatsapp } = generateSmartShare('ressource', {
      title: res.title,
      description: res.description,
      subject: res.subject,
      className: res.className,
      date: res.createdAt,
      classEmail: classInfo?.class_email
    });
    shareToWhatsApp(whatsapp);
  };

  const handleShareEmail = (res: Resource) => {
    const { emailSubject, emailBody, classEmail } = generateSmartShare('ressource', {
      title: res.title,
      description: res.description,
      subject: res.subject,
      className: res.className,
      date: res.createdAt,
      classEmail: classInfo?.class_email
    });
    shareToEmail(emailSubject, emailBody, classEmail);
  };

  const getTypeIcon = (type: Resource['type']) => {
    switch (type) {
      case 'pdf': return <FileText className="text-rose-500" size={24} />;
      case 'image': return <ImageIcon className="text-emerald-500" size={24} />;
      case 'link': return <LinkIcon className="text-primary" size={24} />;
      case 'video': return <Video className="text-amber-500" size={24} />;
      case 'doc': return <FileEdit className="text-blue-500" size={24} />;
      default: return <BookOpen className="text-slate-500" size={24} />;
    }
  };

  if (error) return <div className="max-w-7xl mx-auto px-4 py-12"><ErrBox message={error} /></div>;

  return (
    <div className="max-w-7xl mx-auto px-4 pb-20 space-y-12">
      <ConfirmModal 
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig({ ...confirmConfig, isOpen: false })}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        message={confirmConfig.message}
        type={confirmConfig.type}
      />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        <div className="space-y-1">
          <h1 className="heading-futuristic">Base de Données</h1>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
            Archives numériques de la classe {user?.class_name}
          </p>
        </div>
        
        {canManage && (
          <button 
            onClick={() => setIsModalOpen(true)} 
            className="btn-futuristic-primary px-10 py-4 flex items-center gap-3 self-start lg:self-center"
          >
            <Plus size={20} />
            <span className="font-black uppercase tracking-widest text-xs">Nouvelle Ressource</span>
          </button>
        )}
      </div>

      {/* Filters & Search */}
      <GlassCard className="p-6 rounded-[32px] border-white/5 shadow-2xl" tilt={false}>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center relative z-10">
          <div className="md:col-span-5 relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors" size={20} />
            <input 
              type="text" 
              placeholder="Rechercher dans les archives..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-14 pr-6 py-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm font-medium text-white placeholder:text-slate-700"
            />
          </div>
          
          <div className="md:col-span-3">
            <div className="relative group">
              <Filter className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors" size={18} />
              <select 
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="w-full pl-14 pr-6 py-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm font-black uppercase tracking-widest text-white appearance-none cursor-pointer"
              >
                <option value="all" className="bg-[#0F0F1A]">Tous les types</option>
                <option value="pdf" className="bg-[#0F0F1A]">📄 PDF / Docs</option>
                <option value="link" className="bg-[#0F0F1A]">🔗 Liens</option>
                <option value="video" className="bg-[#0F0F1A]">🎥 Vidéos</option>
                <option value="image" className="bg-[#0F0F1A]">🖼️ Images</option>
                <option value="doc" className="bg-[#0F0F1A]">📝 Travaux</option>
              </select>
            </div>
          </div>

          <div className="md:col-span-4">
            <div className="relative group">
              <BookOpen className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors" size={18} />
              <select 
                value={filterSubject}
                onChange={(e) => setFilterSubject(e.target.value)}
                className="w-full pl-14 pr-6 py-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm font-black uppercase tracking-widest text-white appearance-none cursor-pointer"
              >
                <option value="all" className="bg-[#0F0F1A]">Toutes les matières</option>
                {subjects.map(s => (
                  <option key={s} value={s} className="bg-[#0F0F1A]">{s}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Resources Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-10">
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <GlassCard key={i} className="space-y-6 p-8">
              <div className="flex items-center gap-4">
                <Skeleton className="w-16 h-16 rounded-2xl" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
              <Skeleton className="h-24 w-full rounded-2xl" />
              <div className="flex gap-4">
                <Skeleton className="h-12 flex-1 rounded-xl" />
                <Skeleton className="h-12 w-12 rounded-xl" />
              </div>
            </GlassCard>
          ))
        ) : filteredResources.length > 0 ? (
          <AnimatePresence mode="popLayout">
            {filteredResources.map((res) => (
              <motion.div
                key={res.id}
                layout
                initial={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
                transition={{ type: "spring", stiffness: 200, damping: 25 }}
                className="group"
              >
                <GlassCard className="h-full flex flex-col p-0 overflow-hidden border-white/5 hover:border-primary/30 transition-all duration-500" tilt={true}>
                  {/* Card Header with Icon & Actions */}
                  <div className="p-8 flex items-start justify-between border-b border-white/5 relative z-10">
                    <div className="flex items-center gap-5">
                      <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 shadow-inner group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(108,99,255,0.2)] transition-all duration-500">
                        {getTypeIcon(res.type)}
                      </div>
                      <div className="min-w-0">
                        <div className="px-3 py-1 bg-primary/10 text-primary rounded-full text-[9px] font-black uppercase tracking-widest inline-block mb-2 border border-primary/20">
                          {res.subject}
                        </div>
                        <h3 className="font-black text-white truncate pr-2 tracking-tight text-lg leading-tight" title={res.title}>
                          {res.title}
                        </h3>
                      </div>
                    </div>
                    
                    {canManage && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleEdit(res); }}
                          className="p-2.5 bg-white/5 hover:bg-white/10 text-slate-500 hover:text-primary rounded-xl transition-all"
                        >
                          <Edit3 size={18} />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDelete(res.id); }}
                          className="p-2.5 bg-white/5 hover:bg-white/10 text-slate-500 hover:text-danger rounded-xl transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <div className="p-8 flex-1 relative z-10">
                    <p className="text-sm text-slate-400 line-clamp-3 leading-relaxed font-medium group-hover:text-slate-300 transition-colors duration-500">
                      {res.description || "Aucune description fournie pour cette ressource."}
                    </p>
                  </div>

                  {/* Footer Stats & Actions */}
                  <div className="px-8 py-6 bg-white/5 border-t border-white/5 flex items-center justify-between mt-auto relative z-10">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleShareWhatsApp(res); }}
                        className="p-2.5 bg-white/5 hover:bg-white/10 text-slate-500 hover:text-[#25D366] rounded-xl transition-all"
                        title="Partager WhatsApp"
                      >
                        <Share2 size={20} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleShareEmail(res); }}
                        className="p-2.5 bg-white/5 hover:bg-white/10 text-slate-500 hover:text-primary rounded-xl transition-all"
                        title="Partager Email"
                      >
                        <Mail size={20} />
                      </button>
                    </div>

                    <div className="flex gap-3">
                      {res.type === 'image' ? (
                        <button 
                          onClick={(e) => { e.stopPropagation(); setPreviewImage(res.url); }}
                          className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/10 transition-all"
                        >
                          <Eye size={16} />
                          Aperçu
                        </button>
                      ) : (
                        <a 
                          href={res.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/10 transition-all"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink size={16} />
                          Accès
                        </a>
                      )}
                      <a 
                        href={res.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-12 h-12 bg-primary text-white rounded-xl shadow-[0_0_20px_rgba(108,99,255,0.3)] hover:scale-110 transition-transform flex items-center justify-center group/dl relative overflow-hidden"
                        title="Télécharger / Ouvrir"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DownloadCloud size={22} className="relative z-10" />
                        <motion.div 
                          animate={{ y: ['-100%', '100%'] }}
                          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                          className="absolute inset-0 bg-gradient-to-b from-transparent via-white/20 to-transparent pointer-events-none"
                        />
                      </a>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </AnimatePresence>
        ) : (
          <div className="col-span-full text-center py-32 glass-ultra rounded-[48px] border-2 border-dashed border-white/5">
            <div className="w-28 h-28 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-8 border border-white/10 shadow-inner">
              <BookOpen size={56} className="text-slate-800" />
            </div>
            <h3 className="text-2xl font-black text-white tracking-tight">Aucune ressource trouvée</h3>
            <p className="text-slate-500 font-medium mt-3 max-w-xs mx-auto">Le système n'a trouvé aucune archive correspondant à vos critères de recherche.</p>
            <button 
              onClick={() => { setSearchTerm(''); setFilterType('all'); setFilterSubject('all'); }}
              className="mt-10 px-8 py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] text-primary hover:text-white hover:bg-white/10 transition-all"
            >
              Réinitialiser les protocoles
            </button>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setEditingResource(null);
          setFormData({ title: '', description: '', type: 'pdf', url: '', subject: '' });
        }} 
        title={editingResource ? "Modifier la ressource" : "Nouvelle ressource"}
      >
        <form onSubmit={handleSubmit} className="space-y-8 p-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-3 ml-1">Titre</label>
              <input 
                type="text" 
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl outline-none focus:ring-2 focus:ring-primary/50 transition-all text-white font-medium placeholder:text-slate-600"
                placeholder="Ex: Cours de Mathématiques"
              />
            </div>
            <div className="space-y-3">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-3 ml-1">Matière</label>
              <input 
                type="text" 
                required
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl outline-none focus:ring-2 focus:ring-primary/50 transition-all text-white font-medium placeholder:text-slate-600"
                placeholder="Ex: Algèbre"
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-3 ml-1">Type de ressource</label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-4">
              {(['pdf', 'link', 'video', 'image', 'doc'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setFormData({ ...formData, type: t })}
                  className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-500 ${
                    formData.type === t 
                      ? 'border-primary bg-primary/10 text-primary shadow-[0_0_15px_rgba(108,99,255,0.2)]' 
                      : 'border-white/5 bg-white/5 text-slate-500 hover:border-white/10'
                  }`}
                >
                  <div className="mb-2">{getTypeIcon(t)}</div>
                  <span className="text-[10px] font-black uppercase tracking-widest">{t}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-3 ml-1">Lien URL</label>
            <input 
              type="url" 
              required
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl outline-none focus:ring-2 focus:ring-primary/50 transition-all text-white font-medium placeholder:text-slate-600"
              placeholder="https://..."
            />
          </div>

          <div className="space-y-3">
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-3 ml-1">Description</label>
            <textarea 
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl outline-none focus:ring-2 focus:ring-primary/50 transition-all text-white font-medium placeholder:text-slate-600 resize-none"
              placeholder="Décrivez brièvement le contenu..."
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button 
              type="button" 
              className="flex-1 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors"
              onClick={() => {
                setIsModalOpen(false);
                setEditingResource(null);
                setFormData({ title: '', description: '', type: 'pdf', url: '', subject: '' });
              }}
            >
              Annuler
            </button>
            <button type="submit" className="btn-futuristic-primary flex-1 py-5">
              <span className="font-black uppercase tracking-widest text-xs">
                {editingResource ? "Mettre à jour" : "Archiver la ressource"}
              </span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Image Preview Modal */}
      <AnimatePresence>
        {previewImage && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-[#0F0F1A]/95 backdrop-blur-xl">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, filter: 'blur(20px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.9, filter: 'blur(20px)' }}
              className="relative max-w-6xl w-full max-h-[85vh] flex items-center justify-center"
            >
              <button 
                onClick={() => setPreviewImage(null)}
                className="absolute -top-16 right-0 p-3 text-slate-500 hover:text-white transition-colors bg-white/5 rounded-full border border-white/10"
              >
                <X size={24} />
              </button>
              <img 
                src={previewImage} 
                alt="Preview" 
                className="max-w-full max-h-full rounded-[32px] shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10 object-contain"
                referrerPolicy="no-referrer"
                loading="lazy"
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
