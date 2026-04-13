import { collection, query, where, getDocs, writeBatch, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { Notification as AppNotification } from '../../types';

export const notificationService = {
  /**
   * Send a notification to all students in a specific class
   */
  async notifyClass(className: string, title: string, message: string, type: AppNotification['type'] = 'info', link?: string) {
    try {
      // 1. Get all students in the class
      const usersRef = collection(db, 'users_public');
      const q = query(usersRef, where('class_name', '==', className));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) return;

      // 2. Create notifications in a batch
      const batch = writeBatch(db);
      
      querySnapshot.docs.forEach(userDoc => {
        const notifRef = doc(collection(db, 'notifications'));
        const notificationData: any = {
          userId: userDoc.id,
          title,
          message,
          type,
          isRead: false,
          createdAt: new Date().toISOString()
        };
        
        if (link !== undefined) {
          notificationData.link = link;
        }
        
        batch.set(notifRef, notificationData);
      });

      await batch.commit();
    } catch (err) {
      console.error("🔥 Error sending class notifications:", err);
    }
  },

  /**
   * Send a notification to a specific user
   */
  async notifyUser(userId: string, title: string, message: string, type: AppNotification['type'] = 'info', link?: string) {
    try {
      const notifRef = doc(collection(db, 'notifications'));
      const notificationData: any = {
        userId,
        title,
        message,
        type,
        isRead: false,
        createdAt: new Date().toISOString()
      };
      
      if (link !== undefined) {
        notificationData.link = link;
      }
      
      await writeBatch(db).set(notifRef, notificationData).commit();
    } catch (err) {
      console.error("🔥 Error sending user notification:", err);
    }
  },

  /**
   * Request browser notification permission
   */
  async requestPermission() {
    if (!('Notification' in window)) {
      console.log("This browser does not support desktop notification");
      return false;
    }

    if (Notification.permission === 'granted') return true;

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }
};
