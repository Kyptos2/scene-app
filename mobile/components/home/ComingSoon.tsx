import { StyleSheet, Text, View } from 'react-native';

import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

export function ComingSoon({ label }: { label: string }) {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{label}</Text>
      <Text style={styles.subtitle}>
        This needs a data model that doesn&apos;t exist in SCENE yet — coming in a later pass.
      </Text>
    </View>
  );
}

const createStyles = (colorScheme: 'light' | 'dark') =>
  StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: Colors[colorScheme].background,
    gap: 8,
  },
  title: {
    color: Colors[colorScheme].text,
    fontSize: 16,
    fontWeight: '600',
  },
  subtitle: {
    color: Colors[colorScheme].muted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});
