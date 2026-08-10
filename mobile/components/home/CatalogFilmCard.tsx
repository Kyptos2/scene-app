import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { resolveAvatarUrl, type CatalogFilm } from '@/lib/api';
import { swatchFor } from '@/lib/posterSwatch';

// A Letterboxd-style poster tile — full-bleed image, title on a gradient
// scrim rather than a text block below the poster. Tapping opens the full
// project detail page for credits, links, and reviews.
export function CatalogFilmCard({ film }: { film: CatalogFilm }) {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  const posterUrl = resolveAvatarUrl(film.posterUrl);

  return (
    <Pressable style={styles.tile} onPress={() => router.push(`/project/${film.id}`)}>
      {posterUrl ? (
        <Image source={{ uri: posterUrl }} style={styles.poster} />
      ) : (
        <View style={[styles.poster, { backgroundColor: swatchFor(film.id) }]} />
      )}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.05)', 'rgba(0,0,0,0.88)']}
        locations={[0, 0.5, 1]}
        style={styles.scrim}
      />
      <View style={styles.caption}>
        <Text style={styles.title} numberOfLines={2}>
          {film.title}
        </Text>
        {film.genre || film.releaseYear ? (
          <Text style={styles.meta} numberOfLines={1}>
            {[film.genre, film.releaseYear].filter(Boolean).join(' · ')}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const createStyles = (colorScheme: 'light' | 'dark') =>
  StyleSheet.create({
  tile: {
    width: '48%',
    aspectRatio: 2 / 3,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: Colors[colorScheme].card,
  },
  poster: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  scrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '55%',
  },
  caption: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 8,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 16,
  },
  meta: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10.5,
    marginTop: 2,
  },
});
