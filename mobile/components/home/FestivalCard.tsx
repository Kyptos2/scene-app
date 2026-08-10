import { StyleSheet, Text, View } from 'react-native';

import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import type { UpcomingFestival } from '@/lib/api';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function FestivalCard({ item }: { item: UpcomingFestival }) {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  const location = [item.city, item.state].filter(Boolean).join(', ');

  return (
    <View style={styles.card}>
      <Text style={styles.title} numberOfLines={1}>
        {item.name}
      </Text>
      <Text style={styles.meta}>
        {formatDate(item.startDate)} – {formatDate(item.endDate)}
      </Text>
      <Text style={styles.distance}>
        {location || 'Location unknown'}
        {item.distanceKm != null ? ` · ${item.distanceKm.toFixed(0)} km away` : ''}
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
  title: {
    color: Colors[colorScheme].text,
    fontSize: 15,
    fontWeight: '600',
  },
  meta: {
    color: Colors[colorScheme].muted,
    fontSize: 13,
  },
  distance: {
    color: Colors[colorScheme].muted,
    fontSize: 12,
  },
});
