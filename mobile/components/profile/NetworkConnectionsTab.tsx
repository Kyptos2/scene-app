import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AnimatedPressable } from '@/components/AnimatedPressable';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { categorizeRoles } from '@/constants/Labels';
import { Radius, Space } from '@/constants/Spacing';
import { Type } from '@/constants/Typography';
import type { NetworkConnection } from '@/lib/api';

const CATEGORY_ORDER = [
  'Directors',
  'Cinematographers / DPs',
  'Editors / Post-Production',
  'Crew & Support',
] as const;

export function NetworkConnectionsTab({ connections }: { connections: NetworkConnection[] }) {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  if (connections.length === 0) {
    return (
      <Text style={styles.empty}>
        No connections yet. Scan a QR code at a festival or on set to start building your network.
      </Text>
    );
  }

  const grouped = new Map<string, NetworkConnection[]>();
  for (const person of connections) {
    const category = categorizeRoles(person.primaryRoles);
    grouped.set(category, [...(grouped.get(category) ?? []), person]);
  }

  return (
    <View style={styles.container}>
      {CATEGORY_ORDER.map((category) => {
        const people = grouped.get(category);
        if (!people || people.length === 0) return null;
        return (
          <View key={category} style={styles.group}>
            <Text style={styles.groupTitle}>
              {category} ({people.length})
            </Text>
            <View style={styles.chipRow}>
              {people.map((person) => (
                <Link key={person.id} href={`/profile/${person.id}`} asChild>
                  <AnimatedPressable style={styles.chip} haptic="light">
                    <Text style={styles.chipText}>{person.name}</Text>
                  </AnimatedPressable>
                </Link>
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const createStyles = (colorScheme: 'light' | 'dark') =>
  StyleSheet.create({
  container: {
    paddingHorizontal: Space.lg,
    gap: Space.lg + 2,
  },
  group: {
    gap: Space.sm,
  },
  groupTitle: {
    color: Colors[colorScheme].muted,
    ...Type.body,
    fontWeight: '600',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Space.sm,
  },
  chip: {
    backgroundColor: Colors[colorScheme].card,
    borderColor: Colors[colorScheme].border,
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm - 1,
  },
  chipText: {
    color: Colors[colorScheme].text,
    ...Type.bodyLarge,
    fontWeight: '500',
  },
  empty: {
    color: Colors[colorScheme].muted,
    ...Type.body,
    paddingHorizontal: Space.lg,
  },
});
