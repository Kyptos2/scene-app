import { useCallback } from 'react';
import { Pressable, type GestureResponderEvent, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { haptics } from '@/lib/haptics';

const AnimatedPressableBase = Animated.createAnimatedComponent(Pressable);

type Props = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  haptic?: 'light' | 'medium' | 'selection' | 'success' | 'none';
};

// Drop-in Pressable replacement: scales down slightly on press with a
// spring, back to rest on release, with an optional haptic tick on
// press-in. Used for the app's primary tap targets — buttons, cards,
// chrome icons — so interaction feels physical rather than instant.
export function AnimatedPressable({ scaleTo = 0.96, haptic = 'light', onPressIn, onPressOut, style, ...rest }: Props) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(
    (e: GestureResponderEvent) => {
      scale.value = withSpring(scaleTo, { damping: 15, stiffness: 400 });
      if (haptic !== 'none') haptics[haptic]();
      onPressIn?.(e);
    },
    [scale, scaleTo, haptic, onPressIn],
  );

  const handlePressOut = useCallback(
    (e: GestureResponderEvent) => {
      scale.value = withSpring(1, { damping: 15, stiffness: 400 });
      onPressOut?.(e);
    },
    [scale, onPressOut],
  );

  return (
    <AnimatedPressableBase {...rest} style={[style, animatedStyle]} onPressIn={handlePressIn} onPressOut={handlePressOut} />
  );
}
