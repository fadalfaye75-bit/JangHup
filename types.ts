export enum UserRole {
  ADMIN = 'ADMIN',
  DELEGATE = 'DELEGATE',
  STUDENT = 'STUDENT'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  className: string;
  avatar?: string;
  schoolName: string;
  isActive: boolean;
  passwordChanged: boolean;
  theme?: 'light' | 'dark';
  createdAt: string;
  updatedAt: string;
}

export interface SchoolClass {
  id: string;
  name: string;
  email: string;
  studentCount: number;
  color: string;
  delegateCode: string;
  createdAt: string;
}

export interface Announcement {
  id: string;
  userId: string;
  title: string;
  content: string;
  author: string;
  priority: 'normal' | 'important' | 'urgent';
  className: string;
  color: string;
  link?: string;
  isPinned?: boolean;
  createdAt: string;
}

export interface AnnouncementReadStatus {
  id: string;
  announcementId: string;
  userId: string;
  readAt: string;
}

export interface Exam {
  id: string;
  userId: string;
  subject: string;
  date: string;
  duration: string;
  room: string;
  notes?: string;
  className: string;
  createdAt: string;
}

export interface MeetLink {
  id: string;
  userId: string;
  title: string;
  platform: 'Google Meet' | 'Zoom' | 'Teams' | 'Autre';
  url: string;
  time: string;
  className: string;
  createdAt: string;
}

export interface PollOption {
  id: string;
  pollId: string;
  label: string;
  votes: number;
}

export interface Poll {
  id: string;
  userId: string;
  question: string;
  className: string;
  isActive: boolean;
  totalVotes: number;
  createdAt: string;
  options?: PollOption[];
  userVoteOptionId?: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'danger' | 'reply' | 'mention';
  isRead: boolean;
  link?: string;
  createdAt: string;
}

export interface PollVote {
  id: string;
  pollId: string;
  optionId: string;
  userId: string;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  actor: string;
  action: string;
  target: string;
  type: string;
  createdAt: string;
}

export interface Resource {
  id: string;
  title: string;
  description: string;
  type: 'pdf' | 'link' | 'video' | 'image' | 'doc';
  url: string;
  userId: string;
  author: string;
  className: string;
  subject: string;
  createdAt: string;
}

export interface Post {
  id: string;
  title: string;
  content: string;
  userId: string;
  authorName: string;
  className: string;
  votesScore: number;
  commentsCount: number;
  createdAt: string;
  updatedAt?: string;
}

export interface Comment {
  id: string;
  postId: string;
  parentId: string | null;
  userId: string;
  authorName: string;
  content: string;
  votesScore: number;
  createdAt: string;
}

export interface Vote {
  id: string;
  userId: string;
  targetId: string; // post or comment id
  type: 'up' | 'down';
}

export type ViewState = 'DASHBOARD' | 'ANNOUNCEMENTS' | 'EXAMS' | 'MEETINGS' | 'POLLS' | 'NOTIFICATIONS' | 'PROFILE' | 'ADMIN' | 'FORUM';
