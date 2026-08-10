import type { ComponentProps } from 'react';
import { useEffect, useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimatedPressable } from '@/components/AnimatedPressable';
import { useColorScheme } from '@/components/useColorScheme';
import { WorkspacePickerSheet } from '@/components/workspace/WorkspacePickerSheet';
import Colors from '@/constants/Colors';
import { Radius, Space } from '@/constants/Spacing';
import { Fonts, Type } from '@/constants/Typography';
import { useAuth } from '@/context/AuthContext';
import { getMyWorkspaces, resolveAvatarUrl, type MyWorkspace } from '@/lib/api';

type SymbolName = ComponentProps<typeof SymbolView>['name'];

// The side menu absorbed what used to live directly in the header (search,
// the connections shortcut) now that the header itself is just a hamburger +
// wordmark + bell, matching the reference layout. A plain fade is used
// instead of a slide-in transform — this session already hit one bug from an
// over-engineered Reanimated sequence (see SceneSplash), so this stays to
// Modal's built-in transition rather than adding another animation chain.
export function AppDrawer({
  visible,
  onClose,
  onSearchPress,
  pendingNetworkCount,
}: {
  visible: boolean;
  onClose: () => void;
  onSearchPress: () => void;
  pendingNetworkCount: number;
}) {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const avatarUrl = resolveAvatarUrl(user?.avatarUrl ?? null);
  const [workspaces, setWorkspaces] = useState<MyWorkspace[] | null>(null);
  const [showWorkspacePicker, setShowWorkspacePicker] = useState(false);

  // Fetched once the drawer is opened rather than on mount — the drawer
  // itself mounts for the whole authenticated session, so gating on
  // `visible` avoids a network call before the user has ever seen the menu.
  useEffect(() => {
    if (visible && workspaces === null) {
      getMyWorkspaces()
        .then((res) => setWorkspaces(res.results))
        .catch(() => setWorkspaces([]));
    }
  }, [visible, workspaces]);

  async function handleSignOut() {
    onClose();
    await logout();
  }

  function handleOpenWorkspace() {
    if (workspaces === null) return;
    if (workspaces.length === 1) {
      onClose();
      router.push(`/workspace/${workspaces[0].id}`);
      return;
    }
    // Covers the zero-workspace case too — the sheet renders an empty state
    // with a "New Project" CTA instead of a plain list, same as Home's.
    setShowWorkspacePicker(true);
  }

  return (
    <>
      <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
        <View style={styles.overlay}>
          <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close menu" />
          <View
            style={[
              styles.panel,
              { paddingTop: insets.top + Space.lg, paddingBottom: insets.bottom + Space.lg },
            ]}
          >
              <View style={styles.profileRow}>
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarFallback]}>
                    <Text style={styles.avatarFallbackText}>{(user?.name ?? '?').charAt(0)}</Text>
                  </View>
                )}
                <View style={styles.profileText}>
                  <Text style={styles.name} numberOfLines={1}>
                    {user?.name ?? 'Filmmaker'}
                  </Text>
                  <Text style={styles.username} numberOfLines={1}>
                    @{user?.username ?? ''}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <DrawerItem
                icon={{ ios: 'magnifyingglass', android: 'search', web: 'search' }}
                label="Search"
                onPress={onSearchPress}
                colorScheme={colorScheme}
              />
              <DrawerItem
                icon={{ ios: 'person.2.fill', android: 'group', web: 'group' }}
                label="Connections"
                badge={pendingNetworkCount > 0}
                onPress={() => {
                  onClose();
                  router.push('/connections');
                }}
                colorScheme={colorScheme}
              />
              <DrawerItem
                icon={{ ios: 'star', android: 'star', web: 'star' }}
                label="Plans"
                onPress={() => {
                  onClose();
                  router.push('/subscription');
                }}
                colorScheme={colorScheme}
              />
              <DrawerItem
                icon={{ ios: 'plus.square', android: 'add_box', web: 'add_box' }}
                label="New Project"
                onPress={() => {
                  onClose();
                  router.push('/project/new');
                }}
                colorScheme={colorScheme}
              />
              <DrawerItem
                icon={{ ios: 'rectangle.3.group', android: 'dashboard', web: 'dashboard' }}
                label="Workspace"
                onPress={handleOpenWorkspace}
                colorScheme={colorScheme}
              />
              <DrawerItem
                icon={{ ios: 'gearshape', android: 'settings', web: 'settings' }}
                label="Settings"
                onPress={() => {
                  onClose();
                  router.push('/settings');
                }}
                colorScheme={colorScheme}
              />

              <View style={styles.spacer} />
              <View style={styles.divider} />

              <DrawerItem
                icon={{ ios: 'rectangle.portrait.and.arrow.right', android: 'logout', web: 'logout' }}
                label="Sign Out"
                onPress={handleSignOut}
                colorScheme={colorScheme}
                destructive
              />
            </View>
          </View>
        </Modal>

        <WorkspacePickerSheet
          visible={showWorkspacePicker}
          workspaces={workspaces}
          onClose={() => setShowWorkspacePicker(false)}
          onSelect={(workspace) => {
            setShowWorkspacePicker(false);
            onClose();
            router.push(`/workspace/${workspace.id}`);
          }}
          onCreateNew={() => {
            setShowWorkspacePicker(false);
            onClose();
            router.push('/project/new');
          }}
        />
    </>
  );
}

