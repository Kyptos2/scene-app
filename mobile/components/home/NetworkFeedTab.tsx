import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { HomeDashboard } from '@/components/home/HomeDashboard';
import { NetworkFeedCard } from '@/components/home/NetworkFeedCard';
import { PostCrewCallSheet } from '@/components/home/PostCrewCallSheet';
import { PostUpdateSheet } from '@/components/home/PostUpdateSheet';
import { FeedSkeletonList } from '@/components/SkeletonLoader';
import { useViewfinderPullRefresh, ViewfinderRefreshHeader } from '@/components/home/ViewfinderRefreshHeader';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { composeFeed } from '@/lib/feedComposer';
import { onFeedShouldRefresh } from '@/lib/feedEvents';
import { useLocation } from '@/hooks/useLocation';
import { getNetworkFeed } from '@/lib/api';
import type { NetworkFeedItem } from '@/lib/networkFeed';

type ComposeMode = null | 'crew_call' | 'update';

export function NetworkFeedTab() {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  const { coords } = useLocation();
  const [items, setItems] = useState<NetworkFeedItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [composing, setComposing] = useState<ComposeMode>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await getNetworkFeed(coords);
      setItems(composeFeed(res.results));
    } catch {
      setError("Couldn't load your feed. Is the dev server running?");
    }
  }, [coords]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useEffect(() => onFeedShouldRefresh(load), [load]);

  const { scrollHandler, pullDistance, refreshing } = useViewfinderPullRefresh(load);

  const handleDeleted = useCallback((deleted: NetworkFeedItem) => {
    setItems((prev) => (prev ?? []).filter((it) => it.id !== deleted.id));
  }, []);

  if (items === null && !error) {
    return (
      <View style={styles.container}>
        <FeedSkeletonList />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ViewfinderRefreshHeader pullDistance={pullDistance} refreshing={refreshing} />
      <Animated.FlatList
        data={items ?? []}
        keyExtractor={(item: NetworkFeedItem) => item.id}
        renderItem={({ item, index }: { item: NetworkFeedItem; index: number }) => (
          <Animated.View entering={FadeInUp.delay(Math.min(index, 8) * 60).damping(18).springify()}>
            <NetworkFeedCard item={item} onDeleted={handleDeleted} />
          </Animated.View>
        )}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View>
            <HomeDashboard coords={coords} />
            {composing === 'crew_call' ? (
              <PostCrewCallSheet
                onCancel={() => setComposing(null)}
                onDone={() => {
                  setComposing(null);
                  setItems(null);
                  load();
                }}
              />
            ) : composing === 'update' ? (
              <PostUpdateSheet
                onCancel={() => setComposing(null)}
                onDone={() => {
                  setComposing(null);
                  setItems(null);
                  load();
                }}
              />
            ) : (
              <View style={styles.composeRow}>
                <Pressable style={styles.composeButton} onPress={() => setComposing('crew_call')}>
                  <Text style={styles.composeButtonText}>+ Post a Crew Call</Text>
                </Pressable>
                <Pressable style={[styles.composeButton, styles.composeButtonAlt]} onPress={() => setComposing('update')}>
                  <Text style={[styles.composeButtonText, styles.composeButtonTextAlt]}>+ Share an Update</Text>
                </Pressable>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>Nothing in your network feed yet — post a crew call to get started.</Text>
        }
      />
    </View>
  );
}

const createStyles = (colorScheme: 'light' | 'dark') =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors[colorScheme].background,
  },
  content: {
    paddingTop: 8,
    paddingBottom: 140, // clears the floating [+] tab button so it never overlaps the last card
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors[colorScheme].background,
    padding: 24,
  },
  emptyText: {
    color: Colors[colorScheme].muted,
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 16,
    marginTop: 16,
  },
  composeRow: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  composeButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors[colorScheme].tint,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  composeButtonAlt: {
    borderColor: Colors[colorScheme].secondary,
  },
  composeButtonText: {
    color: Colors[colorScheme].tint,
    fontSize: 13,
    fontWeight: '700',
  },
  composeButtonTextAlt: {
    color: Colors[colorScheme].secondary,
  },
});
