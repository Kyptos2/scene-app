import { useCallback, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, Stack, useFocusEffect } from 'expo-router';

import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { approveFilm, getPendingFilms, rejectFilm, resolveAvatarUrl, type PendingFilm } from '@/lib/api';

function PendingFilmRow({ film, onDecided }: { film: PendingFilm; onDecided: (id: string) => void }) {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  const [pending, setPending] = useState<'approve' | 'reject' | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const posterUrl = resolveAvatarUrl(film.posterUrl);

  async function handleApprove() {
    setPending('approve');
    setActionError(null);
    try {
      await approveFilm(film.id);
      onDecided(film.id);
    } catch {
      setActionError("Couldn't approve this film. Try again.");
    } finally {
      setPending(null);
    }
  }

  async function handleConfirmReject() {
    setPending('reject');
    setActionError(null);
    try {
      await rejectFilm(film.id, note.trim() || null);
      onDecided(film.id);
    } catch {
      setActionError("Couldn't reject this film. Try again.");
    } finally {
      setPending(null);
    }
  }

  return (
    <View style={styles.row}>
      <Pressable style={styles.header} onPress={() => router.push(`/project/${film.id}`)}>
        {posterUrl ? (
          <Image source={{ uri: posterUrl }} style={styles.poster} />
        ) : (
          <View style={[styles.poster, styles.posterFallback]} />
        )}
        <View style={styles.meta}>
          <Text style={styles.title}>{film.title}</Text>
          <Text style={styles.submitter}>Submitted by @{film.owner.username}</Text>
          {film.logline ? (
            <Text style={styles.logline} numberOfLines={2}>
              {film.logline}
            </Text>
          ) : null}
        </View>
      </Pressable>

      {actionError ? <Text style={styles.actionError}>{actionError}</Text> : null}

      {rejecting ? (
        <View style={styles.rejectForm}>
          <TextInput
            style={styles.rejectInput}
            placeholder="Note for the submitter (optional)"
            placeholderTextColor={Colors[colorScheme].muted}
            value={note}
            onChangeText={setNote}
          />
          <View style={styles.actions}>
            <Pressable style={styles.rejectButton} onPress={() => setRejecting(false)} disabled={pending !== null}>
              <Text style={styles.rejectButtonText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.approveButton} onPress={handleConfirmReject} disabled={pending !== null}>
              {pending === 'reject' ? (
                <ActivityIndicator color={Colors[colorScheme].background} size="small" />
              ) : (
                <Text style={styles.approveButtonText}>Confirm Reject</Text>
              )}
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.actions}>
          <Pressable style={styles.rejectButton} onPress={() => setRejecting(true)} disabled={pending !== null}>
            <Text style={styles.rejectButtonText}>Reject</Text>
          </Pressable>
          <Pressable style={styles.approveButton} onPress={handleApprove} disabled={pending !== null}>
            {pending === 'approve' ? (
              <ActivityIndicator color={Colors[colorScheme].background} size="small" />
            ) : (
              <Text style={styles.approveButtonText}>Publish</Text>
            )}
          </Pressable>
        </View>
      )}
    </View>
  );
}

export default function PendingFilmsScreen() {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  const { user } = useAuth();
  const [films, setFilms] = useState<PendingFilm[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      getPendingFilms()
        .then((res) => {
          if (!cancelled) setFilms(res.results);
        })
        .catch(() => {
          if (!cancelled) setError("Couldn't load the pending queue.");
        });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  function handleDecided(id: string) {
    setFilms((prev) => (prev ? prev.filter((f) => f.id !== id) : prev));
  }

  return (
    <View style={styles.safeArea}>
      <Stack.Screen
        options={{
          title: 'Pending Films',
          headerStyle: { backgroundColor: Colors[colorScheme].background },
          headerTintColor: Colors[colorScheme].text,
          headerShadowVisible: false,
        }}
      />

      {!user?.isModerator ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>You don't have access to this page.</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>{error}</Text>
        </View>
      ) : films === null ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors[colorScheme].tint} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {films.length === 0 ? (
            <Text style={styles.emptyText}>Nothing pending review right now.</Text>
          ) : (
            films.map((f) => <PendingFilmRow key={f.id} film={f} onDecided={handleDecided} />)
          )}
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
    padding: 32,
  },
  emptyText: {
    color: Colors[colorScheme].muted,
    fontSize: 13,
    textAlign: 'center',
  },
  content: {
    padding: 16,
    gap: 12,
  },
  row: {
    backgroundColor: Colors[colorScheme].card,
    borderColor: Colors[colorScheme].border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    gap: 10,
  },
  poster: {
    width: 48,
    height: 72,
    borderRadius: 6,
  },
  posterFallback: {
    backgroundColor: Colors[colorScheme].border,
  },
  meta: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: Colors[colorScheme].text,
    fontSize: 15,
    fontWeight: '700',
  },
  submitter: {
    color: Colors[colorScheme].muted,
    fontSize: 12,
  },
  logline: {
    color: Colors[colorScheme].text,
    fontSize: 12,
    lineHeight: 16,
  },
  actionError: {
    color: Colors[colorScheme].error,
    fontSize: 12,
  },
  rejectForm: {
    gap: 8,
  },
  rejectInput: {
    backgroundColor: Colors[colorScheme].background,
    borderColor: Colors[colorScheme].border,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: Colors[colorScheme].text,
    fontSize: 13,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  rejectButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors[colorScheme].tint,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  rejectButtonText: {
    color: Colors[colorScheme].tint,
    fontSize: 13,
    fontWeight: '700',
  },
  approveButton: {
    flex: 1,
    backgroundColor: Colors[colorScheme].secondary,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  approveButtonText: {
    color: Colors[colorScheme].background,
    fontSize: 13,
    fontWeight: '700',
  },
});
