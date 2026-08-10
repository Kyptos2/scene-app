import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { AnimatedPressable } from '@/components/AnimatedPressable';
import { RoleBadge } from '@/components/RoleBadge';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Radius, Space } from '@/constants/Spacing';
import { Type } from '@/constants/Typography';
import type { Credit } from '@/lib/api';
import { swatchFor } from '@/lib/posterSwatch';

export function FilmographyGrid({ credits }: { credits: Credit[] }) {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  if (credits.length === 0) {
    return <Text style={styles.empty}>No verified credits yet.</Text>;
  }

  return (
    <View style={styles.grid}>
      {credits.map((credit) => (
        <AnimatedPressable
          key={credit.id}
          style={styles.card}
          haptic="light"
          scaleTo={0.97}
          onPress={() => router.push(`/project/${credit.project.id}`)}
        >
          <View style={[styles.poster, { backgroundColor: swatchFor(credit.project.id) }]}>
            <Text style={styles.posterTitle} numberOfLines={3}>
              {credit.project.title}
            </Text>
          </View>
          <View style={styles.cardFooter}>
            <Text style={styles.year}>{credit.project.releaseYear ?? 'Year unknown'}</Text>
            <RoleBadge role={credit.role} />
          </View>
        </AnimatedPressable>
      ))}
    </View>
  );
}

const createStyles = (colorScheme: 'light' | 'dark') =>
  StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Space.md,
    paddingHorizontal: Space.lg,
  },
  card: {
    width: '47%',
    gap: Space.xs + 2,
  },
  poster: {
    aspectRatio: 2 / 3,
    borderRadius: Radius.md,
    padding: Space.sm + 2,
    justifyContent: 'flex-end',
  },
  posterTitle: {
    color: 'rgba(255,255,255,0.92)',
    ...Type.subtitle,
    fontWeight: '700',
  },
  cardFooter: {
    gap: Space.xs,
  },
  year: {
    color: Colors[colorScheme].muted,
    ...Type.small,
  },
  empty: {
    color: Colors[colorScheme].muted,
    ...Type.body,
    paddingHorizontal: Space.lg,
  },
});
