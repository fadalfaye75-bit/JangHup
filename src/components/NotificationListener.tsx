import React, { useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

export const NotificationListener: React.FC = () => {
 const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;

    // Listen for recent unread notifications
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.id),
      where('isRead', '==', false),
      orderBy('createdAt', 'desc'),
      limit(5)
    );

    let isFirstRun = true;

    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Skip the first run to avoid notifying about old notifications on page load
      if (isFirstRun) {
        isFirstRun = false;
        return;
      }

      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const notif = change.doc.data();
          
          // Handle different date formats
          let createdAtMs = 0;
          try {
            if (notif.createdAt) {
              if (typeof notif.createdAt === 'string') {
                createdAtMs = new Date(notif.createdAt).getTime();
              } else if (typeof notif.createdAt === 'object' && notif.createdAt !== null && 'seconds' in notif.createdAt) {
                createdAtMs = (notif.createdAt as any).seconds * 1000;
              } else {
                // Fallback to now if format is unknown but field exists
                createdAtMs = Date.now();
              }
            } else {
              // Fallback to now if field is missing
              createdAtMs = Date.now();
            }
          } catch (e) {
            createdAtMs = Date.now();
          }

          const now = new Date().getTime();
          
          // Only notify if it's recently created (within last 30 seconds)
          if ((now - createdAtMs) < 30000) {
            if ('Notification' in window && Notification.permission === 'granted') {
              // Use service worker registration if available for better support
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.ready.then(registration => {
                  registration.showNotification(notif.title || 'Nouvelle notification', {
                    body: notif.message,
                    icon: '/favicon.ico',
                    badge: '/favicon.ico',
                    data: { url: notif.link || '/notifications' }
                  });
                });
              } else {
                new Notification(notif.title || 'Nouvelle notification', {
                  body: notif.message,
                  icon: '/favicon.ico'
                });
              }
            }
          }
        }
      });
    }, (error) => {
      console.error("🔥 Firestore Notification Listener Error:", error);
    });

    return () => unsubscribe();
  }, [user?.id]);

 return null; // This component doesn't render anything
};
