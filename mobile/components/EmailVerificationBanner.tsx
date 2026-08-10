import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { resendVerificationEmail } from '@/lib/api';
import { getSecureItem, setSecureItem } from '@/lib/secureStorage';

const DISMISS_KEY = 'email_verify_banner_dismissed';

// Soft gate: nudges an unverified account without blocking anything they
// do. Dismissible per-device — it was previously permanent chrome with no
// way to acknowledge it, which read as broken ("why does it never go away").
export function EmailVerificationBanner() {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  const { user } = useAuth();
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    getSecureItem(DISMISS_KEY).then((value) => {
      if (value === '1') setDismissed(true);
    });
  }, []);

  function handleDismiss() {
    setDismissed(true);
    setSecureItem(DISMISS_KEY, '1').catch(() => {});
  }

  if (!user || user.emailVerifiedAt || dismissed) return null;

  async function handleResend() {
    setState('sending');
    setError(null);
    try {
      await resendVerificationEmail();
      setState('sent');
    } catch {
      setState('idle');
      setError("Couldn't resend. Try again.");
    }
  }

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>
        {state === 'sent' ? 'Verification email sent — check your inbox.' : 'Please verify your email address.'}
      </Text>
      {state !== 'sent' ? (
        <Pressable onPress={handleResend} disabled={state === 'sending'} hitSlop={6}>
          <Text style={styles.action}>{state === 'sending' ? 'Sending…' : 'Resend'}</Text>
        </Pressable>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable onPress={handleDismiss} hitSlop={8}>
        <Text style={styles.dismiss}>✕</Text>
      </Pressable>
    </View>
  );
}

const createStyles = (colorScheme: 'light' | 'dark') =>
  StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(184, 58, 45, 0.12)',
    borderColor: 'rgba(184, 58, 45, 0.4)',
    borderWidth: 1,
    borderRadius: 10,
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 8,
  },
  text: {
    color: Colors[colorScheme].text,
    fontSize: 12,
    flex: 1,
  },
  action: {
    color: Colors[colorScheme].tint,
    fontSize: 12,
    fontWeight: '700',
  },
  error: {
    color: Colors[colorScheme].error,
    fontSize: 11,
  },
  dismiss: {
    color: Colors[colorScheme].muted,
    fontSize: 13,
    fontWeight: '700',
  },
});
