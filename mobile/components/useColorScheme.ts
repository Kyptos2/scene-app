import { useColorSchemeContext, type ColorSchemeName } from '@/context/ColorSchemeContext';

// Sourced from the app's own theme setting (Settings → Appearance), not the
// OS scheme — the app has an explicit light/dark identity, not a
// system-follows default.
export function useColorScheme(): ColorSchemeName {
  return useColorSchemeContext().colorScheme;
}
