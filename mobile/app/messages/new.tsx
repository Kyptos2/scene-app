import { useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';

import { AnimatedPressable } from '@/components/AnimatedPressable';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Radius, Space } from '@/constants/Spacing';
import { Fonts, Type } from '@/constants/Typography';
import { startConversation } from '@/lib/api';

export default function NewMessageScreen() {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  const { userId, name, avatarUrl } = useLocalSearchParams<{ userId: string; name: string; avatarUrl?: string }>();
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    const trimmed = body.trim();
    if (!trimmed) return;
    setSending(true);
    setError(null);
    try {
      const { conversation } = await startConversation(userId, trimmed);
      router.replace(`/messages/${conversation.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSending(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.safeArea} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen
        options={{
          title: `Message ${name ?? ''}`,
          headerStyle: { backgroundColor: Colors[colorScheme].background },
          headerTintColor: Colors[colorScheme].text,
          headerShadowVisible: false,
        }}
      />
      <View style={styles.content}>
        <View style={styles.recipientRow}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarInitial}>{(name ?? '?').charAt(0)}</Text>
            </View>
          )}
          <Text style={styles.recipientName}>{name}</Text>
        </View>

        <Text style={styles.hint}>
          If you're not already connected, this opens as a request they can accept, deny, or block.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Write your message…"
          placeholderTextColor={Colors[colorScheme].muted}
          value={body}
          onChangeText={setBody}
          multiline
          maxLength={2000}
          autoFocus
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <AnimatedPressable style={styles.sendButton} haptic="medium" onPress={handleSend} disabled={sending || !body.trim()}>
          {sending ? <ActivityIndicator color={Colors[colorScheme].background} /> : <Text style={styles.sendButtonText}>Send</Text>}
        </AnimatedPressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colorScheme: 'light' | 'dark') =>
  StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors[colorScheme].background,
  },
  content: {
    padding: Space.xl,
    gap: Space.md,
  },
  recipientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm + 2,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarFallback: {
    backgroundColor: Colors[colorScheme].card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: Colors[colorScheme].text,
    fontWeight: '700',
  },
  recipientName: {
    color: Colors[colorScheme].text,
    ...Type.cardTitle,
    fontFamily: Fonts.serif,
  },
  hint: {
    color: Colors[colorScheme].muted,
    ...Type.small,
  },
  input: {
    backgroundColor: Colors[colorScheme].card,
    borderColor: Colors[colorScheme].border,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Space.md + 2,
    paddingVertical: Space.md,
    color: Colors[colorScheme].text,
    ...Type.subtitle,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  error: {
    color: Colors[colorScheme].error,
    ...Type.body,
  },
  sendButton: {
    backgroundColor: Colors[colorScheme].tint,
    borderRadius: Radius.md,
    paddingVertical: Space.md + 2,
    alignItems: 'center',
    marginTop: Space.xs,
  },
  sendButtonText: {
    color: Colors[colorScheme].background,
    ...Type.subtitle,
    fontWeight: '700',
  },
});
