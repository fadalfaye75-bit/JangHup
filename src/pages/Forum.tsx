import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useDebounce } from '../hooks/useDebounce';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  getDocs, 
  limit,
  updateDoc,
  arrayUnion,
  setDoc,
  deleteDoc,
  doc
} from 'firebase/firestore';
import { db } from '../firebase';
import { ChatMessage, ChatRoom, UserRole } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, 
  Search, 
  MoreVertical, 
  ChevronLeft, 
  User as UserIcon,
  Clock,
  Hash,
  Menu,
  MessageSquare,
  Paperclip,
  Smile,
  Sticker,
  Check,
  CheckCheck,
  X,
  Camera,
  Image as ImageIcon,
  FileText,
  UserPlus,
  CornerUpLeft,
  Info,
  Trash2,
  ChevronDown,
  CheckCircle,
  Heart,
  ThumbsUp,
  Laugh,
  Meh,
  Frown,
  Angry,
  Copy as CopyIcon
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Button, Badge, Spinner, GlassCard, Avatar } from '../components/ui';
import EmojiPicker, { Theme, EmojiStyle } from 'emoji-picker-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { notificationService } from '../services/notificationService';
import { activityService } from '../services/activityService';

import { useLongPress } from '../hooks/useLongPress';

// --- Constants ---

const STICKERS = [
  'https://cdn-icons-png.flaticon.com/512/2584/2584602.png',
  'https://cdn-icons-png.flaticon.com/512/2584/2584606.png',
  'https://cdn-icons-png.flaticon.com/512/2584/2584610.png',
  'https://cdn-icons-png.flaticon.com/512/2584/2584614.png',
  'https://cdn-icons-png.flaticon.com/512/2584/2584618.png',
  'https://cdn-icons-png.flaticon.com/512/2584/2584622.png',
  'https://cdn-icons-png.flaticon.com/512/2584/2584626.png',
  'https://cdn-icons-png.flaticon.com/512/2584/2584630.png',
  'https://cdn-icons-png.flaticon.com/512/2584/2584634.png',
  'https://cdn-icons-png.flaticon.com/512/2584/2584638.png',
  'https://cdn-icons-png.flaticon.com/512/2584/2584642.png',
  'https://cdn-icons-png.flaticon.com/512/2584/2584646.png',
];

// --- Sub-components ---

