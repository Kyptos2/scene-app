import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { EmailVerificationBanner } from '@/components/EmailVerificationBanner';
import { FestivalsTab } from '@/components/home/FestivalsTab';
import { NetworkFeedTab } from '@/components/home/NetworkFeedTab';
import { TopTabBar, type HomeTab } from '@/components/home/TopTabBar';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  const [tab, setTab] = useState<HomeTab>('home');

  return (
    <View style={styles.container}>
      <TopTabBar active={tab} onChange={setTab} />
      <EmailVerificationBanner />
      {tab === 'home' && <NetworkFeedTab />}
      {tab === 'festivals' && <FestivalsTab />}
    </View>
  );
}

const createStyles = (colorScheme: 'light' | 'dark') =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors[colorScheme].background,
  },
});
