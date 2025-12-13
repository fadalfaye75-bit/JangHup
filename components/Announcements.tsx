import React, { useState } from 'react';
import { Announcement, User, UserRole } from '../types';
import { supabase } from '../lib/supabaseClient';
import { 
  MessageCircle, Link as LinkIcon, Image as ImageIcon, Trash2, Mail, Copy, 
  Video, FileText, HardDrive, X, Check, Plus, Share2, Edit2, File, AlertOctagon, Loader2, Users, School
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
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [targetClass, setTargetClass] = useState(user.classLevel); 
  const [links, setLinks] = useState<{ title: string; url: string; type: 'MEET' | 'FORMS' | 'DRIVE' | 'OTHER' }[]>([]);
  const [images, setImages] = useState<File[]>([]); 
  const [attachments, setAttachments] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<any[]>([]);

  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [linkType, setLinkType] = useState<'MEET' | 'FORMS' | 'DRIVE' | 'OTHER'>('OTHER');

  const canCreate = user.role === UserRole.RESPONSIBLE || user.role === UserRole.ADMIN;

  const resetForm = () => {
    setContent('');
    setLinks([]);
    setImages([]);
    setAttachments([]);
    setExistingImages([]);
    setExistingAttachments([]);
    setTargetClass(user.classLevel);
    setIsCreating(false);
    setEditingId(null);
    setShowLinkInput(false);
    setIsSubmitting(false);
  };

  const handleEdit = (ann: Announcement) => {
      setEditingId(ann.id);
      setContent(ann.content);
      setLinks(ann.links || []);
      setExistingImages(ann.images || []);
      setExistingAttachments(ann.attachments || []);
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'IMAGE' | 'PDF') => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (type === 'IMAGE') setImages([...images, file]);
      else setAttachments([...attachments, file]);
    }
  };

  const uploadFileToSupabase = async (file: File, bucket: string) => {
    try {
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const fileName = `${user.classLevel}/${Date.now()}_${sanitizedName}`;
        const { data, error } = await supabase.storage.from(bucket).upload(fileName, file);
        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(fileName);
        return publicUrl;
    } catch (error) {
        console.error("File upload failed:", error);
        return null;
    }
  };

  const handlePublish = async () => {
    if (!content.trim()) return;
    setIsSubmitting(true);

    try {
        const newImageUrls = await Promise.all(images.map(img => uploadFileToSupabase(img, 'images')));
        const newAttachmentData = await Promise.all(attachments.map(async file => {
            const url = await uploadFileToSupabase(file, 'files');
            return url ? { name: file.name, type: 'PDF' as const, url } : null;
        }));

        const finalImages = [...existingImages, ...(newImageUrls.filter(url => url !== null) as string[])];
        const finalAttachments = [...existingAttachments, ...(newAttachmentData.filter(a => a !== null) as any[])];
        const finalClass = user.role === UserRole.ADMIN ? targetClass : user.classLevel;

        const payload = {
            author_id: user.id,
            author_name: user.name,
            class_level: finalClass,
            content,
            links: links,
            images: finalImages,
            attachments: finalAttachments,
            ...(editingId ? {} : { date: new Date().toISOString() }) 
        };

        let data, error;
        if (editingId) {
            const res = await supabase.from('announcements').update(payload).eq('id', editingId).select().single();
            data = res.data; error = res.error;
        } else {
            const res = await supabase.from('announcements').insert(payload).select().single();
            data = res.data; error = res.error;
        }

        if (error) throw error;

        const formattedAnn: Announcement = {
            id: data.id,
            authorId: data.author_id,
            authorName: data.author_name,
            classLevel: data.class_level,
            content: data.content,
            date: data.date,
            links: data.links,
            images: data.images,
            attachments: data.attachments
        };

        if (editingId) updateAnnouncement(formattedAnn);
        else addAnnouncement(formattedAnn);

        resetForm();
    } catch (error: any) {
        console.error("Error publishing:", error);
        alert(`Erreur lors de la publication : ${error.message}`);
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (deleteConfirmId === id) {
      const { error } = await supabase.from('announcements').delete().eq('id', id);
      if (!error) deleteAnnouncement(id);
      setDeleteConfirmId(null);
    } else {
      setDeleteConfirmId(id);
      setTimeout(() => setDeleteConfirmId(null), 3000);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const shareViaEmail = (ann: Announcement) => {
    const classEmail = ann.classLevel.toLowerCase().replace(/[^a-z0-9]/g, '.') + '@janghub.sn';
    const subject = `Annonce ${ann.classLevel} - JàngHub`;
    const body = `${ann.content}\n\nLien: ${window.location.href}`;
    window.location.href = `mailto:${classEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
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

  const hasRights = (ann: Announcement) => {
    if (user.role === UserRole.ADMIN) return true;
    if (user.role === UserRole.RESPONSIBLE && ann.classLevel === user.classLevel) return true;
    return user.id === ann.authorId;
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

            <textarea
              className="w-full p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-university/20 dark:focus:ring-sky-500/20 focus:border-university dark:focus:border-sky-500 transition-all outline-none resize-none text-slate-700 dark:text-white min-h-[160px] placeholder:text-slate-400 text-sm leading-relaxed"
              placeholder={user.role === UserRole.ADMIN ? "Message de l'administration..." : "Information pour la classe..."}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
            
            {(links.length > 0 || images.length > 0 || attachments.length > 0 || existingImages.length > 0 || existingAttachments.length > 0) && (
              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                {links.map((l, i) => (
                  <span key={i} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium border border-slate-200 dark:border-slate-700">
                    {getLinkIcon(l.type)} {l.title}
                    <button onClick={() => setLinks(links.filter((_, idx) => idx !== i))} className="hover:text-alert"><X size={14} /></button>
                  </span>
                ))}
                
                {[...existingImages, ...images].map((img, i) => (
                  <span key={`img-${i}`} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium border border-slate-200 dark:border-slate-700">
                    <ImageIcon size={14} /> Image {i+1}
                    <button onClick={() => i < existingImages.length ? setExistingImages(existingImages.filter((_, idx) => idx !== i)) : setImages(images.filter((_, idx) => idx !== i - existingImages.length))} className="hover:text-alert"><X size={14} /></button>
                  </span>
                ))}

                {[...existingAttachments, ...attachments].map((att, i) => (
                  <span key={`att-${i}`} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium border border-slate-200 dark:border-slate-700">
                    <File size={14} /> {att.name}
                    <button onClick={() => i < existingAttachments.length ? setExistingAttachments(existingAttachments.filter((_, idx) => idx !== i)) : setAttachments(attachments.filter((_, idx) => idx !== i - existingAttachments.length))} className="hover:text-alert"><X size={14} /></button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 border-t border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-4 justify-between items-center">
             <div className="flex gap-2 w-full md:w-auto">
                <div className="relative">
                   <button 
                     onClick={() => setShowLinkInput(!showLinkInput)}
                     className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 text-xs font-bold border ${showLinkInput ? 'bg-university/10 dark:bg-sky-500/10 text-university dark:text-sky-400 border-university/20 dark:border-sky-500/20' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
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

                <label className="px-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer flex items-center gap-2 text-xs font-bold">
                   <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'IMAGE')} />
                   <ImageIcon size={16} /> Photo
                </label>

                <label className="px-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer flex items-center gap-2 text-xs font-bold">
                   <input type="file" accept=".pdf" className="hidden" onChange={(e) => handleFileUpload(e, 'PDF')} />
                   <FileText size={16} /> PDF
                </label>
             </div>

             <div className="flex gap-2 w-full md:w-auto justify-end">
                <button onClick={resetForm} className="px-5 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-bold text-xs transition-colors border border-transparent">
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
                                    className={`p-2 rounded-lg transition-all flex items-center gap-2 text-xs font-bold ${deleteConfirmId === ann.id ? 'bg-alert text-white' : 'text-slate-400 hover:text-alert hover:bg-alert-light dark:hover:bg-alert/10'}`}
                                >
                                    {deleteConfirmId === ann.id ? <><AlertOctagon size={14} /> Confirmer</> : <Trash2 size={16} />}
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

                {ann.attachments && ann.attachments.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                        {ann.attachments.map((file, i) => (
                            <div key={i} className="flex items-center gap-3 p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-800/80 transition-colors">
                                <div className="text-slate-500 dark:text-slate-400"><FileText size={20} /></div>
                                <div className="flex-1 overflow-hidden">
                                    <p className="font-bold text-slate-700 dark:text-slate-200 truncate text-xs">{file.name}</p>
                                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{file.type}</p>
                                </div>
                                <a href={file.url} target="_blank" rel="noreferrer" className="text-university dark:text-sky-400 font-bold text-xs hover:underline px-2">Télécharger</a>
                            </div>
                        ))}
                    </div>
                )}

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

             <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between rounded-b-xl">
                <div className="flex gap-3">
                    <button 
                      onClick={() => copyToClipboard(ann.content, ann.id)}
                      className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-success hover:bg-success-light dark:hover:bg-success/10 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border border-transparent hover:border-success/20"
                    >
                       {copiedId === ann.id ? <Check size={14} /> : <Copy size={14} />}
                       {copiedId === ann.id ? 'Copié' : 'Copier'}
                    </button>
                    <button 
                      onClick={() => shareViaEmail(ann)}
                      className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-university dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/20 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border border-transparent hover:border-sky-200 dark:hover:border-sky-800"
                    >
                       <Share2 size={14} /> Partager
                    </button>
                </div>
             </div>
          </div>
        ))}

        {announcements.length === 0 && !isCreating && (
          <div className="text-center py-16 px-6 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
             <div className="bg-slate-50 dark:bg-slate-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700">
                <MessageCircle size={24} />
             </div>
             <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-1">Aucune annonce</h3>
             <p className="text-slate-500 dark:text-slate-400 text-sm">Le fil d'actualité est vide pour le moment.</p>
          </div>
        )}
      </div>
    </div>
  );
};