import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimatedPressable } from '@/components/AnimatedPressable';
import { SceneMark } from '@/components/SceneMark';
import { AppDrawer } from '@/components/shell/AppDrawer';
import { SearchBar } from '@/components/search/SearchBar';
import { SearchResultCard } from '@/components/search/SearchResultCard';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Space } from '@/constants/Spacing';
import { Type } from '@/constants/Typography';
import { useLocation } from '@/hooks/useLocation';
import { useUnreadNotifications } from '@/hooks/useUnreadNotifications';
import { getMessageRequests, getMyWorkspaceInvites, getSuggestedUsers, searchUsers } from '@/lib/api';
import type { SearchUserResult } from '@/lib/search';

// A punchier red than the brand's muted terracotta tint, scoped to this file
// only — the reference uses a distinct alert color for the unread dot rather
// than reusing the same accent everywhere else on screen (New Project
// button, accept buttons, badges), so it reads as urgency rather than brand.
const ALERT_RED = '#E5484D';

// Persistent header across every tab: hamburger opens the side menu (search,
// connections, settings, sign out all moved there — see AppDrawer), the
// wordmark sits centered between two equal-width end slots so it's optically
// centered regardless of icon sizes, and the bell carries a live unread dot
// sourced from the same notifications list the Notifications screen reads.
export function AppHeader() {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  const insets = useSafeAreaInsets();
  const { coords } = useLocation();
  const { hasUnread } = useUnreadNotifications();
  const [expanded, setExpanded] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [results, setResults] = useState<SearchUserResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [pendingNetworkCount, setPendingNetworkCount] = useState(0);
  const [suggested, setSuggested] = useState<SearchUserResult[] | null>(null);
  const [suggestedLoading, setSuggestedLoading] = useState(false);

  useEffect(() => {
    if (!expanded || suggested !== null) return;
    setSuggestedLoading(true);
    getSuggestedUsers(coords)
      .then((res) => setSuggested(res.results))
      .catch(() => setSuggested([]))
      .finally(() => setSuggestedLoading(false));
  }, [expanded, suggested, coords]);

  useFocusEffect(
    useCallback(() => {
      Promise.all([getMessageRequests(), getMyWorkspaceInvites()])
        .then(([reqRes, inviteRes]) => setPendingNetworkCount(reqRes.results.length + inviteRes.results.length))
        .catch(() => {});
    }, []),
  );

  const handleQueryChange = useCallback(
    (q: string) => {
      setQuery(q);
      if (!q) {
        setResults(null);
        return;
      }
      setLoading(true);
      searchUsers(q, coords)
        .then((res) => setResults(res.results))
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    },
    [coords],
  );

  function close() {
    setExpanded(false);
    setQuery('');
    setResults(null);
    setSuggested(null);
  }

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 8 }]}>
      <View style={styles.row}>
        <View style={styles.sideSlot}>
          <AnimatedPressable
            style={styles.iconButton}
            hitSlop={8}
            haptic="light"
            onPress={() => setDrawerOpen(true)}
          >
            <SymbolView
              name={{ ios: 'line.3.horizontal', android: 'menu', web: 'menu' }}
              size={18}
              tintColor={Colors[colorScheme].text}
            />
          </AnimatedPressable>
        </View>

        <View style={styles.wordmarkRow}>
          <SceneMark size={18} color={Colors[colorScheme].text} />
          <Text style={styles.wordmark}>SCENE</Text>
        </View>

        <View style={[styles.sideSlot, styles.sideSlotEnd]}>
          <AnimatedPressable
            style={styles.iconButton}
            hitSlop={8}
            haptic="light"
            onPress={() => router.push('/notifications')}
          >
            <SymbolView
              name={{ ios: 'bell.fill', android: 'notifications', web: 'notifications' }}
              size={17}
              tintColor={Colors[colorScheme].text}
            />
            {hasUnread ? <View style={styles.badge} /> : null}
          </AnimatedPressable>
        </View>
      </View>

      <AppDrawer
        visible={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSearchPress={() => {
          setDrawerOpen(false);
          setExpanded(true);
        }}
        pendingNetworkCount={pendingNetworkCount}
      />

      <Modal visible={expanded} animationType="fade" transparent onRequestClose={close}>
        <View style={[styles.overlay, { paddingTop: insets.top + 8 }]}>
          <View style={styles.overlaySearchRow}>
            <View style={styles.overlaySearchBar}>
              <SearchBar onQueryChange={handleQueryChange} autoFocus />
            </View>
            <Pressable onPress={close} hitSlop={8} style={styles.cancelButton}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>

          {loading ? <ActivityIndicator color={Colors[colorScheme].tint} style={styles.spinner} /> : null}

          {!loading && query && results?.length === 0 ? (
            <Text style={styles.emptyText}>No filmmakers found for "{query}".</Text>
          ) : null}

          {!query && !loading && suggestedLoading ? (
            <ActivityIndicator color={Colors[colorScheme].tint} style={styles.spinner} />
          ) : null}

          {!query && !loading && !suggestedLoading && suggested?.length === 0 ? (
            <Text style={styles.emptyText}>Search by name, @username, or role — "gaffer", "DP", "sound".</Text>
          ) : null}

          {!query && !loading && !suggestedLoading && suggested && suggested.length > 0 ? (
            <Text style={styles.suggestedTitle}>Suggested for you</Text>
          ) : null}

          <FlatList
            data={query ? results ?? [] : suggested ?? []}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <SearchResultCard result={item} />}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
          />
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (colorScheme: 'light' | 'dark') =>
  StyleSheet.create({
  wrap: {
    backgroundColor: Colors[colorScheme].background,
    paddingHorizontal: Space.lg,
    paddingBottom: Space.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Both end slots are the same fixed width so the wordmark's flex:1 center
  // section is optically centered regardless of icon count on either side.
  sideSlot: {
    width: 34,
    alignItems: 'flex-start',
  },
  sideSlotEnd: {
    alignItems: 'flex-end',
  },
  wordmarkRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Space.xs + 2,
  },
  wordmark: {
    color: Colors[colorScheme].text,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 6,
  },
  iconButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: ALERT_RED,
    borderWidth: 1.5,
    borderColor: Colors[colorScheme].background,
  },
  overlay: {
    flex: 1,
    backgroundColor: Colors[colorScheme].background,
    paddingHorizontal: Space.lg,
  },
  overlaySearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md - 2,
  },
  overlaySearchBar: {
    flex: 1,
  },
  cancelButton: {
    paddingVertical: Space.sm,
  },
  cancelText: {
    color: Colors[colorScheme].tint,
    ...Type.bodyLarge,
    fontWeight: '600',
  },
  spinner: {
    marginTop: Space.lg,
  },
  emptyText: {
    color: Colors[colorScheme].muted,
    ...Type.body,
    marginTop: Space.lg,
  },
  suggestedTitle: {
    color: Colors[colorScheme].muted,
    ...Type.small,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: Space.lg,
    marginBottom: Space.xs,
  },
  list: {
    paddingBottom: Space.xxl,
  },
});