const MessageBubble = React.memo<{ 
  message: ChatMessage; 
  isMe: boolean;
  showAvatar?: boolean;
  onReply?: (msg: ChatMessage) => void;
  onDelete?: (id: string) => void;
  onReaction?: (msgId: string, emoji: string) => void;
}>(({ message, isMe, showAvatar = true, onReply, onDelete, onReaction }) => {
  const { user } = useAuth();
  const [showActions, setShowActions] = React.useState(false);
  const time = message.createdAt?.toDate ? message.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
  const isRead = message.readBy && message.readBy.length > 1; // Simplified logic

  const reactions = message.reactions || {};
  const hasReactions = Object.keys(reactions).length > 0;

  const renderText = (text: string) => {
    if (!text) return null;
    
    // Process mentions first to keep them as custom components if needed, 
    // or just let markdown handle the rest.
    // We'll use a custom component for mentions within ReactMarkdown
    
    return (
      <div className="markdown-content">
        <ReactMarkdown 
          remarkPlugins={[remarkGfm]}
          components={{
            p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
            a: ({ href, children }) => (
              <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline font-medium decoration-blue-500/30 underline-offset-2">
                {children}
              </a>
            ),
            code: ({ children }) => (
              <code className="bg-gray-100 dark:bg-gray-700/50 px-1.5 py-0.5 rounded font-mono text-[13px] text-pink-500 dark:text-pink-400">
                {children}
              </code>
            ),
            pre: ({ children }) => (
              <pre className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl font-mono text-[13px] my-3 overflow-x-auto custom-scrollbar border border-gray-200 dark:border-gray-700 shadow-inner">
                {children}
              </pre>
            ),
            strong: ({ children }) => <strong className="font-bold text-gray-900 dark:text-white">{children}</strong>,
            em: ({ children }) => <em className="italic opacity-90">{children}</em>,
            ul: ({ children }) => <ul className="list-disc ml-5 my-2 space-y-1">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal ml-5 my-2 space-y-1">{children}</ol>,
            li: ({ children }) => <li className="pl-1">{children}</li>,
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-blue-500/30 dark:border-blue-500/20 pl-4 italic my-3 text-gray-600 dark:text-gray-400 bg-blue-50/30 dark:bg-blue-900/10 py-1 rounded-r-lg">
                {children}
              </blockquote>
            ),
            h1: ({ children }) => <h1 className="text-lg font-bold mb-2 mt-4 first:mt-0">{children}</h1>,
            h2: ({ children }) => <h2 className="text-md font-bold mb-2 mt-3 first:mt-0">{children}</h2>,
            h3: ({ children }) => <h3 className="text-sm font-bold mb-1 mt-2 first:mt-0">{children}</h3>,
            // Custom mention handling
            span: ({ className, children }) => {
              if (typeof children === 'string' && children.startsWith('@')) {
                return (
                  <span className="font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded-md border border-blue-100 dark:border-blue-800/50">
                    {children}
                  </span>
                );
              }
              return <span className={className}>{children}</span>;
            }
          }}
        >
          {text.replace(/@\[(.*?)\]\((.*?)\)/g, '@$1')}
        </ReactMarkdown>
      </div>
    );
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    // Could add a toast here if available
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={cn(
        "flex w-full mb-1 group relative",
        isMe ? "justify-end" : "justify-start",
        showAvatar ? "mt-5" : "mt-1"
      )}
    >
      <div className={cn(
        "flex max-w-[95%] md:max-w-[90%] items-end gap-2",
        isMe ? "flex-row-reverse" : "flex-row"
      )}>
        {!isMe && (
          <div className="w-8 shrink-0">
            {showAvatar && (
              <Avatar 
                src={message.userAvatar} 
                name={message.userName} 
                size="sm" 
              />
            )}
          </div>
        )}
        
        <div className={cn(
          "flex flex-col relative",
          isMe ? "items-end" : "items-start"
        )}>
          {!isMe && showAvatar && (
            <span className="text-[11px] font-medium text-gray-500 mb-1 ml-2">
              {message.userName}
            </span>
          )}
          
          <motion.div 
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.1}
            whileTap={{ scale: 0.98 }}
            onDragEnd={(e, { offset }) => {
              if (Math.abs(offset.x) > 60 && onReply) {
                onReply(message);
              }
            }}
            onClick={() => setShowActions(!showActions)}
            className={cn(
            "px-4 py-3 rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.05)] relative group/bubble transition-all cursor-pointer tap-feedback select-none",
            message.type === 'sticker' 
              ? "bg-transparent border-none shadow-none p-0"
              : isMe 
                ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white border border-blue-600/50" 
                : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white"
          )}>
            {/* Reply Context */}
            {message.replyTo && (
              <div className={cn(
                "mb-3 p-2.5 rounded-xl border-l-4 text-[12px] bg-black/5 flex flex-col gap-1",
                isMe ? "border-white/40" : "border-blue-500/40"
              )}>
                <span className="font-bold opacity-90">{message.replyTo.userName}</span>
                <p className="truncate opacity-80 italic">{message.replyTo.text}</p>
              </div>
            )}

            {message.type === 'sticker' ? (
              <motion.img 
                whileHover={{ scale: 1.15, rotate: [0, -2, 2, 0] }}
                whileTap={{ scale: 0.9 }}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                src={message.stickerUrl} 
                alt="sticker" 
                className="w-32 h-32 md:w-40 md:h-40 object-contain drop-shadow-lg"
                referrerPolicy="no-referrer"
              />
            ) : message.type === 'media' && message.mediaType === 'image' ? (
              <motion.div 
                whileHover={{ scale: 1.01 }}
                className="rounded-2xl overflow-hidden mb-1.5 border border-black/5 shadow-sm"
              >
                <img src={message.mediaUrl} alt="media" className="max-w-full max-h-80 object-cover" referrerPolicy="no-referrer" />
              </motion.div>
            ) : (
              <div className="text-[14.5px] md:text-[15px] leading-[1.6] break-words">
                {renderText(message.text || '')}
              </div>
            )}

            <div className={cn(
              "flex items-center gap-1.5 mt-1.5 justify-end",
              message.type === 'sticker' ? "text-gray-500" : isMe ? "text-white/60" : "text-gray-400"
            )}>
              <span className="text-[10px] font-semibold tracking-wide uppercase">{time}</span>
              {isMe && (
                <CheckCheck 
                  size={12} 
                  className={cn(isRead ? "text-blue-200" : "text-white/30")} 
                />
              )}
            </div>

            {/* Reactions Display */}
            {hasReactions && (
              <div className={cn(
                "absolute -bottom-3 flex flex-wrap gap-1",
                isMe ? "right-0" : "left-0"
              )}>
                {Object.entries(reactions).map(([emoji, uids]) => (
                  <button
                    key={emoji}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onReaction?.(message.id, emoji);
                    }}
                    className={cn(
                      "flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] shadow-sm border transition-all active:scale-95",
                      uids.includes(user?.id || '')
                        ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400"
                        : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500"
                    )}
                  >
                    <span>{emoji}</span>
                    <span className="font-medium">{uids.length}</span>
                  </button>
                ))}
              </div>
            )}
          </motion.div>

          {/* Quick Actions Overlay (Moved outside motion.div to prevent gesture interference) */}
          <div className={cn(
            "absolute transition-opacity flex flex-wrap gap-1 z-30 w-max max-w-[85vw]",
            showActions ? "opacity-100 pointer-events-auto" : "opacity-0 md:group-hover/bubble:opacity-100 pointer-events-none md:pointer-events-auto",
            isMe ? "right-0 bottom-full mb-1 justify-end" : "left-0 bottom-full mb-1 justify-start"
          )}>
            {/* Reaction Picker Bar */}
            <div className="flex bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-1 shadow-sm gap-1">
              {['👍', '❤️', '😂', '😮', '😢', '🔥'].map(emoji => (
                <button
                  key={emoji}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onReaction?.(message.id, emoji);
                    setShowActions(false);
                  }}
                  className="hover:scale-110 transition-transform p-2 md:p-1 rounded hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95"
                >
                  {emoji}
                </button>
              ))}
            </div>
            
            <button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleCopy(message.text || '');
                setShowActions(false);
              }}
              className="p-2 md:p-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-gray-900 dark:hover:text-white shadow-sm active:scale-95 transition-transform"
              title="Copier"
            >
              <CopyIcon size={14} />
            </button>
            <button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onReply?.(message);
                setShowActions(false);
              }}
              className="p-2 md:p-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-gray-900 dark:hover:text-white shadow-sm active:scale-95 transition-transform"
              title="Répondre"
            >
              <CornerUpLeft size={14} />
            </button>
            {isMe && (
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete?.(message.id);
                  setShowActions(false);
                }}
                className="p-2 md:p-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-red-500 shadow-sm active:scale-95 transition-transform"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
});

