import React, { useState } from 'react';
import { Announcement, User, UserRole } from '../types';
import { 
  MessageCircle, Link as LinkIcon, Image as ImageIcon, Trash2, Mail, Copy, 
  Video, FileText, HardDrive, X, Check, Plus, Share2, Edit2, File, AlertCircle, Loader2, School
} from 'lucide-react';

interface AnnouncementsProps {
  user: User;
  announcements: Announcement[];
  addAnnouncement: (a: Announcement) => void;
  updateAnnouncement: (a: Announcement) => void;
  deleteAnnouncement: (id: string) => void;
}

export const Announcements: React.FC<AnnouncementsProps> = ({ user, announcements, addAnnouncement, updateAnnouncement, deleteAnnouncement }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [targetClass, setTargetClass] = useState(user.classLevel); 
  const [links, setLinks] = useState<{ title: string; url: string; type: 'MEET' | 'FORMS' | 'DRIVE' | 'OTHER' }[]>([]);
  
  // Simplification : On simule l'upload en gardant juste le nom du fichier pour la démo
  const [images, setImages] = useState<string[]>([]); 
  const [attachments, setAttachments] = useState<{name: string, type: 'PDF' | 'IMAGE' | 'EXCEL', url: string}[]>([]);

  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [linkType, setLinkType] = useState<'MEET' | 'FORMS' | 'DRIVE' | 'OTHER'>('OTHER');
  
  const [uploadError, setUploadError] = useState<string | null>(null);

  const canCreate = user.role === UserRole.ADMIN || user.role === UserRole.RESPONSIBLE;

  const hasRights = (ann: Announcement) => {
    if (user.role === UserRole.ADMIN) return true;
    if (user.role === UserRole.RESPONSIBLE && ann.classLevel === user.classLevel) return true;
    return user.id === ann.authorId;
  };

  const resetForm = () => {
    setContent('');
    setLinks([]);
    setImages([]);
    setAttachments([]);
    setTargetClass(user.classLevel);
    setIsCreating(false);
    setEditingId(null);
    setShowLinkInput(false);
    setIsSubmitting(false);
    setUploadError(null);
  };

  const handleEdit = (ann: Announcement) => {
      setEditingId(ann.id);
      setContent(ann.content);
      setLinks(ann.links || []);
      setImages(ann.images || []);
      setAttachments(ann.attachments || []);
      if (user.role === UserRole.ADMIN) setTargetClass(ann.classLevel);
      setIsCreating(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddLink = () => {
    if (linkUrl && linkTitle) {
      setLinks([...links, { title: linkTitle, url: linkUrl, type: linkType }]);
      setLinkUrl('');
      setLinkTitle('');
      setShowLinkInput(false);
    }
  };

  // Simulation Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'IMAGE' | 'PDF') => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (type === 'IMAGE') {
          // Create fake local URL
          const fakeUrl = URL.createObjectURL(file);
          setImages([...images, fakeUrl]);
      } else {
          setAttachments([...attachments, { name: file.name, type: 'PDF', url: '#' }]);
      }
    }
  };

  const handlePublish = () => {
    if (!content.trim()) return;
    setIsSubmitting(true);
    
    // Simuler délai réseau
    setTimeout(() => {
        const finalClass = user.role === UserRole.ADMIN ? targetClass : user.classLevel;

        const newAnn: Announcement = {
            id: editingId || Date.now().toString(),
            authorId: user.id,
            authorName: user.name,
            classLevel: finalClass,
            content,
            date: editingId ? (announcements.find(a => a.id === editingId)?.date || new Date().toISOString()) : new Date().toISOString(),
            links: links,
            images: images,
            attachments: attachments
        };

        if (editingId) updateAnnouncement(newAnn);
        else addAnnouncement(newAnn);

        resetForm();
    }, 500);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Supprimer cette annonce ?")) {
      deleteAnnouncement(id);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getLinkIcon = (type: string) => {
    switch (type) {
      case 'MEET': return <Video size={16} />;
      case 'FORMS': return <FileText size={16} />;
      case 'DRIVE': return <HardDrive size={16} />;
      default: return <LinkIcon size={16} />;
    }
  };

  const getLinkColor = (type: string) => {
    switch (type) {
      case 'MEET': return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800';
      case 'FORMS': return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800';
      case 'DRIVE': return 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-900/20 dark:text-sky-300 dark:border-sky-800';
      default: return 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
           <div className="flex items-center gap-2">
               <h2 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">Fil d'actualité</h2>
               <span className="bg-university/10 dark:bg-sky-500/20 text-university dark:text-sky-400 text-xs font-bold px-2 py-0.5 rounded border border-university/20 dark:border-sky-500/20">
                 {user.role === UserRole.ADMIN ? 'Admin' : user.classLevel}
               </span>
           </div>
           <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Communications officielles et ressources.</p>
        </div>
        {canCreate && !isCreating && (
          <button 
            onClick={() => setIsCreating(true)}
            className="bg-university hover:bg-university-dark dark:bg-sky-600 dark:hover:bg-sky-700 text-white px-6 py-2.5 rounded-lg font-bold shadow-sm transition-all flex items-center gap-2 text-sm"
          >
            <Plus size={18} /> Nouvelle Annonce
          </button>
        )}
      </div>

      {isCreating && (
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-card border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
             <h3 className="text-base font-bold text-slate-800 dark:text-white">{editingId ? 'Modifier l\'annonce' : 'Nouvelle Communication'}</h3>
          </div>
          <div className="p-6">
            {user.role === UserRole.ADMIN && (
                <div className="mb-4 relative">
                    <School className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                        type="text" 
                        value={targetClass} 
                        onChange={(e) => setTargetClass(e.target.value)}
                        placeholder="Classe cible (ex: Tle S2)"
                        className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none font-medium text-slate-700 dark:text-white focus:ring-2 focus:ring-university/20 dark:focus:ring-sky-500/20 focus:border-university dark:focus:border-sky-500 text-sm"
                    />
                </div>
            )}
            
            <div className="relative">
                <textarea
                  className="w-full p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-university/20 dark:focus:ring-sky-500/20 focus:border-university dark:focus:border-sky-500 transition-all outline-none resize-none text-slate-700 dark:text-white min-h-[180px] placeholder:text-slate-400 text-sm leading-relaxed"
                  placeholder="Saisissez le contenu de votre annonce ici..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  disabled={isSubmitting}
                />
            </div>
            
            {(links.length > 0 || images.length > 0 || attachments.length > 0) && (
              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                {links.map((l, i) => (
                  <span key={i} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium border border-slate-200 dark:border-slate-700">
                    {getLinkIcon(l.type)} {l.title}
                    <button onClick={() => setLinks(links.filter((_, idx) => idx !== i))} className="hover:text-alert"><X size={14} /></button>
                  </span>
                ))}
                
                {images.map((img, i) => (
                  <span key={`img-${i}`} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium border border-slate-200 dark:border-slate-700">
                    <ImageIcon size={14} /> Image {i+1}
                    <button onClick={() => setImages(images.filter((_, idx) => idx !== i))} className="hover:text-alert"><X size={14} /></button>
                  </span>
                ))}

                {attachments.map((att, i) => (
                  <span key={`att-${i}`} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium border border-slate-200 dark:border-slate-700">
                    <File size={14} /> {att.name}
                    <button onClick={() => setAttachments(attachments.filter((_, idx) => idx !== i))} className="hover:text-alert"><X size={14} /></button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 border-t border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-4 justify-between items-center">
             <div className="flex gap-2 w-full md:w-auto">
                <div className="relative">
                   <button 
                     disabled={isSubmitting}
                     onClick={() => setShowLinkInput(!showLinkInput)}
                     className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 text-xs font-bold border disabled:opacity-50 ${showLinkInput ? 'bg-university/10 dark:bg-sky-500/10 text-university dark:text-sky-400 border-university/20 dark:border-sky-500/20' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                   >
                      <LinkIcon size={16} /> Lien
                   </button>
                   {showLinkInput && (
                     <div className="absolute bottom-full left-0 mb-2 w-72 bg-white dark:bg-slate-900 p-4 rounded-xl shadow-elevation border border-slate-200 dark:border-slate-700 z-10">
                        <input 
                          placeholder="Titre" 
                          className="w-full mb-2 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs outline-none focus:border-university dark:focus:border-sky-500 text-slate-800 dark:text-white"
                          value={linkTitle} onChange={e => setLinkTitle(e.target.value)}
                        />
                        <input 
                          placeholder="URL" 
                          className="w-full mb-2 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs outline-none focus:border-university dark:focus:border-sky-500 text-slate-800 dark:text-white"
                          value={linkUrl} onChange={e => setLinkUrl(e.target.value)}
                        />
                        <button onClick={handleAddLink} className="w-full bg-university dark:bg-sky-600 text-white py-2 rounded-md text-xs font-bold hover:bg-university-dark dark:hover:bg-sky-700">Ajouter</button>
                     </div>
                   )}
                </div>

                <label className={`px-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer flex items-center gap-2 text-xs font-bold ${isSubmitting ? 'opacity-50 pointer-events-none' : ''}`}>
                   <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'IMAGE')} disabled={isSubmitting} />
                   <ImageIcon size={16} /> Photo
                </label>

                <label className={`px-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer flex items-center gap-2 text-xs font-bold ${isSubmitting ? 'opacity-50 pointer-events-none' : ''}`}>
                   <input type="file" accept=".pdf" className="hidden" onChange={(e) => handleFileUpload(e, 'PDF')} disabled={isSubmitting} />
                   <FileText size={16} /> PDF
                </label>
             </div>

             <div className="flex gap-2 w-full md:w-auto justify-end">
                <button disabled={isSubmitting} onClick={resetForm} className="px-5 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-bold text-xs transition-colors border border-transparent disabled:opacity-50">
                  Annuler
                </button>
                <button 
                  onClick={handlePublish}
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-university hover:bg-university-dark dark:bg-sky-600 dark:hover:bg-sky-700 text-white rounded-lg font-bold shadow-sm transition-all flex items-center gap-2 text-xs disabled:opacity-50"
                >
                   {isSubmitting ? <Loader2 className="animate-spin" size={16}/> : <><Check size={16} /> {editingId ? 'Mettre à jour' : 'Publier'}</>}
                </button>
             </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {announcements.map(ann => (
          <div key={ann.id} className="bg-white dark:bg-slate-900 rounded-xl p-0 shadow-card border border-slate-200 dark:border-slate-800 hover:border-university/30 dark:hover:border-sky-500/30 transition-all">
             <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold text-white shadow-sm
                                ${ann.authorName.includes('Admin') ? 'bg-university-dark dark:bg-sky-700' : 'bg-university dark:bg-sky-600'}`}
                        >
                                {ann.authorName.charAt(0)}
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 dark:text-white text-sm">{ann.authorName}</h3>
                            <div className="flex gap-2 items-center text-xs text-slate-500 dark:text-slate-400">
                                <span>{new Date(ann.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute:'2-digit' })}</span>
                                {user.role === UserRole.ADMIN && (
                                    <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                                        {ann.classLevel}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex gap-1">
                        {hasRights(ann) && (
                            <>
                                <button onClick={() => handleEdit(ann)} className="p-2 text-slate-400 hover:text-university dark:hover:text-sky-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors" title="Modifier">
                                    <Edit2 size={16} />
                                </button>
                                <button 
                                    onClick={() => handleDelete(ann.id)} 
                                    className="p-2 rounded-lg transition-all flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-alert hover:bg-alert-light dark:hover:bg-alert/10"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </>
                        )}
                    </div>
                </div>

                <div className="prose prose-slate dark:prose-invert prose-sm max-w-none mb-6">
                    <p className="whitespace-pre-wrap text-slate-700 dark:text-slate-300 leading-relaxed">{ann.content}</p>
                </div>

                {ann.links && ann.links.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-6">
                        {ann.links.map((link, i) => (
                            <a 
                                key={i} 
                                href={link.url} 
                                target="_blank" 
                                rel="noreferrer"
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-bold text-xs transition-all border ${getLinkColor(link.type)} hover:brightness-95`}
                            >
                                {getLinkIcon(link.type)}
                                <span>{link.title}</span>
                            </a>
                        ))}
                    </div>
                )}

                {/* Dummy Image Display */}
                {ann.images && ann.images.length > 0 && (
                    <div className={`grid gap-3 mb-6 ${ann.images.length === 1 ? 'grid-cols-1' : 'grid-cols-2 md:grid-cols-3'}`}>
                        {ann.images.map((img, i) => (
                            <div key={i} className="relative aspect-video rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                <img src={img} alt="Attachment" className="w-full h-full object-cover" />
                            </div>
                        ))}
                    </div>
                )}
             </div>
          </div>
        ))}
      </div>
    </div>
  );
};