import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { AnimatedPressable } from '@/components/AnimatedPressable';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Radius, Space } from '@/constants/Spacing';
import { Type } from '@/constants/Typography';

const DEBOUNCE_MS = 300;

export function SearchBar({
  onQueryChange,
  placeholder = 'Search by name, @username, or role',
  autoFocus,
}: {
  onQueryChange: (query: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  const [value, setValue] = useState('');

  useEffect(() => {
    const handle = setTimeout(() => onQueryChange(value.trim()), DEBOUNCE_MS);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={setValue}
        placeholder={placeholder}
        placeholderTextColor={Colors[colorScheme].muted}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        autoFocus={autoFocus}
      />
      {value.length > 0 ? (
        <AnimatedPressable onPress={() => setValue('')} haptic="light" hitSlop={8} style={styles.clearButton}>
          <Text style={styles.clearButtonText}>×</Text>
        </AnimatedPressable>
      ) : null}
    </View>
  );
}

const createStyles = (colorScheme: 'light' | 'dark') =>
  StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors[colorScheme].card,
    borderColor: Colors[colorScheme].border,
    borderWidth: 1,
    borderRadius: Radius.md,
    marginHorizontal: Space.lg,
    marginVertical: Space.md,
    paddingHorizontal: Space.md,
  },
  input: {
    flex: 1,
    color: Colors[colorScheme].text,
    ...Type.subtitle,
    paddingVertical: Space.sm + 2,
  },
  clearButton: {
    paddingHorizontal: Space.xs,
    paddingVertical: 2,
  },
  clearButtonText: {
    color: Colors[colorScheme].muted,
    fontSize: 18,
    lineHeight: 18,
  },
});
