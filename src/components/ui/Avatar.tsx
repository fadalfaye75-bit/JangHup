import React from 'react';
import { cn } from '../../lib/utils';

interface AvatarProps {
  src?: string | null;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ src, name = '?', size = 'md', className }) => {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-[12px]',
    md: 'w-10 h-10 text-[14px]',
    lg: 'w-16 h-16 text-[20px]',
    xl: 'w-32 h-32 text-[32px]'
  };

  const initials = getInitials(name);

  // Generate a consistent background color based on the name
  const getBgColor = (name: string) => {
    const colors = [
      'bg-blue-500',
      'bg-purple-500',
      'bg-emerald-500',
      'bg-rose-500',
      'bg-amber-500',
      'bg-indigo-500',
      'bg-cyan-500'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className={cn(
      "relative flex-shrink-0 rounded-xl overflow-hidden flex items-center justify-center font-semibold text-white shadow-sm border border-white/10",
      sizeClasses[size],
      !src && getBgColor(name),
      className
    )}>
      {src ? (
        <img 
          src={src} 
          alt={name} 
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
          onError={(e) => {
            // Fallback if image fails to load
            (e.target as HTMLImageElement).style.display = 'none';
            (e.target as HTMLImageElement).parentElement!.classList.add(getBgColor(name));
          }}
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
};
