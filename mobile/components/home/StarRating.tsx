import { StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';

import { AnimatedPressable } from '@/components/AnimatedPressable';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

// rating is in half-star units: 1 = 0.5★ … 10 = 5.0★
export function StarRating({ rating, size = 14 }: { rating: number; size?: number }) {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  const fullStars = Math.floor(rating / 2);
  const hasHalf = rating % 2 === 1;

  return (
    <View style={styles.row}>
      {[0, 1, 2, 3, 4].map((i) => {
        const filled = i < fullStars;
        const half = !filled && i === fullStars && hasHalf;
        return (
          <Text
            key={i}
            style={[
              { fontSize: size },
              filled ? styles.filled : half ? styles.half : styles.empty,
            ]}
          >
            ★
          </Text>
        );
      })}
      <Text style={[styles.value, { fontSize: size - 2 }]}>{(rating / 2).toFixed(1)}</Text>
    </View>
  );
}

const INPUT_STAR_SIZE = 32;

// Tap the left half of a star for a half rating, the right half for a full
// one — same half-star unit model as the read-only StarRating above, just
// writable. Letterboxd's rating widget was the reference for this: input
// granularity should match what the display already renders.
export function StarRatingInput({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  return (
    <View style={styles.row}>
      {[0, 1, 2, 3, 4].map((i) => {
        const base = i * 2;
        const filled = value >= base + 2;
        const half = !filled && value === base + 1;

        function handlePress(e: GestureResponderEvent) {
          const tappedLeftHalf = e.nativeEvent.locationX < INPUT_STAR_SIZE / 2;
          onChange(base + (tappedLeftHalf ? 1 : 2));
        }

        return (
          <AnimatedPressable key={i} hitSlop={4} scaleTo={0.85} haptic="selection" onPress={handlePress}>
            <Text style={[styles.inputGlyph, filled ? styles.filled : half ? styles.half : styles.empty]}>★</Text>
          </AnimatedPressable>
        );
      })}
    </View>
  );
}

const createStyles = (colorScheme: 'light' | 'dark') =>
  StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  filled: {
    color: Colors[colorScheme].tint,
  },
  half: {
    color: Colors[colorScheme].tint,
    opacity: 0.45,
  },
  empty: {
    color: Colors[colorScheme].border,
  },
  value: {
    color: Colors[colorScheme].muted,
    marginLeft: 4,
  },
  inputGlyph: {
    fontSize: INPUT_STAR_SIZE - 4,
  },
});
