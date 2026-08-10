import { useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { AnimatedPressable } from '@/components/AnimatedPressable';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { ROLE_LABELS } from '@/constants/Labels';
import { Radius, Space } from '@/constants/Spacing';
import { Fonts, Type } from '@/constants/Typography';
import {
  blockUser,
  createConnection,
  resolveAvatarUrl,
  unblockUser,
  updateMyProfile,
  type UserProfile,
} from '@/lib/api';
import { shareProfile } from '@/lib/shareLinks';

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function ProfileHeader({
  profile,
  editable,
  onProfileUpdated,
}: {
  profile: UserProfile;
  editable?: boolean;
  onProfileUpdated?: (profile: UserProfile) => void;
}) {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  const location = [profile.city, profile.state].filter(Boolean).join(', ');
  const avatarUrl = resolveAvatarUrl(profile.avatarUrl);
  const coverUrl = resolveAvatarUrl(profile.coverImageUrl);
  // "Verified" matches the badge shown everywhere else in the app (search
  // results, feed): having at least one verified film credit — not email
  // verification. profile.credits is already pre-filtered to isVerified.
  const verified = profile.credits.length > 0;
  const roleLine = profile.primaryRoles.map((r) => ROLE_LABELS[r] ?? r).join(' / ');
  const projectsCount = new Set(profile.credits.map((c) => c.project.id)).size;

  const [editingTagline, setEditingTagline] = useState(false);
  const [taglineDraft, setTaglineDraft] = useState(profile.tagline ?? '');
  const [saving, setSaving] = useState(false);
  const [blocked, setBlocked] = useState(profile.viewerHasBlocked ?? false);
  const [blockPending, setBlockPending] = useState(false);
  const [confirmingBlock, setConfirmingBlock] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [connectState, setConnectState] = useState<'idle' | 'sending' | 'sent'>(
    profile.viewerConnectionStatus === 'none' || profile.viewerConnectionStatus == null ? 'idle' : 'sent',
  );
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleConnect() {
    if (connectState !== 'idle') return;
    setConnectState('sending');
    setActionError(null);
    try {
      await createConnection(profile.id);
      setConnectState('sent');
    } catch {
      setConnectState('idle');
      setActionError("Couldn't send that request. Try again.");
    }
  }

  async function handleToggleBlock() {
    if (blockPending) return;
    if (blocked) {
      setBlockPending(true);
      setActionError(null);
      try {
        await unblockUser(profile.id);
        setBlocked(false);
      } catch {
        setActionError("Couldn't unblock. Try again.");
      } finally {
        setBlockPending(false);
      }
      return;
    }
    setMenuOpen(false);
    setConfirmingBlock(true);
  }

  async function handleConfirmBlock() {
    setConfirmingBlock(false);
    setBlockPending(true);
    setActionError(null);
    try {
      await blockUser(profile.id);
      setBlocked(true);
    } catch {
      setActionError("Couldn't block this user. Try again.");
    } finally {
      setBlockPending(false);
    }
  }

  async function handleSaveTagline() {
    setSaving(true);
    setActionError(null);
    try {
      const updated = await updateMyProfile({ tagline: taglineDraft.trim() || null });
      onProfileUpdated?.(updated);
      setEditingTagline(false);
    } catch {
      setActionError("Couldn't save your tagline. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.coverWrap}>
        {coverUrl ? (
          <Image source={{ uri: coverUrl }} style={styles.cover} />
        ) : (
          <View style={[styles.cover, styles.coverFallback]} />
        )}
        <View style={styles.avatarWrap}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
          ) : (
            <View style={[styles.avatarImage, styles.avatarFallback]}>
              <Text style={styles.avatarText}>{initials(profile.name)}</Text>
            </View>
          )}
          {verified ? (
            <View style={styles.verifiedBadge}>
              <SymbolView name={{ ios: 'checkmark', android: 'check', web: 'check' }} size={11} tintColor="#fff" />
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.menuRow}>
          <View style={{ flex: 1 }} />
          <AnimatedPressable style={styles.menuButton} haptic="light" onPress={() => setMenuOpen(true)} hitSlop={8}>
            <SymbolView
              name={{ ios: 'ellipsis', android: 'more_horiz', web: 'more_horiz' }}
              size={16}
              tintColor={Colors[colorScheme].muted}
            />
          </AnimatedPressable>
        </View>

        <Text style={styles.name}>{profile.name}</Text>
        {roleLine ? <Text style={styles.roleLine}>{roleLine}</Text> : null}
        {location ? (
          <View style={styles.locationRow}>
            <SymbolView
              name={{ ios: 'mappin', android: 'place', web: 'place' }}
              size={12}
              tintColor={Colors[colorScheme].muted}
            />
            <Text style={styles.locationText}>{location}</Text>
          </View>
        ) : null}

        {editingTagline ? (
          <View style={styles.taglineEditRow}>
            <TextInput
              style={styles.taglineInput}
              value={taglineDraft}
              onChangeText={setTaglineDraft}
              placeholder="Director | Seeking Sound Mixer"
              placeholderTextColor={Colors[colorScheme].muted}
              maxLength={160}
              autoFocus
            />
            <View style={styles.taglineEditActions}>
              <AnimatedPressable
                haptic="light"
                onPress={() => {
                  setTaglineDraft(profile.tagline ?? '');
                  setEditingTagline(false);
                }}
                hitSlop={8}
              >
                <Text style={styles.taglineCancel}>Cancel</Text>
              </AnimatedPressable>
              <AnimatedPressable haptic="medium" onPress={handleSaveTagline} disabled={saving} hitSlop={8}>
                {saving ? (
                  <ActivityIndicator color={Colors[colorScheme].tint} size="small" />
                ) : (
                  <Text style={styles.taglineSave}>Save</Text>
                )}
              </AnimatedPressable>
            </View>
          </View>
        ) : (
          <AnimatedPressable disabled={!editable} haptic="light" onPress={() => setEditingTagline(true)}>
            {profile.tagline ? (
              <Text style={styles.tagline}>
                {profile.tagline}
                {editable ? <Text style={styles.editHint}>  · Edit</Text> : null}
              </Text>
            ) : editable ? (
              <Text style={styles.taglinePlaceholder}>+ Add a tagline (e.g. "Director | Seeking Sound Mixer")</Text>
            ) : null}
          </AnimatedPressable>
        )}

        {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile.connectionsCount ?? 0}</Text>
            <Text style={styles.statLabel}>Connections</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{projectsCount}</Text>
            <Text style={styles.statLabel}>Projects</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile.profileViewsCount ?? 0}</Text>
            <Text style={styles.statLabel}>Profile Views</Text>
          </View>
        </View>

        {editable ? (
          <View style={styles.actionRow}>
            <AnimatedPressable style={styles.primaryButton} haptic="light" onPress={() => router.push('/edit-profile')}>
              <Text style={styles.primaryButtonText}>Edit Profile</Text>
            </AnimatedPressable>
          </View>
        ) : (
          <View style={styles.actionRow}>
            <AnimatedPressable
              style={[styles.primaryButton, connectState !== 'idle' && styles.primaryButtonDisabled]}
              haptic="medium"
              onPress={handleConnect}
              disabled={connectState !== 'idle'}
            >
              <Text style={styles.primaryButtonText}>
                {connectState === 'sent' ? 'Connected' : connectState === 'sending' ? 'Connecting…' : 'Connect'}
              </Text>
            </AnimatedPressable>
            <AnimatedPressable
              style={styles.secondaryButton}
              haptic="medium"
              onPress={() =>
                router.push({
                  pathname: '/messages/new',
                  params: { userId: profile.id, name: profile.name, avatarUrl: avatarUrl ?? '' },
                })
              }
            >
              <Text style={styles.secondaryButtonText}>Message</Text>
            </AnimatedPressable>
          </View>
        )}

        {actionError ? <Text style={styles.actionErrorText}>{actionError}</Text> : null}
      </View>

      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.menuBackdrop} onPress={() => setMenuOpen(false)}>
          <View style={styles.menuSheet}>
            <Pressable
              style={styles.menuItem}
              onPress={() => {
                setMenuOpen(false);
                shareProfile({ id: profile.id, name: profile.name });
              }}
            >
              <Text style={styles.menuItemText}>Share</Text>
            </Pressable>
            {!editable ? (
              <>
                <Pressable
                  style={styles.menuItem}
                  onPress={() => {
                    setMenuOpen(false);
                    router.push({
                      pathname: '/report',
                      params: { targetType: 'USER', targetId: profile.id, label: `@${profile.username}` },
                    });
                  }}
                >
                  <Text style={styles.menuItemText}>Report</Text>
                </Pressable>
                <Pressable style={styles.menuItem} onPress={handleToggleBlock} disabled={blockPending}>
                  <Text style={[styles.menuItemText, styles.menuItemDestructive]}>
                    {blocked ? 'Unblock' : 'Block'}
                  </Text>
                </Pressable>
              </>
            ) : null}
          </View>
        </Pressable>
      </Modal>

      <ConfirmDialog
        visible={confirmingBlock}
        title={`Block @${profile.username}?`}
        message="They won't be able to message you or see your posts."
        confirmLabel="Block"
        destructive
        onConfirm={handleConfirmBlock}
        onCancel={() => setConfirmingBlock(false)}
      />
    </View>
  );
}

