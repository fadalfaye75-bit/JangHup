import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/AuthContext';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  increment, 
  writeBatch,
  orderBy,
  getDocs
} from 'firebase/firestore';
import { db } from '../../firebase';
import { Poll, PollOption, PollVote } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, ChevronLeft, X, Check } from 'lucide-react';

export const StoryPolls: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { user } = useAuth();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [myVotes, setMyVotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'polls'), 
      where('className', '==', user.className),
      where('isActive', '==', true),
      orderBy('createdAt', 'desc')
    );

    const unsubscribePolls = onSnapshot(q, async (snapshot) => {
      const pollsData: Poll[] = [];
      for (const pollDoc of snapshot.docs) {
        const poll = { id: pollDoc.id, ...pollDoc.data() } as Poll;
        const optionsSnap = await getDocs(query(collection(db, 'poll_options'), where('pollId', '==', poll.id)));
        poll.options = optionsSnap.docs.map(d => ({ id: d.id, ...d.data() } as PollOption));
        pollsData.push(poll);
      }
      setPolls(pollsData);
      setLoading(false);
    });

    const votesQ = query(collection(db, 'poll_votes'), where('userId', '==', user.id));
    const unsubscribeVotes = onSnapshot(votesQ, (snapshot) => {
      const votesMap: Record<string, string> = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        votesMap[data.pollId] = data.optionId;
      });
      setMyVotes(votesMap);
    });

    return () => {
      unsubscribePolls();
      unsubscribeVotes();
    };
  }, [user]);

  const handleVote = async (pollId: string, optionId: string) => {
    if (!user || myVotes[pollId]) return;

    try {
      const batch = writeBatch(db);
      const voteRef = doc(collection(db, 'poll_votes'));
      batch.set(voteRef, { pollId, optionId, userId: user.id, createdAt: new Date().toISOString() });
      batch.update(doc(db, 'poll_options', optionId), { votes: increment(1) });
      batch.update(doc(db, 'polls', pollId), { totalVotes: increment(1) });
      await batch.commit();
    } catch (error) {
      console.error("Vote error:", error);
    }
  };

  const nextPoll = () => {
    if (currentIndex < polls.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onClose();
    }
  };

  const prevPoll = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  if (loading) return null;
  if (polls.length === 0) return null;

  const currentPoll = polls[currentIndex];
  const hasVoted = !!myVotes[currentPoll.id];

  return (
    <div style={{ 
      position: 'fixed', 
      inset: 0, 
      zIndex: 2000, 
      background: '#0f0f1a', 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff'
    }}>
      {/* Progress Bars */}
      <div style={{ position: 'absolute', top: '20px', left: '20px', right: '20px', display: 'flex', gap: '4px', zIndex: 10 }}>
        {polls.map((_, idx) => (
          <div key={idx} style={{ flex: 1, height: '3px', background: 'rgba(255,255,255,0.2)', borderRadius: '2px', overflow: 'hidden' }}>
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: idx < currentIndex ? '100%' : idx === currentIndex ? '100%' : '0%' }}
              transition={{ duration: idx === currentIndex ? 5 : 0.3, ease: "linear" }}
              style={{ height: '100%', background: '#fff' }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div style={{ position: 'absolute', top: '40px', left: '20px', right: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)', padding: '2px' }}>
            <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>JH</div>
          </div>
          <div>
            <p style={{ fontSize: '14px', fontWeight: '700' }}>JangHup Sondages</p>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>{currentIndex + 1} sur {polls.length}</p>
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
          <X size={24} />
        </button>
      </div>

      {/* Navigation Areas */}
      <div onClick={prevPoll} style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '20%', zIndex: 5, cursor: 'pointer' }} />
      <div onClick={nextPoll} style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '20%', zIndex: 5, cursor: 'pointer' }} />

      {/* Poll Card */}
      <AnimatePresence mode="wait">
        <motion.div 
          key={currentPoll.id}
          initial={{ opacity: 0, scale: 0.9, x: 20 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          exit={{ opacity: 0, scale: 0.9, x: -20 }}
          style={{ 
            width: '90%', 
            maxWidth: '400px', 
            background: 'rgba(255,255,255,0.1)', 
            backdropFilter: 'blur(20px)',
            borderRadius: '24px',
            padding: '32px',
            border: '1px solid rgba(255,255,255,0.1)',
            textAlign: 'center',
            zIndex: 8
          }}
        >
          <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '32px', lineHeight: '1.3' }}>
            {currentPoll.question}
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {currentPoll.options?.map((option) => {
              const percentage = currentPoll.totalVotes > 0 ? Math.round((option.votes / currentPoll.totalVotes) * 100) : 0;
              const isMyVote = myVotes[currentPoll.id] === option.id;

              return (
                <motion.button
                  key={option.id}
                  whileHover={!hasVoted ? { scale: 1.02 } : {}}
                  whileTap={!hasVoted ? { scale: 0.98 } : {}}
                  disabled={hasVoted}
                  onClick={() => handleVote(currentPoll.id, option.id)}
                  style={{
                    width: '100%',
                    padding: '20px',
                    background: isMyVote ? '#6C63FF' : 'rgba(255,255,255,0.1)',
                    border: 'none',
                    borderRadius: '16px',
                    color: '#fff',
                    fontSize: '16px',
                    fontWeight: '700',
                    cursor: hasVoted ? 'default' : 'pointer',
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  {hasVoted && (
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      style={{ 
                        position: 'absolute', 
                        left: 0, 
                        top: 0, 
                        bottom: 0, 
                        background: isMyVote ? 'rgba(255,255,255,0.2)' : 'rgba(108, 99, 255, 0.3)',
                        zIndex: 0
                      }}
                    />
                  )}
                  <span style={{ position: 'relative', zIndex: 1 }}>{option.label}</span>
                  {hasVoted && (
                    <span style={{ position: 'relative', zIndex: 1, fontSize: '18px' }}>{percentage}%</span>
                  )}
                </motion.button>
              );
            })}
          </div>

          {hasVoted && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ marginTop: '24px', color: 'rgba(255,255,255,0.5)', fontSize: '14px', fontWeight: '600' }}
            >
              Swipez pour le suivant
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation Buttons (Desktop) */}
      <div style={{ position: 'absolute', bottom: '40px', display: 'flex', gap: '20px', zIndex: 10 }}>
        <button 
          onClick={prevPoll} 
          disabled={currentIndex === 0}
          style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '12px', borderRadius: '50%', cursor: 'pointer', opacity: currentIndex === 0 ? 0.3 : 1 }}
        >
          <ChevronLeft size={24} />
        </button>
        <button 
          onClick={nextPoll}
          style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '12px', borderRadius: '50%', cursor: 'pointer' }}
        >
          <ChevronRight size={24} />
        </button>
      </div>
    </div>
  );
};
