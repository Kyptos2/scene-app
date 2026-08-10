import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { SceneMark } from '@/components/SceneMark';

// Splash is a fixed brand moment — always cream background with a charcoal
// mark, regardless of the user's light/dark preference.
const CREAM = '#FDF7E4';
const CHARCOAL = '#1C1C21';
const MARK_SIZE = 96;

// Three independent shared values, each assigned exactly ONCE per mount:
// - opacity: the whole stage's visibility (fade in → hold → fade out).
// - markScale: the mark alone, springing up from small to full size —
//   this is what makes the entrance actually read as motion rather than
//   a static shape that fades in.
// - wordmarkTranslateY: the wordmark alone, sliding up into place slightly
//   after the mark starts, so the two pieces arrive as a beat instead of
//   one flat pop.
// Assigning any one of these a SECOND time (even synchronously, on the very
// next line) replaces whatever animation was already driving it — that
// silently broke every earlier version of this component, where the
// fade-in and the exit-scheduling were both written as separate statements
// against the same `opacity` value and the second one cancelled the first
// before it ever got a frame to run. Every value here is composed into one
// withSequence/withDelay chain and assigned once, so that can't happen.
const TOTAL_MS = 1900;
const EASE = Easing.out(Easing.cubic);
const SPRING = { damping: 8, stiffness: 140, mass: 0.7 };

export function SceneSplash({ onFinish }: { onFinish: () => void }) {
  const opacity = useSharedValue(0);
  const markScale = useSharedValue(0.35);
  const wordmarkTranslateY = useSharedValue(16);
  const finished = useRef(false);

  function finishOnce() {
    if (finished.current) return;
    finished.current = true;
    onFinish();
  }

  useEffect(() => {
    const fadeInMs = 320;
    const fadeOutMs = 360;
    opacity.value = withSequence(
      withTiming(1, { duration: fadeInMs, easing: EASE }),
      withDelay(
        TOTAL_MS - fadeInMs - fadeOutMs,
        withTiming(0, { duration: fadeOutMs, easing: Easing.in(Easing.cubic) }, (done) => {
          if (done) runOnJS(finishOnce)();
        }),
      ),
    );
    markScale.value = withSpring(1, SPRING);
    wordmarkTranslateY.value = withDelay(140, withSpring(0, SPRING));

    // Independent of Reanimated's callback firing at all — if the JS-thread
    // callback ever fails to fire (backgrounding mid-animation, a dropped
    // frame), the splash would otherwise stay up forever and block the app
    // underneath it.
    const fallback = setTimeout(finishOnce, TOTAL_MS + 500);
    return () => clearTimeout(fallback);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stageStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const markStyle = useAnimatedStyle(() => ({ transform: [{ scale: markScale.value }] }));
  const wordmarkStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: wordmarkTranslateY.value }],
  }));

  return (
    <View style={styles.container} pointerEvents="none">
      <Animated.View style={[styles.stage, stageStyle]}>
        <Animated.View style={markStyle}>
          <SceneMark size={MARK_SIZE} color={CHARCOAL} />
        </Animated.View>
        <Animated.Text style={[styles.wordmark, wordmarkStyle]}>SCENE</Animated.Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    backgroundColor: CREAM,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  stage: {
    alignItems: 'center',
  },
  wordmark: {
    marginTop: 22,
    color: CHARCOAL,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 8,
  },
});
