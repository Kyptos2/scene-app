import { Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedPressable } from '@/components/AnimatedPressable';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Radius, Space } from '@/constants/Spacing';
import { Type } from '@/constants/Typography';
import { useColorSchemeContext } from '@/context/ColorSchemeContext';

const OPTIONS: { value: 'light' | 'dark'; title: string; description: string }[] = [
  {
    value: 'light',
    title: 'Quiet Editorial',
    description: 'Clean, focused, professional. Works well in bright environments and long work sessions.',
  },
  {
    value: 'dark',
    title: 'Dark Editorial',
    description: 'Cinematic, focused, immersive. Reduces eye strain and keeps attention on your work.',
  },
];

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const { setColorScheme } = useColorSchemeContext();
  const styles = createStyles(colorScheme);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Stack.Screen
        options={{
          title: 'Settings',
          headerStyle: { backgroundColor: Colors[colorScheme].background },
          headerTintColor: Colors[colorScheme].text,
          headerShadowVisible: false,
        }}
      />
      <View style={styles.content}>
        <Text style={styles.sectionLabel}>Appearance</Text>
        {OPTIONS.map((opt) => {
          const selected = colorScheme === opt.value;
          return (
            <AnimatedPressable
              key={opt.value}
              style={[styles.option, selected && styles.optionSelected]}
              haptic="selection"
              onPress={() => setColorScheme(opt.value)}
            >
              <View style={styles.optionHeader}>
                <Text style={[styles.optionTitle, selected && styles.optionTitleSelected]}>{opt.title}</Text>
                {selected ? <Text style={styles.optionCheck}>✓</Text> : null}
              </View>
              <Text style={styles.optionDescription}>{opt.description}</Text>
            </AnimatedPressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colorScheme: 'light' | 'dark') =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: Colors[colorScheme].background,
    },
    content: {
      padding: Space.xl,
      gap: Space.sm + 2,
    },
    sectionLabel: {
      color: Colors[colorScheme].muted,
      ...Type.body,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: Space.xs,
    },
    option: {
      backgroundColor: Colors[colorScheme].card,
      borderColor: Colors[colorScheme].border,
      borderWidth: 1,
      borderRadius: Radius.lg,
      padding: Space.md + 2,
      gap: Space.xs,
    },
    optionSelected: {
      borderColor: Colors[colorScheme].tint,
    },
    optionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    optionTitle: {
      color: Colors[colorScheme].text,
      ...Type.subtitle,
      fontWeight: '700',
    },
    optionTitleSelected: {
      color: Colors[colorScheme].tint,
    },
    optionCheck: {
      color: Colors[colorScheme].tint,
      ...Type.subtitle,
      fontWeight: '700',
    },
    optionDescription: {
      color: Colors[colorScheme].muted,
      ...Type.body,
      lineHeight: 18,
    },
  });
