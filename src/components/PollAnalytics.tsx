import React from 'react';
import { Poll } from '../../types';
import { motion } from 'motion/react';
import { TrendingUp, Users, Award } from 'lucide-react';
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

import { GlassCard } from './ui/GlassCard';

interface PollAnalyticsProps {
  poll: Poll;
}

export const PollAnalytics: React.FC<PollAnalyticsProps> = ({ poll }) => {
  const options = poll.options || [];
  const sortedOptions = [...options].sort((a, b) => b.votes - a.votes);
  const winner = sortedOptions[0];
  const participationRate = 100; // Mock participation rate for UI

  const chartData = options.map(opt => ({
    name: opt.label,
    value: opt.votes,
    percentage: poll.totalVotes > 0 ? Math.round((opt.votes / poll.totalVotes) * 100) : 0
  }));

  const COLORS = ['#6C63FF', '#00D1FF', '#00C896', '#FF4757', '#FFB800', '#8E44AD', '#2ECC71'];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/90 backdrop-blur-xl border border-white/20 p-4 rounded-2xl shadow-2xl">
          <p className="text-white font-black text-xs uppercase tracking-widest mb-2">{payload[0].name}</p>
          <p className="text-primary text-lg font-black tracking-tighter">
            {payload[0].value} <span className="text-[10px] uppercase tracking-normal text-slate-500">votes</span>
          </p>
          <p className="text-neon-blue text-xs font-black">
            {payload[0].payload.percentage}% <span className="text-[10px] uppercase tracking-normal text-slate-500">du total</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col gap-10">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <GlassCard className="p-6 border-white/10" tilt={true}>
          <Users size={20} className="text-primary mb-4" />
          <p className="text-4xl font-black text-white tracking-tighter">{poll.totalVotes}</p>
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mt-1">Total Participants</p>
        </GlassCard>
        
        <GlassCard className="p-6 border-white/10" tilt={true}>
          <Award size={20} className="text-neon-blue mb-4" />
          <p className="text-xl font-black text-white truncate tracking-tight">{winner?.label || 'N/A'}</p>
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mt-1">Vecteur Dominant</p>
        </GlassCard>

        <GlassCard className="p-6 border-white/10" tilt={true}>
          <TrendingUp size={20} className="text-success mb-4" />
          <p className="text-4xl font-black text-white tracking-tighter">{participationRate}%</p>
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mt-1">Engagement Flux</p>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Bar Chart */}
        <GlassCard className="p-8 border-white/10 min-h-[400px]" tilt={false}>
          <h4 className="text-[10px] font-black text-slate-500 mb-10 uppercase tracking-[0.3em]">Répartition Analytique</h4>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 40 }}>
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900, textAnchor: 'start' }}
                  width={120}
                  dx={-10}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)', radius: 12 }} />
                <Bar dataKey="value" radius={[0, 12, 12, 0]} barSize={32}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Pie Chart */}
        <GlassCard className="p-8 border-white/10 flex flex-col items-center justify-center min-h-[400px]" tilt={false}>
          <h4 className="text-[10px] font-black text-slate-500 mb-10 uppercase tracking-[0.3em]">Visualisation Holo-Circulaire</h4>
          <div className="h-[250px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={10}
                  dataKey="value"
                  animationBegin={0}
                  animationDuration={1500}
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth={2}
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
                className="text-4xl font-black text-white tracking-tighter"
              >
                {poll.totalVotes}
              </motion.p>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">Flux Total</p>
            </div>
          </div>
          <div className="mt-10 flex flex-wrap gap-4 justify-center">
            {options.map((opt, idx) => (
              <div key={opt.id} className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-2xl border border-white/5">
                <div className="w-2.5 h-2.5 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.2)]" style={{ background: COLORS[idx % COLORS.length] }} />
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{opt.label}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
};