const ChatSidebarItem = React.memo<{
  room: ChatRoom;
  isActive: boolean;
  onClick: () => void;
}>(({ room, isActive, onClick }) => {
  return (
    <motion.button
      whileHover={{ x: 4, backgroundColor: 'rgba(59, 130, 246, 0.03)' }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 transition-colors relative group",
        isActive 
          ? "bg-blue-50/50 dark:bg-blue-500/10 border-l-4 border-blue-500" 
          : "bg-transparent border-l-4 border-transparent hover:bg-gray-100/50 dark:hover:bg-gray-800/50 cursor-pointer"
      )}
    >
      <div className={cn(
        "w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 shadow-sm",
        room.color || "bg-blue-50 dark:bg-blue-900/20 text-blue-500"
      )}>
        <Hash size={20} />
      </div>
      
      <div className="flex-1 text-left min-w-0">
        <div className="flex justify-between items-center mb-0.5">
          <h3 className={cn(
            "text-[14px] font-bold truncate tracking-tight",
            isActive ? "text-gray-900 dark:text-blue-400" : "text-gray-700 dark:text-gray-300"
          )}>
            {room.name}
          </h3>
          {room.lastMessageTime && (
            <span className="text-[10px] font-medium text-gray-400">
              {room.lastMessageTime}
            </span>
          )}
        </div>
        <p className={cn(
          "text-[12px] truncate",
          isActive ? "text-blue-600/70 dark:text-blue-400/70" : "text-gray-500"
        )}>
          {room.lastMessage || "Aucun message"}
        </p>
      </div>
      
      {room.unreadCount ? (
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-5 h-5 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center shadow-lg shadow-blue-500/20"
        >
          {room.unreadCount}
        </motion.div>
      ) : null}
    </motion.button>
  );
});

// --- Main Component ---

