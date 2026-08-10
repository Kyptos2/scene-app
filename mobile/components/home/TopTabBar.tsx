import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

export type HomeTab = 'home' | 'festivals';

const TABS: { id: HomeTab; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'festivals', label: 'Festivals' },
];

export function TopTabBar({ active, onChange }: { active: HomeTab; onChange: (tab: HomeTab) => void }) {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scrollView}
      contentContainerStyle={styles.container}
    >
      {TABS.map((tab) => {
        const isActive = tab.id === active;
        return (
          <Pressable
            key={tab.id}
            onPress={() => onChange(tab.id)}
            style={[styles.tab, isActive && styles.tabActive]}
          >
            <Text style={[styles.label, isActive && styles.labelActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const createStyles = (colorScheme: 'light' | 'dark') =>
  StyleSheet.create({
  scrollView: {
    flexGrow: 0,
    flexShrink: 0,
  },
  container: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors[colorScheme].border,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
  },
  tabActive: {
    backgroundColor: Colors[colorScheme].text,
  },
  label: {
    color: Colors[colorScheme].muted,
    fontSize: 14,
    fontWeight: '600',
  },
  labelActive: {
    color: Colors[colorScheme].background,
  },
});
