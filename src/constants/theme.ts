import { ThemeMode } from './types';

export const darkTheme = {
  background: '#0B0B0B',
  surface: '#1C1C1C',
  surfaceHigher: '#262626',
  border: '#2D2D2D',
  blue: '#3B82F6',
  blueLight: '#60A5FA',
  purple: '#8B5CF6',
  purpleLight: '#A78BFA',
  green: '#10B981',
  yellow: '#F59E0B',
  red: '#EF4444',
  textPrimary: '#FFFFFF',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  tabBar: '#141414',
  tabBarBorder: '#2D2D2D',
  cardShadow: 'rgba(0,0,0,0.6)',
  gradient: ['#3B82F6', '#8B5CF6'] as [string, string],
  gradientOverlay: 'rgba(11,11,11,0.7)',
  inputBg: '#262626',
  inputBorder: '#3D3D3D',
  mode: 'dark' as ThemeMode,
};

export const lightTheme = {
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceHigher: '#F1F5F9',
  border: '#E2E8F0',
  blue: '#3B82F6',
  blueLight: '#2563EB',
  purple: '#8B5CF6',
  purpleLight: '#7C3AED',
  green: '#10B981',
  yellow: '#F59E0B',
  red: '#EF4444',
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  tabBar: '#FFFFFF',
  tabBarBorder: '#E2E8F0',
  cardShadow: 'rgba(0,0,0,0.08)',
  gradient: ['#3B82F6', '#8B5CF6'] as [string, string],
  gradientOverlay: 'rgba(248,250,252,0.8)',
  inputBg: '#F1F5F9',
  inputBorder: '#CBD5E1',
  mode: 'light' as ThemeMode,
};

export type Theme = typeof darkTheme;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const typography = {
  h1: { fontSize: 32, fontWeight: '700' as const, letterSpacing: -0.5 },
  h2: { fontSize: 24, fontWeight: '700' as const, letterSpacing: -0.3 },
  h3: { fontSize: 20, fontWeight: '600' as const },
  h4: { fontSize: 18, fontWeight: '600' as const },
  body: { fontSize: 16, fontWeight: '400' as const },
  bodyMedium: { fontSize: 16, fontWeight: '500' as const },
  bodySmall: { fontSize: 14, fontWeight: '400' as const },
  caption: { fontSize: 12, fontWeight: '400' as const },
  captionBold: { fontSize: 12, fontWeight: '600' as const },
};
