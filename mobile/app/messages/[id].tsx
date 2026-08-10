import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { SymbolView } from 'expo-symbols';

import { AnimatedPressable } from '@/components/AnimatedPressable';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { FeedSkeletonList } from '@/components/SkeletonLoader';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Radius, Space } from '@/constants/Spacing';
import { Fonts, Type } from '@/constants/Typography';
import { useAuth } from '@/context/AuthContext';
import {
  blockConversation,
  deleteConversationMessage,
  getConversationThread,
  resolveAvatarUrl,
  sendConversationMessage,
  uploadConversationMessageImage,
  type ConversationMessage,
  type ConversationThread,
  type PickedImage,
} from '@/lib/api';

// A curated, self-contained set — no external GIF/sticker service or API
// key involved, just large-format emoji sent as their own message kind
// (STICKER) so they render without a bubble background, same idea as
// iMessage's oversized single-emoji messages.
const STICKERS = [
  '🎬', '🎥', '🎞️', '📽️', '🍿', '🎭', '🏆', '👏',
  '🔥', '💯', '😂', '😍', '😮', '👍', '👎', '❤️',
  '🙌', '🤝', '🎉', '⭐', '✨', '🙏', '😢', '💪',
];

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function dayLabel(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (isSameDay(date, today)) return 'Today';
  if (isSameDay(date, yesterday)) return 'Yesterday';
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: date.getFullYear() === today.getFullYear() ? undefined : 'numeric',
  });
}

type ThreadListItem =
  | { type: 'date'; id: string; label: string }
  | { type: 'message'; id: string; message: ConversationMessage };

function buildThreadItems(messages: ConversationMessage[]): ThreadListItem[] {
  const items: ThreadListItem[] = [];
  let lastDay: string | null = null;
  for (const message of messages) {
    const day = new Date(message.createdAt).toDateString();
    if (day !== lastDay) {
      items.push({ type: 'date', id: `date-${day}`, label: dayLabel(message.createdAt) });
      lastDay = day;
    }
    items.push({ type: 'message', id: message.id, message });
  }
  return items;
}

function MessageBubble({
  message,
  isMine,
  onLongPress,
  onImagePress,
}: {
  message: ConversationMessage;
  isMine: boolean;
  onLongPress: () => void;
  onImagePress: (url: string) => void;
}) {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);

  if (message.deletedAt) {
    return (
      <View style={[styles.bubbleRow, isMine && styles.bubbleRowMine]}>
        <View style={[styles.bubble, styles.bubbleDeleted]}>
          <Text style={styles.bubbleDeletedText}>Message deleted</Text>
        </View>
      </View>
    );
  }

  if (message.kind === 'STICKER') {
    return (
      <AnimatedPressable
        style={[styles.bubbleRow, isMine && styles.bubbleRowMine]}
        scaleTo={0.94}
        haptic="none"
        onLongPress={isMine ? onLongPress : undefined}
        disabled={!isMine}
      >
        <Text style={styles.stickerText}>{message.body}</Text>
        <Text style={styles.bubbleTime}>{formatTime(message.createdAt)}</Text>
      </AnimatedPressable>
    );
  }

  if (message.kind === 'IMAGE') {
    const imageUrl = resolveAvatarUrl(message.imageUrl);
    return (
      <View style={[styles.bubbleRow, isMine && styles.bubbleRowMine]}>
        <AnimatedPressable
          style={styles.imageBubbleWrap}
          scaleTo={0.98}
          haptic="light"
          onPress={() => imageUrl && onImagePress(imageUrl)}
          onLongPress={isMine ? onLongPress : undefined}
        >
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.messageImage} />
          ) : (
            <View style={[styles.messageImage, styles.messageImageLoading]}>
              <ActivityIndicator color={Colors[colorScheme].muted} />
            </View>
          )}
        </AnimatedPressable>
        <Text style={styles.bubbleTime}>{formatTime(message.createdAt)}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.bubbleRow, isMine && styles.bubbleRowMine]}>
      <AnimatedPressable
        style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}
        scaleTo={0.98}
        haptic="none"
        onLongPress={isMine ? onLongPress : undefined}
        disabled={!isMine}
      >
        <Text style={[styles.bubbleText, isMine && styles.bubbleTextMine]}>{message.body}</Text>
      </AnimatedPressable>
      <Text style={styles.bubbleTime}>{formatTime(message.createdAt)}</Text>
    </View>
  );
}

