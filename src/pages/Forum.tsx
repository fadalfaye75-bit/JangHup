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
  Angry
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Button, Badge, Spinner, GlassCard } from '../components/ui';
import EmojiPicker, { Theme, EmojiStyle } from 'emoji-picker-react';
import { notificationService } from '../services/notificationService';

// --- Constants ---

const WHATSAPP_WALLPAPER = "url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')";

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
    const parts = text.split(/(@\[.*?\]\(.*?\))/g);
    return parts.map((part, i) => {
      const mentionMatch = part.match(/@\[(.*?)\]\((.*?)\)/);
      if (mentionMatch) {
        return (
          <span key={i} className="font-bold text-primary bg-primary/10 px-1 rounded">
            @{mentionMatch[1]}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={cn(
        "flex w-full mb-1 group relative",
        isMe ? "justify-end" : "justify-start",
        showAvatar ? "mt-4" : "mt-0.5"
      )}
    >
      <div className={cn(
        "flex max-w-[85%] md:max-w-[70%] items-end gap-1",
        isMe ? "flex-row-reverse" : "flex-row"
      )}>
        {!isMe && (
          <div className="w-8 shrink-0">
            {showAvatar && (
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/10 shadow-sm overflow-hidden">
                {message.userAvatar ? (
                  <img src={message.userAvatar} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <UserIcon size={14} />
                )}
              </div>
            )}
          </div>
        )}
        
        <div className={cn(
          "flex flex-col relative",
          isMe ? "items-end" : "items-start"
        )}>
          {!isMe && showAvatar && (
            <span className="text-[10px] font-bold text-primary mb-1 ml-2 uppercase tracking-wider drop-shadow-sm">
              {message.userName}
            </span>
          )}
          
          <div 
            onClick={() => setShowActions(!showActions)}
            className={cn(
            "px-3 py-1.5 rounded-2xl shadow-md relative group/bubble transition-all cursor-pointer",
            message.type === 'sticker' 
              ? "bg-transparent border-none shadow-none p-0"
              : isMe 
                ? "bg-primary text-white rounded-tr-none ring-1 ring-primary/20" 
                : "bg-[var(--bg-card)] border border-[var(--border-card)] text-[var(--text-main)] rounded-tl-none ring-1 ring-black/5"
          )}>
            {/* Reply Context */}
            {message.replyTo && (
              <div className={cn(
                "mb-2 p-2 rounded-lg border-l-4 text-xs bg-black/5 flex flex-col gap-0.5",
                isMe ? "border-white/40" : "border-primary/40"
              )}>
                <span className="font-bold opacity-80">{message.replyTo.userName}</span>
                <p className="truncate opacity-70">{message.replyTo.text}</p>
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
              <div className="rounded-lg overflow-hidden mb-1">
                <img src={message.mediaUrl} alt="media" className="max-w-full max-h-60 object-cover" referrerPolicy="no-referrer" />
              </div>
            ) : (
              <p className="text-[13px] md:text-sm leading-relaxed whitespace-pre-wrap break-words">
                {renderText(message.text || '')}
              </p>
            )}

            <div className={cn(
              "flex items-center gap-1 mt-1 justify-end",
              message.type === 'sticker' ? "text-[var(--text-muted)]" : isMe ? "text-white/60" : "text-[var(--text-muted)]"
            )}>
              <span className="text-[9px] font-medium">{time}</span>
              {isMe && (
                <CheckCheck 
                  size={10} 
                  className={cn(isRead ? "text-info" : "text-white/40")} 
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
                      "flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] shadow-sm border transition-all",
                      uids.includes(user?.id || '')
                        ? "bg-primary/10 border-primary/20 text-primary"
                        : "bg-[var(--bg-card)] border-[var(--border-card)] text-[var(--text-muted)]"
                    )}
                  >
                    <span>{emoji}</span>
                    <span className="font-bold">{uids.length}</span>
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
              <div className="flex bg-[var(--bg-card)] border border-[var(--border-card)] rounded-full p-1 shadow-lg gap-1">
                {['👍', '❤️', '😂', '😮', '😢', '🔥'].map(emoji => (
                  <button
                    key={emoji}
                    onClick={(e) => {
                      e.stopPropagation();
                      onReaction?.(message.id, emoji);
                      setShowActions(false);
                    }}
                    className="hover:scale-125 transition-transform p-0.5"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onReply?.(message);
                  setShowActions(false);
                }}
                className="p-1.5 rounded-full bg-[var(--bg-card)] border border-[var(--border-card)] text-[var(--text-muted)] hover:text-primary shadow-sm"
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
                  className="p-1.5 rounded-full bg-[var(--bg-card)] border border-[var(--border-card)] text-[var(--text-muted)] hover:text-danger shadow-sm"
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
        "w-full flex items-center gap-4 p-4 transition-all border-b border-[var(--border-card)]/50",
        isActive 
          ? "bg-primary/5 border-l-4 border-l-primary" 
          : "hover:bg-[var(--bg-main)] border-l-4 border-l-transparent"
      )}
    >
      <div className={cn(
        "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm",
        room.color || "bg-primary/10 text-primary"
      )}>
        <Hash size={24} />
      </div>
      
      <div className="flex-1 text-left min-w-0">
        <div className="flex justify-between items-center mb-1">
          <h3 className={cn(
            "text-sm font-bold truncate",
            isActive ? "text-primary" : "text-[var(--text-main)]"
          )}>
            {room.name}
          </h3>
          {room.lastMessageTime && (
            <span className="text-[10px] font-medium text-[var(--text-muted)]">
              {room.lastMessageTime}
            </span>
          )}
        </div>
        <p className="text-xs text-[var(--text-secondary)] truncate font-medium">
          {room.lastMessage || "Aucun message"}
        </p>
      </div>
      
      {room.unreadCount ? (
        <div className="w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
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
      const q = query(collection(db, 'users'), where('class_name', '==', activeRoom.name));
      const snapshot = await getDocs(q);
      setMembers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
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
      <div className="px-4 py-1 rounded-lg bg-[var(--bg-card)]/80 backdrop-blur-sm border border-[var(--border-card)] shadow-sm">
        <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
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
    <div className="h-[calc(100vh-120px)] max-w-7xl mx-auto flex overflow-hidden bg-[var(--bg-card)] border border-[var(--border-card)] rounded-[32px] shadow-2xl">
      
      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {(!isMobileView || showSidebarOnMobile) && (
          <motion.div 
            initial={isMobileView ? { x: -300 } : false}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            className={cn(
              "w-full md:w-80 flex flex-col border-r border-[var(--border-card)] bg-[var(--bg-card)] z-20",
              isMobileView ? "absolute inset-0" : "relative"
            )}
          >
            <div className="p-6 border-b border-[var(--border-card)]">
              <h2 className="text-xl font-bold text-[var(--text-main)] mb-4">Discussions</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
                <input 
                  type="text"
                  placeholder="Rechercher..."
                  className="w-full bg-[var(--bg-main)] border border-[var(--border-main)] rounded-xl py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
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
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {activeRoom ? (
          <>
            {/* Chat Header */}
            <div className="h-20 flex items-center justify-between px-6 bg-[var(--bg-card)] border-b border-[var(--border-card)] z-20 shadow-sm">
              <div className="flex items-center gap-4">
                {isMobileView && (
                  <button 
                    onClick={() => setShowSidebarOnMobile(true)}
                    className="p-2 -ml-2 rounded-full hover:bg-[var(--bg-main)] text-[var(--text-muted)]"
                  >
                    <ChevronLeft size={24} />
                  </button>
                )}
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center shadow-sm",
                  activeRoom.color || "bg-primary/10 text-primary"
                )}>
                  <Hash size={20} />
                </div>
                <div className="cursor-pointer" onClick={() => setShowGroupInfo(true)}>
                  <h3 className="text-sm font-bold text-[var(--text-main)]">{activeRoom.name}</h3>
                  <div className="flex items-center gap-1.5">
                    {typingUsers.length > 0 ? (
                      <span className="text-[10px] font-bold text-primary animate-pulse">
                        {typingUsers.join(', ')} {typingUsers.length > 1 ? 'écrivent...' : 'écrit...'}
                      </span>
                    ) : (
                      <>
                        <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                        <span className="text-[10px] font-bold text-success uppercase tracking-wider">En ligne</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShowChatSearch(!showChatSearch)}
                  className={cn(
                    "p-2 rounded-full transition-colors",
                    showChatSearch ? "bg-primary/10 text-primary" : "hover:bg-[var(--bg-main)] text-[var(--text-muted)]"
                  )}
                >
                  <Search size={18} />
                </button>
                <button 
                  onClick={() => setShowGroupInfo(true)}
                  className="p-2 rounded-full hover:bg-[var(--bg-main)] text-[var(--text-muted)] transition-colors"
                >
                  <Info size={18} />
                </button>
                <button className="p-2 rounded-full hover:bg-[var(--bg-main)] text-[var(--text-muted)] transition-colors">
                  <MoreVertical size={18} />
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
                  className="bg-[var(--bg-card)] border-b border-[var(--border-card)] px-6 py-3 z-10"
                >
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={14} />
                    <input 
                      type="text"
                      value={chatSearch}
                      onChange={(e) => setChatSearch(e.target.value)}
                      placeholder="Rechercher dans la discussion..."
                      className="w-full bg-[var(--bg-main)] border border-[var(--border-main)] rounded-lg py-1.5 pl-9 pr-4 text-xs outline-none focus:ring-1 focus:ring-primary/30"
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
                backgroundImage: WHATSAPP_WALLPAPER,
                backgroundSize: '400px',
                backgroundRepeat: 'repeat',
                backgroundColor: 'var(--bg-main)'
              }}
            >
              {/* Overlay for readability */}
              <div className="absolute inset-0 bg-[var(--bg-main)]/85 pointer-events-none" />
              
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
                    className="absolute bottom-6 right-6 w-10 h-10 rounded-full bg-[var(--bg-card)] border border-[var(--border-card)] shadow-lg flex items-center justify-center text-primary z-30 hover:bg-[var(--bg-main)] transition-colors"
                  >
                    <ChevronDown size={20} />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

            {/* Input Area */}
            <div className="p-4 md:p-6 bg-[var(--bg-card)] border-t border-[var(--border-card)] relative z-20">
              {/* Reply Preview */}
              <AnimatePresence>
                {replyingTo && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mb-3 p-3 bg-primary/5 border-l-4 border-primary rounded-lg flex items-center justify-between"
                  >
                    <div className="flex flex-col gap-0.5 overflow-hidden">
                      <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Réponse à {replyingTo.userName}</span>
                      <p className="text-xs text-[var(--text-secondary)] truncate">{replyingTo.text || 'Média'}</p>
                    </div>
                    <button onClick={() => setReplyingTo(null)} className="text-[var(--text-muted)] hover:text-primary">
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
                    className="absolute bottom-full left-16 mb-2 w-64 bg-[var(--bg-card)] border border-[var(--border-card)] rounded-xl shadow-2xl overflow-hidden z-30"
                  >
                    <div className="p-2 border-b border-[var(--border-card)] bg-[var(--bg-main)]">
                      <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Mentionner un membre</span>
                    </div>
                    <div className="max-h-48 overflow-y-auto custom-scrollbar">
                      {members.filter(m => m.name.toLowerCase().includes(mentionSearch.toLowerCase())).map(member => (
                        <button
                          key={member.id}
                          onClick={() => insertMention(member)}
                          className="w-full flex items-center gap-3 px-4 py-2 hover:bg-primary/5 transition-colors text-left"
                        >
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                            {member.avatar ? <img src={member.avatar} alt="" className="w-full h-full object-cover rounded-full" /> : member.name[0]}
                          </div>
                          <span className="text-sm font-medium text-[var(--text-main)]">{member.name}</span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {showEmojiPicker && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.95 }}
                    className="absolute bottom-full left-6 mb-4 z-30"
                  >
                    <div className="shadow-2xl rounded-3xl overflow-hidden border border-[var(--border-card)]">
                      <EmojiPicker 
                        onEmojiClick={onEmojiClick}
                        theme={Theme.AUTO}
                        emojiStyle={EmojiStyle.APPLE}
                        lazyLoadEmojis={true}
                        searchPlaceholder="Rechercher un emoji..."
                        width={320}
                        height={400}
                      />
                    </div>
                  </motion.div>
                )}

                {showStickerPicker && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.95 }}
                    className="absolute bottom-full left-6 right-6 mb-4 bg-[var(--bg-card)] border border-[var(--border-card)] rounded-3xl shadow-2xl p-4 z-30"
                  >
                    <div className="flex items-center justify-between mb-4 px-2">
                      <h4 className="text-sm font-bold text-[var(--text-main)]">Stickers</h4>
                      <button 
                        onClick={() => setShowStickerPicker(false)}
                        className="text-[var(--text-muted)] hover:text-primary"
                      >
                        <X size={18} />
                      </button>
                    </div>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 max-h-60 overflow-y-auto custom-scrollbar p-2">
                      {STICKERS.map((url, idx) => (
                        <button 
                          key={idx}
                          onClick={() => handleSendSticker(url)}
                          className="aspect-square rounded-xl hover:bg-[var(--bg-main)] p-2 transition-all hover:scale-110"
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
                className="flex items-center gap-3 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-2xl p-2 pl-4 shadow-sm focus-within:ring-2 focus-within:ring-primary/20 transition-all"
              >
                <div className="flex items-center gap-2">
                  <button 
                    type="button" 
                    onClick={() => {
                      setShowEmojiPicker(!showEmojiPicker);
                      setShowStickerPicker(false);
                    }}
                    className={cn(
                      "transition-colors",
                      showEmojiPicker ? "text-primary" : "text-[var(--text-muted)] hover:text-primary"
                    )}
                  >
                    <Smile size={20} />
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
                  className="flex-1 bg-transparent border-none outline-none text-sm py-2 text-[var(--text-main)] placeholder:text-[var(--text-muted)]"
                />
                
                {inputText.trim() ? (
                  <button 
                    type="submit"
                    className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary text-white shadow-lg shadow-primary/20 transition-all active:scale-95"
                  >
                    <Send size={18} />
                  </button>
                ) : (
                  <div className="w-10 h-10" />
                )}
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <div className="w-20 h-20 rounded-3xl bg-primary/5 flex items-center justify-center text-primary mb-6">
              <MessageSquare size={40} />
            </div>
            <h3 className="text-xl font-bold text-[var(--text-main)] mb-2">Bienvenue sur le Forum</h3>
            <p className="text-[var(--text-secondary)] max-w-md font-medium">
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
              className="w-full md:w-80 border-l border-[var(--border-card)] bg-[var(--bg-card)] z-30 flex flex-col absolute inset-y-0 right-0 md:relative"
            >
              <div className="h-20 flex items-center px-6 border-b border-[var(--border-card)]">
                <button onClick={() => setShowGroupInfo(false)} className="mr-4 text-[var(--text-muted)] hover:text-primary">
                  <X size={20} />
                </button>
                <h3 className="font-bold text-[var(--text-main)]">Infos du groupe</h3>
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                <div className="flex flex-col items-center mb-8">
                  <div className={cn(
                    "w-32 h-32 rounded-3xl flex items-center justify-center shadow-xl mb-4",
                    activeRoom.color || "bg-primary/10 text-primary"
                  )}>
                    <Hash size={60} />
                  </div>
                  <h2 className="text-xl font-bold text-[var(--text-main)]">{activeRoom.name}</h2>
                  <span className="text-xs text-[var(--text-muted)] font-medium mt-1">Groupe • 25 membres</span>
                </div>
                
                <div className="space-y-6">
                  <div className="bg-[var(--bg-main)]/50 p-4 rounded-2xl border border-[var(--border-card)]">
                    <h4 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2">Description</h4>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                      Espace de discussion officiel pour la classe {activeRoom.name}. Partagez vos ressources, posez vos questions et collaborez en temps réel.
                    </p>
                  </div>

                  <div className="space-y-1">
                    {[
                      { icon: ImageIcon, label: 'Médias, liens et docs', count: '12' },
                      { icon: Clock, label: 'Messages éphémères', status: 'Désactivé' },
                      { icon: CheckCircle, label: 'Chiffrement', status: 'Bout en bout' }
                    ].map((item, idx) => (
                      <button key={idx} className="w-full flex items-center justify-between p-3 hover:bg-[var(--bg-main)] rounded-xl transition-colors">
                        <div className="flex items-center gap-3">
                          <item.icon size={18} className="text-[var(--text-muted)]" />
                          <span className="text-sm font-medium text-[var(--text-main)]">{item.label}</span>
                        </div>
                        <span className="text-xs text-[var(--text-muted)]">{item.count || item.status}</span>
                      </button>
                    ))}
                  </div>
                  
                  <div>
                    <h4 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-3 px-3">Médias récents</h4>
                    <div className="grid grid-cols-3 gap-2 px-1">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="aspect-square rounded-xl bg-[var(--bg-main)] border border-[var(--border-main)] overflow-hidden group cursor-pointer">
                          <img src={`https://picsum.photos/seed/${activeRoom.name}${i}/200`} alt="" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" referrerPolicy="no-referrer" />
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-4 px-3">
                      <h4 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Membres (25)</h4>
                      <button className="text-[10px] font-bold text-primary uppercase">Voir tout</button>
                    </div>
                    <div className="space-y-1">
                      {[
                        { name: 'Admin', role: 'Administrateur', avatar: null, status: 'Disponible' },
                        { name: user?.name, role: 'Vous', avatar: user?.avatar, status: 'En ligne' },
                      ].map((member, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 hover:bg-[var(--bg-main)] rounded-xl transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary overflow-hidden border border-primary/10">
                              {member.avatar ? <img src={member.avatar} alt="" className="w-full h-full object-cover" /> : <UserIcon size={18} />}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-[var(--text-main)]">{member.name}</p>
                              <p className="text-[10px] text-[var(--text-muted)]">{member.status}</p>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{member.role}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4">
                    <button className="w-full flex items-center gap-3 p-4 text-danger hover:bg-danger/5 rounded-2xl transition-colors font-bold text-sm">
                      <Trash2 size={18} />
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
