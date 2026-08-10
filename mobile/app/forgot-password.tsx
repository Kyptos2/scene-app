import { useState } from 'react';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { forgotPassword } from '@/lib/api';

export default function ForgotPasswordScreen() {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!email.trim()) {
      setError('Enter your email.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await forgotPassword(email.trim());
      setSent(true);
    } catch {
      setError('Something went wrong. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backLink}>
        <Text style={styles.backLinkText}>← Back</Text>
      </Pressable>

      <Text style={styles.title}>Reset your password</Text>

      {sent ? (
        <Text style={styles.confirmation}>
          If that email has an account, we've sent a link to reset your password. It expires in 1 hour.
        </Text>
      ) : (
        <View style={styles.form}>
          <Text style={styles.hint}>Enter your account email and we'll send you a reset link.</Text>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={Colors[colorScheme].muted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <Pressable style={styles.button} onPress={handleSubmit} disabled={submitting}>
            {submitting ? (
              <ActivityIndicator color={Colors[colorScheme].background} />
            ) : (
              <Text style={styles.buttonText}>Send Reset Link</Text>
            )}
          </Pressable>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const createStyles = (colorScheme: 'light' | 'dark') =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors[colorScheme].background,
    padding: 24,
    justifyContent: 'center',
    gap: 8,
  },
  backLink: {
    position: 'absolute',
    top: 60,
    left: 24,
  },
  backLinkText: {
    color: Colors[colorScheme].tint,
    fontSize: 14,
    fontWeight: '600',
  },
  title: {
    color: Colors[colorScheme].text,
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 16,
  },
  confirmation: {
    color: Colors[colorScheme].text,
    fontSize: 15,
    lineHeight: 21,
  },
  form: {
    gap: 12,
  },
  hint: {
    color: Colors[colorScheme].muted,
    fontSize: 14,
    lineHeight: 19,
    marginBottom: 4,
  },
  input: {
    backgroundColor: Colors[colorScheme].card,
    borderColor: Colors[colorScheme].border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: Colors[colorScheme].text,
    fontSize: 15,
  },
  error: {
    color: Colors[colorScheme].error,
    fontSize: 13,
  },
  button: {
    backgroundColor: Colors[colorScheme].tint,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonText: {
    color: Colors[colorScheme].background,
    fontSize: 15,
    fontWeight: '700',
  },
});
