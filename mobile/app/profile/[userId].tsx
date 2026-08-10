import { Stack, useLocalSearchParams } from 'expo-router';

import { ProfileScreenContent } from '@/components/profile/ProfileScreenContent';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

export default function ProfileByIdScreen() {
  const colorScheme = useColorScheme();
  const { userId } = useLocalSearchParams<{ userId: string }>();

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Profile',
          headerStyle: { backgroundColor: Colors[colorScheme].background },
          headerTintColor: Colors[colorScheme].text,
          headerShadowVisible: false,
        }}
      />
      <ProfileScreenContent userId={userId} />
    </>
  );
}
