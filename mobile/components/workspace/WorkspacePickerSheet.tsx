import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { AnimatedPressable } from '@/components/AnimatedPressable';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Radius, Space } from '@/constants/Spacing';
import { Fonts, Type } from '@/constants/Typography';
import { resolveAvatarUrl, type MyWorkspace } from '@/lib/api';

// The single workspace list/picker UI, shared by three call sites that each
// need it for a different reason: the Home "Workspace" button and the
// drawer's "Workspace" item both use it as a launcher (resolve straight to
// the one workspace, or let you pick when there's more than one); the
// in-workspace header switcher uses it to jump between workspaces without
// backing out to Home first. Each caller owns its own fetch/visibility
// state and just hands this component the list to render.
export function WorkspacePickerSheet({
  visible,
  workspaces,
  currentWorkspaceId,
  onClose,
  onSelect,
  onCreateNew,
}: {
  visible: boolean;
  workspaces: MyWorkspace[] | null;
  currentWorkspaceId?: string;
  onClose: () => void;
  onSelect: (workspace: MyWorkspace) => void;
  onCreateNew?: () => void;
}) {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  const isEmpty = workspaces !== null && workspaces.length === 0;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <Text style={styles.title}>{isEmpty ? 'No workspaces yet' : 'Switch workspace'}</Text>

          {isEmpty ? (
            <>
              <Text style={styles.emptyText}>Create a project to get a team workspace for it.</Text>
              {onCreateNew ? (
                <AnimatedPressable style={styles.emptyButton} haptic="medium" onPress={onCreateNew}>
                  <Text style={styles.emptyButtonText}>New Project</Text>
                </AnimatedPressable>
              ) : null}
            </>
          ) : (
            (workspaces ?? []).map((workspace) => {
              const isCurrent = workspace.id === currentWorkspaceId;
              const posterUrl = resolveAvatarUrl(workspace.posterUrl);
              return (
                <AnimatedPressable
                  key={workspace.id}
                  style={styles.row}
                  haptic="light"
                  onPress={() => onSelect(workspace)}
                  disabled={isCurrent}
                >
                  {posterUrl ? (
                    <Image source={{ uri: posterUrl }} style={styles.poster} />
                  ) : (
                    <View style={[styles.poster, styles.posterFallback]}>
                      <Text style={styles.posterFallbackText}>{workspace.name.charAt(0)}</Text>
                    </View>
                  )}
                  <View style={styles.rowText}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {workspace.name}
                    </Text>
                    {workspace.projectTitle ? (
                      <Text style={styles.rowSubtitle} numberOfLines={1}>
                        {workspace.projectTitle}
                      </Text>
                    ) : null}
                  </View>
                  {isCurrent ? (
                    <SymbolView
                      name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }}
                      size={18}
                      tintColor={Colors[colorScheme].tint}
                    />
                  ) : (
                    <SymbolView
                      name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
                      size={14}
                      tintColor={Colors[colorScheme].muted}
                    />
                  )}
                </AnimatedPressable>
              );
            })
          )}
        </View>
      </View>
    </Modal>
  );
}

const POSTER_SIZE = 40;

const createStyles = (colorScheme: 'light' | 'dark') =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    backdrop: {
      ...StyleSheet.absoluteFill,
      backgroundColor: 'rgba(0,0,0,0.4)',
    },
    sheet: {
      backgroundColor: Colors[colorScheme].background,
      borderTopLeftRadius: Radius.xxl,
      borderTopRightRadius: Radius.xxl,
      padding: Space.lg,
      paddingBottom: Space.xxxl,
      gap: Space.xs,
    },
    title: {
      color: Colors[colorScheme].text,
      ...Type.title,
      fontFamily: Fonts.serif,
      marginBottom: Space.sm,
    },
    emptyText: {
      color: Colors[colorScheme].muted,
      ...Type.body,
      marginBottom: Space.md,
    },
    emptyButton: {
      backgroundColor: Colors[colorScheme].tint,
      borderRadius: Radius.pill,
      paddingVertical: Space.md,
      alignItems: 'center',
    },
    emptyButtonText: {
      color: Colors[colorScheme].background,
      ...Type.bodyLarge,
      fontWeight: '700',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Space.sm + 2,
      backgroundColor: Colors[colorScheme].card,
      borderColor: Colors[colorScheme].border,
      borderWidth: 1,
      borderRadius: Radius.lg,
      paddingHorizontal: Space.md,
      paddingVertical: Space.sm + 1,
    },
    poster: {
      width: POSTER_SIZE,
      height: POSTER_SIZE,
      borderRadius: Radius.sm,
      backgroundColor: Colors[colorScheme].surface2,
    },
    posterFallback: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    posterFallbackText: {
      color: Colors[colorScheme].muted,
      ...Type.subtitle,
      fontWeight: '700',
    },
    rowText: {
      flex: 1,
      gap: 1,
    },
    rowTitle: {
      color: Colors[colorScheme].text,
      ...Type.bodyLarge,
      fontWeight: '700',
    },
    rowSubtitle: {
      color: Colors[colorScheme].muted,
      ...Type.small,
    },
  });
