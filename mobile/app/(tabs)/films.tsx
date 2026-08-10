import { StyleSheet, View } from 'react-native';

import { ReviewsTab } from '@/components/home/ReviewsTab';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

export default function FilmsTabScreen() {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  return (
    <View style={styles.safeArea}>
      <ReviewsTab />
    </View>
  );
}

const createStyles = (colorScheme: 'light' | 'dark') =>
  StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors[colorScheme].background,
  },
});
