import { format, isToday, isTomorrow, differenceInDays, parseISO, isValid } from 'date-fns';
import { fr } from 'date-fns/locale';

export type ShareType = 'annonce' | 'examen' | 'reunion' | 'sondage' | 'forum' | 'ressource' | 'notification';

export interface ShareData {
  title?: string;
  content?: string;
  priority?: 'normal' | 'important' | 'urgent';
  date?: string | Date;
  className?: string;
  subject?: string;
  room?: string;
  duration?: string;
  platform?: string;
  url?: string;
  author?: string;
  totalVotes?: number;
  options?: { label: string; votes: number }[];
  description?: string;
  classEmail?: string;
}

const getSmartDate = (dateInput?: string | Date): string | null => {
  if (!dateInput) return null;
  const date = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
  if (!isValid(date)) return null;

  if (isToday(date)) return "Aujourd'hui";
  if (isTomorrow(date)) return "Demain";
  
  const diff = differenceInDays(date, new Date());
  if (diff > 0 && diff < 7) return `Dans ${diff} jours`;
  if (diff < 0) return null; // Ignore past dates

  return format(date, 'eeee d MMMM', { locale: fr });
};

const summarize = (text?: string, maxLen: number = 100): string => {
  if (!text) return "";
  if (text.length <= maxLen) return text;
  return text.substring(0, maxLen).trim() + "...";
};

export const generateSmartShare = (type: ShareType, data: ShareData) => {
  const smartDate = getSmartDate(data.date);
  const summary = summarize(data.content || data.description || "", 80);
  
  let emoji = "📢";
  let cta = "Consulte l’annonce";
  let intro = "Une nouvelle annonce a été publiée.";
  let contextMessage = "";

  // Priority adaptation
  if (data.priority === 'urgent') {
    emoji = "⚠️";
    contextMessage = "Action immédiate requise !";
  } else if (data.priority === 'important') {
    emoji = "🔔";
  }

  // Type specific logic
  switch (type) {
    case 'examen':
      emoji = data.priority === 'urgent' ? "⚠️" : "📝";
      cta = "Prépare-toi dès maintenant";
      intro = "Un nouvel examen a été programmé.";
      if (smartDate && smartDate.includes("Dans")) emoji = "⏳";
      break;
    case 'reunion':
      emoji = "🎥";
      cta = "Rejoins la réunion";
      intro = "Une réunion a été organisée.";
      break;
    case 'sondage':
      emoji = "📊";
      cta = "Donne ton avis";
      intro = "Ton avis compte ! Un nouveau sondage est disponible.";
      break;
    case 'forum':
      emoji = "💬";
      cta = "Participe à la discussion";
      intro = "Une nouvelle discussion s'anime sur le forum.";
      break;
    case 'ressource':
      emoji = "📚";
      cta = "Accède au contenu";
      intro = "Une nouvelle ressource pédagogique est disponible.";
      break;
    case 'notification':
      emoji = "🔔";
      cta = "Voir le détail";
      intro = "Tu as reçu une nouvelle notification.";
      break;
  }

  const title = data.title || data.subject || "Nouveau contenu";
  const displayTitle = data.priority === 'urgent' ? `[URGENT] ${title}` : title;

  // WhatsApp Format
  const waLines = [
    `*${summarize(displayTitle.toUpperCase(), 50)}*`,
    "",
    summary ? `_Note : ${summary}_` : null,
    smartDate ? `- *Date* : ${smartDate}` : null,
    data.room ? `- *Salle* : ${data.room}` : null,
    data.subject && type !== 'examen' ? `- *Matière* : ${data.subject}` : null,
    data.className ? `- *Classe* : ${data.className}` : null,
    data.platform ? `- *Plateforme* : ${data.platform}` : null,
  ];

  if (type === 'sondage' && data.options && data.options.length > 0) {
    waLines.push("");
    waLines.push("*RÉSULTATS DU SONDAGE :*");
    data.options.forEach(opt => {
      const percentage = data.totalVotes && data.totalVotes > 0 
        ? Math.round((opt.votes / data.totalVotes) * 100) 
        : 0;
      waLines.push(`- ${opt.label} : *${opt.votes}* (${percentage}%)`);
    });
    waLines.push(`\n_Participant(s) : ${data.totalVotes || 0}_`);
  }

  waLines.push("");
  if (data.url) waLines.push(`Lien : ${data.url}`);
  waLines.push(`\n*${cta.toUpperCase()}*`);

  const whatsapp = waLines.filter(line => line !== null).join('\n').trim();

  // Email Format
  const emailSubject = `${emoji} ${displayTitle}`;
  
  const infoLines = [];
  if (data.subject || data.title) infoLines.push(`Sujet : ${data.subject || data.title}`);
  if (smartDate) infoLines.push(`Date : ${smartDate}`);
  if (data.room) infoLines.push(`Salle : ${data.room}`);
  if (data.duration) infoLines.push(`Durée : ${data.duration}`);
  if (data.platform) infoLines.push(`Plateforme : ${data.platform}`);
  if (data.url) infoLines.push(`Lien : ${data.url}`);
  if (data.className) infoLines.push(`Classe : ${data.className}`);
  if (data.classEmail) infoLines.push(`Email Classe : ${data.classEmail}`);

  const emailBody = `Bonjour,

${intro}

📌 Détails :
${infoLines.map(line => `- ${line}`).join('\n')}

${data.content || data.description || ""}

${contextMessage}

👉 Accéder sur JangHup

Cordialement,
L'équipe JangHup`;

  return {
    whatsapp,
    emailSubject,
    emailBody,
    classEmail: data.classEmail
  };
};

export const shareToWhatsApp = (whatsappText: string) => {
  window.open(`https://wa.me/?text=${encodeURIComponent(whatsappText)}`, '_blank');
};

export const shareToEmail = (subject: string, body: string, recipient: string = '') => {
  window.open(`mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
};
