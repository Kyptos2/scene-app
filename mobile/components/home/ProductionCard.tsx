import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { RoleBadge } from '@/components/RoleBadge';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { PROJECT_STATUS_LABELS } from '@/constants/Labels';
import type { LocalProduction } from '@/lib/api';

export function ProductionCard({ item }: { item: LocalProduction }) {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  const location = [item.city, item.state].filter(Boolean).join(', ');

  return (
    <View style={styles.card}>
      <Text style={styles.title} numberOfLines={1}>
        {item.title}
      </Text>
      <Text style={styles.meta} numberOfLines={1}>
        {PROJECT_STATUS_LABELS[item.status] ?? item.status}
        {item.genre ? ` · ${item.genre}` : ''} · by{' '}
        <Text style={styles.link} onPress={() => router.push(`/profile/${item.ownerId}`)}>
          {item.ownerName}
        </Text>
      </Text>
      <Text style={styles.distance}>
        {location || 'Location unknown'} · {item.distanceKm.toFixed(0)} km away
      </Text>
    </View>
  );
}

export function RequestCard({
  title,
  projectTitle,
  role,
  meta,
  location,
  distanceKm,
  posterId,
}: {
  title: string;
  projectTitle: string;
  role: string;
  meta: string;
  location: string;
  distanceKm: number | null;
  posterId?: string;
}) {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text
          style={styles.title}
          numberOfLines={1}
          onPress={posterId ? () => router.push(`/profile/${posterId}`) : undefined}
        >
          {title}
        </Text>
        <RoleBadge role={role} />
      </View>
      <Text style={styles.meta} numberOfLines={1}>
        {projectTitle} · {meta}
      </Text>
      <Text style={styles.distance}>
        {location || 'Location unknown'}
        {distanceKm != null ? ` · ${distanceKm.toFixed(0)} km away` : ''}
      </Text>
    </View>
  );
}

const createStyles = (colorScheme: 'light' | 'dark') =>
  StyleSheet.create({
  card: {
    backgroundColor: Colors[colorScheme].card,
    borderColor: Colors[colorScheme].border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    color: Colors[colorScheme].text,
    fontSize: 15,
    fontWeight: '600',
    flexShrink: 1,
  },
  meta: {
    color: Colors[colorScheme].muted,
    fontSize: 13,
  },
  link: {
    color: Colors[colorScheme].tint,
    fontWeight: '600',
  },
  distance: {
    color: Colors[colorScheme].muted,
    fontSize: 12,
  },
});
