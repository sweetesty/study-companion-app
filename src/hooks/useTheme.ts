import { useAppStore } from '../store/useAppStore';
import { darkTheme, lightTheme, Theme } from '../constants/theme';

export function useTheme(): { theme: Theme; isDark: boolean } {
  const themeMode = useAppStore((s) => s.themeMode);
  const isDark = themeMode === 'dark';
  return { theme: isDark ? darkTheme : lightTheme, isDark };
}
