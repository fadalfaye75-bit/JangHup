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
  deleteAnnouncement: (id: string) => void;
}

export const Announcements: React.FC<AnnouncementsProps> = ({ user, announcements, addAnnouncement, deleteAnnouncement }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Creation Form State
  const [content, setContent] = useState('');
  const [targetClass, setTargetClass] = useState(user.classLevel); // New for Admin
  const [links, setLinks] = useState<{ title: string; url: string; type: 'MEET' | 'FORMS' | 'DRIVE' | 'OTHER' }[]>([]);
  const [images, setImages] = useState<File[]>([]); 
  const [attachments, setAttachments] = useState<File[]>([]);
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
    setTargetClass(user.classLevel);
    setIsCreating(false);
    setShowLinkInput(false);
    setIsSubmitting(false);
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
    const fileName = `${user.classLevel}/${Date.now()}_${file.name}`;
    const { data, error } = await supabase.storage.from(bucket).upload(fileName, file);
    if (error) {
        console.error('Upload error:', error);
        return null;
    }
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(fileName);
    return publicUrl;
  };

  const handlePublish = async () => {
    if (!content.trim()) return;
    setIsSubmitting(true);

    try {
        // Upload Images
        const imageUrls = await Promise.all(images.map(img => uploadFileToSupabase(img, 'images')));
        
        // Upload Attachments
        const attachmentData = await Promise.all(attachments.map(async file => {
            const url = await uploadFileToSupabase(file, 'files');
            return url ? { name: file.name, type: 'PDF' as const, url } : null;
        }));

        const validImages = imageUrls.filter(url => url !== null) as string[];
        const validAttachments = attachmentData.filter(a => a !== null) as any[];

        // Use targetClass if Admin, otherwise user.classLevel
        const finalClass = user.role === UserRole.ADMIN ? targetClass : user.classLevel;

        const newAnn = {
            author_id: user.id,
            author_name: user.name,
            class_level: finalClass,
            content,
            date: new Date().toISOString(),
            links: links,
            images: validImages,
            attachments: validAttachments
        };

        const { data, error } = await supabase.from('announcements').insert(newAnn).select().single();

        if (error) throw error;

        // Map back to frontend type
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

        addAnnouncement(formattedAnn);
        resetForm();
    } catch (error) {
        console.error("Error publishing:", error);
        alert("Erreur lors de la publication. Vérifiez votre connexion.");
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
    const body = `${ann.content}\n\nLien JàngHub: ${window.location.href}`;
    window.location.href = `mailto:${classEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const getLinkIcon = (type: string) => {
    switch (type) {
      case 'MEET': return <Video size={18} />;
      case 'FORMS': return <FileText size={18} />;
      case 'DRIVE': return <HardDrive size={18} />;
      default: return <LinkIcon size={18} />;
    }
  };

  const getLinkColor = (type: string) => {
    switch (type) {
      case 'MEET': return 'bg-emerald-500 hover:bg-emerald-600 border-emerald-200 text-white shadow-emerald-200/50';
      case 'FORMS': return 'bg-purple-500 hover:bg-purple-600 border-purple-200 text-white shadow-purple-200/50';
      case 'DRIVE': return 'bg-blue-500 hover:bg-blue-600 border-blue-200 text-white shadow-blue-200/50';
      default: return 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700';
    }
  };

  // Logic for rights: Admin OR (Responsible AND Same Class) OR Author
  const hasRights = (ann: Announcement) => {
    if (user.role === UserRole.ADMIN) return true;
    if (user.role === UserRole.RESPONSIBLE && ann.classLevel === user.classLevel) return true;
    return user.id === ann.authorId;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <div className="flex items-center gap-3">
               <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Fil d'actualité</h2>
               <span className="bg-brand/10 text-brand text-xs font-bold px-3 py-1 rounded-full border border-brand/20 flex items-center gap-1">
                 <Users size={12} /> {user.role === UserRole.ADMIN ? 'Vue Admin' : user.classLevel}
               </span>
           </div>
           <p className="text-slate-500 font-medium mt-1">Informations et communications.</p>
        </div>
        {canCreate && !isCreating && (
          <button 
            onClick={() => setIsCreating(true)}
            className="bg-brand hover:bg-sky-400 text-white px-8 py-3.5 rounded-2xl font-bold shadow-lg shadow-sky-200 transition-all flex items-center gap-2 transform hover:-translate-y-0.5 active:scale-95"
          >
            <Plus size={22} /> Nouvelle Annonce
          </button>
        )}
      </div>

      {/* Creation Form */}
      {isCreating && (
        <div className="bg-white rounded-[2.5rem] shadow-xl border border-sky-100 overflow-hidden ring-4 ring-sky-50">
          <div className="p-8">
            <h3 className="text-lg font-bold text-slate-700 mb-4">Rédiger un message</h3>
            
            {/* Admin Class Selector */}
            {user.role === UserRole.ADMIN && (
                <div className="mb-4 relative">
                    <School className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        type="text" 
                        value={targetClass} 
                        onChange={(e) => setTargetClass(e.target.value)}
                        placeholder="Classe cible (ex: Tle S2)"
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border-0 rounded-2xl outline-none font-medium focus:ring-2 focus:ring-brand"
                    />
                    <p className="text-xs text-slate-400 mt-1 pl-1">L'annonce sera visible uniquement par cette classe.</p>
                </div>
            )}

            <textarea
              className="w-full p-5 bg-slate-50 border-0 rounded-3xl focus:ring-4 focus:ring-brand/20 focus:bg-white transition-all outline-none resize-none text-slate-700 min-h-[160px] placeholder:text-slate-400 text-base leading-relaxed"
              placeholder={user.role === UserRole.ADMIN ? "Message de l'administration..." : "Quoi de neuf pour la classe ?"}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
            
            {/* Added Items Chips */}
            {(links.length > 0 || images.length > 0 || attachments.length > 0) && (
              <div className="flex flex-wrap gap-2 mt-6">
                {links.map((l, i) => (
                  <span key={i} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-50 text-sky-700 text-sm font-bold border border-sky-100">
                    {getLinkIcon(l.type)} {l.title}
                    <button onClick={() => setLinks(links.filter((_, idx) => idx !== i))}><X size={16} /></button>
                  </span>
                ))}
                {images.map((img, i) => (
                  <span key={i} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-50 text-purple-700 text-sm font-bold border border-purple-100">
                    <ImageIcon size={16} /> {img.name}
                    <button onClick={() => setImages(images.filter((_, idx) => idx !== i))}><X size={16} /></button>
                  </span>
                ))}
                {attachments.map((a, i) => (
                  <span key={i} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-50 text-orange-700 text-sm font-bold border border-orange-100">
                    <File size={16} /> {a.name}
                    <button onClick={() => setAttachments(attachments.filter((_, idx) => idx !== i))}><X size={16} /></button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Form Actions Toolbar */}
          <div className="bg-slate-50/50 p-5 border-t border-slate-100 flex flex-col md:flex-row gap-4 justify-between items-center">
             <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                {/* Add Link */}
                <div className="relative">
                   <button 
                     onClick={() => setShowLinkInput(!showLinkInput)}
                     className={`px-5 py-2.5 rounded-2xl transition-colors flex items-center gap-2 text-sm font-bold ${showLinkInput ? 'bg-sky-100 text-sky-700' : 'bg-white text-slate-600 hover:bg-white border border-slate-200/50'}`}
                   >
                      <LinkIcon size={18} /> Lien
                   </button>
                   {showLinkInput && (
                     <div className="absolute bottom-full left-0 mb-3 w-80 bg-white p-5 rounded-3xl shadow-xl border border-slate-100 z-10 animate-in fade-in slide-in-from-bottom-2">
                        <input 
                          placeholder="Titre (ex: Cours de Maths)" 
                          className="w-full mb-3 p-3 bg-slate-50 border-0 rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand outline-none"
                          value={linkTitle} onChange={e => setLinkTitle(e.target.value)}
                        />
                        <input 
                          placeholder="URL (https://...)" 
                          className="w-full mb-3 p-3 bg-slate-50 border-0 rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand outline-none"
                          value={linkUrl} onChange={e => setLinkUrl(e.target.value)}
                        />
                        <div className="flex gap-2 mb-3">
                           {['MEET', 'FORMS', 'DRIVE', 'OTHER'].map(t => (
                              <button 
                                key={t} 
                                onClick={() => setLinkType(t as any)}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${linkType === t ? 'bg-brand text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                              >
                                {t === 'OTHER' ? 'Autre' : t}
                              </button>
                           ))}
                        </div>
                        <button onClick={handleAddLink} className="w-full bg-slate-800 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-slate-900 transition-colors">Ajouter</button>
                     </div>
                   )}
                </div>

                {/* Upload Image */}
                <label className="px-5 py-2.5 rounded-2xl bg-white border border-slate-200/50 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer flex items-center gap-2 text-sm font-bold">
                   <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'IMAGE')} />
                   <ImageIcon size={18} /> Photo
                </label>

                {/* Upload Doc */}
                <label className="px-5 py-2.5 rounded-2xl bg-white border border-slate-200/50 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer flex items-center gap-2 text-sm font-bold">
                   <input type="file" accept=".pdf" className="hidden" onChange={(e) => handleFileUpload(e, 'PDF')} />
                   <FileText size={18} /> PDF
                </label>
             </div>

             <div className="flex gap-3 w-full md:w-auto justify-end">
                <button onClick={resetForm} className="px-6 py-3 text-slate-500 hover:bg-slate-200/50 rounded-2xl font-bold text-sm transition-colors">
                  Annuler
                </button>
                <button 
                  onClick={handlePublish}
                  disabled={isSubmitting}
                  className="px-8 py-3 bg-brand hover:bg-sky-400 text-white rounded-2xl font-bold shadow-md shadow-sky-200 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                   {isSubmitting ? <Loader2 className="animate-spin" size={20}/> : <><Check size={20} /> Publier</>}
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Announcements List */}
      <div className="space-y-8">
        {announcements.map(ann => (
          <div key={ann.id} className="bg-white rounded-[2.5rem] p-8 shadow-soft border border-white hover:shadow-lg hover:border-brand/20 transition-all">
             {/* Header */}
             <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                   <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold text-white shadow-lg
                        ${ann.authorName.includes('Admin') ? 'bg-indigo-500 shadow-indigo-200' : 'bg-brand shadow-sky-200'}`}
                   >
                        {ann.authorName.charAt(0)}
                   </div>
                   <div>
                      <h3 className="font-bold text-slate-800 text-lg">{ann.authorName}</h3>
                      <div className="flex gap-2 items-center">
                          <p className="text-sm text-slate-400 font-medium">
                            {new Date(ann.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute:'2-digit' })}
                          </p>
                          {/* Show class tag for admin viewing all */}
                          {user.role === UserRole.ADMIN && (
                              <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-lg border border-slate-200">
                                {ann.classLevel}
                              </span>
                          )}
                      </div>
                   </div>
                </div>
                
                {/* Actions */}
                <div className="flex gap-2">
                   {hasRights(ann) && (
                       <>
                          <button className="p-3 text-action-edit bg-sky-50 hover:bg-sky-100 rounded-2xl transition-colors" title="Modifier">
                             <Edit2 size={20} />
                          </button>
                          <button 
                             onClick={() => handleDelete(ann.id)} 
                             className={`p-3 rounded-2xl transition-all duration-300 flex items-center gap-2 ${deleteConfirmId === ann.id ? 'bg-alert text-white w-32 justify-center' : 'text-alert bg-red-50 hover:bg-red-100'}`}
                             title="Supprimer"
                          >
                             {deleteConfirmId === ann.id ? (
                               <> <AlertOctagon size={20} /> Sûr ? </>
                             ) : (
                               <Trash2 size={20} />
                             )}
                          </button>
                       </>
                   )}
                </div>
             </div>

             {/* Content */}
             <div className="prose prose-slate max-w-none mb-8">
               <p className="whitespace-pre-wrap text-slate-600 leading-relaxed text-base">{ann.content}</p>
             </div>

             {/* Links Section */}
             {ann.links && ann.links.length > 0 && (
                <div className="flex flex-wrap gap-3 mb-8">
                   {ann.links.map((link, i) => (
                      <a 
                        key={i} 
                        href={link.url} 
                        target="_blank" 
                        rel="noreferrer"
                        className={`flex items-center gap-3 px-6 py-4 rounded-2xl font-bold text-sm transition-all shadow-md active:scale-95 ${getLinkColor(link.type)}`}
                      >
                         {getLinkIcon(link.type)}
                         <span>{link.title}</span>
                      </a>
                   ))}
                </div>
             )}

             {/* Documents (PDF) */}
             {ann.attachments && ann.attachments.length > 0 && (
                <div className="space-y-4 mb-8">
                   {ann.attachments.map((file, i) => (
                      <div key={i} className="flex items-center gap-4 p-4 border border-slate-100 rounded-3xl bg-slate-50 hover:bg-white hover:shadow-md transition-all group">
                         <div className="p-3 bg-white border border-slate-200 text-alert rounded-2xl shadow-sm">
                            <FileText size={24} />
                         </div>
                         <div className="flex-1 overflow-hidden">
                            <p className="font-bold text-slate-700 truncate text-sm">{file.name}</p>
                            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mt-0.5">{file.type}</p>
                         </div>
                         <a href={file.url} target="_blank" rel="noreferrer" className="text-brand font-bold text-sm hover:underline px-4 group-hover:text-sky-600">Voir</a>
                      </div>
                   ))}
                </div>
             )}

             {/* Image Gallery */}
             {ann.images && ann.images.length > 0 && (
                <div className={`grid gap-4 mb-8 ${ann.images.length === 1 ? 'grid-cols-1' : 'grid-cols-2 md:grid-cols-3'}`}>
                    {ann.images.map((img, i) => (
                        <div key={i} className="relative aspect-video rounded-3xl overflow-hidden bg-slate-100 shadow-sm group">
                            <img src={img} alt="Attachment" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>
                        </div>
                    ))}
                </div>
             )}

             {/* Footer Actions */}
             <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                <div className="flex gap-4">
                    <button 
                      onClick={() => copyToClipboard(ann.content, ann.id)}
                      className="flex items-center gap-2 text-action-copy hover:bg-green-50 px-4 py-2 rounded-xl text-xs font-bold transition-all uppercase tracking-wide"
                    >
                       {copiedId === ann.id ? <Check size={16} /> : <Copy size={16} />}
                       {copiedId === ann.id ? 'Copié !' : 'Copier'}
                    </button>
                    <button 
                      onClick={() => shareViaEmail(ann)}
                      className="flex items-center gap-2 text-action-share hover:bg-blue-50 px-4 py-2 rounded-xl text-xs font-bold transition-all uppercase tracking-wide"
                    >
                       <Share2 size={16} /> Partager
                    </button>
                </div>
                <button className="text-slate-400 hover:text-brand text-xs font-bold flex items-center gap-2 transition-colors">
                   <Mail size={16} /> Contacter l'auteur
                </button>
             </div>
          </div>
        ))}

        {announcements.length === 0 && !isCreating && (
          <div className="text-center py-20 px-6">
             <div className="bg-sky-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                <MessageCircle size={40} className="text-brand opacity-50" />
             </div>
             <h3 className="text-2xl font-bold text-slate-800 mb-2">Aucune annonce</h3>
             <p className="text-slate-500 font-medium">Il n'y a rien de nouveau pour la classe.</p>
          </div>
        )}
      </div>
    </div>
  );
};