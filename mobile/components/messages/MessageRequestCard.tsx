import { useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { AnimatedPressable } from '@/components/AnimatedPressable';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Radius, Space } from '@/constants/Spacing';
import { Type } from '@/constants/Typography';
import { resolveAvatarUrl, type MessageRequestSummary } from '@/lib/api';

export function MessageRequestCard({
  request,
  onAccept,
  onDeny,
  onBlock,
}: {
  request: MessageRequestSummary;
  onAccept: (id: string) => Promise<void>;
  onDeny: (id: string) => Promise<void>;
  onBlock: (id: string) => Promise<void>;
}) {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  const [pending, setPending] = useState<'accept' | 'deny' | 'block' | null>(null);
  const avatarUrl = resolveAvatarUrl(request.requester.avatarUrl);

  async function run(action: 'accept' | 'deny' | 'block', fn: (id: string) => Promise<void>) {
    if (pending) return;
    setPending(action);
    try {
      await fn(request.id);
    } finally {
      setPending(null);
    }
  }

  return (
    <View style={styles.card}>
      <AnimatedPressable style={styles.header} haptic="light" onPress={() => router.push(`/profile/${request.requester.id}`)}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarInitial}>{request.requester.name.charAt(0)}</Text>
          </View>
        )}
        <View style={styles.identity}>
          <Text style={styles.name}>{request.requester.name}</Text>
          <Text style={styles.handle}>@{request.requester.username}</Text>
          {request.requester.tagline ? <Text style={styles.tagline}>{request.requester.tagline}</Text> : null}
        </View>
      </AnimatedPressable>

      {request.note ? (
        <Text style={styles.note} numberOfLines={4}>
          “{request.note}”
        </Text>
      ) : null}

      {request.mutualProject ? (
        <View style={styles.mutualChip}>
          <Text style={styles.mutualChipText}>Worked together on “{request.mutualProject.title}”</Text>
        </View>
      ) : null}

      <View style={styles.actions}>
        <AnimatedPressable style={styles.denyButton} haptic="light" onPress={() => run('deny', onDeny)} disabled={pending !== null}>
          {pending === 'deny' ? (
            <ActivityIndicator color={Colors[colorScheme].text} size="small" />
          ) : (
            <Text style={styles.denyText}>Deny</Text>
          )}
        </AnimatedPressable>
        <AnimatedPressable style={styles.blockButton} haptic="light" onPress={() => run('block', onBlock)} disabled={pending !== null}>
          {pending === 'block' ? (
            <ActivityIndicator color={Colors[colorScheme].tint} size="small" />
          ) : (
            <Text style={styles.blockText}>Block</Text>
          )}
        </AnimatedPressable>
        <AnimatedPressable style={styles.acceptButton} haptic="medium" onPress={() => run('accept', onAccept)} disabled={pending !== null}>
          {pending === 'accept' ? (
            <ActivityIndicator color={Colors[colorScheme].background} size="small" />
          ) : (
            <Text style={styles.acceptText}>Accept</Text>
          )}
        </AnimatedPressable>
      </View>
    </View>
  );
}

const createStyles = (colorScheme: 'light' | 'dark') =>
  StyleSheet.create({
  card: {
    backgroundColor: Colors[colorScheme].card,
    borderColor: Colors[colorScheme].border,
    borderWidth: 1,
    borderRadius: Radius.xl,
    padding: Space.md + 2,
    marginHorizontal: Space.lg,
    marginBottom: Space.md,
    gap: Space.sm + 2,
  },
  header: { flexDirection: 'row', gap: Space.sm + 2, alignItems: 'center' },
  avatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: Colors[colorScheme].secondary },
  avatarFallback: { backgroundColor: Colors[colorScheme].background, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: Colors[colorScheme].text, fontWeight: '700' },
  identity: { flex: 1 },
  name: { color: Colors[colorScheme].text, ...Type.subtitle, fontWeight: '700' },
  handle: { color: Colors[colorScheme].muted, ...Type.small },
  tagline: { color: Colors[colorScheme].secondary, ...Type.small, fontWeight: '600', marginTop: 2 },
  note: { color: Colors[colorScheme].text, ...Type.bodyLarge, fontStyle: 'italic' },
  mutualChip: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(78, 104, 81, 0.16)',
    borderColor: 'rgba(78, 104, 81, 0.5)',
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: Space.sm + 2,
    paddingVertical: 4,
  },
  mutualChipText: { color: Colors[colorScheme].secondary, ...Type.label, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: Space.sm, marginTop: 2 },
  denyButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors[colorScheme].border,
    borderRadius: Radius.md,
    paddingVertical: Space.sm + 2,
    alignItems: 'center',
  },
  denyText: { color: Colors[colorScheme].text, ...Type.body, fontWeight: '600' },
  blockButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors[colorScheme].tint,
    borderRadius: Radius.md,
    paddingVertical: Space.sm + 2,
    alignItems: 'center',
  },
  blockText: { color: Colors[colorScheme].tint, ...Type.body, fontWeight: '600' },
  acceptButton: {
    flex: 1.4,
    backgroundColor: Colors[colorScheme].tint,
    borderRadius: Radius.md,
    paddingVertical: Space.sm + 2,
    alignItems: 'center',
  },
  acceptText: { color: Colors[colorScheme].background, ...Type.body, fontWeight: '700' },
});
