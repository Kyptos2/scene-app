import { useEffect, useState } from 'react';
import { FlatList, Image, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';

import { FeedSkeletonList } from '@/components/SkeletonLoader';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Space } from '@/constants/Spacing';
import { Type } from '@/constants/Typography';
import { useUnreadNotifications } from '@/hooks/useUnreadNotifications';
import { getNotifications, resolveAvatarUrl, type NotificationItem } from '@/lib/api';

const TYPE_LABEL: Record<NotificationItem['type'], string> = {
  connection: 'New Connection',
  application: 'Crew Call Application',
  applause: 'Applause',
  comment: 'Comment',
  catalog_review: 'Indie Catalog',
};

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60) return `${Math.max(minutes, 1)}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function NotificationRow({ item }: { item: NotificationItem }) {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  return (
    <View style={styles.row}>
      {item.actor.avatarUrl ? (
        <Image source={{ uri: resolveAvatarUrl(item.actor.avatarUrl) ?? undefined }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarFallback]}>
          <Text style={styles.avatarInitial}>{item.actor.name.charAt(0)}</Text>
        </View>
      )}
      <View style={styles.meta}>
        <Text style={styles.kicker}>{TYPE_LABEL[item.type]}</Text>
        <Text style={styles.summary}>{item.summary}</Text>
        <Text style={styles.time}>{relativeTime(item.createdAt)} ago</Text>
      </View>
    </View>
  );
}

export default function NotificationsScreen() {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { markViewed } = useUnreadNotifications();

  useEffect(() => {
    getNotifications()
      .then((res) => setItems(res.results))
      .catch(() => setError("Couldn't load notifications. Is the dev server running?"));
    markViewed();
    // markViewed is stable across renders — only fire once, on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.safeArea}>
      <Stack.Screen
        options={{
          title: 'Notifications',
          headerStyle: { backgroundColor: Colors[colorScheme].background },
          headerTintColor: Colors[colorScheme].text,
          headerShadowVisible: false,
        }}
      />
      {items === null && !error ? (
        <FeedSkeletonList count={4} />
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={items ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <NotificationRow item={item} />}
          contentContainerStyle={styles.content}
          ListEmptyComponent={<Text style={styles.emptyText}>Nothing yet — activity on your posts will show up here.</Text>}
        />
      )}
    </View>
  );
}

const createStyles = (colorScheme: 'light' | 'dark') =>
  StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors[colorScheme].background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Space.xxl,
  },
  emptyText: {
    color: Colors[colorScheme].muted,
    ...Type.body,
    textAlign: 'center',
    paddingHorizontal: Space.lg,
    marginTop: Space.lg,
  },
  content: {
    paddingTop: Space.sm,
    paddingBottom: Space.xxl,
  },
  row: {
    flexDirection: 'row',
    gap: Space.md,
    paddingHorizontal: Space.lg,
    paddingVertical: Space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors[colorScheme].border,
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
    borderWidth: 1,
    borderColor: Colors[colorScheme].border,
  },
  avatarInitial: {
    color: Colors[colorScheme].text,
    fontWeight: '700',
  },
  meta: {
    flex: 1,
    gap: 2,
  },
  kicker: {
    color: Colors[colorScheme].secondary,
    ...Type.label,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summary: {
    color: Colors[colorScheme].text,
    ...Type.bodyLarge,
  },
  time: {
    color: Colors[colorScheme].muted,
    ...Type.label,
  },
});
