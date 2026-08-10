import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

import { useAuth } from '@/context/AuthContext';
import { registerPushToken, unregisterPushToken } from '@/lib/api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Registers this device's Expo push token with the backend while the user
// is signed in, and unregisters it on logout. No-ops on web (Expo push
// tokens are a native-only concept) and when no EAS project is configured
// (getExpoPushTokenAsync requires one to reach FCM/APNs).
export function usePushNotifications() {
  const { isAuthenticated } = useAuth();
  const registeredTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || Platform.OS === 'web' || !Device.isDevice) return;

    let cancelled = false;

    async function register() {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
      if (!projectId) return;

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted' || cancelled) return;

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.DEFAULT,
        });
      }

      const { data: expoPushToken } = await Notifications.getExpoPushTokenAsync({ projectId });
      if (cancelled) return;
      registeredTokenRef.current = expoPushToken;
      await registerPushToken(expoPushToken, Platform.OS).catch(() => {});
    }

    register().catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) return;
    const token = registeredTokenRef.current;
    if (!token) return;
    registeredTokenRef.current = null;
    unregisterPushToken(token).catch(() => {});
  }, [isAuthenticated]);
}
