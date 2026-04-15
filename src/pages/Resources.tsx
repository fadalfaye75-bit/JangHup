import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTable, insertRow, deleteRow, updateRow } from '../lib/hooks';
import { Resource, UserRole } from '../types';
import { Badge, Spinner, ErrBox, Modal, ConfirmModal, GlassCard, Button, Input, AppCard, AutoGrid, Avatar } from '../components/ui';
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
          authorAvatar: user?.avatar || null,
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
      url: res.url,
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
      url: res.url,
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
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <Badge variant="primary" className="text-[10px] font-bold uppercase tracking-wider">Ressources</Badge>
            <ChevronRight size={14} />
            <span className="text-[10px] font-bold uppercase tracking-wider">{user?.class_name || 'Ma Classe'}</span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white tracking-tight">Base de Connaissances</h1>
          <p className="text-[14px] text-gray-500 dark:text-gray-400">
            Accédez aux supports de cours, exercices et liens utiles partagés par votre classe.
          </p>
        </div>
        
        {canManage && (
          <Button 
            onClick={() => { setEditingResource(null); setFormData({ title: '', description: '', type: 'pdf', url: '', subject: '' }); setIsModalOpen(true); }}
            className="flex items-center gap-2"
          >
            <Plus size={16} />
            <span>Nouvelle Ressource</span>
          </Button>
        )}
      </div>

      {/* Filters & Search */}
      <div className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text"
              placeholder="Rechercher une ressource..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg pl-10 pr-4 py-2 text-[13px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-gray-400"
            />
          </div>
          <div className="flex gap-2">
            <select 
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2 text-[13px] font-medium text-gray-700 dark:text-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
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
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2 text-[13px] font-medium text-gray-700 dark:text-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
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
                    <div className="flex justify-between items-start w-full gap-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-md bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center p-1.5">
                          {getTypeIcon(res.type)}
                        </div>
                        <h3 className="text-[16px] font-semibold text-gray-900 dark:text-white leading-tight line-clamp-1">
                          {res.title}
                        </h3>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="sm" onClick={() => handleShareWhatsApp(res)} className="px-2 py-1 h-auto text-gray-500 hover:text-[#25D366]">
                          <Share2 size={14} />
                        </Button>
                        {canManage && (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(res)} className="px-2 py-1 h-auto text-gray-500 hover:text-gray-900 dark:hover:text-white">
                              <Edit3 size={14} />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(res.id)} className="px-2 py-1 h-auto text-gray-500 hover:text-red-500">
                              <Trash2 size={14} />
                            </Button>
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
                      size="sm"
                      className="w-full flex items-center justify-center gap-2"
                    >
                      {res.type === 'link' ? <ExternalLink size={14} /> : <Download size={14} />}
                      <span>{res.type === 'link' ? 'Ouvrir le lien' : 'Télécharger'}</span>
                    </Button>
                  }
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="primary">{res.subject}</Badge>
                        <span className="text-[12px] text-gray-500 dark:text-gray-400">{fmtDate(res.createdAt)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Avatar 
                          src={res.authorAvatar} 
                          name={res.author} 
                          size="xs" 
                        />
                        <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">{res.author}</span>
                      </div>
                    </div>
                    <p className="text-[13px] text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed">
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
        <div className="text-center py-16 border border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
          <BookOpen size={32} className="mx-auto text-gray-400 mb-4"/>
          <h3 className="text-[16px] font-semibold text-gray-900 dark:text-white tracking-tight">Aucune ressource</h3>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1">Aucun document n'a été partagé avec ces critères.</p>
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
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider ml-1">Titre de la ressource</label>
              <Input 
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Cours Chapitre 1 - Algèbre"
                className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg py-2.5 px-3 text-[13px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-gray-400"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider ml-1">Matière</label>
                <Input 
                  required
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Ex: Mathématiques"
                  className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg py-2.5 px-3 text-[13px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-gray-400"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider ml-1">Type de fichier</label>
                <select 
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg py-2.5 px-3 text-[13px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
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
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider ml-1">URL de la ressource</label>
              <Input 
                type="url"
                required
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                placeholder="https://..."
                className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg py-2.5 px-3 text-[13px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-gray-400"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider ml-1">Description (Facultatif)</label>
              <textarea 
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg py-2.5 px-3 text-[13px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-gray-400 resize-none"
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