export const Forum: React.FC = () => {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [isMobileView, setIsMobileView] = useState(false);
  const [showSidebarOnMobile, setShowSidebarOnMobile] = useState(true);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [chatSearch, setChatSearch] = useState('');
  const debouncedChatSearch = useDebounce(chatSearch, 300);
  const [showChatSearch, setShowChatSearch] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [showMentionList, setShowMentionList] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [showMarkdownGuide, setShowMarkdownGuide] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Handle responsive view
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobileView(mobile);
      if (!mobile) setShowSidebarOnMobile(true);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch members for mentions
  useEffect(() => {
    if (!activeRoom) return;
    const fetchMembers = async () => {
      try {
        const q = query(collection(db, 'users_public'), where('class_name', '==', activeRoom.name));
        const snapshot = await getDocs(q);
        setMembers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error("Error fetching members:", err);
      }
    };
    fetchMembers();
  }, [activeRoom]);
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        let q;
        if (user?.role === UserRole.ADMIN) {
          q = query(collection(db, 'classes'), orderBy('name', 'asc'));
        } else {
          q = query(collection(db, 'classes'), where('name', '==', user?.class_name || ''), limit(1));
        }
        
        const snapshot = await getDocs(q);
        const fetchedRooms = snapshot.docs.map(doc => {
          const data = doc.data() as any;
          return {
            id: doc.id,
            name: data.name,
            color: data.color || 'bg-primary/10 text-primary'
          } as ChatRoom;
        });
        
        setRooms(fetchedRooms);
        
        // Auto-select user's class
        if (user?.class_name) {
          const myRoom = fetchedRooms.find(r => r.name === user.class_name);
          if (myRoom) {
            setActiveRoom(myRoom);
            if (isMobileView) setShowSidebarOnMobile(false);
          }
        } else if (fetchedRooms.length > 0) {
          setActiveRoom(fetchedRooms[0]);
        }
        
        setLoading(false);
      } catch (err) {
        console.error("Error fetching rooms:", err);
        setLoading(false);
      }
    };
    
    fetchRooms();
  }, [user?.class_name, isMobileView]);

  // Listen for messages in active room
  useEffect(() => {
    if (!activeRoom) return;

    const q = query(
      collection(db, 'messages'),
      where('className', '==', activeRoom.name),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ChatMessage)).reverse();
      setMessages(msgs);
      scrollToBottom();

      // Mark as read
      msgs.forEach(msg => {
        if (!msg.readBy?.includes(user?.id || '') && msg.userId !== user?.id) {
          updateDoc(doc(db, 'messages', msg.id), {
            readBy: arrayUnion(user?.id)
          });
        }
      });
    }, (error) => {
      console.error("Error listening to messages:", error);
    });

    return () => unsubscribe();
  }, [activeRoom]);

  // Auto-delete expired messages (older than 7 days)
  useEffect(() => {
    if (!messages.length || !user) return;
    const now = Date.now();
    const EXPIRE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

    messages.forEach(msg => {
      if (msg.createdAt) {
        const msgTime = typeof msg.createdAt.toMillis === 'function' 
          ? msg.createdAt.toMillis() 
          : (msg.createdAt.seconds ? msg.createdAt.seconds * 1000 : null);
          
        if (msgTime && (msgTime + EXPIRE_MS < now)) {
          if (user.role === UserRole.ADMIN || user.id === msg.userId) {
            deleteDoc(doc(db, 'messages', msg.id)).catch(console.error);
          }
        }
      }
    });
  }, [messages, user]);

  // Listen for typing users
  useEffect(() => {
    if (!activeRoom || !user) return;

    const q = query(
      collection(db, 'typing'),
      where('className', '==', activeRoom.name),
      where('userId', '!=', user.id)
    );

    return onSnapshot(q, (snapshot) => {
      const users = snapshot.docs.map(doc => doc.data().userName);
      setTypingUsers(users);
    });
  }, [activeRoom, user]);

  // Handle typing status
  useEffect(() => {
    if (!activeRoom || !user) return;

    const typingRef = doc(db, 'typing', user.id);

    if (isTyping) {
      setDoc(typingRef, {
        userId: user.id,
        userName: user.name,
        className: activeRoom.name,
        updatedAt: serverTimestamp()
      });
    } else {
      deleteDoc(typingRef);
    }

    const timer = setTimeout(() => setIsTyping(false), 3000);
    return () => {
      clearTimeout(timer);
      deleteDoc(typingRef);
    };
  }, [isTyping, activeRoom, user]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      setShowScrollButton(false);
    }, 100);
  };

  // Scalable Message Processing: Flattening for virtualization
  const virtualData = useMemo(() => {
    const filtered = messages.filter(m => 
      !debouncedChatSearch || m.text?.toLowerCase().includes(debouncedChatSearch.toLowerCase())
    );
    
    const flattened: any[] = [];
    let lastDate = '';
    
    filtered.forEach((msg, idx) => {
      const date = msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleDateString() : 'Aujourd\'hui';
      if (date !== lastDate) {
        flattened.push({ type: 'divider', date });
        lastDate = date;
      }
      
      const prevMsg = filtered[idx - 1];
      const showAvatar = !prevMsg || prevMsg.userId !== msg.userId || (prevMsg.createdAt?.toDate?.().toLocaleDateString() !== date);
      
      flattened.push({ type: 'message', data: msg, showAvatar });
    });
    
    return flattened;
  }, [messages, debouncedChatSearch]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShowScrollButton(!isAtBottom);
  };

  const handleReaction = async (msgId: string, emoji: string) => {
    if (!user) return;
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;

    const reactions = { ...(msg.reactions || {}) };
    const uids = reactions[emoji] || [];

    if (uids.includes(user.id)) {
      reactions[emoji] = uids.filter(id => id !== user.id);
      if (reactions[emoji].length === 0) delete reactions[emoji];
    } else {
      reactions[emoji] = [...uids, user.id];
    }

    try {
      await updateDoc(doc(db, 'messages', msgId), { reactions });
      
      // Notify message author about the reaction (if it's a new reaction and not by themselves)
      if (!uids.includes(user.id) && msg.userId !== user.id) {
        notificationService.notifyUser(
          msg.userId,
          `Réaction dans ${activeRoom.name}`,
          `${user.name} a réagi ${emoji} à votre message.`,
          'info',
          '/forum'
        );
      }
    } catch (err) {
      console.error("Error updating reaction:", err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputText(value);
    setIsTyping(true);

    const lastChar = value[value.length - 1];
    const words = value.split(' ');
    const lastWord = words[words.length - 1];

    if (lastWord.startsWith('@')) {
      setShowMentionList(true);
      setMentionSearch(lastWord.slice(1));
    } else {
      setShowMentionList(false);
    }
  };

  const insertMention = (member: any) => {
    const words = inputText.split(' ');
    words[words.length - 1] = `@[${member.name}](${member.id}) `;
    setInputText(words.join(' '));
    setShowMentionList(false);
  };
  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || !user || !activeRoom) return;

    const text = inputText.trim();
    
    // Extract mentions: @[Name](ID)
    const mentionRegex = /@\[.*?\]\((.*?)\)/g;
    const mentions: string[] = [];
    let match;
    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[1]);
    }

    setInputText('');
    const currentReply = replyingTo;
    setReplyingTo(null);

    try {
      await addDoc(collection(db, 'messages'), {
        text,
        type: 'text',
        userId: user.id,
        userName: user.name,
        userAvatar: user.avatar || null,
        className: activeRoom.name,
        createdAt: serverTimestamp(),
        readBy: [user.id],
        mentions,
        replyTo: currentReply ? {
          id: currentReply.id,
          text: currentReply.text || (currentReply.type === 'sticker' ? 'Sticker' : 'Média'),
          userName: currentReply.userName
        } : null
      });

      // Notify mentioned users
      mentions.forEach(mentionId => {
        if (mentionId !== user.id) {
          notificationService.notifyUser(
            mentionId,
            `Mention dans ${activeRoom.name}`,
            `${user.name} vous a mentionné dans un message.`,
            'info',
            '/forum'
          );
        }
      });

      // Notify user being replied to
      if (currentReply && currentReply.userId !== user.id) {
        notificationService.notifyUser(
          currentReply.userId,
          `Réponse dans ${activeRoom.name}`,
          `${user.name} a répondu à votre message.`,
          'info',
          '/forum'
        );
      }

      scrollToBottom();

      // Log activity in background
      activityService.logActivity(
        user,
        `A envoyé un message dans ${activeRoom.name}`,
        activeRoom.name,
        'chat_message'
      ).catch(err => console.error("Activity log error:", err));
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  const handleSendSticker = async (stickerUrl: string) => {
    if (!user || !activeRoom) return;

    try {
      await addDoc(collection(db, 'messages'), {
        stickerUrl,
        type: 'sticker',
        userId: user.id,
        userName: user.name,
        userAvatar: user.avatar || null,
        className: activeRoom.name,
        createdAt: serverTimestamp(),
        readBy: [user.id]
      });
      setShowStickerPicker(false);
      scrollToBottom();

      // Log activity in background
      activityService.logActivity(
        user,
        `A envoyé un sticker dans ${activeRoom.name}`,
        activeRoom.name,
        'chat_sticker'
      ).catch(err => console.error("Activity log error:", err));
    } catch (err) {
      console.error("Error sending sticker:", err);
    }
  };

  const handleDeleteMessage = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'messages', id));
    } catch (err) {
      console.error("Error deleting message:", err);
    }
  };

  const handleRoomSelect = (room: ChatRoom) => {
    setActiveRoom(room);
    if (isMobileView) setShowSidebarOnMobile(false);
  };

  const onEmojiClick = (emojiData: any) => {
    setInputText(prev => prev + emojiData.emoji);
    setIsTyping(true);
  };

  const renderDateDivider = (date: string) => (
    <div className="flex justify-center my-8 sticky top-4 z-10">
      <div className="px-4 py-1.5 rounded-full bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border border-gray-200/50 dark:border-gray-800/50 shadow-md ring-1 ring-black/5 dark:ring-white/5">
        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">
          {date}
        </span>
      </div>
    </div>
  );

  const groupMessagesByDate = (msgs: ChatMessage[]) => {
    const groups: { date: string, messages: ChatMessage[] }[] = [];
    msgs.forEach(msg => {
      const date = msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) : 'Aujourd\'hui';
      const lastGroup = groups[groups.length - 1];
      if (lastGroup && lastGroup.date === date) {
        lastGroup.messages.push(msg);
      } else {
        groups.push({ date, messages: [msg] });
      }
    });
    return groups;
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size={48} /></div>;

  return (
    <div className="h-full w-full flex overflow-hidden bg-white dark:bg-gray-900 pb-[120px] md:pb-0">
      
      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {(!isMobileView || showSidebarOnMobile) && (
          <motion.div 
            initial={isMobileView ? { x: -300 } : false}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            className={cn(
              "w-full md:w-80 flex flex-col border-r border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 z-[60]",
              isMobileView ? "fixed inset-0" : "relative"
            )}
          >
            <div className="p-5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">Discussions</h2>
              {isMobileView && (
                <button onClick={() => setShowSidebarOnMobile(false)} className="p-2 text-gray-500">
                  <X size={20} />
                </button>
              )}
            </div>
            
            <div className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <input 
                  type="text"
                  placeholder="Rechercher..."
                  className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl py-2 pl-9 pr-4 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {rooms.map(room => (
                <ChatSidebarItem 
                  key={room.id}
                  room={room}
                  isActive={activeRoom?.id === room.id}
                  onClick={() => handleRoomSelect(room)}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col relative overflow-hidden bg-white dark:bg-gray-900">
        {activeRoom ? (
          <>
            {/* Chat Header */}
            <div className="h-16 flex items-center justify-between px-4 md:px-6 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 z-20">
              <div className="flex items-center gap-3">
                {isMobileView && (
                  <button 
                    onClick={() => setShowSidebarOnMobile(true)}
                    className="p-2 -ml-1 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 tap-feedback"
                  >
                    <Menu size={20} />
                  </button>
                )}
                <div className={cn(
                  "w-8 h-8 rounded-xl flex items-center justify-center shadow-sm",
                  activeRoom.color || "bg-primary/10 text-primary border border-primary/20"
                )}>
                  <Hash size={16} />
                </div>
                <div className="cursor-pointer" onClick={() => setShowGroupInfo(true)}>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white leading-none mb-1">{activeRoom.name}</h3>
                  <div className="flex items-center gap-1.5">
                    {typingUsers.length > 0 ? (
                      <span className="text-[10px] font-bold text-primary animate-pulse">
                        {typingUsers[0]} {typingUsers.length > 1 ? 'et d\'autres écrivent...' : 'écrit...'}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                        <span className="text-[10px] text-gray-500 font-medium tracking-tight">Nexus Actif</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setShowChatSearch(!showChatSearch)}
                  className={cn(
                    "p-2 rounded-xl transition-all tap-feedback",
                    showChatSearch ? "bg-primary/10 text-primary" : "text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  )}
                >
                  <Search size={18} />
                </button>
                <button 
                  onClick={() => setShowGroupInfo(true)}
                  className="p-2 rounded-xl text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all tap-feedback"
                >
                  <Info size={18} />
                </button>
              </div>
            </div>

            {/* Search Bar */}
            <AnimatePresence>
              {showChatSearch && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-3 z-10"
                >
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                    <input 
                      type="text"
                      value={chatSearch}
                      onChange={(e) => setChatSearch(e.target.value)}
                      placeholder="Rechercher dans la discussion..."
                      className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg py-1.5 pl-9 pr-4 text-[13px] outline-none focus:ring-1 focus:ring-blue-500/30"
                      autoFocus
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div 
              ref={chatContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto p-4 custom-scrollbar flex flex-col relative"
            >
              <div className="flex-1 flex flex-col min-h-full">
                {virtualData.map((item, idx) => (
                  <div key={item.type === 'divider' ? `divider-${item.date}` : `msg-${item.data.id}`}>
                    {item.type === 'divider' ? (
                      renderDateDivider(item.date)
                    ) : (
                      <MessageBubble 
                        message={item.data} 
                        isMe={item.data.userId === user?.id}
                        showAvatar={item.showAvatar}
                        onReply={setReplyingTo}
                        onDelete={handleDeleteMessage}
                        onReaction={handleReaction}
                      />
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Scroll to Bottom Button */}
              <AnimatePresence>
                {showScrollButton && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.5, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.5, y: 20 }}
                    onClick={scrollToBottom}
                    className="absolute bottom-6 right-6 w-8 h-8 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm flex items-center justify-center text-gray-500 z-30 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <ChevronDown size={14} />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

            {/* Input Area */}
            <div className="p-3 md:p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 relative z-20 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
              {/* Reply Preview */}
              <AnimatePresence>
                {replyingTo && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mb-3 p-3 bg-gray-50 dark:bg-gray-800 border-l-2 border-primary rounded-md flex items-center justify-between"
                  >
                    <div className="flex flex-col gap-0.5 overflow-hidden">
                      <span className="text-[12px] font-semibold text-primary">Réponse à {replyingTo.userName}</span>
                      <p className="text-[13px] text-gray-600 dark:text-gray-300 truncate">{replyingTo.text || 'Média'}</p>
                    </div>
                    <button onClick={() => setReplyingTo(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                      <X size={16} />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {showMentionList && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute bottom-full left-16 mb-2 w-64 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg overflow-hidden z-30"
                  >
                    <div className="p-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                      <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Mentionner un membre</span>
                    </div>
                    <div className="max-h-48 overflow-y-auto custom-scrollbar">
                      {members.filter(m => m.name.toLowerCase().includes(mentionSearch.toLowerCase())).map(member => (
                        <button
                          key={member.id}
                          onClick={() => insertMention(member)}
                          className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
                        >
                          <Avatar 
                            src={member.avatar} 
                            name={member.name} 
                            size="xs" 
                          />
                          <span className="text-[13px] font-medium text-gray-900 dark:text-white">{member.name}</span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {showMarkdownGuide && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.95 }}
                    className="absolute bottom-full left-6 w-[280px] mb-4 z-30 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl p-4 overflow-hidden"
                  >
                    <div className="flex items-center justify-between mb-4 px-1">
                      <div className="flex items-center gap-2 text-primary">
                        <FileText size={16} />
                        <span className="text-[12px] font-bold uppercase tracking-wider text-gray-900 dark:text-white">Formatage Markdown</span>
                      </div>
                      <button onClick={() => setShowMarkdownGuide(false)} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400">
                        <X size={14} />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-2.5">
                      {[
                        { label: 'Gras', syntax: '**texte**', example: 'Bold Text' },
                        { label: 'Italique', syntax: '*texte*', example: 'Italic Text' },
                        { label: 'Code', syntax: '`code`', example: 'console.log()' },
                        { label: 'Citation', syntax: '> texte', example: 'Inspiring quote' },
                        { label: 'Liste', syntax: '- item', example: 'Points list' },
                        { label: 'Lien', syntax: '[nom](url)', example: 'Link to web' }
                      ].map((item, idx) => (
                        <div 
                          key={idx}
                          className="group p-2 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-blue-200 dark:hover:border-blue-900/30 hover:bg-blue-50/30 dark:hover:bg-blue-500/5 transition-all flex items-center justify-between"
                        >
                          <div className="flex flex-col">
                            <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">{item.label}</span>
                            <code className="text-[12px] text-blue-600 dark:text-blue-400 font-mono">{item.syntax}</code>
                          </div>
                          <div className="opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all font-mono text-[10px] text-gray-400 italic">
                            ex: {item.example}
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {showStickerPicker && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.95 }}
                    className="absolute bottom-full left-6 right-6 mb-4 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl p-5 z-40"
                  >
                    <div className="flex items-center justify-between mb-5 px-1">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-orange-500 flex items-center justify-center">
                          <Sticker size={18} />
                        </div>
                        <h4 className="text-[14px] font-bold text-gray-900 dark:text-white tracking-tight">Pack de Stickers Officiels</h4>
                      </div>
                      <button 
                        onClick={() => setShowStickerPicker(false)}
                        className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors"
                      >
                        <X size={18} />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-4 max-h-[320px] overflow-y-auto custom-scrollbar pr-2">
                      {STICKERS.map((url, idx) => (
                        <motion.button 
                          key={idx}
                          whileHover={{ scale: 1.15, rotate: [0, -5, 5, 0] }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleSendSticker(url)}
                          className="aspect-square rounded-2xl bg-gray-50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-800 border-2 border-transparent hover:border-orange-200 dark:hover:border-orange-900/30 p-2.5 shadow-sm hover:shadow-md transition-all flex items-center justify-center overflow-hidden group"
                        >
                          <img 
                            src={url} 
                            alt={`sticker-${idx}`} 
                            className="w-full h-full object-contain filter drop-shadow-sm group-hover:drop-shadow-md transition-all" 
                            referrerPolicy="no-referrer" 
                          />
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <form 
                onSubmit={handleSendMessage}
                className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-[16px] p-2 pl-4 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all"
              >
                <div className="flex items-center gap-2">
                  <button 
                    type="button" 
                    onClick={() => {
                      setShowEmojiPicker(!showEmojiPicker);
                      setShowStickerPicker(false);
                      setShowMarkdownGuide(false);
                    }}
                    className={cn(
                      "transition-colors p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700",
                      showEmojiPicker ? "text-blue-500" : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    )}
                    title="Emoji"
                  >
                    <Smile size={18} />
                  </button>
                  <button 
                    type="button" 
                    onClick={() => {
                      setShowMarkdownGuide(!showMarkdownGuide);
                      setShowEmojiPicker(false);
                      setShowStickerPicker(false);
                    }}
                    className={cn(
                      "transition-colors p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700",
                      showMarkdownGuide ? "text-blue-500" : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    )}
                    title="Guide Markdown"
                  >
                    <FileText size={18} />
                  </button>
                </div>
                
                <input 
                  type="text"
                  value={inputText}
                  onChange={handleInputChange}
                  onFocus={() => {
                    setShowEmojiPicker(false);
                    setShowStickerPicker(false);
                  }}
                  placeholder="Écrivez votre message..."
                  className="flex-1 bg-transparent border-none outline-none text-[16px] md:text-[15px] py-2 text-gray-900 dark:text-white placeholder:text-gray-400"
                />
                
                {inputText.trim() ? (
                  <motion.button 
                    whileTap={{ scale: 0.90 }}
                    type="submit"
                    className="w-10 h-10 rounded-full flex items-center justify-center bg-primary text-white hover:opacity-90 transition-all shadow-md shadow-primary/20"
                  >
                    <Send size={16} className="ml-0.5" />
                  </motion.button>
                ) : (
                  <div className="w-10 h-10" />
                )}
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-400 mb-6">
              <MessageSquare size={32} />
            </div>
            <h3 className="text-[16px] font-semibold text-gray-900 dark:text-white mb-2 tracking-tight">Bienvenue sur le Forum</h3>
            <p className="text-[14px] text-gray-500 dark:text-gray-400 max-w-md">
              Sélectionnez une discussion dans la liste de gauche pour commencer à échanger en temps réel avec vos camarades.
            </p>
          </div>
        )}

        {/* Group Info Sidebar */}
        <AnimatePresence>
          {showGroupInfo && activeRoom && (
            <motion.div 
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 300, opacity: 0 }}
              className="w-full md:w-72 border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 z-30 flex flex-col absolute inset-y-0 right-0 md:relative"
            >
              <div className="h-14 flex items-center px-6 border-b border-gray-200 dark:border-gray-800">
                <button onClick={() => setShowGroupInfo(false)} className="mr-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                  <X size={18} />
                </button>
                <h3 className="font-semibold text-[14px] text-gray-900 dark:text-white">Infos du groupe</h3>
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                <div className="flex flex-col items-center mb-8">
                  <div className={cn(
                    "w-20 h-20 rounded-2xl flex items-center justify-center mb-4",
                    activeRoom.color || "bg-blue-50 dark:bg-blue-900/20 text-blue-500"
                  )}>
                    <Hash size={40} />
                  </div>
                  <h2 className="text-[16px] font-semibold text-gray-900 dark:text-white">{activeRoom.name}</h2>
                  <span className="text-[13px] text-gray-500 mt-1">Groupe • 25 membres</span>
                </div>
                
                <div className="space-y-6">
                  <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                    <h4 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Description</h4>
                    <p className="text-[13px] text-gray-600 dark:text-gray-300 leading-relaxed">
                      Espace de discussion officiel pour la classe {activeRoom.name}. Partagez vos ressources, posez vos questions et collaborez en temps réel.
                    </p>
                  </div>

                  <div className="space-y-1">
                    {[
                      { icon: ImageIcon, label: 'Médias, liens et docs', count: '12' },
                      { icon: Clock, label: 'Messages éphémères', status: 'Désactivé' },
                      { icon: CheckCircle, label: 'Chiffrement', status: 'Bout en bout' }
                    ].map((item, idx) => (
                      <button key={idx} className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors">
                        <div className="flex items-center gap-3">
                          <item.icon size={16} className="text-gray-400" />
                          <span className="text-[13px] font-medium text-gray-900 dark:text-white">{item.label}</span>
                        </div>
                        <span className="text-[12px] text-gray-500">{item.count || item.status}</span>
                      </button>
                    ))}
                  </div>
                  
                  <div>
                    <h4 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-3 px-3">Médias récents</h4>
                    <div className="grid grid-cols-3 gap-2 px-1">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="aspect-square rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden group cursor-pointer">
                          <img src={`https://picsum.photos/seed/${activeRoom.name}${i}/200`} alt="" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" referrerPolicy="no-referrer" />
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-4 px-3">
                      <h4 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Membres (25)</h4>
                      <button className="text-[11px] font-semibold text-blue-500 uppercase">Voir tout</button>
                    </div>
                    <div className="space-y-1">
                      {[
                        { name: 'Admin', role: 'Administrateur', avatar: null, status: 'Disponible' },
                        { name: user?.name, role: 'Vous', avatar: user?.avatar, status: 'En ligne' },
                      ].map((member, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors">
                          <div className="flex items-center gap-3">
                            <Avatar 
                              src={member.avatar} 
                              name={member.name} 
                              size="sm" 
                            />
                            <div>
                              <p className="text-[13px] font-medium text-gray-900 dark:text-white">{member.name}</p>
                              <p className="text-[11px] text-gray-500">{member.status}</p>
                            </div>
                          </div>
                          <span className="text-[10px] font-medium text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-md">{member.role}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4">
                    <button className="w-full flex items-center gap-3 p-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors font-medium text-[13px]">
                      <Trash2 size={16} />
                      Quitter le groupe
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
