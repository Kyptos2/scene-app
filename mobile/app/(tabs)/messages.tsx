import { useCallback, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';

import { AnimatedPressable } from '@/components/AnimatedPressable';
import { MessageRequestCard } from '@/components/messages/MessageRequestCard';
import { FeedSkeletonList } from '@/components/SkeletonLoader';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Radius, Space } from '@/constants/Spacing';
import { Type } from '@/constants/Typography';
import { useAuth } from '@/context/AuthContext';
import {
  acceptMessageRequest,
  blockConversation,
  denyMessageRequest,
  getConversations,
  getMessageRequests,
  resolveAvatarUrl,
  type ConversationSummary,
  type MessageRequestSummary,
} from '@/lib/api';

function lastMessageBodyPreview(lastMessage: NonNullable<ConversationSummary['lastMessage']>): string {
  if (lastMessage.deletedAt) return 'Message deleted';
  if (lastMessage.kind === 'IMAGE') return '📷 Photo';
  if (lastMessage.kind === 'STICKER') return `Sent a sticker ${lastMessage.body}`;
  return lastMessage.body;
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60) return `${Math.max(minutes, 1)}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function ConversationRow({ conversation, myUserId }: { conversation: ConversationSummary; myUserId: string }) {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  const avatarUrl = resolveAvatarUrl(conversation.otherUser.avatarUrl);
  const preview = conversation.lastMessage
    ? `${conversation.lastMessage.senderId === myUserId ? 'You: ' : ''}${lastMessageBodyPreview(conversation.lastMessage)}`
    : 'Say hello';
  const unread = conversation.unread;

  return (
    <AnimatedPressable style={styles.conversationRow} haptic="light" onPress={() => router.push(`/messages/${conversation.id}`)}>
      {avatarUrl ? (
        <Image source={{ uri: avatarUrl }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarFallback]}>
          <Text style={styles.avatarInitial}>{conversation.otherUser.name.charAt(0)}</Text>
        </View>
      )}
      <View style={styles.conversationMeta}>
        <Text style={styles.conversationName}>{conversation.otherUser.name}</Text>
        <Text style={[styles.conversationPreview, unread && styles.conversationPreviewUnread]} numberOfLines={1}>
          {preview}
        </Text>
      </View>
      <View style={styles.conversationTrailing}>
        <Text style={styles.conversationTime}>{relativeTime(conversation.updatedAt)}</Text>
        {unread ? <View style={styles.unreadDot} /> : null}
      </View>
    </AnimatedPressable>
  );
}

export default function MessagesTabScreen() {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  const { user } = useAuth();
  const [requests, setRequests] = useState<MessageRequestSummary[] | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [requestsRes, conversationsRes] = await Promise.all([getMessageRequests(), getConversations()]);
      setRequests(requestsRes.results);
      setConversations(conversationsRes.results);
    } catch {
      setError("Couldn't load messages. Is the dev server running?");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function handleAccept(id: string) {
    await acceptMessageRequest(id);
    await load();
  }

  async function handleDeny(id: string) {
    await denyMessageRequest(id);
    setRequests((prev) => (prev ? prev.filter((r) => r.id !== id) : prev));
  }

  async function handleBlock(id: string) {
    await blockConversation(id);
    setRequests((prev) => (prev ? prev.filter((r) => r.id !== id) : prev));
  }

  const loading = requests === null && conversations === null && !error;

  return (
    <View style={styles.safeArea}>
      {loading ? (
        <FeedSkeletonList count={3} />
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>{error}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {requests && requests.length > 0 ? (
            <>
              <Text style={styles.sectionTitle}>Requests</Text>
              {requests.map((request) => (
                <MessageRequestCard
                  key={request.id}
                  request={request}
                  onAccept={handleAccept}
                  onDeny={handleDeny}
                  onBlock={handleBlock}
                />
              ))}
            </>
          ) : null}

          <Text style={styles.sectionTitle}>Messages</Text>
          {!conversations || conversations.length === 0 ? (
            <Text style={styles.emptyText}>
              No conversations yet — message a connection or reach out from someone's profile.
            </Text>
          ) : (
            conversations.map((c) => <ConversationRow key={c.id} conversation={c} myUserId={user?.id ?? ''} />)
          )}

          <View style={styles.bottomSpacer} />
        </ScrollView>
      )}
    </View>
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
    paddingHorizontal: Space.lg,
  },
  content: {
    paddingTop: Space.sm,
    paddingBottom: 140, // clears the floating [+] tab button
  },
  sectionTitle: {
    color: Colors[colorScheme].muted,
    ...Type.small,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: Space.lg,
    paddingTop: Space.lg,
    paddingBottom: Space.sm,
  },
  conversationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    paddingHorizontal: Space.lg,
    paddingVertical: Space.sm + 2,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarFallback: {
    backgroundColor: Colors[colorScheme].card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors[colorScheme].border,
  },
  avatarInitial: {
    color: Colors[colorScheme].text,
    fontWeight: '700',
  },
  conversationMeta: {
    flex: 1,
    gap: 2,
  },
  conversationName: {
    color: Colors[colorScheme].text,
    ...Type.subtitle,
    fontWeight: '700',
  },
  conversationPreview: {
    color: Colors[colorScheme].muted,
    ...Type.body,
  },
  conversationPreviewUnread: {
    color: Colors[colorScheme].text,
    fontWeight: '600',
  },
  conversationTrailing: {
    alignItems: 'flex-end',
    gap: Space.xs + 2,
  },
  conversationTime: {
    color: Colors[colorScheme].muted,
    ...Type.label,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors[colorScheme].tint,
  },
  bottomSpacer: {
    height: Space.xxl,
  },
});