const COVER_HEIGHT = 150;
const AVATAR_SIZE = 72;

const createStyles = (colorScheme: 'light' | 'dark') =>
  StyleSheet.create({
  container: {
    gap: 0,
  },
  coverWrap: {
    position: 'relative',
  },
  cover: {
    width: '100%',
    height: COVER_HEIGHT,
  },
  coverFallback: {
    backgroundColor: Colors[colorScheme].surface2,
  },
  avatarWrap: {
    position: 'absolute',
    left: Space.lg,
    bottom: -(AVATAR_SIZE / 2),
  },
  avatarImage: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 3,
    borderColor: Colors[colorScheme].background,
    backgroundColor: Colors[colorScheme].card,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: Colors[colorScheme].tint,
    fontSize: 24,
    fontWeight: '700',
  },
  verifiedBadge: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors[colorScheme].secondary,
    borderWidth: 2,
    borderColor: Colors[colorScheme].background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: Space.lg,
    paddingTop: AVATAR_SIZE / 2 + Space.sm,
    gap: Space.xs + 2,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    top: Space.sm,
    right: Space.lg,
  },
  menuButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    color: Colors[colorScheme].text,
    ...Type.display,
    fontFamily: Fonts.serif,
  },
  roleLine: {
    color: Colors[colorScheme].tint,
    ...Type.bodyLarge,
    fontWeight: '600',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    color: Colors[colorScheme].muted,
    ...Type.body,
  },
  tagline: {
    color: Colors[colorScheme].text,
    ...Type.bodyLarge,
    fontWeight: '600',
  },
  taglinePlaceholder: {
    color: Colors[colorScheme].muted,
    ...Type.bodyLarge,
    fontStyle: 'italic',
  },
  editHint: {
    color: Colors[colorScheme].tint,
    ...Type.small,
    fontWeight: '600',
  },
  taglineEditRow: {
    gap: Space.sm,
  },
  taglineInput: {
    backgroundColor: Colors[colorScheme].card,
    borderColor: Colors[colorScheme].border,
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingHorizontal: Space.sm + 2,
    paddingVertical: Space.sm,
    color: Colors[colorScheme].text,
    ...Type.bodyLarge,
  },
  taglineEditActions: {
    flexDirection: 'row',
    gap: Space.lg,
    justifyContent: 'flex-end',
  },
  taglineCancel: {
    color: Colors[colorScheme].muted,
    ...Type.body,
    fontWeight: '600',
  },
  taglineSave: {
    color: Colors[colorScheme].tint,
    ...Type.body,
    fontWeight: '700',
  },
  bio: {
    color: Colors[colorScheme].text,
    ...Type.bodyLarge,
    lineHeight: 21,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Space.xxl,
    marginTop: Space.sm,
  },
  statItem: {
    gap: 1,
  },
  statValue: {
    color: Colors[colorScheme].text,
    ...Type.cardTitle,
    fontWeight: '700',
  },
  statLabel: {
    color: Colors[colorScheme].muted,
    ...Type.label,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Space.sm,
    marginTop: Space.sm,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: Colors[colorScheme].tint,
    borderRadius: Radius.pill,
    paddingVertical: Space.sm + 3,
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: Colors[colorScheme].background,
    ...Type.bodyLarge,
    fontWeight: '700',
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors[colorScheme].border,
    borderRadius: Radius.pill,
    paddingVertical: Space.sm + 3,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: Colors[colorScheme].text,
    ...Type.bodyLarge,
    fontWeight: '700',
  },
  actionErrorText: {
    color: Colors[colorScheme].error,
    ...Type.small,
  },
  menuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  menuSheet: {
    backgroundColor: Colors[colorScheme].card,
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    paddingVertical: Space.sm,
    paddingBottom: Space.xxl,
  },
  menuItem: {
    paddingHorizontal: Space.xl,
    paddingVertical: Space.md + 2,
  },
  menuItemText: {
    color: Colors[colorScheme].text,
    ...Type.bodyLarge,
    fontWeight: '600',
  },
  menuItemDestructive: {
    color: Colors[colorScheme].tint,
  },
});
