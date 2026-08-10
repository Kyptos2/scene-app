import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, Stack } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SceneMark } from '@/components/SceneMark';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Radius, Space } from '@/constants/Spacing';
import { Fonts, Type } from '@/constants/Typography';
import { useAuth } from '@/context/AuthContext';
import { haptics } from '@/lib/haptics';
import {
  isAppleSignInAvailable,
  isGoogleSignInConfigured,
  signInWithApple,
  useGoogleSignIn,
} from '@/lib/oauth';

// The entry point for a signed-out device — a brand moment first, forms
// second. "Continue where you left off" is the whole app's promise; this
// screen just sets the mood before the actual sign-in/sign-up forms below
// (which stay exactly where they were, at /login and /signup).
export default function WelcomeScreen() {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  const { loginWithGoogle, loginWithApple } = useAuth();
  const [request, , promptGoogleAsync] = useGoogleSignIn();
  const [busy, setBusy] = useState<'google' | 'apple' | null>(null);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    isAppleSignInAvailable().then(setAppleAvailable);
  }, []);

  async function handleGoogle() {
    if (busy) return;
    if (!isGoogleSignInConfigured) {
      Alert.alert('Not set up yet', 'Google sign-in needs a client ID before it can be used.');
      return;
    }
    setError(null);
    setBusy('google');
    try {
      const result = await promptGoogleAsync();
      if (result.type === 'success' && result.params.id_token) {
        await loginWithGoogle(result.params.id_token);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in with Google.');
    } finally {
      setBusy(null);
    }
  }

  async function handleApple() {
    if (busy) return;
    setError(null);
    setBusy('apple');
    try {
      const { identityToken, fullName } = await signInWithApple();
      await loginWithApple(identityToken, fullName);
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code !== 'ERR_REQUEST_CANCELED') {
        setError(err instanceof Error ? err.message : 'Could not sign in with Apple.');
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <LinearGradient
        colors={
          colorScheme === 'dark' ? ['#1E2327', Colors.dark.background] : ['#F1ECE4', Colors.light.background]
        }
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.brandBlock}>
          <SceneMark size={FRAME_SIZE} color={Colors[colorScheme].text} />
          <Text style={styles.wordmark}>SCENE</Text>
          <Text style={styles.heading}>Network. Create. Inspire.</Text>
        </View>

        <View style={styles.actions}>
          {appleAvailable ? (
            <Pressable
              style={[styles.button, styles.appleButton]}
              onPress={() => {
                haptics.medium();
                handleApple();
              }}
              disabled={busy !== null}
            >
              {busy === 'apple' ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <SymbolView name={{ ios: 'applelogo' }} size={17} tintColor="#FFFFFF" />
                  <Text style={styles.appleButtonText}>Continue with Apple</Text>
                </>
              )}
            </Pressable>
          ) : null}

          <Pressable
            style={[styles.button, styles.googleButton, !isGoogleSignInConfigured && styles.buttonDisabled]}
            onPress={() => {
              haptics.medium();
              handleGoogle();
            }}
            disabled={busy !== null || !request}
          >
            {busy === 'google' ? (
              <ActivityIndicator color={Colors[colorScheme].text} />
            ) : (
              <>
                <View style={styles.googleMark}>
                  <Text style={styles.googleMarkText}>G</Text>
                </View>
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </>
            )}
          </Pressable>

          <Pressable
            style={[styles.button, styles.emailButton]}
            onPress={() => {
              haptics.light();
              router.push('/login');
            }}
            disabled={busy !== null}
          >
            <SymbolView
              name={{ ios: 'envelope', android: 'mail', web: 'mail' }}
              size={16}
              tintColor={Colors[colorScheme].text}
            />
            <Text style={styles.emailButtonText}>Continue with Email</Text>
          </Pressable>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.footer}>
            <Text style={styles.footerText}>New here? </Text>
            <Pressable onPress={() => router.push('/signup')} hitSlop={8}>
              <Text style={styles.footerLink}>Create an account</Text>
            </Pressable>
          </View>

          <View style={styles.legalRow}>
            <Pressable onPress={() => router.push('/terms')} hitSlop={8}>
              <Text style={styles.legalLink}>Terms</Text>
            </Pressable>
            <Text style={styles.legalDivider}>·</Text>
            <Pressable onPress={() => router.push('/privacy')} hitSlop={8}>
              <Text style={styles.legalLink}>Privacy</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const FRAME_SIZE = 96;

const createStyles = (colorScheme: 'light' | 'dark') =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: Colors[colorScheme].background,
    },
    safeArea: {
      flex: 1,
      justifyContent: 'space-between',
      paddingHorizontal: Space.xl,
      paddingBottom: Space.lg,
    },
    brandBlock: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: Space.lg,
    },
    wordmark: {
      color: Colors[colorScheme].text,
      fontSize: 30,
      fontWeight: '800',
      letterSpacing: 8,
    },
    // The editorial serif (Fraunces) is this app's established headline
    // voice everywhere else — Home's greeting, section titles, card
    // headlines — so a new welcome-screen heading uses the same italic cut
    // rather than falling back to system sans, which is reserved for body/
    // meta text per the Typography.ts convention.
    heading: {
      color: Colors[colorScheme].text,
      ...Type.heading,
      fontFamily: Fonts.serifItalic,
      textAlign: 'center',
    },
    actions: {
      gap: Space.sm + 2,
    },
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Space.sm,
      borderRadius: Radius.pill,
      paddingVertical: Space.md,
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    appleButton: {
      backgroundColor: '#000000',
    },
    appleButtonText: {
      color: '#FFFFFF',
      ...Type.bodyLarge,
      fontWeight: '700',
    },
    googleButton: {
      backgroundColor: Colors[colorScheme].card,
      borderWidth: 1,
      borderColor: Colors[colorScheme].border,
    },
    googleButtonText: {
      color: Colors[colorScheme].text,
      ...Type.bodyLarge,
      fontWeight: '700',
    },
    googleMark: {
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: '#4285F4',
      alignItems: 'center',
      justifyContent: 'center',
    },
    googleMarkText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '800',
    },
    emailButton: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: Colors[colorScheme].border,
    },
    emailButtonText: {
      color: Colors[colorScheme].text,
      ...Type.bodyLarge,
      fontWeight: '700',
    },
    error: {
      color: Colors[colorScheme].error,
      ...Type.small,
      textAlign: 'center',
      marginTop: Space.xs,
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: Space.md,
    },
    footerText: {
      color: Colors[colorScheme].muted,
      ...Type.body,
    },
    footerLink: {
      color: Colors[colorScheme].tint,
      ...Type.body,
      fontWeight: '700',
    },
    legalRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: Space.sm,
      marginTop: Space.lg,
    },
    legalLink: {
      color: Colors[colorScheme].muted,
      ...Type.small,
      fontWeight: '600',
    },
    legalDivider: {
      color: Colors[colorScheme].muted,
      ...Type.small,
    },
  });
