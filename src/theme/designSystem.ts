export const COLORS = {
  // Brand Colors
  primary: {
    DEFAULT: '#6C63FF', // violet tech
    glow: 'rgba(108, 99, 255, 0.4)',
    hover: '#827BFF',
  },
  accent: {
    DEFAULT: '#00C896', // vert moderne
    glow: 'rgba(0, 200, 150, 0.4)',
  },
  
  // Status Colors
  status: {
    info: '#3B8BEB', // bleu
    warning: '#FFA502', // orange doux
    danger: '#FF4757', // rouge soft
    success: '#10B981', // vert propre
  },

  // Dark Mode (Principal)
  dark: {
    background: '#0F0F1A', // dark bleu profond
    surface: 'rgba(255, 255, 255, 0.05)',
    border: 'rgba(255, 255, 255, 0.08)',
    text: {
      primary: '#FFFFFF',
      secondary: 'rgba(255, 255, 255, 0.7)',
      muted: 'rgba(255, 255, 255, 0.5)',
    }
  },

  // Light Mode (Secondary)
  light: {
    background: '#F4F6FB',
    surface: '#FFFFFF',
    border: '#E5E7EB',
    text: {
      primary: '#1A1A2E',
      secondary: '#4B5563',
      muted: '#6B7280',
    }
  }
} as const;

export const DESIGN_SYSTEM = {
  colors: COLORS,
  
  // Cards & Surfaces
  glass: {
    borderRadius: '16px',
    backdropFilter: 'blur(12px)',
    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.15)',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    hoverLift: 'translateY(-4px)',
  },

  // Typography
  typography: {
    fontFamily: '"Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif',
    monoFamily: '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace',
    h1: 'text-4xl md:text-6xl font-black tracking-tighter leading-[1.05]',
    h2: 'text-3xl md:text-4xl font-bold tracking-tight',
    h3: 'text-2xl md:text-3xl font-bold tracking-tight',
    body: 'text-base leading-relaxed',
    small: 'text-sm font-medium',
  },

  // Global UI Rules
  rules: {
    spacing: 'Beaucoup d’espace blanc (ou dark space) pour respirer',
    hierarchy: 'Hiérarchie claire via la typographie et les contrastes',
    colors: 'Pas de couleurs agressives, utilisation de glow subtil',
    animations: 'Transitions douces (0.2s) et hover lift léger',
  }
} as const;
