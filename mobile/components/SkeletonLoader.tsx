import { useEffect } from 'react';
import { StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Radius, Space } from '@/constants/Spacing';

export function SkeletonBlock({
  width,
  height,
  radius = Radius.sm,
  style,
}: {
  width: DimensionValue;
  height: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const colorScheme = useColorScheme();
  const opacity = useSharedValue(0.35);

  useEffect(() => {
    opacity.value = withRepeat(withSequence(withTiming(0.7, { duration: 700 }), withTiming(0.35, { duration: 700 })), -1, true);
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[{ width, height, borderRadius: radius, backgroundColor: Colors[colorScheme].surface2 }, animatedStyle, style]}
    />
  );
}

// Mirrors the rough silhouette of a NetworkFeedCard (avatar + two lines of
// meta, then two lines of body) so the swap-in to real content doesn't
// cause a layout jump.
export function FeedCardSkeleton() {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <SkeletonBlock width={36} height={36} radius={18} />
        <View style={styles.rowMeta}>
          <SkeletonBlock width="55%" height={12} />
          <SkeletonBlock width="35%" height={10} />
        </View>
      </View>
      <SkeletonBlock width="92%" height={14} style={styles.line} />
      <SkeletonBlock width="68%" height={14} style={styles.lineTight} />
    </View>
  );
}

export function FeedSkeletonList({ count = 4 }: { count?: number }) {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, i) => (
        <FeedCardSkeleton key={i} />
      ))}
    </View>
  );
}

const createStyles = (colorScheme: 'light' | 'dark') =>
  StyleSheet.create({
  list: {
    paddingTop: Space.sm,
  },
  card: {
    backgroundColor: Colors[colorScheme].card,
    borderRadius: Radius.xl,
    marginHorizontal: Space.lg,
    marginBottom: Space.sm,
    padding: Space.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
  },
  rowMeta: {
    flex: 1,
    gap: 6,
  },
  line: {
    marginTop: Space.md,
  },
  lineTight: {
    marginTop: 6,
  },
});
