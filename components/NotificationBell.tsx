import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { collection, query, where, onSnapshot, limit, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../lib/AuthContext';
import { Notification } from '../types';
import { motion, AnimatePresence } from 'motion/react';

export const NotificationBell: React.FC = () => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!user?.id) return;

    // Optimize: Limit to 20 most recent notifications to avoid massive reads
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.id),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.isRead).length);
    });

    return () => unsubscribe();
  }, [user?.id]);

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:scale-110 transition-all"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-danger rounded-full border-2 border-white dark:border-slate-800" />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 z-50 overflow-hidden"
            >
              <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                <h3 className="font-bold text-slate-800 dark:text-white">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-1 rounded-lg">
                    {unreadCount} non lues
                  </span>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto p-2">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-slate-500 text-sm">
                    Aucune notification
                  </div>
                ) : (
                  notifications.slice(0, 5).map(notif => (
                    <Link 
                      key={notif.id}
                      to="/notifications"
                      onClick={() => setIsOpen(false)}
                      className={`block p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${!notif.isRead ? 'bg-primary/5' : ''}`}
                    >
                      <p className={`text-sm ${!notif.isRead ? 'font-bold text-slate-800 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                        {notif.title}
                      </p>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-1">{notif.message}</p>
                    </Link>
                  ))
                )}
              </div>
              <div className="p-3 border-t border-slate-100 dark:border-slate-700 text-center">
                <Link 
                  to="/notifications" 
                  onClick={() => setIsOpen(false)}
                  className="text-sm font-bold text-primary hover:underline"
                >
                  Voir toutes les notifications
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
