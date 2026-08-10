import { StyleSheet, View } from 'react-native';

import { ProfileScreenContent } from '@/components/profile/ProfileScreenContent';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/context/AuthContext';
import Colors from '@/constants/Colors';

export default function ProfileTabScreen() {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  const { user } = useAuth();

  if (!user) return null; // Stack.Protected guarantees we never actually hit this

  return (
    <View style={styles.safeArea}>
      <ProfileScreenContent userId={user.id} />
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
