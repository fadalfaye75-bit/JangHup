import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Poll, PollOption } from '../types';
import { PollAnalytics } from '../components/PollAnalytics';
import { Button, Spinner, ErrBox, GlassCard } from '../components/ui';
import { ChevronLeft, Share2, Download, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';

export const PollAnalyticsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const pollRef = doc(db, 'polls', id);
    const optionsQ = query(collection(db, 'poll_options'), where('pollId', '==', id));
    
    // Listen for real-time updates to the poll
    const unsubscribePoll = onSnapshot(pollRef, (snapshot) => {
      if (snapshot.exists()) {
        setPoll(prev => {
          const pollData = { id: snapshot.id, ...snapshot.data() } as Poll;
          return prev ? { ...pollData, options: prev.options } : { ...pollData, options: [] };
        });
        setLoading(false);
      } else {
        setError("Sondage non trouvé");
        setLoading(false);
      }
    }, (err) => {
      console.error("Error fetching poll analytics:", err);
      setError("Erreur lors du chargement des données");
      setLoading(false);
    });

    // Listen for real-time updates to the options
    const unsubscribeOptions = onSnapshot(optionsQ, (snapshot) => {
      const options = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PollOption));
      setPoll(prev => prev ? { ...prev, options } : null);
    });

    return () => {
      unsubscribePoll();
      unsubscribeOptions();
    };
  }, [id]);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `Résultats du sondage: ${poll?.question}`,
        text: `Découvrez les résultats du sondage sur JangHup!`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("Lien copié dans le presse-papier !");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Spinner size={48} />
        <p className="text-slate-500 font-medium animate-pulse">Chargement des analyses...</p>
      </div>
    );
  }

  if (error || !poll) {
    return (
      <div className="max-w-2xl mx-auto pt-10 px-4">
        <ErrBox message={error || "Une erreur est survenue"} />
        <Button variant="secondary" onClick={() => navigate('/polls')} className="mt-4">
          <ChevronLeft size={18} className="mr-2" /> Retour aux sondages
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Top Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button 
          onClick={() => navigate('/polls')}
          className="flex items-center gap-2 text-slate-500 hover:text-primary transition-colors group w-fit"
        >
          <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 group-hover:bg-primary/10 transition-all">
            <ChevronLeft size={18} />
          </div>
          <span className="font-bold text-sm">Retour aux sondages</span>
        </button>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => window.print()} className="hidden sm:flex">
            <Download size={16} className="mr-2" /> Exporter PDF
          </Button>
          <Button variant="primary" size="sm" onClick={handleShare}>
            <Share2 size={16} className="mr-2" /> Partager
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        <GlassCard className="p-8 border-slate-100 dark:border-slate-800">
          <PollAnalytics poll={poll} />
        </GlassCard>

        {/* Detailed Table (Optional but good for "Analytics" page) */}
        <GlassCard className="p-8 border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <RefreshCw size={18} className="text-primary" />
            Données brutes
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <th className="pb-4 font-bold text-[11px] uppercase tracking-widest text-slate-400">Option</th>
                  <th className="pb-4 font-bold text-[11px] uppercase tracking-widest text-slate-400 text-center">Votes</th>
                  <th className="pb-4 font-bold text-[11px] uppercase tracking-widest text-slate-400 text-right">Pourcentage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                {poll.options?.map((opt) => {
                  const percentage = poll.totalVotes > 0 ? Math.round((opt.votes / poll.totalVotes) * 100) : 0;
                  return (
                    <tr key={opt.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                      <td className="py-4 font-bold text-slate-700 dark:text-slate-300">{opt.label}</td>
                      <td className="py-4 text-center font-black text-slate-900 dark:text-white">{opt.votes}</td>
                      <td className="py-4 text-right">
                        <span className="px-3 py-1 rounded-full bg-primary/10 text-primary font-bold text-xs">
                          {percentage}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
};
