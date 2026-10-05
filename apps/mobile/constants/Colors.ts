// SparGator Design System - Farben & Tokens
export const Colors = {
  // Brand
  primary: '#2E7D32',      // SparGator Grün
  primaryLight: '#4CAF50',
  primaryDark: '#1B5E20',

  // Akzente
  discount: '#FF3D00',     // Rabatt-Rot
  discountBg: '#FF3D0015',
  savings: '#00C853',      // Ersparnisgrün

  // Stores
  stores: {
    lidl:      { bg: '#0050AA', text: '#FFE000', label: 'Lidl' },
    aldi:      { bg: '#003C84', text: '#FFFFFF', label: 'Aldi' },
    penny:     { bg: '#CC0000', text: '#FFFFFF', label: 'Penny' },
    netto:     { bg: '#FFD700', text: '#000000', label: 'Netto' },
    kaufland:  { bg: '#CC0000', text: '#FFFFFF', label: 'Kaufland' },
  },

  // UI - Dark Mode
  background: '#0F0F0F',
  surface: '#1A1A1A',
  surfaceElevated: '#242424',
  surfaceBorder: '#2A2A2A',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#B0B0B0',
  textMuted: '#666666',

  // Misc
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const Radius = {
  sm: 6,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};

export const Typography = {
  // Größen
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const Shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  strong: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
};
