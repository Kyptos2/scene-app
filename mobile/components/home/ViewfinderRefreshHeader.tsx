import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  type SharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

const PULL_TRIGGER_DISTANCE = 88;
const HEADER_HEIGHT = 64;

/**
 * Custom pull-to-refresh built on Reanimated's scroll offset instead of the
 * native RefreshControl, so the release animation can be a branded viewfinder
 * rather than a platform spinner.
 *
 * iOS gets negative contentOffset.y for free while overscrolling. On Android,
 * pass `overScrollMode="always"` on the Animated.FlatList/ScrollView — even
 * then Android's overscroll glow behaves differently from iOS bounce, so this
 * is best treated as an iOS-first affordance with graceful Android degrade
 * (a manual "Refresh" affordance may be worth keeping as a fallback there).
 */
export function useViewfinderPullRefresh(onRefresh: () => Promise<void>) {
  const pullDistance = useSharedValue(0);
  const armed = useSharedValue(false);
  const [refreshing, setRefreshing] = useState(false);

  const startRefresh = useCallback(() => {
    setRefreshing(true);
    onRefresh().finally(() => setRefreshing(false));
  }, [onRefresh]);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      const offset = event.contentOffset.y;
      pullDistance.value = offset < 0 ? -offset : 0;
      armed.value = pullDistance.value > PULL_TRIGGER_DISTANCE;
    },
    onEndDrag: () => {
      if (armed.value) {
        armed.value = false;
        runOnJS(startRefresh)();
      }
    },
  });

  return { scrollHandler, pullDistance, refreshing };
}

export function ViewfinderRefreshHeader({
  pullDistance,
  refreshing,
}: {
  pullDistance: SharedValue<number>;
  refreshing: boolean;
}) {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  const dotPulse = [useSharedValue(0.3), useSharedValue(0.3), useSharedValue(0.3), useSharedValue(0.3)];

  useEffect(() => {
    if (!refreshing) {
      dotPulse.forEach((v) => {
        v.value = withTiming(0.3, { duration: 150 });
      });
      return;
    }
    dotPulse.forEach((v, i) => {
      v.value = withDelay(
        i * 140,
        withRepeat(withSequence(withTiming(1, { duration: 260 }), withTiming(0.3, { duration: 260 })), -1, false),
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshing]);

  const containerStyle = useAnimatedStyle(() => ({
    height: Math.min(pullDistance.value, HEADER_HEIGHT),
    opacity: interpolate(pullDistance.value, [0, 24], [0, 1], 'clamp'),
  }));

  const bracketStyle = useAnimatedStyle(() => {
    const spread = interpolate(pullDistance.value, [0, PULL_TRIGGER_DISTANCE], [0, 8], 'clamp');
    return { transform: [{ scale: 1 + spread / 40 }] };
  });

  return (
    <Animated.View style={[styles.container, containerStyle]} pointerEvents="none">
      <Animated.View style={[styles.frame, bracketStyle]}>
        <View style={[styles.bracket, styles.tl]} />
        <View style={[styles.bracket, styles.tr]} />
        <View style={[styles.bracket, styles.br]} />
        <View style={[styles.bracket, styles.bl]} />
        <View style={styles.dotsRow}>
          {dotPulse.map((v, i) => (
            <Dot key={i} opacity={v} />
          ))}
        </View>
      </Animated.View>
    </Animated.View>
  );
}

function Dot({ opacity }: { opacity: SharedValue<number> }) {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[styles.dot, style]} />;
}

const BRACKET_SIZE = 14;
const BRACKET_THICKNESS = 2;

const createStyles = (colorScheme: 'light' | 'dark') =>
  StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  frame: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bracket: {
    position: 'absolute',
    width: BRACKET_SIZE,
    height: BRACKET_SIZE,
    borderColor: Colors[colorScheme].secondary,
  },
  tl: { top: 0, left: 0, borderTopWidth: BRACKET_THICKNESS, borderLeftWidth: BRACKET_THICKNESS },
  tr: { top: 0, right: 0, borderTopWidth: BRACKET_THICKNESS, borderRightWidth: BRACKET_THICKNESS },
  br: { bottom: 0, right: 0, borderBottomWidth: BRACKET_THICKNESS, borderRightWidth: BRACKET_THICKNESS },
  bl: { bottom: 0, left: 0, borderBottomWidth: BRACKET_THICKNESS, borderLeftWidth: BRACKET_THICKNESS },
  dotsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Colors[colorScheme].tint,
  },
});
