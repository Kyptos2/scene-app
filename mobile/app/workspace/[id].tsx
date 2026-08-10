import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';

import { AnimatedPressable } from '@/components/AnimatedPressable';
import { AddCrewMemberModal } from '@/components/workspace/AddCrewMemberModal';
import { FeedSkeletonList } from '@/components/SkeletonLoader';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { ROLE_LABELS } from '@/constants/Labels';
import { Radius, Space } from '@/constants/Spacing';
import { Type } from '@/constants/Typography';
import { useAuth } from '@/context/AuthContext';
import {
  getChannelMessages,
  getMyWorkspaces,
  getWorkspace,
  getWorkspaceInvites,
  pinChannelMessage,
  resolveAvatarUrl,
  sendChannelMessage,
  type ChannelMessage,
  type MyWorkspace,
  type WorkspaceDetail,
  type WorkspaceInvite,
} from '@/lib/api';

const STATUS_LABEL: Record<WorkspaceInvite['status'], string> = {
  PENDING: 'Pending',
  ACCEPTED: 'Accepted',
  DECLINED: 'Declined',
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function InviteTracker({ invites }: { invites: WorkspaceInvite[] }) {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  if (invites.length === 0) {
    return <Text style={styles.emptyText}>No invites sent yet.</Text>;
  }
  return (
    <View style={styles.trackerList}>
      {invites.map((invite) => (
        <View key={invite.id} style={styles.trackerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.trackerName}>{invite.invitee.name}</Text>
            <Text style={styles.trackerMeta}>
              {invite.role ? ROLE_LABELS[invite.role] ?? invite.role : 'No role set'} · invited by {invite.inviter.name}
            </Text>
          </View>
          <View
            style={[
              styles.trackerBadge,
              invite.status === 'ACCEPTED' && styles.trackerBadgeAccepted,
              invite.status === 'DECLINED' && styles.trackerBadgeDeclined,
            ]}
          >
            <Text style={styles.trackerBadgeText}>{STATUS_LABEL[invite.status]}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

// A quiet strip of project avatars sitting right under the native header —
// same shelf as the channel-pill rail below it, so switching projects reads
// as another row of workspace chrome rather than a popup bolted on top of
// it. Tapping another project switches immediately (router.replace, no
// sheet, no confirmation) since there's nothing to lose by hopping over;
// only rendered once there's actually more than one to switch between.
function WorkspaceSwitcherStrip({
  workspaces,
  currentId,
}: {
  workspaces: MyWorkspace[];
  currentId: string;
}) {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.switcherRail}
      contentContainerStyle={styles.switcherRailContent}
    >
      {workspaces.map((w) => {
        const isCurrent = w.id === currentId;
        const posterUrl = resolveAvatarUrl(w.posterUrl);
        return (
          <AnimatedPressable
            key={w.id}
            haptic={isCurrent ? 'none' : 'selection'}
            disabled={isCurrent}
            onPress={() => router.replace(`/workspace/${w.id}`)}
          >
            <View style={[styles.switcherRing, isCurrent && styles.switcherRingActive]}>
              {posterUrl ? (
                <Image source={{ uri: posterUrl }} style={styles.switcherAvatar} />
              ) : (
                <View style={[styles.switcherAvatar, styles.switcherAvatarFallback]}>
                  <Text style={styles.switcherAvatarFallbackText}>{w.name.charAt(0)}</Text>
                </View>
              )}
            </View>
          </AnimatedPressable>
        );
      })}
    </ScrollView>
  );
}

function MessageBubble({
  message,
  isMine,
  showSender,
  onTogglePin,
}: {
  message: ChannelMessage;
  isMine: boolean;
  showSender: boolean;
  onTogglePin: (message: ChannelMessage) => void;
}) {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  return (
    <View style={[styles.bubbleRow, isMine && styles.bubbleRowMine]}>
      {!isMine && showSender ? <Text style={styles.senderName}>{message.sender.name}</Text> : null}
      <AnimatedPressable onLongPress={() => onTogglePin(message)} delayLongPress={350}>
        <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
          {message.pinned ? <Text style={styles.pinnedTag}>📌 Pinned to feed</Text> : null}
          <Text style={[styles.bubbleText, isMine && styles.bubbleTextMine]}>{message.body}</Text>
        </View>
      </AnimatedPressable>
      <Text style={styles.bubbleTime}>{formatTime(message.createdAt)}</Text>
    </View>
  );
}

export default function WorkspaceScreen() {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [workspace, setWorkspace] = useState<WorkspaceDetail | null>(null);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChannelMessage[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [showAddCrew, setShowAddCrew] = useState(false);
  const [showTracker, setShowTracker] = useState(false);
  const [invites, setInvites] = useState<WorkspaceInvite[] | null>(null);
  const [myWorkspaces, setMyWorkspaces] = useState<MyWorkspace[] | null>(null);
  const listRef = useRef<FlatList<ChannelMessage>>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      getWorkspace(id)
        .then((data) => {
          if (cancelled) return;
          setWorkspace(data);
          setActiveChannelId((prev) => prev ?? data.channels.find((c) => c.name === 'general')?.id ?? data.channels[0]?.id ?? null);
        })
        .catch(() => {
          if (!cancelled) setError("Couldn't load this workspace.");
        });
      return () => {
        cancelled = true;
      };
    }, [id]),
  );

  // Fetched alongside the workspace itself, not lazily on tap, so the
  // switcher strip can decide up front whether it's even worth showing —
  // no point rendering a row of one avatar.
  useFocusEffect(
    useCallback(() => {
      getMyWorkspaces()
        .then((res) => setMyWorkspaces(res.results))
        .catch(() => setMyWorkspaces([]));
    }, []),
  );

  const loadInvites = useCallback(() => {
    getWorkspaceInvites(id)
      .then((res) => setInvites(res.results))
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    loadInvites();
  }, [loadInvites]);

  useEffect(() => {
    if (!workspace || !activeChannelId) return;
    let cancelled = false;
    setMessages(null);
    getChannelMessages(workspace.id, activeChannelId)
      .then((res) => {
        if (!cancelled) setMessages(res.results);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load messages for this channel.");
      });
    return () => {
      cancelled = true;
    };
  }, [workspace, activeChannelId]);

  async function handleSend() {
    const body = draft.trim();
    if (!body || sending || !workspace || !activeChannelId) return;
    setSending(true);
    try {
      const message = await sendChannelMessage(workspace.id, activeChannelId, body);
      setMessages((prev) => (prev ? [...prev, message] : prev));
      setDraft('');
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    } catch {
      setError("Couldn't send that message.");
    } finally {
      setSending(false);
    }
  }

  // Long-press to pin — a pinned message surfaces as a Workspace Alert on
  // every member's Home feed, so this is the one action from the chat
  // itself that has an effect outside this screen.
  async function handleTogglePin(message: ChannelMessage) {
    if (!workspace || !activeChannelId) return;
    try {
      const { pinned } = await pinChannelMessage(workspace.id, activeChannelId, message.id);
      setMessages((prev) => prev?.map((m) => (m.id === message.id ? { ...m, pinned } : m)) ?? prev);
    } catch {
      setError("Couldn't pin that message.");
    }
  }

  const activeChannel = workspace?.channels.find((c) => c.id === activeChannelId);

  return (
    <KeyboardAvoidingView
      style={styles.safeArea}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <Stack.Screen
        options={{
          title: workspace?.project.title ?? 'Workspace',
          headerStyle: { backgroundColor: Colors[colorScheme].background },
          headerTintColor: Colors[colorScheme].text,
          headerShadowVisible: false,
          headerRight: () =>
            workspace ? (
              <View style={styles.headerActions}>
                <AnimatedPressable
                  onPress={() => router.push(`/workspace/${workspace.id}/board`)}
                  haptic="selection"
                  hitSlop={10}
                  style={styles.headerAddButton}
                >
                  <Text style={styles.headerAddButtonText}>Board</Text>
                </AnimatedPressable>
                <AnimatedPressable onPress={() => setShowAddCrew(true)} haptic="medium" hitSlop={10} style={styles.headerAddButton}>
                  <Text style={styles.headerAddButtonText}>+ Add</Text>
                </AnimatedPressable>
              </View>
            ) : null,
        }}
      />

      {error ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>{error}</Text>
        </View>
      ) : !workspace ? (
        <View style={styles.safeArea}>
          <FeedSkeletonList count={3} />
        </View>
      ) : (
        <>
          {myWorkspaces && myWorkspaces.length > 1 ? (
            <WorkspaceSwitcherStrip workspaces={myWorkspaces} currentId={workspace.id} />
          ) : null}

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.channelRail} contentContainerStyle={styles.channelRailContent}>
            {workspace.channels.map((c) => {
              const active = c.id === activeChannelId;
              return (
                <AnimatedPressable
                  key={c.id}
                  style={[styles.channelTab, active && styles.channelTabActive]}
                  haptic="selection"
                  onPress={() => setActiveChannelId(c.id)}
                >
                  <Text style={[styles.channelTabText, active && styles.channelTabTextActive]}>#{c.name}</Text>
                </AnimatedPressable>
              );
            })}
          </ScrollView>

          {invites && invites.length > 0 ? (
            <AnimatedPressable style={styles.trackerToggle} haptic="selection" onPress={() => setShowTracker((v) => !v)}>
              <Text style={styles.trackerToggleText}>
                {showTracker ? 'Hide' : 'Show'} crew invites ({invites.length})
              </Text>
            </AnimatedPressable>
          ) : null}
          {showTracker && invites ? (
            <View style={styles.trackerPanel}>
              <InviteTracker invites={invites} />
            </View>
          ) : null}

          {messages === null ? (
            <View style={styles.centered}>
              <ActivityIndicator color={Colors[colorScheme].tint} />
            </View>
          ) : (
            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={(m) => m.id}
              renderItem={({ item, index }) => (
                <MessageBubble
                  message={item}
                  isMine={item.senderId === user?.id}
                  showSender={messages[index - 1]?.senderId !== item.senderId}
                  onTogglePin={handleTogglePin}
                />
              )}
              contentContainerStyle={styles.messageList}
              onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
              ListEmptyComponent={
                <Text style={styles.emptyText}>
                  {activeChannel ? `Be the first to post in #${activeChannel.name}.` : ''}
                </Text>
              }
            />
          )}

          <View style={styles.composer}>
            <TextInput
              style={styles.composerInput}
              placeholder={activeChannel ? `Message #${activeChannel.name}` : 'Message…'}
              placeholderTextColor={Colors[colorScheme].muted}
              value={draft}
              onChangeText={setDraft}
              multiline
              maxLength={2000}
            />
            <AnimatedPressable style={styles.sendButton} haptic="medium" onPress={handleSend} disabled={sending || !draft.trim()}>
              {sending ? (
                <ActivityIndicator color={Colors[colorScheme].background} size="small" />
              ) : (
                <Text style={styles.sendButtonText}>Send</Text>
              )}
            </AnimatedPressable>
          </View>
        </>
      )}

      {workspace ? (
        <AddCrewMemberModal
          visible={showAddCrew}
          workspaceId={workspace.id}
          onClose={() => setShowAddCrew(false)}
          onInvited={loadInvites}
        />
      ) : null}
    </KeyboardAvoidingView>
  );
}

