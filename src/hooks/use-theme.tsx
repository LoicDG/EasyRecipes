import { useSQLiteContext } from 'expo-sqlite';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { Colors, type Palette } from '@/constants/theme';
import { getSettingSync, setSetting } from '@/lib/db';

/** "system" follows the phone's own light/dark setting. */
export type ThemePreference = 'system' | 'light' | 'dark';

export const ThemePreferences: { value: ThemePreference; label: string; hint: string }[] = [
  { value: 'system', label: 'Match my phone', hint: 'Follows the Android light/dark setting' },
  { value: 'light', label: 'Light', hint: 'Warm paper and ink' },
  { value: 'dark', label: 'Dark', hint: 'Easier on the eyes at night' },
];

const SETTING_KEY = 'themePreference';

type ThemeContextValue = {
  theme: Palette;
  isDark: boolean;
  preference: ThemePreference;
  setPreference: (value: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isPreference(value: string | null): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

/** Must sit inside SQLiteProvider — the choice is stored in the settings table. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const systemScheme = useColorScheme();

  const [preference, setStoredPreference] = useState<ThemePreference>(() => {
    const saved = getSettingSync(db, SETTING_KEY);
    return isPreference(saved) ? saved : 'system';
  });

  const setPreference = useCallback(
    (value: ThemePreference) => {
      setStoredPreference(value);
      // The screen updates from state; persisting can finish on its own.
      setSetting(db, SETTING_KEY, value).catch(() => {});
    },
    [db]
  );

  const value = useMemo<ThemeContextValue>(() => {
    const isDark = preference === 'system' ? systemScheme === 'dark' : preference === 'dark';
    return { theme: isDark ? Colors.dark : Colors.light, isDark, preference, setPreference };
  }, [preference, systemScheme, setPreference]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

function useThemeContext(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme was used outside ThemeProvider');
  return value;
}

/** Resolves the palette for the chosen appearance. */
export function useTheme(): Palette {
  return useThemeContext().theme;
}

export function useIsDark(): boolean {
  return useThemeContext().isDark;
}

export function useThemePreference(): {
  preference: ThemePreference;
  setPreference: (value: ThemePreference) => void;
} {
  const { preference, setPreference } = useThemeContext();
  return { preference, setPreference };
}
