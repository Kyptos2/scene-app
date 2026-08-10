import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, ZoomIn } from 'react-native-reanimated';

import { AnimatedPressable } from '@/components/AnimatedPressable';
import { CommentThread } from '@/components/home/CommentThread';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { applaudFeedItem, createConnection, deleteFeedPost, type ReportTargetType } from '@/lib/api';
import { shareFeedItem } from '@/lib/shareLinks';
import type { NetworkFeedItem } from '@/lib/networkFeed';

const REPORT_TARGET_TYPE: Partial<Record<NetworkFeedItem['type'], ReportTargetType>> = {
  crew_call: 'PRODUCTION_REQUEST',
  announcement: 'FEED_POST',
  project_launch: 'FEED_POST',
};

// FeedPost-backed item types — the only ones deletable via /api/feed/posts/[id].
const DELETABLE_TYPES: NetworkFeedItem['type'][] = ['announcement', 'project_launch'];

export function InteractionBar({
  item,
  onApplaud,
  onDeleted,
}: {
  item: NetworkFeedItem;
  onApplaud?: (item: NetworkFeedItem, applauded: boolean) => void;
  onDeleted?: (item: NetworkFeedItem) => void;
}) {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  const [applauded, setApplauded] = useState(item.viewerHasApplauded);
  const [applaudCount, setApplaudCount] = useState(item.applaudCount);
  const [connectState, setConnectState] = useState<'idle' | 'sending' | 'sent'>(
    item.actor.viewerHasConnected ? 'sent' : 'idle',
  );
  const [showComments, setShowComments] = useState(false);
  const [commentCount, setCommentCount] = useState(item.commentCount);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const applaudScale = useSharedValue(1);
  const applaudAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: applaudScale.value }] }));

  async function handleConnect() {
    if (connectState !== 'idle') return;
    setConnectState('sending');
    setConnectError(null);
    try {
      await createConnection(item.actor.id);
      setConnectState('sent');
    } catch {
      setConnectState('idle');
      setConnectError("Couldn't send that request. Try again.");
    }
  }

  async function handleApplaud() {
    const next = !applauded;
    setApplauded(next);
    setApplaudCount((c) => c + (next ? 1 : -1));
    onApplaud?.(item, next);
    if (next) {
      applaudScale.value = withSequence(withSpring(1.3, { damping: 6, stiffness: 300 }), withSpring(1, { damping: 10 }));
    }
    try {
      const result = await applaudFeedItem(item.type, item.id);
      setApplauded(result.applauded);
      setApplaudCount(result.count);
    } catch {
      setApplauded(!next);
      setApplaudCount((c) => c + (next ? -1 : 1));
    }
  }

  async function handleShare() {
    try {
      await shareFeedItem(item);
    } catch {
      // user cancelled or share sheet unavailable — nothing to do
    }
  }

  async function handleDelete() {
    setConfirmingDelete(false);
    setDeleteError(null);
    try {
      await deleteFeedPost(item.id);
      onDeleted?.(item);
    } catch {
      setDeleteError("Couldn't delete this post. Try again.");
    }
  }

  const canDelete = item.actor.viewerIsSelf && DELETABLE_TYPES.includes(item.type);

  const primaryAction =
    item.type === 'crew_call' ? (
      item.actor.viewerIsSelf ? (
        <AnimatedPressable style={styles.connectButton} haptic="medium" onPress={() => router.push(`/crew-call/${item.id}`)}>
          <Text style={styles.connectButtonText}>Manage Applicants</Text>
        </AnimatedPressable>
      ) : null
    ) : item.actor.viewerIsSelf ? null : (
      <AnimatedPressable style={styles.connectButton} haptic="medium" onPress={handleConnect} disabled={connectState !== 'idle'}>
        <View style={styles.connectContent}>
          {connectState === 'sent' ? (
            <Animated.View key="check" entering={ZoomIn.springify().damping(10)}>
              <Text style={styles.connectCheck}>✓</Text>
            </Animated.View>
          ) : null}
          <Text style={styles.connectButtonText}>
            {connectState === 'sent' ? 'Connected' : connectState === 'sending' ? 'Connecting…' : 'Connect'}
          </Text>
        </View>
      </AnimatedPressable>
    );

  return (
    <View>
      <View style={styles.row}>
        {primaryAction}

        <AnimatedPressable style={styles.action} haptic="light" onPress={handleApplaud}>
          <Animated.Text style={[styles.actionText, applauded && styles.actionTextActive, applaudAnimatedStyle]}>
            Applaud{applaudCount > 0 ? `  ${applaudCount}` : ''}
          </Animated.Text>
        </AnimatedPressable>

        <AnimatedPressable style={styles.action} haptic="selection" onPress={() => setShowComments((v) => !v)}>
          <Text style={[styles.actionText, showComments && styles.actionTextActive]}>
            Comment{commentCount > 0 ? `  ${commentCount}` : ''}
          </Text>
        </AnimatedPressable>

        <AnimatedPressable style={styles.action} haptic="light" onPress={handleShare}>
          <Text style={styles.actionText}>Share</Text>
        </AnimatedPressable>

        {!item.actor.viewerIsSelf && REPORT_TARGET_TYPE[item.type] ? (
          <AnimatedPressable
            style={styles.action}
            haptic="light"
            onPress={() =>
              router.push({
                pathname: '/report',
                params: { targetType: REPORT_TARGET_TYPE[item.type], targetId: item.id },
              })
            }
          >
            <Text style={styles.actionText}>Report</Text>
          </AnimatedPressable>
        ) : null}

        {canDelete ? (
          <AnimatedPressable style={styles.action} haptic="light" onPress={() => setConfirmingDelete(true)}>
            <Text style={styles.actionText}>Delete</Text>
          </AnimatedPressable>
        ) : null}
      </View>

      {connectError ? <Text style={styles.errorText}>{connectError}</Text> : null}
      {deleteError ? <Text style={styles.errorText}>{deleteError}</Text> : null}

      {showComments ? (
        <CommentThread itemType={item.type} itemId={item.id} onCommentPosted={() => setCommentCount((c) => c + 1)} />
      ) : null}

      <ConfirmDialog
        visible={confirmingDelete}
        title="Delete this post?"
        message="This can't be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setConfirmingDelete(false)}
      />
    </View>
  );
}

const createStyles = (colorScheme: 'light' | 'dark') =>
  StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  connectButton: {
    backgroundColor: Colors[colorScheme].tint,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  connectButtonText: {
    color: Colors[colorScheme].background,
    fontSize: 12,
    fontWeight: '700',
  },
  connectContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  connectCheck: {
    color: Colors[colorScheme].background,
    fontSize: 12,
    fontWeight: '800',
  },
  action: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  actionText: {
    color: Colors[colorScheme].muted,
    fontSize: 12,
    fontWeight: '600',
  },
  actionTextActive: {
    color: Colors[colorScheme].secondary,
  },
  errorText: {
    color: Colors[colorScheme].error,
    fontSize: 11,
    marginTop: 2,
  },
});
