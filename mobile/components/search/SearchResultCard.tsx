import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { AnimatedPressable } from '@/components/AnimatedPressable';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Radius, Space } from '@/constants/Spacing';
import { Type } from '@/constants/Typography';
import { createConnection, resolveAvatarUrl } from '@/lib/api';
import type { SearchUserResult } from '@/lib/search';

export function SearchResultCard({ result }: { result: SearchUserResult }) {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  const [connectState, setConnectState] = useState<'idle' | 'sending' | 'sent'>(
    result.connectionStatus === 'none' ? 'idle' : 'sent',
  );
  const [error, setError] = useState<string | null>(null);

  async function handleConnect() {
    if (connectState !== 'idle') return;
    setConnectState('sending');
    setError(null);
    try {
      await createConnection(result.id);
      setConnectState('sent');
    } catch {
      setConnectState('idle');
      setError("Couldn't send that request. Try again.");
    }
  }

  return (
    <View style={styles.card}>
      {result.avatarUrl ? (
        <Image source={{ uri: resolveAvatarUrl(result.avatarUrl) ?? undefined }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarFallback]}>
          <Text style={styles.avatarInitial}>{result.name.charAt(0)}</Text>
        </View>
      )}

      <View style={styles.meta}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {result.name}
          </Text>
          {result.verified ? <Text style={styles.verified}>✓</Text> : null}
          <Text style={styles.handle}>@{result.handle}</Text>
        </View>
        <Text style={styles.tagline} numberOfLines={1}>
          {result.tagline}
        </Text>
        {result.distanceKm != null ? (
          <Text style={styles.distance}>{result.distanceKm.toFixed(0)} km away</Text>
        ) : null}

        <View style={styles.actions}>
          <AnimatedPressable style={styles.connectButton} haptic="medium" onPress={handleConnect} disabled={connectState !== 'idle'}>
            <Text style={styles.connectButtonText}>
              {connectState === 'sent' ? 'Connected' : connectState === 'sending' ? 'Connecting…' : 'Connect'}
            </Text>
          </AnimatedPressable>
          <AnimatedPressable style={styles.profileButton} haptic="light" onPress={() => router.push(`/profile/${result.id}`)}>
            <Text style={styles.profileButtonText}>View Profile</Text>
          </AnimatedPressable>
        </View>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>
    </View>
  );
}

const createStyles = (colorScheme: 'light' | 'dark') =>
  StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: Space.md,
    backgroundColor: Colors[colorScheme].card,
    borderColor: Colors[colorScheme].border,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Space.md,
    marginHorizontal: Space.lg,
    marginBottom: Space.sm,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarFallback: {
    backgroundColor: Colors[colorScheme].border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: Colors[colorScheme].text,
    fontWeight: '700',
    fontSize: 16,
  },
  meta: {
    flex: 1,
    gap: 3,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Space.xs + 2,
  },
  name: {
    color: Colors[colorScheme].text,
    ...Type.subtitle,
    fontWeight: '700',
    flexShrink: 1,
  },
  handle: {
    color: Colors[colorScheme].muted,
    ...Type.small,
  },
  verified: {
    color: Colors[colorScheme].secondary,
    ...Type.small,
  },
  tagline: {
    color: Colors[colorScheme].text,
    ...Type.body,
    fontWeight: '600',
  },
  distance: {
    color: Colors[colorScheme].muted,
    ...Type.label,
  },
  actions: {
    flexDirection: 'row',
    gap: Space.sm,
    marginTop: Space.xs + 2,
  },
  connectButton: {
    backgroundColor: Colors[colorScheme].tint,
    borderRadius: Radius.pill,
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm - 2,
  },
  connectButtonText: {
    color: Colors[colorScheme].background,
    ...Type.small,
    fontWeight: '700',
  },
  profileButton: {
    borderWidth: 1,
    borderColor: Colors[colorScheme].border,
    borderRadius: Radius.pill,
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm - 2,
  },
  profileButtonText: {
    color: Colors[colorScheme].text,
    ...Type.small,
    fontWeight: '700',
  },
  errorText: {
    color: Colors[colorScheme].error,
    ...Type.label,
    marginTop: Space.xs,
  },
});
