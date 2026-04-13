export const COLORS = {
  // Brand Colors
  primary: {
    DEFAULT: '#6C63FF', // violet moderne
    hover: '#5A52D5', // hover légèrement plus foncé
  },
  secondary: {
    DEFAULT: '#3B8BEB', // bleu clair
    light: '#F1F5FF', // fond secondaire
  },
  accent: {
    DEFAULT: '#00C896', // vert frais
  },
  
  // Status Colors
  status: {
    info: '#4D96FF', // bleu info
    warning: '#FFA502', // orange doux
    danger: '#FF4757', // rouge soft
    success: '#10B981', // vert propre
  },

  // Light Mode (Principal)
  light: {
    background: '#F6F8FC', // blanc cassé doux
    surface: '#FFFFFF', // blanc pur
    surfaceSecondary: '#F1F5FF',
    border: '#E6EAF2',
    text: {
      primary: '#1A1A2E', // bleu très foncé doux
      secondary: '#5B6475',
      muted: '#8A94A6',
    }
  },

  // Dark Mode (Soft Dark - Fallback)
  dark: {
    background: '#121826', // bleu nuit doux
    backgroundSecondary: '#1A2233',
    surface: 'rgba(255, 255, 255, 0.06)',
    surfaceElevated: 'rgba(255, 255, 255, 0.08)',
    border: 'rgba(255, 255, 255, 0.06)',
    text: {
      primary: '#E8EEF9', // pas blanc pur
      secondary: 'rgba(232, 238, 249, 0.75)',
      muted: 'rgba(232, 238, 249, 0.55)',
    }
  }
} as const;

export const DESIGN_SYSTEM = {
  colors: COLORS,
  
  // Cards & Surfaces
  cards: {
    borderRadius: '14px',
    boxShadow: '0 2px 12px rgba(0, 0, 0, 0.05)', // shadow douce
    transition: 'all 0.2s ease-in-out',
    hoverLift: 'translateY(-2px)', // hover léger
    padding: '16px 20px', // padding confortable
  },

  // Typography
  typography: {
    fontFamily: '"Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif',
    monoFamily: '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace',
    h1: 'text-4xl md:text-5xl font-bold tracking-tight leading-[1.1]',
    h2: 'text-3xl md:text-4xl font-bold tracking-tight leading-[1.2]',
    h3: 'text-2xl md:text-3xl font-bold tracking-tight leading-[1.3]',
    body: 'text-base leading-relaxed',
    small: 'text-sm font-medium',
  },

  // Global UI Rules
  rules: {
    spacing: 'Beaucoup d’espace entre éléments, sections bien séparées',
    hierarchy: 'Hiérarchie claire (titres > contenu)',
    colors: 'Pas de couleurs agressives ou saturées, couleur toujours significative',
    animations: 'Transitions douces et hover lift léger (2px)',
  }
} as const;
