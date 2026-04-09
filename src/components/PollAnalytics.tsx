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

  const COLORS = ['#6C63FF', '#00C896', '#FF4757', '#FFB800', '#00D1FF', '#8E44AD', '#2ECC71'];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-white/20 p-3 rounded-xl shadow-2xl">
          <p className="text-white font-bold text-sm mb-1">{payload[0].name}</p>
          <p className="text-emerald-400 text-xs font-black">
            {payload[0].value} votes ({payload[0].payload.percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-50 dark:bg-white/5 p-6 rounded-3xl border border-slate-100 dark:border-white/10 shadow-sm">
          <Users size={20} className="text-indigo-600 dark:text-indigo-400 mb-3" />
          <p className="text-3xl font-black text-slate-900 dark:text-white">{poll.totalVotes}</p>
          <p className="text-[10px] text-slate-500 dark:text-white/40 font-black uppercase tracking-[0.15em]">Total Votes</p>
        </div>
        <div className="bg-slate-50 dark:bg-white/5 p-6 rounded-3xl border border-slate-100 dark:border-white/10 shadow-sm">
          <Award size={20} className="text-emerald-600 dark:text-emerald-400 mb-3" />
          <p className="text-xl font-black text-slate-900 dark:text-white truncate">{winner?.label || 'N/A'}</p>
          <p className="text-[10px] text-slate-500 dark:text-white/40 font-black uppercase tracking-[0.15em]">Option Gagnante</p>
        </div>
        <div className="bg-slate-50 dark:bg-white/5 p-6 rounded-3xl border border-slate-100 dark:border-white/10 shadow-sm">
          <TrendingUp size={20} className="text-amber-600 dark:text-amber-400 mb-3" />
          <p className="text-3xl font-black text-slate-900 dark:text-white">{participationRate}%</p>
          <p className="text-[10px] text-slate-500 dark:text-white/40 font-black uppercase tracking-[0.15em]">Participation</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Bar Chart */}
        <div className="bg-slate-50 dark:bg-white/5 p-8 rounded-[32px] border border-slate-100 dark:border-white/10 min-h-[350px] shadow-sm">
          <h4 className="text-xs font-black text-slate-500 dark:text-white/60 mb-8 uppercase tracking-[0.2em]">Répartition des votes</h4>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 30 }}>
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'currentColor', fontSize: 11, fontWeight: 700 }}
                  className="text-slate-600 dark:text-slate-400"
                  width={100}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)', radius: 8 }} />
                <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={24}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart */}
        <div className="bg-slate-50 dark:bg-white/5 p-8 rounded-[32px] border border-slate-100 dark:border-white/10 flex flex-col items-center justify-center min-h-[350px] shadow-sm">
          <h4 className="text-xs font-black text-slate-500 dark:text-white/60 mb-8 uppercase tracking-[0.2em]">Visualisation Circulaire</h4>
          <div className="h-[220px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={95}
                  paddingAngle={8}
                  dataKey="value"
                  animationBegin={0}
                  animationDuration={1200}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className="text-3xl font-black text-slate-900 dark:text-white">{poll.totalVotes}</p>
              <p className="text-[10px] text-slate-500 dark:text-white/40 font-black uppercase tracking-widest">Votes</p>
            </div>
          </div>
          <div className="mt-8 flex flex-wrap gap-4 justify-center">
            {options.map((opt, idx) => (
              <div key={opt.id} className="flex items-center gap-2.5 bg-white dark:bg-white/5 px-3 py-1.5 rounded-full border border-slate-100 dark:border-white/5">
                <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ background: COLORS[idx % COLORS.length] }} />
                <span className="text-[11px] text-slate-700 dark:text-slate-300 font-bold">{opt.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
