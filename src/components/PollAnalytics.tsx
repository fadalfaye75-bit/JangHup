import React, { useState, useEffect } from 'react';
import { Poll, User } from '../types';
import { motion } from 'motion/react';
import { 
  TrendingUp, 
  Users, 
  Award, 
  Clock, 
  Calendar, 
  CheckCircle2,
  PieChart as PieChartIcon 
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip,
  CartesianGrid
} from 'recharts';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { GlassCard } from './ui/GlassCard';
import { Badge } from './ui/Badge';
import { fmtDate } from '../lib/utils';

interface PollAnalyticsProps {
  poll: Poll;
}

export const PollAnalytics: React.FC<PollAnalyticsProps> = ({ poll }) => {
  const [classMemberCount, setClassMemberCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClassSize = async () => {
      if (!poll.className) {
        setLoading(false);
        return;
      }
      try {
        const q = query(
          collection(db, 'users_public'),
          where('class_name', '==', poll.className)
        );
        const snapshot = await getDocs(q);
        setClassMemberCount(snapshot.size);
      } catch (err) {
        console.error("Error fetching class size for analytics:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchClassSize();
  }, [poll.className]);

  const options = poll.options || [];
  const sortedOptions = [...options].sort((a, b) => b.votes - a.votes);
  const winner = sortedOptions[0];
  
  const participationRate = classMemberCount > 0 
    ? Math.round((poll.totalVotes / classMemberCount) * 100) 
    : 0;

  const chartData = options.map(opt => ({
    name: opt.label,
    value: opt.votes,
    percentage: poll.totalVotes > 0 ? Math.round((opt.votes / poll.totalVotes) * 100) : 0
  }));

  const COLORS = ['#6C63FF', '#00D1FF', '#00C896', '#FF4757', '#FFB800', '#8E44AD', '#2ECC71'];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-2xl">
          <p className="text-slate-500 dark:text-slate-400 font-bold text-[10px] uppercase tracking-widest mb-2">{payload[0].name}</p>
          <p className="text-slate-900 dark:text-white text-lg font-black tracking-tighter">
            {payload[0].value} <span className="text-[10px] uppercase tracking-normal text-slate-500">votes</span>
          </p>
          <p className="text-primary text-xs font-bold mt-1">
            {payload[0].payload.percentage}% <span className="text-[10px] uppercase tracking-normal text-slate-500">du total</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: 0.1
          }
        }
      }}
      className="flex flex-col gap-8"
    >
      {/* Header Info */}
      <motion.div 
        variants={{
          hidden: { opacity: 0, y: 10 },
          visible: { opacity: 1, y: 0 }
        }}
        className="flex flex-col gap-2"
      >
        <div className="flex items-center gap-2">
          <Badge variant={poll.isActive ? 'success' : 'secondary'}>
            {poll.isActive ? 'Sondage Actif' : 'Sondage Clôturé'}
          </Badge>
          <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
            <Calendar size={12} />
            Créé le {fmtDate(poll.createdAt)}
          </span>
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">
          {poll.question}
        </h2>
      </motion.div>

      {/* Stats Cards */}
      <motion.div 
        variants={{
          hidden: { opacity: 0, y: 20 },
          visible: { opacity: 1, y: 0 }
        }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
      >
        <motion.div 
          whileHover={{ scale: 1.02, translateY: -4 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 shadow-sm"
        >
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4">
            <Users size={20} />
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">{poll.totalVotes}</p>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Total Participants</p>
        </motion.div>
        
        <motion.div 
          whileHover={{ scale: 1.02, translateY: -4 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 shadow-sm"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 mb-4">
            <Award size={20} />
          </div>
          <p className="text-xl font-black text-slate-900 dark:text-white truncate tracking-tight">{winner?.label || 'N/A'}</p>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Option en tête</p>
        </motion.div>

        <motion.div 
          whileHover={{ scale: 1.02, translateY: -4 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 shadow-sm"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-4">
            <TrendingUp size={20} />
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">
            {loading ? '...' : `${participationRate}%`}
          </p>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Taux de participation</p>
        </motion.div>
      </motion.div>

      <motion.div 
        variants={{
          hidden: { opacity: 0, y: 20 },
          visible: { opacity: 1, y: 0 }
        }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        {/* Bar Chart */}
        <div className="p-6 rounded-[2.5rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
          <h4 className="text-[11px] font-bold text-slate-400 mb-8 uppercase tracking-widest flex items-center gap-2">
            <CheckCircle2 size={14} />
            Répartition des votes
          </h4>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 40 }}>
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name"
                  type="category"
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                  width={100}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.02)', radius: 8 }} />
                <Bar 
                  dataKey="value" 
                  radius={[0, 8, 8, 0]} 
                  barSize={24}
                  animationBegin={200}
                  animationDuration={1500}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart */}
        <div className="p-6 rounded-[2.5rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center transition-all hover:shadow-md">
          <h4 className="text-[11px] font-bold text-slate-400 mb-8 uppercase tracking-widest self-start flex items-center gap-2">
            <PieChartIcon size={14} />
            Distribution relative
          </h4>
          <div className="h-[250px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={8}
                  dataKey="value"
                  animationBegin={400}
                  animationDuration={1500}
                  stroke="transparent"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <motion.p 
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.8, type: "spring" }}
                className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter"
              >
                {poll.totalVotes}
              </motion.p>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Votes</p>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3 justify-center">
            {options.map((opt, idx) => (
              <motion.div 
                key={opt.id} 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1 + (idx * 0.1) }}
                className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-slate-700/50"
              >
                <div className="w-2 h-2 rounded-full" style={{ background: COLORS[idx % COLORS.length] }} />
                <span className="text-[10px] text-slate-600 dark:text-slate-400 font-bold uppercase tracking-tight">{opt.label}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
