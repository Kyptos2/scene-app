import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import Animated from 'react-native-reanimated';

import { CatalogFilmCard } from '@/components/home/CatalogFilmCard';
import { useViewfinderPullRefresh, ViewfinderRefreshHeader } from '@/components/home/ViewfinderRefreshHeader';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { getCatalog, type CatalogFilm } from '@/lib/api';

export function ReviewsTab() {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  const { user } = useAuth();
  const [films, setFilms] = useState<CatalogFilm[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await getCatalog();
      setFilms(res.results);
    } catch {
      setError("Couldn't load the catalog. Is the dev server running?");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const { scrollHandler, pullDistance, refreshing } = useViewfinderPullRefresh(load);

  return (
    <View style={styles.container}>
      <ViewfinderRefreshHeader pullDistance={pullDistance} refreshing={refreshing} />
      <Animated.ScrollView contentContainerStyle={styles.content} onScroll={scrollHandler} scrollEventThrottle={16}>
        <Pressable style={styles.submitButton} onPress={() => router.push('/film/submit')}>
          <Text style={styles.submitButtonText}>+ Submit a Film</Text>
        </Pressable>

        {user?.isModerator ? (
          <View style={styles.moderationRow}>
            <Pressable style={styles.moderationButton} onPress={() => router.push('/moderation/pending-films')}>
              <Text style={styles.moderationButtonText}>Pending Films</Text>
            </Pressable>
            <Pressable style={styles.moderationButton} onPress={() => router.push('/moderation/reports')}>
              <Text style={styles.moderationButtonText}>Reports</Text>
            </Pressable>
          </View>
        ) : null}

        {error && <Text style={styles.error}>{error}</Text>}

        {films === null && !error ? (
          <ActivityIndicator color={Colors[colorScheme].tint} style={styles.spinner} />
        ) : films?.length === 0 ? (
          <Text style={styles.empty}>
            No films in the catalog yet — submit yours to be the first.
          </Text>
        ) : (
          <View style={styles.grid}>
            {films?.map((film) => <CatalogFilmCard key={film.id} film={film} />)}
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </Animated.ScrollView>
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
    paddingTop: 16,
    paddingBottom: 140, // clears the floating [+] tab button
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
    paddingHorizontal: 16,
  },
  submitButton: {
    borderWidth: 1,
    borderColor: Colors[colorScheme].tint,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
  },
  submitButtonText: {
    color: Colors[colorScheme].tint,
    fontSize: 14,
    fontWeight: '700',
  },
  moderationRow: {
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  moderationButton: {
    flex: 1,
    backgroundColor: Colors[colorScheme].secondary,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  moderationButtonText: {
    color: Colors[colorScheme].background,
    fontSize: 14,
    fontWeight: '700',
  },
  spinner: {
    marginTop: 12,
  },
  empty: {
    color: Colors[colorScheme].muted,
    fontSize: 13,
    paddingHorizontal: 16,
  },
  error: {
    color: Colors[colorScheme].error,
    fontSize: 13,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  bottomSpacer: {
    height: 24,
  },
});
