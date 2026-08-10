import { useState } from 'react';
import { Link } from 'expo-router';
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
import { useAuth } from '@/context/AuthContext';
import Colors from '@/constants/Colors';

export default function SignupScreen() {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  const { signup } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!name || !email || !password) {
      setError('Fill in every field to continue.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      // No manual navigation here — Stack.Protected in app/_layout.tsx
      // reacts to the auth state change and swaps to the setup-profile
      // screen (fresh accounts always fail isProfileComplete) on its own.
      await signup(name, email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.title}>Join SCENE</Text>
      <Text style={styles.subtitle}>Build your verified filmmaking profile.</Text>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Name"
          placeholderTextColor={Colors[colorScheme].muted}
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={Colors[colorScheme].muted}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={Colors[colorScheme].muted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable style={styles.button} onPress={handleSubmit} disabled={submitting}>
          {submitting ? (
            <ActivityIndicator color={Colors[colorScheme].background} />
          ) : (
            <Text style={styles.buttonText}>Create account</Text>
          )}
        </Pressable>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Already have an account? </Text>
        <Link href="/login" replace>
          <Text style={styles.footerLink}>Log in</Text>
        </Link>
      </View>

      <Text style={styles.legalText}>
        By creating an account, you agree to SCENE's{' '}
        <Link href="/terms">
          <Text style={styles.legalLink}>Terms of Service</Text>
        </Link>{' '}
        and{' '}
        <Link href="/privacy">
          <Text style={styles.legalLink}>Privacy Policy</Text>
        </Link>
        .
      </Text>
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
  },
  subtitle: {
    color: Colors[colorScheme].muted,
    fontSize: 14,
    marginBottom: 16,
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    color: Colors[colorScheme].muted,
    fontSize: 14,
  },
  footerLink: {
    color: Colors[colorScheme].tint,
    fontSize: 14,
    fontWeight: '600',
  },
  legalText: {
    color: Colors[colorScheme].muted,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
    marginTop: 16,
  },
  legalLink: {
    color: Colors[colorScheme].tint,
    fontWeight: '600',
  },
});
