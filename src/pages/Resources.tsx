import React, { useState, useMemo } from 'react';
import { useAuth } from '../../lib/AuthContext';
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
import { fmtDate } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { where, orderBy } from 'firebase/firestore';

export const Resources: React.FC = () => {
  const { user } = useAuth();
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

  const { data: resources, loading, error } = useTable<Resource>(
    'resources',
    [where('className', '==', user?.className || ''), orderBy('createdAt', 'desc')]
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
          className: user?.className
        });
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
      title: res.title,
      description: res.description,
      type: res.type,
      url: res.url,
      subject: res.subject
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
    const text = `📂 Ressource JangHup\nTitre: ${res.title}\nLien: ${res.url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleShareEmail = (res: Resource) => {
    const subject = `Ressource JangHup: ${res.title}`;
    const body = `${res.title}\n\nLien: ${res.url}\n\nPartagé via JangHup.`;
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  const getTypeIcon = (type: Resource['type']) => {
    switch (type) {
      case 'pdf': return <FileText className="text-rose-500" size={24} />;
      case 'image': return <ImageIcon className="text-emerald-500" size={24} />;
      case 'link': return <LinkIcon className="text-indigo-500" size={24} />;
      case 'video': return <Video className="text-amber-500" size={24} />;
      case 'doc': return <FileEdit className="text-blue-500" size={24} />;
      default: return <BookOpen className="text-slate-500" size={24} />;
    }
  };

  if (error) return <div className="max-w-7xl mx-auto px-4 py-12"><ErrBox message={error} /></div>;

  return (
    <div className="max-w-7xl mx-auto px-4 pb-20 space-y-8">
      <ConfirmModal 
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig({ ...confirmConfig, isOpen: false })}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        message={confirmConfig.message}
        type={confirmConfig.type}
      />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <SecHdr 
          title="Bibliothèque de Ressources" 
          subtitle={`Accédez aux supports de cours de la classe ${user?.className}`}
        />
        
        {canManage && (
          <Btn onClick={() => setIsModalOpen(true)} className="lg:mb-8">
            <Plus size={20} />
            Ajouter une ressource
          </Btn>
        )}
      </div>

      {/* Filters & Search */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-white dark:bg-[#161a22] p-4 rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-sm">
        <div className="md:col-span-5 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Rechercher par titre ou matière..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-2xl outline-none focus:ring-2 focus:ring-primary transition-all text-sm"
          />
        </div>
        
        <div className="md:col-span-3">
          <div className="relative">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <select 
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-2xl outline-none focus:ring-2 focus:ring-primary transition-all text-sm appearance-none"
            >
              <option value="all">Tous les types</option>
              <option value="pdf">📄 PDF / Docs</option>
              <option value="link">🔗 Liens</option>
              <option value="video">🎥 Vidéos</option>
              <option value="image">🖼️ Images</option>
              <option value="doc">📝 Travaux</option>
            </select>
          </div>
        </div>

        <div className="md:col-span-4">
          <div className="relative">
            <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <select 
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-2xl outline-none focus:ring-2 focus:ring-primary transition-all text-sm appearance-none"
            >
              <option value="all">Toutes les matières</option>
              {subjects.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Resources Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="space-y-4">
              <div className="flex items-center gap-4">
                <Skeleton className="w-12 h-12 rounded-2xl" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
              <Skeleton className="h-20 w-full" />
              <div className="flex gap-2">
                <Skeleton className="h-10 flex-1" />
                <Skeleton className="h-10 flex-1" />
              </div>
            </Card>
          ))
        ) : filteredResources.length > 0 ? (
          <AnimatePresence mode="popLayout">
            {filteredResources.map((res) => (
              <motion.div
                key={res.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                whileHover={{ y: -5, scale: 1.02 }}
                className="group"
              >
                <Card className="h-full flex flex-col p-0 overflow-hidden border-white/5 hover:border-primary/30 transition-colors">
                  {/* Card Header with Icon & Actions */}
                  <div className="p-5 flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-white/5 flex items-center justify-center shadow-inner">
                        {getTypeIcon(res.type)}
                      </div>
                      <div className="min-w-0">
                        <Badge type="primary" className="mb-1">{res.subject}</Badge>
                        <h3 className="font-bold text-slate-900 dark:text-white truncate pr-2" title={res.title}>
                          {res.title}
                        </h3>
                      </div>
                    </div>
                    
                    {canManage && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleEdit(res); }}
                          className="p-2 text-slate-400 hover:text-primary transition-colors"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDelete(res.id); }}
                          className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <div className="px-5 pb-5 flex-1">
                    <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed">
                      {res.description || "Aucune description fournie pour cette ressource."}
                    </p>
                  </div>

                  {/* Footer Stats & Actions */}
                  <div className="px-5 py-4 bg-slate-50/50 dark:bg-white/[0.02] border-t border-slate-100 dark:border-white/5 flex items-center justify-between mt-auto">
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleShareWhatsApp(res); }}
                        className="p-2 text-slate-400 hover:text-[#25D366] transition-colors"
                        title="Partager WhatsApp"
                      >
                        <Share2 size={18} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleShareEmail(res); }}
                        className="p-2 text-slate-400 hover:text-primary transition-colors"
                        title="Partager Email"
                      >
                        <Mail size={18} />
                      </button>
                    </div>

                    <div className="flex gap-2">
                      {res.type === 'image' ? (
                        <button 
                          onClick={(e) => { e.stopPropagation(); setPreviewImage(res.url); }}
                          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-white/10 transition-all"
                        >
                          <Eye size={14} />
                          Aperçu
                        </button>
                      ) : (
                        <a 
                          href={res.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-white/10 transition-all"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink size={14} />
                          Ouvrir
                        </a>
                      )}
                      <a 
                        href={res.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-primary text-white rounded-xl shadow-lg shadow-primary/20 hover:scale-110 transition-transform flex items-center justify-center"
                        title="Télécharger / Ouvrir"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DownloadCloud size={18} />
                      </a>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        ) : (
          <div className="col-span-full text-center py-20 space-y-4">
            <div className="w-24 h-24 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto">
              <BookOpen size={48} className="text-slate-200 dark:text-white/10" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Aucune ressource trouvée</h3>
            <p className="text-slate-500 max-w-xs mx-auto">Essayez de modifier vos filtres ou effectuez une nouvelle recherche.</p>
            <Btn variant="ghost" onClick={() => { setSearchTerm(''); setFilterType('all'); setFilterSubject('all'); }}>
              Réinitialiser les filtres
            </Btn>
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
        title={editingResource ? "Modifier la ressource" : "Ajouter une ressource"}
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Titre</label>
              <input 
                type="text" 
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="input"
                placeholder="Ex: Cours de Mathématiques"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Matière</label>
              <input 
                type="text" 
                required
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="input"
                placeholder="Ex: Algèbre"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Type de ressource</label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {(['pdf', 'link', 'video', 'image', 'doc'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setFormData({ ...formData, type: t })}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all ${
                    formData.type === t 
                      ? 'border-primary bg-primary/5 text-primary' 
                      : 'border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5 text-slate-400'
                  }`}
                >
                  {getTypeIcon(t)}
                  <span className="text-[10px] font-bold uppercase mt-2">{t}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Lien URL</label>
            <input 
              type="url" 
              required
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              className="input"
              placeholder="https://google.drive.com/..."
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Description</label>
            <textarea 
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input resize-none"
              placeholder="Décrivez brièvement le contenu de cette ressource..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Btn 
              type="button" 
              variant="secondary" 
              className="flex-1" 
              onClick={() => {
                setIsModalOpen(false);
                setEditingResource(null);
                setFormData({ title: '', description: '', type: 'pdf', url: '', subject: '' });
              }}
            >
              Annuler
            </Btn>
            <Btn type="submit" className="flex-1">
              {editingResource ? "Mettre à jour" : "Ajouter"}
            </Btn>
          </div>
        </form>
      </Modal>

      {/* Image Preview Modal */}
      <AnimatePresence>
        {previewImage && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative max-w-5xl w-full max-h-[90vh] flex items-center justify-center"
            >
              <button 
                onClick={() => setPreviewImage(null)}
                className="absolute -top-12 right-0 p-2 text-white hover:text-primary transition-colors"
              >
                <X size={32} />
              </button>
              <img 
                src={previewImage} 
                alt="Preview" 
                className="max-w-full max-h-full rounded-2xl shadow-2xl object-contain"
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
