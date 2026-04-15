import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTable, insertRow, deleteRow, updateRow } from '../lib/hooks';
import { Resource, UserRole } from '../types';
import { Badge, Spinner, ErrBox, Modal, ConfirmModal, GlassCard, Button, Input, AppCard, AutoGrid } from '../components/ui';
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
  ChevronRight,
  FileEdit,
  X,
  DownloadCloud,
  MoreVertical
} from 'lucide-react';
import { generateSmartShare, shareToWhatsApp, shareToEmail } from '../lib/shareUtils';
import { fmtDate } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { where, orderBy } from 'firebase/firestore';
import { notificationService } from '../services/notificationService';
import { cn } from '../lib/utils';

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
      default: return <BookOpen className="text-[var(--text-muted)]" size={24} />;
    }
  };

  if (error) return <div className="max-w-5xl mx-auto px-4 py-12"><ErrBox message={error} /></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 px-4">
      <ConfirmModal 
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig({ ...confirmConfig, isOpen: false })}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        message={confirmConfig.message}
        type={confirmConfig.type}
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[var(--text-muted)] mb-1">
            <Badge variant="primary" className="text-[10px] font-bold uppercase tracking-wider">Ressources</Badge>
            <ChevronRight size={14} />
            <span className="text-[10px] font-bold uppercase tracking-wider">{user?.class_name || 'Ma Classe'}</span>
          </div>
          <h1 className="text-3xl font-bold text-[var(--text-main)] tracking-tight">Base de Connaissances</h1>
          <p className="text-xs font-medium text-[var(--text-secondary)]">
            Accédez aux supports de cours, exercices et liens utiles partagés par votre classe.
          </p>
        </div>
        
        {canManage && (
          <Button 
            onClick={() => { setEditingResource(null); setFormData({ title: '', description: '', type: 'pdf', url: '', subject: '' }); setIsModalOpen(true); }}
            className="flex items-center gap-2"
          >
            <Plus size={18} />
            <span className="font-bold uppercase tracking-wider text-xs">Nouvelle Ressource</span>
          </Button>
        )}
      </div>

      {/* Filters & Search */}
      <GlassCard className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
            <input 
              type="text"
              placeholder="Rechercher une ressource..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-standard pl-12 py-3"
            />
          </div>
          <div className="flex gap-2">
            <select 
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="input-standard py-3 text-xs font-bold uppercase tracking-wider"
            >
              <option value="all">Tous les types</option>
              <option value="pdf">PDF / Documents</option>
              <option value="link">Liens</option>
              <option value="video">Vidéos</option>
              <option value="image">Images</option>
              <option value="doc">Travaux</option>
            </select>
            <select 
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
              className="input-standard py-3 text-xs font-bold uppercase tracking-wider"
            >
              <option value="all">Toutes les matières</option>
              {subjects.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      </GlassCard>

      {/* Resources Grid */}
      <AutoGrid minWidth="280px">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 rounded-3xl animate-pulse bg-[var(--bg-main)]/50 border border-[var(--border-main)]" />
          ))
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredResources.map((res) => (
              <motion.div
                key={res.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="group h-full"
              >
                <AppCard 
                  className="flex flex-col h-full"
                  header={
                    <div className="flex justify-between items-center w-full">
                      <div className="w-12 h-12 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-card)] flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                        {getTypeIcon(res.type)}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleShareWhatsApp(res)} className="p-2 text-[var(--text-muted)] hover:text-[#25D366] transition-colors">
                          <Share2 size={16} />
                        </button>
                        {canManage && (
                          <>
                            <button onClick={() => handleEdit(res)} className="p-2 text-[var(--text-muted)] hover:text-primary transition-colors">
                              <Edit3 size={16} />
                            </button>
                            <button onClick={() => handleDelete(res.id)} className="p-2 text-[var(--text-muted)] hover:text-danger transition-colors">
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  }
                  footer={
                    <Button 
                      as="a"
                      href={res.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      variant="secondary"
                      className="w-full flex items-center justify-center gap-2 rounded-xl"
                    >
                      {res.type === 'link' ? <ExternalLink size={16} /> : <Download size={16} />}
                      <span className="font-bold uppercase tracking-wider text-xs">
                        {res.type === 'link' ? 'Ouvrir le lien' : 'Télécharger'}
                      </span>
                    </Button>
                  }
                >
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="primary" className="text-[8px] px-2 py-0.5 uppercase tracking-wider">{res.subject}</Badge>
                        <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">{fmtDate(res.createdAt)}</span>
                      </div>
                      <h3 className="text-lg font-bold text-[var(--text-main)] tracking-tight line-clamp-1 group-hover:text-primary transition-colors leading-tight">{res.title}</h3>
                    </div>
                    <p className="text-sm text-[var(--text-secondary)] font-medium line-clamp-2 leading-relaxed">
                      {res.description || "Aucune description fournie."}
                    </p>
                  </div>
                </AppCard>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </AutoGrid>

      {filteredResources.length === 0 && !loading && (
        <div className="text-center py-16 border-2 border-dashed border-[var(--border-main)] rounded-[32px]">
          <BookOpen size={48} className="mx-auto text-[var(--text-muted)] mb-4"/>
          <h3 className="text-lg font-bold text-[var(--text-main)] tracking-tight">Aucune ressource</h3>
          <p className="text-[var(--text-secondary)] font-medium text-sm mt-1">Aucun document n'a été partagé avec ces critères.</p>
        </div>
      )}

      {/* New/Edit Resource Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingResource ? "Modifier la ressource" : "Nouvelle Ressource"}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider ml-1">Titre de la ressource</label>
              <Input 
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Cours Chapitre 1 - Algèbre"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider ml-1">Matière</label>
                <Input 
                  required
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Ex: Mathématiques"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider ml-1">Type de fichier</label>
                <select 
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="input-standard"
                >
                  <option value="pdf">PDF / Document</option>
                  <option value="link">Lien externe</option>
                  <option value="video">Vidéo</option>
                  <option value="image">Image</option>
                  <option value="doc">Travail dirigé</option>
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider ml-1">URL de la ressource</label>
              <Input 
                type="url"
                required
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider ml-1">Description (Facultatif)</label>
              <textarea 
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input-standard resize-none py-3"
                placeholder="Brève description du contenu..."
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)} className="flex-1">Annuler</Button>
            <Button type="submit" className="flex-1">
              {editingResource ? "Mettre à jour" : "Partager"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
