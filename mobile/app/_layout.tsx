import { Fraunces_500Medium_Italic, Fraunces_600SemiBold } from '@expo-google-fonts/fraunces';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';

import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ColorSchemeProvider } from '@/context/ColorSchemeContext';
import { SceneSplash } from '@/components/SceneSplash';
import { useColorScheme } from '@/components/useColorScheme';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Fonts } from '@/constants/Typography';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    // Scoped mockup: an editorial serif for headline-tier text, tried out
    // on the Home screen only for now — see components/home/HomeDashboard.tsx.
    // Not yet wired into the shared Typography.ts scale on purpose, so it
    // doesn't ripple into every other screen until the direction is approved.
    Fraunces_600SemiBold,
    Fraunces_500Medium_Italic,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ColorSchemeProvider>
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
    </ColorSchemeProvider>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { isLoading, isAuthenticated, isProfileComplete } = useAuth();
  const [showIntro, setShowIntro] = useState(true);
  usePushNotifications();

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync();
    }
  }, [isLoading]);

  // Keep the native (static) splash screen up while we check for a stored session.
  if (isLoading) {
    return null;
  }

  // The real navigator mounts immediately underneath the animated SCENE intro
  // so that by the time the intro's zoom-exit reveals it, it's already loaded.
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      {/* Every pushed screen (Settings, Notifications, Project, Workspace, ...)
          renders its title through this native header rather than a custom
          Text component, so the editorial serif has to be threaded in here
          to reach them — per-screen headerTitleStyle overrides still win. */}
      <Stack screenOptions={{ headerTitleStyle: { fontFamily: Fonts.serif } }}>
        <Stack.Protected guard={isAuthenticated && isProfileComplete}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
          <Stack.Screen name="profile/[userId]" />
          <Stack.Screen name="project/[id]" />
          <Stack.Screen name="project/new" options={{ presentation: 'modal' }} />
          <Stack.Screen name="crew-call/[id]" />
          <Stack.Screen name="messages/[id]" />
          <Stack.Screen name="messages/new" options={{ presentation: 'modal' }} />
          <Stack.Screen name="workspace/[id]" />
          <Stack.Screen name="notifications" />
          <Stack.Screen name="connections" />
          <Stack.Screen name="film/submit" options={{ presentation: 'modal' }} />
          <Stack.Screen name="festival/new" options={{ presentation: 'modal' }} />
          <Stack.Screen name="moderation/pending-films" />
          <Stack.Screen name="moderation/reports" />
          <Stack.Screen name="report" options={{ presentation: 'modal' }} />
          <Stack.Screen name="edit-profile" options={{ presentation: 'modal' }} />
          <Stack.Screen name="settings" />
          <Stack.Screen name="subscription" />
        </Stack.Protected>

        <Stack.Protected guard={isAuthenticated && !isProfileComplete}>
          <Stack.Screen name="setup-profile" options={{ headerShown: false, gestureEnabled: false }} />
        </Stack.Protected>

        <Stack.Protected guard={!isAuthenticated}>
          <Stack.Screen name="welcome" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="signup" options={{ headerShown: false }} />
          <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
          <Stack.Screen name="reset-password" options={{ headerShown: false }} />
        </Stack.Protected>

        {/* Reachable regardless of auth state — a just-signed-up user is
            already logged in when they open this link, but the link must
            also work for someone who isn't. */}
        <Stack.Screen name="verify-email" options={{ headerShown: false }} />

        {/* Linked from both the signup screen (pre-auth) and profile/settings
            (post-auth), so these stay outside the guarded groups too. */}
        <Stack.Screen name="terms" />
        <Stack.Screen name="privacy" />
      </Stack>
      {showIntro && <SceneSplash onFinish={() => setShowIntro(false)} />}
    </ThemeProvider>
  );
}