const createStyles = (colorScheme: 'light' | 'dark') =>
  StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors[colorScheme].background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Space.xxxl,
  },
  emptyText: {
    color: Colors[colorScheme].muted,
    ...Type.body,
    textAlign: 'center',
  },
  switcherRail: {
    flexGrow: 0,
  },
  switcherRailContent: {
    paddingHorizontal: Space.md,
    paddingTop: Space.sm,
    paddingBottom: Space.xs,
    gap: Space.sm + 2,
  },
  switcherRing: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  switcherRingActive: {
    borderColor: Colors[colorScheme].tint,
  },
  switcherAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors[colorScheme].surface2,
  },
  switcherAvatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  switcherAvatarFallbackText: {
    color: Colors[colorScheme].muted,
    ...Type.body,
    fontWeight: '700',
  },
  channelRail: {
    flexGrow: 0,
  },
  channelRailContent: {
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm,
    gap: Space.sm,
  },
  channelTab: {
    backgroundColor: Colors[colorScheme].card,
    borderRadius: Radius.pill,
    paddingHorizontal: Space.md + 2,
    paddingVertical: Space.sm - 1,
  },
  channelTabActive: {
    backgroundColor: Colors[colorScheme].tint,
    borderColor: Colors[colorScheme].tint,
  },
  channelTabText: {
    color: Colors[colorScheme].text,
    ...Type.body,
    fontWeight: '600',
  },
  channelTabTextActive: {
    color: Colors[colorScheme].background,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAddButton: {
    paddingHorizontal: Space.sm + 2,
    paddingVertical: 5,
  },
  headerAddButtonText: {
    color: Colors[colorScheme].tint,
    ...Type.bodyLarge,
    fontWeight: '700',
  },
  trackerToggle: {
    paddingHorizontal: Space.lg,
    paddingBottom: Space.sm,
  },
  trackerToggleText: {
    color: Colors[colorScheme].secondary,
    ...Type.small,
    fontWeight: '700',
  },
  trackerPanel: {
    paddingHorizontal: Space.lg,
    paddingBottom: Space.sm + 2,
  },
  trackerList: {
    gap: Space.sm,
  },
  trackerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm + 2,
    backgroundColor: Colors[colorScheme].card,
    borderRadius: Radius.md,
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm + 1,
  },
  trackerName: {
    color: Colors[colorScheme].text,
    ...Type.body,
    fontWeight: '700',
  },
  trackerMeta: {
    color: Colors[colorScheme].muted,
    ...Type.label,
    marginTop: 1,
  },
  trackerBadge: {
    backgroundColor: Colors[colorScheme].border,
    borderRadius: Radius.pill,
    paddingHorizontal: Space.sm + 1,
    paddingVertical: 4,
  },
  trackerBadgeAccepted: {
    backgroundColor: Colors[colorScheme].secondary,
  },
  trackerBadgeDeclined: {
    backgroundColor: '#4A3236',
  },
  trackerBadgeText: {
    color: Colors[colorScheme].text,
    ...Type.caption,
    fontWeight: '700',
  },
  messageList: {
    padding: Space.lg,
    gap: Space.sm + 2,
    flexGrow: 1,
  },
  bubbleRow: {
    alignItems: 'flex-start',
    gap: 3,
  },
  bubbleRowMine: {
    alignItems: 'flex-end',
  },
  senderName: {
    color: Colors[colorScheme].secondary,
    ...Type.label,
    fontWeight: '700',
    marginHorizontal: Space.xs,
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: Radius.xl,
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm,
  },
  bubbleTheirs: {
    backgroundColor: Colors[colorScheme].card,
  },
  bubbleMine: {
    backgroundColor: Colors[colorScheme].tint,
  },
  bubbleText: {
    color: Colors[colorScheme].text,
    ...Type.bodyLarge,
  },
  bubbleTextMine: {
    color: Colors[colorScheme].background,
  },
  pinnedTag: {
    color: Colors[colorScheme].secondary,
    ...Type.caption,
    fontWeight: '700',
    marginBottom: 3,
  },
  bubbleTime: {
    color: Colors[colorScheme].muted,
    ...Type.caption,
    marginHorizontal: Space.xs,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Space.sm,
    padding: Space.md,
  },
  composerInput: {
    flex: 1,
    backgroundColor: Colors[colorScheme].card,
    borderRadius: Radius.xxl + 2,
    paddingHorizontal: Space.md + 2,
    paddingVertical: Space.sm + 2,
    color: Colors[colorScheme].text,
    ...Type.bodyLarge,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: Colors[colorScheme].tint,
    borderRadius: Radius.xxl + 2,
    paddingHorizontal: Space.lg,
    paddingVertical: Space.sm + 2,
  },
  sendButtonText: {
    color: Colors[colorScheme].background,
    ...Type.bodyLarge,
    fontWeight: '700',
  },
});
