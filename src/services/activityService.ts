import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { User } from '../types';

export const activityService = {
  async logActivity(user: User, action: string, target: string, type: string, details?: string) {
    try {
      await addDoc(collection(db, 'activity_logs'), {
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        userAvatar: user.avatar || null,
        action,
        target,
        type,
        details: details || null,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.error("Error logging activity:", err);
    }
  }
};
