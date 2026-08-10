import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// expo-haptics is a no-op stub on web that still returns a rejected-ish
// promise in some environments — short-circuit there rather than let every
// call site guard for it.
const supported = Platform.OS !== 'web';

export const haptics = {
  light: () => {
    if (supported) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  },
  medium: () => {
    if (supported) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  },
  selection: () => {
    if (supported) Haptics.selectionAsync().catch(() => {});
  },
  success: () => {
    if (supported) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  },
  warning: () => {
    if (supported) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
  },
};
