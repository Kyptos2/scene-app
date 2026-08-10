import { StyleSheet, Text, View } from 'react-native';

import { useColorScheme } from '@/components/useColorScheme';
import { ROLE_LABELS } from '@/constants/Labels';
import Colors from '@/constants/Colors';

export function RoleBadge({ role }: { role: string }) {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  return (
    <View style={styles.badge}>
      <Text style={styles.text}>{ROLE_LABELS[role] ?? role}</Text>
    </View>
  );
}

const createStyles = (colorScheme: 'light' | 'dark') =>
  StyleSheet.create({
  badge: {
    backgroundColor: 'rgba(78, 104, 81, 0.22)',
    borderColor: 'rgba(78, 104, 81, 0.5)',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  text: {
    color: Colors[colorScheme].secondary,
    fontSize: 12,
    fontWeight: '600',
  },
});
