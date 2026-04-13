import React, { useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../context/AuthContext';

export const NotificationListener: React.FC = () => {
 const { user } = useAuth();

 useEffect(() => {
 if (!user?.id) return;

 // Listen for the most recent notification
 const q = query(
 collection(db, 'notifications'),
 where('userId', '==', user.id),
 orderBy('createdAt', 'desc'),
 limit(1)
 );

 let isFirstRun = true;

 const unsubscribe = onSnapshot(q, (snapshot) => {
 // Skip the first run to avoid notifying about old notifications on page load
 if (isFirstRun) {
 isFirstRun = false;
 return;
 }

 if (!snapshot.empty) {
 const notif = snapshot.docs[0].data();
 
 // Handle different date formats (ISO string or Firestore Timestamp)
 let createdAtMs = 0;
 if (notif.createdAt) {
 if (typeof notif.createdAt === 'string') {
 createdAtMs = new Date(notif.createdAt).getTime();
 } else if (typeof notif.createdAt === 'object' && 'seconds' in notif.createdAt) {
 // Firestore Timestamp
 createdAtMs = (notif.createdAt as any).seconds * 1000;
 }
 }

 const now = new Date().getTime();
 
 // Only notify if it's unread and recently created (within last 10 seconds)
 if (!notif.isRead && (now - createdAtMs) < 10000) {
 if ('Notification' in window && Notification.permission === 'granted') {
 new Notification(notif.title || 'Nouvelle notification', {
 body: notif.message,
 icon: '/favicon.ico' // Or a generic icon
 });
 }
 }
 }
 });

 return () => unsubscribe();
 }, [user?.id]);

 return null; // This component doesn't render anything
};
