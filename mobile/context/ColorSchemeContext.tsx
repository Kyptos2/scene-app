import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { getSecureItem, setSecureItem } from '@/lib/secureStorage';

const STORAGE_KEY = 'slate_color_scheme';

export type ColorSchemeName = 'light' | 'dark';

type ColorSchemeContextValue = {
  colorScheme: ColorSchemeName;
  setColorScheme: (scheme: ColorSchemeName) => void;
  toggleColorScheme: () => void;
};

const ColorSchemeContext = createContext<ColorSchemeContextValue | null>(null);

// Quiet Editorial (light) is the app's default identity — dark is an opt-in
// reached from Settings, not something derived from the OS. Persisted so the
// choice survives a restart.
export function ColorSchemeProvider({ children }: { children: ReactNode }) {
  const [colorScheme, setColorSchemeState] = useState<ColorSchemeName>('light');

  useEffect(() => {
    getSecureItem(STORAGE_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark') setColorSchemeState(stored);
    });
  }, []);

  function setColorScheme(scheme: ColorSchemeName) {
    setColorSchemeState(scheme);
    setSecureItem(STORAGE_KEY, scheme).catch(() => {});
  }

  function toggleColorScheme() {
    setColorScheme(colorScheme === 'light' ? 'dark' : 'light');
  }

  const value = useMemo(
    () => ({ colorScheme, setColorScheme, toggleColorScheme }),
    [colorScheme],
  );

  return <ColorSchemeContext.Provider value={value}>{children}</ColorSchemeContext.Provider>;
}

export function useColorSchemeContext(): ColorSchemeContextValue {
  const ctx = useContext(ColorSchemeContext);
  if (!ctx) throw new Error('useColorSchemeContext must be used within a ColorSchemeProvider');
  return ctx;
}
