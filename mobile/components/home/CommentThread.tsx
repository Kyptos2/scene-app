import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { getFeedComments, postFeedComment, type FeedCommentEntry } from '@/lib/api';

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60) return `${Math.max(minutes, 1)}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export function CommentThread({
  itemType,
  itemId,
  onCommentPosted,
}: {
  itemType: string;
  itemId: string;
  onCommentPosted?: () => void;
}) {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  const [comments, setComments] = useState<FeedCommentEntry[] | null>(null);
  const [draft, setDraft] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getFeedComments(itemType, itemId)
      .then((res) => setComments(res.results))
      .catch(() => setError("Couldn't load comments."));
  }, [itemType, itemId]);

  async function handlePost() {
    const body = draft.trim();
    if (!body) return;
    setPosting(true);
    setError(null);
    try {
      const comment = await postFeedComment(itemType, itemId, body);
      setComments((prev) => [...(prev ?? []), comment]);
      setDraft('');
      onCommentPosted?.();
    } catch {
      setError("Couldn't post that comment. Try again.");
    } finally {
      setPosting(false);
    }
  }

  return (
    <View style={styles.container}>
      {comments === null ? (
        <ActivityIndicator color={Colors[colorScheme].tint} size="small" style={styles.spinner} />
      ) : comments.length === 0 ? (
        <Text style={styles.empty}>No comments yet — be the first to weigh in.</Text>
      ) : (
        comments.map((c) => (
          <View key={c.id} style={styles.comment}>
            <Text style={styles.commentMeta}>
              <Text style={styles.commentAuthor}>{c.authorName}</Text> · {relativeTime(c.createdAt)}
            </Text>
            <Text style={styles.commentBody}>{c.body}</Text>
          </View>
        ))
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.composeRow}>
        <TextInput
          style={styles.input}
          placeholder="Write a comment…"
          placeholderTextColor={Colors[colorScheme].muted}
          value={draft}
          onChangeText={setDraft}
          multiline
        />
        <Pressable style={styles.postButton} onPress={handlePost} disabled={posting || !draft.trim()}>
          {posting ? (
            <ActivityIndicator color={Colors[colorScheme].background} size="small" />
          ) : (
            <Text style={styles.postButtonText}>Post</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const createStyles = (colorScheme: 'light' | 'dark') =>
  StyleSheet.create({
  container: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors[colorScheme].border,
    gap: 8,
  },
  spinner: {
    marginVertical: 4,
  },
  empty: {
    color: Colors[colorScheme].muted,
    fontSize: 12,
  },
  comment: {
    gap: 1,
  },
  commentMeta: {
    color: Colors[colorScheme].muted,
    fontSize: 11,
  },
  commentAuthor: {
    color: Colors[colorScheme].text,
    fontWeight: '700',
  },
  commentBody: {
    color: Colors[colorScheme].text,
    fontSize: 13,
  },
  error: {
    color: Colors[colorScheme].error,
    fontSize: 12,
  },
  composeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: Colors[colorScheme].background,
    borderColor: Colors[colorScheme].border,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    color: Colors[colorScheme].text,
    fontSize: 13,
    maxHeight: 80,
  },
  postButton: {
    backgroundColor: Colors[colorScheme].tint,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  postButtonText: {
    color: Colors[colorScheme].background,
    fontSize: 12,
    fontWeight: '700',
  },
});
