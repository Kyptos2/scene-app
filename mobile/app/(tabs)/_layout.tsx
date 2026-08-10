import { useEffect, useState } from 'react';
import { SymbolView } from 'expo-symbols';
import { Tabs, usePathname } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppHeader } from '@/components/shell/AppHeader';
import { CreateSheet } from '@/components/shell/CreateSheet';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { haptics } from '@/lib/haptics';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  const [showCreate, setShowCreate] = useState(false);
  const { unreadCount, refresh: refreshUnreadMessages } = useUnreadMessages();
  const pathname = usePathname();

  // The tab layout mounts once for the whole session, so a plain effect
  // would only ever check unread state at launch. Re-check on every
  // navigation instead — cheap, and catches "just read a thread" /
  // "just got a new message" without needing a dedicated event bus.
  useEffect(() => {
    refreshUnreadMessages();
  }, [pathname, refreshUnreadMessages]);

  return (
    <>
      <Tabs
        screenOptions={{
          header: () => <AppHeader />,
          tabBarActiveTintColor: Colors[colorScheme].tint,
          tabBarInactiveTintColor: Colors[colorScheme].tabIconDefault,
          tabBarStyle: {
            backgroundColor: Colors[colorScheme].background,
            borderTopColor: Colors[colorScheme].border,
          },
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color }) => (
              <SymbolView name={{ ios: 'house', android: 'home', web: 'home' }} tintColor={color} size={24} />
            ),
          }}
          listeners={{ tabPress: () => haptics.selection() }}
        />
        <Tabs.Screen
          name="films"
          options={{
            title: 'Films',
            tabBarIcon: ({ color }) => (
              <SymbolView
                name={{ ios: 'film.stack', android: 'movie', web: 'movie' }}
                tintColor={color}
                size={22}
              />
            ),
          }}
          listeners={{ tabPress: () => haptics.selection() }}
        />
        {/* Docked directly into the bar between Films and Messages — a
            small raised circle rather than a large button floating above
            everything. The route itself never renders; tabPress is
            intercepted below to open the Create sheet instead. */}
        <Tabs.Screen
          name="create"
          options={{
            title: '',
            tabBarLabel: () => null,
            tabBarIcon: () => (
              <View style={styles.createDock}>
                <SymbolView name={{ ios: 'plus', android: 'add', web: 'add' }} tintColor="#FFFFFF" size={20} />
              </View>
            ),
          }}
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              haptics.medium();
              setShowCreate(true);
            },
          }}
        />
        <Tabs.Screen
          name="messages"
          options={{
            title: 'Messages',
            tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
            tabBarIcon: ({ color }) => (
              <SymbolView name={{ ios: 'envelope', android: 'mail', web: 'mail' }} tintColor={color} size={22} />
            ),
          }}
          listeners={{ tabPress: () => haptics.selection() }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color }) => (
              <SymbolView
                name={{ ios: 'person.crop.circle', android: 'person', web: 'person' }}
                tintColor={color}
                size={24}
              />
            ),
          }}
          listeners={{ tabPress: () => haptics.selection() }}
        />
      </Tabs>

      <CreateSheet visible={showCreate} onClose={() => setShowCreate(false)} />
    </>
  );
}

const createStyles = (colorScheme: 'light' | 'dark') =>
  StyleSheet.create({
  createDock: {
    // The icon slot every tab renders into is a fixed 31x28 box (see
    // expo-router's TabBarIcon), centered within the tab column the same
    // way for every tab. A 36x36 circle centered in that box overflows it
    // symmetrically by a few px on each side — that's what reads as
    // "docked" — rather than a manual negative marginTop, which shifted
    // this circle's center off the same vertical axis every other tab's
    // icon sits on.
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors[colorScheme].tint,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
});
