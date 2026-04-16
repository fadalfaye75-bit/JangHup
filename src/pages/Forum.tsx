import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
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
  MessageSquare,
  Paperclip,
  Smile,
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

// --- Constants ---

const MINIMAL_WALLPAPER = "radial-gradient(#e5e7eb 0.5px, transparent 0.5px)";
const DARK_MINIMAL_WALLPAPER = "radial-gradient(#374151 0.5px, transparent 0.5px)";

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

const MessageBubble: React.FC<{ 
  message: ChatMessage; 
  isMe: boolean;
  showAvatar?: boolean;
  onReply?: (msg: ChatMessage) => void;
  onDelete?: (id: string) => void;
  onReaction?: (msgId: string, emoji: string) => void;
}> = ({ message, isMe, showAvatar = true, onReply, onDelete, onReaction }) => {
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
      whileHover={{ y: -1 }}
      className={cn(
        "flex w-full mb-1 group relative",
        isMe ? "justify-end" : "justify-start",
        showAvatar ? "mt-5" : "mt-1"
      )}
    >
      <div className={cn(
        "flex max-w-[85%] md:max-w-[75%] items-end gap-2",
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
          
          <div 
            onClick={() => setShowActions(!showActions)}
            className={cn(
            "px-4 py-3 rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.05)] relative group/bubble transition-all cursor-pointer",
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
                whileHover={{ scale: 1.1 }}
                src={message.stickerUrl} 
                alt="sticker" 
                className="w-32 h-32 object-contain"
                referrerPolicy="no-referrer"
              />
            ) : message.type === 'media' && message.mediaType === 'image' ? (
              <div className="rounded-xl overflow-hidden mb-1.5 border border-black/5">
                <img src={message.mediaUrl} alt="media" className="max-w-full max-h-72 object-cover" referrerPolicy="no-referrer" />
              </div>
            ) : (
              <div className="text-[14.5px] leading-[1.6] break-words">
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
                      e.stopPropagation();
                      onReaction?.(message.id, emoji);
                    }}
                    className={cn(
                      "flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] shadow-sm border transition-all",
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

            {/* Quick Actions Overlay */}
            <div className={cn(
              "absolute top-0 transition-opacity flex gap-1 z-20",
              showActions ? "opacity-100" : "opacity-0 md:group-hover/bubble:opacity-100 pointer-events-none md:pointer-events-auto",
              isMe ? "right-full mr-2" : "left-full ml-2"
            )}>
              {/* Reaction Picker Bar */}
              <div className="flex bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-1 shadow-sm gap-1">
                {['👍', '❤️', '😂', '😮', '😢', '🔥'].map(emoji => (
                  <button
                    key={emoji}
                    onClick={(e) => {
                      e.stopPropagation();
                      onReaction?.(message.id, emoji);
                      setShowActions(false);
                    }}
                    className="hover:scale-110 transition-transform p-1 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopy(message.text || '');
                  setShowActions(false);
                }}
                className="p-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-gray-900 dark:hover:text-white shadow-sm"
                title="Copier"
              >
                <CopyIcon size={14} />
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onReply?.(message);
                  setShowActions(false);
                }}
                className="p-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-gray-900 dark:hover:text-white shadow-sm"
                title="Répondre"
              >
                <CornerUpLeft size={14} />
              </button>
              {isMe && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete?.(message.id);
                    setShowActions(false);
                  }}
                  className="p-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-red-500 shadow-sm"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const ChatSidebarItem: React.FC<{
  room: ChatRoom;
  isActive: boolean;
  onClick: () => void;
}> = ({ room, isActive, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 transition-all",
        isActive 
          ? "bg-white dark:bg-gray-800" 
          : "hover:bg-white/50 dark:hover:bg-gray-800/50"
      )}
    >
      <div className={cn(
        "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
        room.color || "bg-blue-50 dark:bg-blue-900/20 text-blue-500"
      )}>
        <Hash size={18} />
      </div>
      
      <div className="flex-1 text-left min-w-0">
        <div className="flex justify-between items-center mb-0.5">
          <h3 className={cn(
            "text-[14px] font-medium truncate",
            isActive ? "text-gray-900 dark:text-white" : "text-gray-700 dark:text-gray-300"
          )}>
            {room.name}
          </h3>
          {room.lastMessageTime && (
            <span className="text-[11px] text-gray-400">
              {room.lastMessageTime}
            </span>
          )}
        </div>
        <p className="text-[12px] text-gray-500 truncate">
          {room.lastMessage || "Aucun message"}
        </p>
      </div>
      
      {room.unreadCount ? (
        <div className="w-4 h-4 rounded-full bg-blue-500 text-white text-[10px] font-medium flex items-center justify-center">
          {room.unreadCount}
        </div>
      ) : null}
    </button>
  );
};

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

      // Log activity
      await activityService.logActivity(
        user,
        `A envoyé un sticker dans ${activeRoom.name}`,
        activeRoom.name,
        'chat_sticker'
      );
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
    <div className="flex justify-center my-6 sticky top-2 z-10">
      <div className="px-3 py-1 rounded-md bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200 dark:border-gray-800 shadow-sm">
        <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">
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
    <div className="h-[calc(100vh-120px)] max-w-7xl mx-auto flex overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm">
      
      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {(!isMobileView || showSidebarOnMobile) && (
          <motion.div 
            initial={isMobileView ? { x: -300 } : false}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            className={cn(
              "w-full md:w-80 flex flex-col border-r border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 z-20",
              isMobileView ? "absolute inset-0" : "relative"
            )}
          >
            <div className="p-4 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-[14px] font-semibold text-gray-900 dark:text-white mb-4 px-2 tracking-tight">Discussions</h2>
              <div className="relative px-2">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <input 
                  type="text"
                  placeholder="Rechercher..."
                  className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg py-1.5 pl-9 pr-4 text-[13px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-gray-400"
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar py-2">
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
            <div className="h-14 flex items-center justify-between px-6 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 z-20">
              <div className="flex items-center gap-3">
                {isMobileView && (
                  <button 
                    onClick={() => setShowSidebarOnMobile(true)}
                    className="p-1.5 -ml-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
                  >
                    <ChevronLeft size={18} />
                  </button>
                )}
                <div className={cn(
                  "w-7 h-7 rounded-md flex items-center justify-center",
                  activeRoom.color || "bg-blue-50 dark:bg-blue-900/20 text-blue-500"
                )}>
                  <Hash size={14} />
                </div>
                <div className="cursor-pointer" onClick={() => setShowGroupInfo(true)}>
                  <h3 className="text-[14px] font-semibold text-gray-900 dark:text-white">{activeRoom.name}</h3>
                  <div className="flex items-center gap-1.5">
                    {typingUsers.length > 0 ? (
                      <span className="text-[11px] font-medium text-blue-500 animate-pulse">
                        {typingUsers.join(', ')} {typingUsers.length > 1 ? 'écrivent...' : 'écrit...'}
                      </span>
                    ) : (
                      <>
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span className="text-[11px] text-gray-500">En ligne</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setShowChatSearch(!showChatSearch)}
                  className={cn(
                    "p-1.5 rounded-md transition-colors",
                    showChatSearch ? "bg-blue-50 dark:bg-blue-900/20 text-blue-500" : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400"
                  )}
                >
                  <Search size={16} />
                </button>
                <button 
                  onClick={() => setShowGroupInfo(true)}
                  className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors"
                >
                  <Info size={16} />
                </button>
                <button className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors">
                  <MoreVertical size={16} />
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

            {/* Messages Area with Wallpaper */}
            <div 
              ref={chatContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto p-6 custom-scrollbar flex flex-col relative"
              style={{ 
                backgroundImage: document.documentElement.classList.contains('dark') ? DARK_MINIMAL_WALLPAPER : MINIMAL_WALLPAPER,
                backgroundSize: '24px 24px',
                backgroundColor: 'var(--bg-main)'
              }}
            >
              {/* Overlay for readability */}
              <div className="absolute inset-0 bg-white/85 dark:bg-gray-900/85 pointer-events-none" />
              
              <div className="relative z-10 flex-1 flex flex-col">
                <div className="flex-1" />
                <div className="space-y-1">
                  {groupMessagesByDate(messages.filter(m => 
                    !chatSearch || m.text?.toLowerCase().includes(chatSearch.toLowerCase())
                  )).map((group, gIdx) => (
                    <React.Fragment key={group.date}>
                      {renderDateDivider(group.date)}
                      {group.messages.map((msg, idx) => {
                        const isMe = msg.userId === user?.id;
                        const prevMsg = group.messages[idx - 1];
                        const showAvatar = !prevMsg || prevMsg.userId !== msg.userId;
                        
                        return (
                            <MessageBubble 
                              key={msg.id} 
                              message={msg} 
                              isMe={isMe}
                              showAvatar={showAvatar}
                              onReply={setReplyingTo}
                              onDelete={handleDeleteMessage}
                              onReaction={handleReaction}
                            />
                        );
                      })}
                    </React.Fragment>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
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
                    <ChevronDown size={16} />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

            {/* Input Area */}
            <div className="p-4 md:p-6 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 relative z-20">
              {/* Reply Preview */}
              <AnimatePresence>
                {replyingTo && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mb-3 p-3 bg-gray-50 dark:bg-gray-800 border-l-2 border-blue-500 rounded-md flex items-center justify-between"
                  >
                    <div className="flex flex-col gap-0.5 overflow-hidden">
                      <span className="text-[12px] font-semibold text-blue-500">Réponse à {replyingTo.userName}</span>
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
                    className="absolute bottom-full left-20 mb-4 z-30 w-64 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Guide Markdown</span>
                      <button onClick={() => setShowMarkdownGuide(false)} className="text-gray-400 hover:text-gray-600">
                        <X size={14} />
                      </button>
                    </div>
                    <div className="space-y-2 text-[12px]">
                      <div className="flex justify-between border-b border-gray-100 dark:border-gray-800 pb-1">
                        <span className="text-gray-500">Gras</span>
                        <code className="text-blue-500">**texte**</code>
                      </div>
                      <div className="flex justify-between border-b border-gray-100 dark:border-gray-800 pb-1">
                        <span className="text-gray-500">Italique</span>
                        <code className="text-blue-500">*texte*</code>
                      </div>
                      <div className="flex justify-between border-b border-gray-100 dark:border-gray-800 pb-1">
                        <span className="text-gray-500">Code</span>
                        <code className="text-blue-500">`code`</code>
                      </div>
                      <div className="flex justify-between border-b border-gray-100 dark:border-gray-800 pb-1">
                        <span className="text-gray-500">Bloc Code</span>
                        <code className="text-blue-500">```bloc```</code>
                      </div>
                      <div className="flex justify-between border-b border-gray-100 dark:border-gray-800 pb-1">
                        <span className="text-gray-500">Liste</span>
                        <code className="text-blue-500">- item</code>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Citation</span>
                        <code className="text-blue-500">&gt; texte</code>
                      </div>
                    </div>
                  </motion.div>
                )}

                {showStickerPicker && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.95 }}
                    className="absolute bottom-full left-6 right-6 mb-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg p-4 z-30"
                  >
                    <div className="flex items-center justify-between mb-4 px-2">
                      <h4 className="text-[14px] font-semibold text-gray-900 dark:text-white">Stickers</h4>
                      <button 
                        onClick={() => setShowStickerPicker(false)}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                      >
                        <X size={16} />
                      </button>
                    </div>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 max-h-60 overflow-y-auto custom-scrollbar p-2">
                      {STICKERS.map((url, idx) => (
                        <button 
                          key={idx}
                          onClick={() => handleSendSticker(url)}
                          className="aspect-square rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 p-2 transition-all hover:scale-105"
                        >
                          <img src={url} alt="sticker" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <form 
                onSubmit={handleSendMessage}
                className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-2 pl-4 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all"
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
                  className="flex-1 bg-transparent border-none outline-none text-[14px] py-1.5 text-gray-900 dark:text-white placeholder:text-gray-400"
                />
                
                {inputText.trim() ? (
                  <button 
                    type="submit"
                    className="w-8 h-8 rounded-md flex items-center justify-center bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                  >
                    <Send size={14} />
                  </button>
                ) : (
                  <div className="w-8 h-8" />
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
              className="w-full md:w-80 border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 z-30 flex flex-col absolute inset-y-0 right-0 md:relative"
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