function DrawerItem({
  icon,
  label,
  onPress,
  colorScheme,
  badge,
  destructive,
}: {
  icon: SymbolName;
  label: string;
  onPress: () => void;
  colorScheme: 'light' | 'dark';
  badge?: boolean;
  destructive?: boolean;
}) {
  const styles = createStyles(colorScheme);
  const color = destructive ? Colors[colorScheme].error : Colors[colorScheme].text;
  return (
    <AnimatedPressable style={styles.item} haptic="light" onPress={onPress}>
      <View style={styles.itemIconWrap}>
        <SymbolView name={icon} size={18} tintColor={color} />
        {badge ? <View style={styles.itemBadge} /> : null}
      </View>
      <Text style={[styles.itemLabel, { color }]}>{label}</Text>
    </AnimatedPressable>
  );
}

const PANEL_WIDTH = '78%';

const createStyles = (colorScheme: 'light' | 'dark') =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      flexDirection: 'row',
    },
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
    },
    panel: {
      width: PANEL_WIDTH,
      maxWidth: 320,
      backgroundColor: Colors[colorScheme].background,
      paddingHorizontal: Space.lg,
    },
    profileRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Space.md,
      marginBottom: Space.lg,
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
    },
    avatarFallback: {
      backgroundColor: Colors[colorScheme].surface2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarFallbackText: {
      color: Colors[colorScheme].text,
      ...Type.title,
      fontWeight: '700',
    },
    profileText: {
      flex: 1,
      gap: 1,
    },
    name: {
      color: Colors[colorScheme].text,
      ...Type.subtitle,
      fontFamily: Fonts.serif,
    },
    username: {
      color: Colors[colorScheme].muted,
      ...Type.small,
    },
    divider: {
      height: 1,
      backgroundColor: Colors[colorScheme].border,
      marginBottom: Space.sm,
    },
    spacer: {
      flex: 1,
    },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Space.md,
      paddingVertical: Space.md,
    },
    itemIconWrap: {
      width: 24,
      alignItems: 'center',
    },
    itemBadge: {
      position: 'absolute',
      top: -2,
      right: 2,
      width: 7,
      height: 7,
      borderRadius: 3.5,
      backgroundColor: Colors[colorScheme].tint,
    },
    itemLabel: {
      ...Type.bodyLarge,
      fontWeight: '600',
    },
  });
