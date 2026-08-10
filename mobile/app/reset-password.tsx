import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
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
import { resetPassword } from '@/lib/api';

export default function ResetPasswordScreen() {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!token) {
      setError('This reset link is missing its token.');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await resetPassword(token, newPassword);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'This reset link is invalid or has expired.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={styles.title}>Set a new password</Text>

      {!token ? (
        <Text style={styles.error}>This reset link is missing its token. Request a new one from the login screen.</Text>
      ) : done ? (
        <View style={styles.form}>
          <Text style={styles.confirmation}>Your password has been reset.</Text>
          <Pressable style={styles.button} onPress={() => router.replace('/login')}>
            <Text style={styles.buttonText}>Log In</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="New password"
            placeholderTextColor={Colors[colorScheme].muted}
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
          />
          <TextInput
            style={styles.input}
            placeholder="Confirm new password"
            placeholderTextColor={Colors[colorScheme].muted}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <Pressable style={styles.button} onPress={handleSubmit} disabled={submitting}>
            {submitting ? (
              <ActivityIndicator color={Colors[colorScheme].background} />
            ) : (
              <Text style={styles.buttonText}>Reset Password</Text>
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
