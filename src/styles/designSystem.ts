export const designTokens = {
  colors: {
    background: {
      dark: '#020617',
      light: '#f5f7fb',
    },
    card: {
      dark: '#0f172a',
      light: '#ffffff',
    },
    primary: '#6C63FF',
    accent: '#00C896',
    danger: '#FF4757',
    text: {
      primary: { dark: '#FFFFFF', light: '#1e293b' },
      secondary: { dark: 'rgba(255,255,255,0.7)', light: '#64748b' },
    },
    border: {
      dark: 'rgba(255,255,255,0.06)',
      light: 'rgba(0,0,0,0.06)',
    }
  },
  animations: {
    spring: {
      type: "spring",
      stiffness: 400,
      damping: 30
    },
    transition: {
      duration: 0.3,
      ease: [0.4, 0.6, 0.3, 1]
    }
  },
  glass: {
    blur: 'blur(24px)',
    background: {
      dark: 'rgba(15, 23, 42, 0.6)',
      light: 'rgba(255, 255, 255, 0.6)'
    }
  }
};
