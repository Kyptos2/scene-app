import { useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { AnimatedPressable } from '@/components/AnimatedPressable';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Space } from '@/constants/Spacing';
import { Type } from '@/constants/Typography';

export function AccordionSection({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  const [open, setOpen] = useState(defaultOpen);

  return (
    <View style={styles.container}>
      <AnimatedPressable style={styles.header} haptic="selection" onPress={() => setOpen((prev) => !prev)}>
        <Text style={styles.title}>{title}</Text>
        <SymbolView
          name={{
            ios: open ? 'chevron.up' : 'chevron.down',
            android: open ? 'expand_less' : 'expand_more',
            web: open ? 'expand_less' : 'expand_more',
          }}
          tintColor={Colors[colorScheme].muted}
          size={18}
        />
      </AnimatedPressable>
      {open ? (
        <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(120)} style={styles.body}>
          {children}
        </Animated.View>
      ) : null}
    </View>
  );
}

const createStyles = (colorScheme: 'light' | 'dark') =>
  StyleSheet.create({
  container: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors[colorScheme].border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Space.md + 2,
  },
  title: {
    color: Colors[colorScheme].text,
    ...Type.subtitle,
    fontWeight: '600',
  },
  body: {
    paddingBottom: Space.lg,
  },
});
