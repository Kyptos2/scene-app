import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { verifyEmail } from '@/lib/api';

export default function VerifyEmailScreen() {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  const { token } = useLocalSearchParams<{ token?: string }>();
  const { isAuthenticated, refreshProfile } = useAuth();
  const [status, setStatus] = useState<'verifying' | 'done' | 'error'>('verifying');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setError('This verification link is missing its token.');
      return;
    }
    verifyEmail(token)
      .then(async () => {
        if (isAuthenticated) await refreshProfile().catch(() => {});
        setStatus('done');
      })
      .catch((err) => {
        setStatus('error');
        setError(err instanceof Error ? err.message : 'This verification link is invalid or has expired.');
      });
    // Only re-run if the token itself changes — refreshProfile/isAuthenticated
    // are stable enough here that including them would just cause re-verifies.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <View style={styles.container}>
      {status === 'verifying' ? (
        <ActivityIndicator color={Colors[colorScheme].tint} />
      ) : status === 'done' ? (
        <View style={styles.form}>
          <Text style={styles.title}>Email verified</Text>
          <Text style={styles.message}>Your email address has been confirmed.</Text>
          <Pressable
            style={styles.button}
            onPress={() => router.replace(isAuthenticated ? '/' : '/login')}
          >
            <Text style={styles.buttonText}>{isAuthenticated ? 'Continue' : 'Log In'}</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.form}>
          <Text style={styles.title}>Verification failed</Text>
          <Text style={styles.error}>{error}</Text>
          <Pressable style={styles.button} onPress={() => router.replace(isAuthenticated ? '/' : '/login')}>
            <Text style={styles.buttonText}>{isAuthenticated ? 'Continue' : 'Log In'}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const createStyles = (colorScheme: 'light' | 'dark') =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors[colorScheme].background,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  form: {
    gap: 12,
    alignItems: 'center',
  },
  title: {
    color: Colors[colorScheme].text,
    fontSize: 24,
    fontWeight: '700',
  },
  message: {
    color: Colors[colorScheme].muted,
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
  },
  error: {
    color: Colors[colorScheme].error,
    fontSize: 14,
    textAlign: 'center',
  },
  button: {
    backgroundColor: Colors[colorScheme].tint,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonText: {
    color: Colors[colorScheme].background,
    fontSize: 15,
    fontWeight: '700',
  },
});
