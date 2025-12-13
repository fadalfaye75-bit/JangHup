
export enum UserRole {
  ADMIN = 'ADMIN',
  RESPONSIBLE = 'RESPONSIBLE', // Prof / Délégué
  STUDENT = 'STUDENT'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  classLevel: string; // ex: '2nde S', 'Tle L', '1ere S2'
  avatar?: string;
}

export interface SchoolClass {
  id: string;
  name: string; // ex: "Tle S2"
  email: string; // ex: "tle.s2@janghub.sn"
  delegateId?: string; // ID du responsable
  delegateName?: string;
  studentCount: number;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  actorName: string;
  actorRole: UserRole;
  action: string; // ex: "CREATE_ANNOUNCEMENT"
  targetClass: string;
  details: string;
  timestamp: string;
}

export interface Announcement {
  id: string;
  authorId: string;
  authorName: string;
  classLevel: string;
  content: string;
  date: string; // ISO String
  links?: { title: string; url: string; type: 'MEET' | 'FORMS' | 'DRIVE' | 'OTHER' }[];
  attachments?: { name: string; type: 'PDF' | 'IMAGE' | 'EXCEL'; url: string }[];
  images?: string[];
}

export interface Exam {
  id: string;
  subject: string;
  classLevel: string;
  date: string; // ISO String
  duration: string;
  room: string;
  notes?: string;
  authorId: string;
}

export interface ScheduleItem {
  id: string;
  title: string;
  classLevel: string;
  semester: string;   // e.g. 'Semestre 1', 'Semestre 2'
  url: string; 
  uploadedAt: string;
  version: number;
}

export interface PollOption {
  id: string;
  text: string;
  votes: number;
}

export interface Poll {
  id: string;
  question: string;
  classLevel: string;
  options: PollOption[];
  authorId: string;
  active: boolean;
  totalVotes: number;
}

export interface Meeting {
  id: string;
  title: string;
  classLevel: string;
  date: string; // ISO date string YYYY-MM-DD
  time: string;
  link: string;
  platform: 'Google Meet' | 'Zoom' | 'Teams' | 'Autre';
  authorId: string;
  authorName: string;
}

export interface ForumReply {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export interface ForumPost {
  id: string;
  categoryId: string;
  authorId: string;
  authorName: string;
  title: string;
  content: string;
  createdAt: string;
  views: number;
  replies: ForumReply[];
}

export interface ForumCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export type ViewState = 'HOME' | 'ANNOUNCEMENTS' | 'SCHEDULE' | 'EXAMS' | 'POLLS' | 'MEET' | 'ADMIN' | 'PROFILE' | 'FORUM';