export default function ConversationThreadScreen() {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [thread, setThread] = useState<ConversationThread | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [pickingImage, setPickingImage] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [confirmingBlock, setConfirmingBlock] = useState(false);
  const [showStickers, setShowStickers] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);
  const listRef = useRef<FlatList<ThreadListItem>>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      getConversationThread(id)
        .then((data) => {
          if (!cancelled) setThread(data);
        })
        .catch(() => {
          if (!cancelled) setError("Couldn't load this conversation.");
        });
      return () => {
        cancelled = true;
      };
    }, [id]),
  );

  const threadItems = useMemo(() => (thread ? buildThreadItems(thread.messages) : []), [thread]);

  function scrollToEnd() {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }

  async function handleSend() {
    const body = draft.trim();
    if (!body || sending || !thread) return;
    setSending(true);
    setSendError(null);
    try {
      const message = await sendConversationMessage(thread.id, body);
      setThread((prev) => (prev ? { ...prev, messages: [...prev.messages, message] } : prev));
      setDraft('');
      scrollToEnd();
    } catch {
      setSendError("Couldn't send that message. Try again.");
    } finally {
      setSending(false);
    }
  }

  async function handlePickImage() {
    if (!thread || pickingImage) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setSendError("Couldn't access your photos. Check your permissions.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (result.canceled || result.assets.length === 0) return;
    const asset = result.assets[0];
    const picked: PickedImage = { uri: asset.uri, mimeType: asset.mimeType, fileName: asset.fileName, file: asset.file };

    setSendError(null);
    setPickingImage(true);
    try {
      const message = await sendConversationMessage(thread.id, '', 'IMAGE');
      // Show the picked file's own URI immediately — the bubble appears in
      // the thread right away instead of sitting on a spinner while the
      // upload is still in flight, then gets swapped for the served URL.
      setThread((prev) =>
        prev ? { ...prev, messages: [...prev.messages, { ...message, imageUrl: picked.uri }] } : prev,
      );
      scrollToEnd();
      const uploaded = await uploadConversationMessageImage(thread.id, message.id, picked);
      setThread((prev) =>
        prev ? { ...prev, messages: prev.messages.map((m) => (m.id === message.id ? uploaded : m)) } : prev,
      );
    } catch {
      setSendError("Couldn't send that photo. Try again.");
    } finally {
      setPickingImage(false);
    }
  }

  async function handleSendSticker(emoji: string) {
    if (!thread) return;
    setShowStickers(false);
    setSendError(null);
    try {
      const message = await sendConversationMessage(thread.id, emoji, 'STICKER');
      setThread((prev) => (prev ? { ...prev, messages: [...prev.messages, message] } : prev));
      scrollToEnd();
    } catch {
      setSendError("Couldn't send that sticker. Try again.");
    }
  }

  async function handleConfirmDelete() {
    if (!thread || !messageToDelete) return;
    const targetId = messageToDelete;
    setMessageToDelete(null);
    try {
      const updated = await deleteConversationMessage(thread.id, targetId);
      setThread((prev) =>
        prev ? { ...prev, messages: prev.messages.map((m) => (m.id === targetId ? updated : m)) } : prev,
      );
    } catch {
      setSendError("Couldn't delete that message. Try again.");
    }
  }

  async function handleConfirmBlock() {
    if (!thread) return;
    setConfirmingBlock(false);
    await blockConversation(thread.id);
    router.back();
  }

  return (
    <KeyboardAvoidingView
      style={styles.safeArea}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <Stack.Screen
        options={{
          title: thread?.otherUser.name ?? 'Conversation',
          headerStyle: { backgroundColor: Colors[colorScheme].background },
          headerTintColor: Colors[colorScheme].text,
          headerShadowVisible: false,
          headerRight: thread
            ? () => (
                <AnimatedPressable haptic="light" onPress={() => setConfirmingBlock(true)} hitSlop={12}>
                  <Text style={styles.blockHeaderText}>Block</Text>
                </AnimatedPressable>
              )
            : undefined,
        }}
      />

      <ConfirmDialog
        visible={confirmingBlock}
        title="Block this person?"
        message="They won't be able to message you again."
        confirmLabel="Block"
        destructive
        onConfirm={handleConfirmBlock}
        onCancel={() => setConfirmingBlock(false)}
      />

      <ConfirmDialog
        visible={!!messageToDelete}
        title="Delete this message?"
        message="This can't be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={handleConfirmDelete}
        onCancel={() => setMessageToDelete(null)}
      />

      <Modal visible={showStickers} transparent animationType="fade" onRequestClose={() => setShowStickers(false)}>
        <View style={styles.stickerOverlay}>
          <Pressable style={styles.stickerBackdrop} onPress={() => setShowStickers(false)} />
          <View style={styles.stickerSheet}>
            <Text style={styles.stickerSheetTitle}>Stickers</Text>
            <View style={styles.stickerGrid}>
              {STICKERS.map((emoji) => (
                <AnimatedPressable
                  key={emoji}
                  style={styles.stickerItem}
                  haptic="light"
                  onPress={() => handleSendSticker(emoji)}
                >
                  <Text style={styles.stickerItemText}>{emoji}</Text>
                </AnimatedPressable>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!viewingImageUrl} transparent animationType="fade" onRequestClose={() => setViewingImageUrl(null)}>
        <Pressable style={styles.imageViewerBackdrop} onPress={() => setViewingImageUrl(null)}>
          {viewingImageUrl ? (
            <Image source={{ uri: viewingImageUrl }} style={styles.imageViewerImage} resizeMode="contain" />
          ) : null}
        </Pressable>
      </Modal>

      {error ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>{error}</Text>
        </View>
      ) : !thread ? (
        <View style={styles.safeArea}>
          <FeedSkeletonList count={3} />
        </View>
      ) : thread.status !== 'ACCEPTED' ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>
            {thread.status === 'PENDING_REQUEST'
              ? 'Waiting for them to accept your message request.'
              : 'This conversation is no longer available.'}
          </Text>
        </View>
      ) : (
        <>
          <AnimatedPressable style={styles.header} haptic="light" onPress={() => router.push(`/profile/${thread.otherUser.id}`)}>
            {resolveAvatarUrl(thread.otherUser.avatarUrl) ? (
              <Image source={{ uri: resolveAvatarUrl(thread.otherUser.avatarUrl) ?? undefined }} style={styles.headerAvatar} />
            ) : (
              <View style={[styles.headerAvatar, styles.headerAvatarFallback]}>
                <Text style={styles.headerAvatarInitial}>{thread.otherUser.name.charAt(0)}</Text>
              </View>
            )}
            <View>
              <Text style={styles.headerName}>{thread.otherUser.name}</Text>
              {thread.otherUser.tagline ? <Text style={styles.headerTagline}>{thread.otherUser.tagline}</Text> : null}
            </View>
          </AnimatedPressable>

          <FlatList
            ref={listRef}
            data={threadItems}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) =>
              item.type === 'date' ? (
                <View style={styles.dateDivider}>
                  <Text style={styles.dateDividerText}>{item.label}</Text>
                </View>
              ) : (
                <MessageBubble
                  message={item.message}
                  isMine={item.message.senderId === user?.id}
                  onLongPress={() => setMessageToDelete(item.message.id)}
                  onImagePress={setViewingImageUrl}
                />
              )
            }
            contentContainerStyle={styles.messageList}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          />

          {sendError ? <Text style={styles.sendErrorText}>{sendError}</Text> : null}
          <View style={styles.composer}>
            <AnimatedPressable
              style={styles.composerIconButton}
              haptic="light"
              onPress={handlePickImage}
              disabled={pickingImage}
            >
              {pickingImage ? (
                <ActivityIndicator color={Colors[colorScheme].muted} size="small" />
              ) : (
                <SymbolView name={{ ios: 'photo', android: 'image', web: 'image' }} size={20} tintColor={Colors[colorScheme].muted} />
              )}
            </AnimatedPressable>
            <AnimatedPressable style={styles.composerIconButton} haptic="light" onPress={() => setShowStickers(true)}>
              <SymbolView
                name={{ ios: 'face.smiling', android: 'sentiment_satisfied', web: 'sentiment_satisfied' }}
                size={20}
                tintColor={Colors[colorScheme].muted}
              />
            </AnimatedPressable>
            <TextInput
              style={styles.composerInput}
              placeholder="Message…"
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
  blockHeaderText: {
    color: Colors[colorScheme].tint,
    ...Type.body,
    fontWeight: '700',
    marginRight: Space.xs,
  },
  sendErrorText: {
    color: Colors[colorScheme].error,
    ...Type.small,
    paddingHorizontal: Space.lg,
    paddingTop: Space.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm + 2,
    paddingHorizontal: Space.lg,
    paddingVertical: Space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors[colorScheme].border,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  headerAvatarFallback: {
    backgroundColor: Colors[colorScheme].card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarInitial: {
    color: Colors[colorScheme].text,
    fontWeight: '700',
  },
  headerName: {
    color: Colors[colorScheme].text,
    ...Type.bodyLarge,
    fontFamily: Fonts.serif,
  },
  headerTagline: {
    color: Colors[colorScheme].secondary,
    ...Type.small,
  },
  messageList: {
    padding: Space.lg,
    gap: Space.sm + 2,
  },
  dateDivider: {
    alignItems: 'center',
    marginVertical: Space.sm,
  },
  dateDividerText: {
    color: Colors[colorScheme].muted,
    ...Type.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    backgroundColor: Colors[colorScheme].surface2,
    borderRadius: Radius.pill,
    paddingHorizontal: Space.md,
    paddingVertical: 4,
    overflow: 'hidden',
  },
  bubbleRow: {
    alignItems: 'flex-start',
    gap: 3,
  },
  bubbleRowMine: {
    alignItems: 'flex-end',
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: Radius.xl,
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm,
  },
  bubbleTheirs: {
    backgroundColor: Colors[colorScheme].card,
    borderColor: Colors[colorScheme].border,
    borderWidth: 1,
  },
  bubbleMine: {
    backgroundColor: Colors[colorScheme].tint,
  },
  bubbleDeleted: {
    backgroundColor: 'transparent',
    borderColor: Colors[colorScheme].border,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  bubbleDeletedText: {
    color: Colors[colorScheme].muted,
    ...Type.body,
    fontStyle: 'italic',
  },
  bubbleText: {
    color: Colors[colorScheme].text,
    ...Type.bodyLarge,
  },
  bubbleTextMine: {
    color: Colors[colorScheme].background,
  },
  bubbleTime: {
    color: Colors[colorScheme].muted,
    ...Type.caption,
    marginHorizontal: Space.xs,
  },
  stickerText: {
    fontSize: 56,
    lineHeight: 64,
  },
  imageBubbleWrap: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
  },
  messageImage: {
    width: 220,
    height: 220,
    backgroundColor: Colors[colorScheme].surface2,
  },
  messageImageLoading: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Space.sm,
    padding: Space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors[colorScheme].border,
  },
  composerIconButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composerInput: {
    flex: 1,
    backgroundColor: Colors[colorScheme].card,
    borderColor: Colors[colorScheme].border,
    borderWidth: 1,
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
  stickerOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  stickerBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  stickerSheet: {
    backgroundColor: Colors[colorScheme].background,
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    padding: Space.lg,
    paddingBottom: Space.xxl,
  },
  stickerSheetTitle: {
    color: Colors[colorScheme].text,
    ...Type.title,
    fontFamily: Fonts.serif,
    marginBottom: Space.md,
  },
  stickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Space.sm,
  },
  stickerItem: {
    width: 56,
    height: 56,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors[colorScheme].card,
  },
  stickerItemText: {
    fontSize: 30,
  },
  imageViewerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageViewerImage: {
    width: '100%',
    height: '80%',
  },
});
