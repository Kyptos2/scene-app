import { useState } from 'react';
import { ActivityIndicator, FlatList, Image, Modal, StyleSheet, Text, View } from 'react-native';

import { AnimatedPressable } from '@/components/AnimatedPressable';
import { SearchBar } from '@/components/search/SearchBar';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { ROLE_LABELS } from '@/constants/Labels';
import { Radius, Space } from '@/constants/Spacing';
import { Fonts, Type } from '@/constants/Typography';
import { inviteToWorkspace, resolveAvatarUrl, searchUsers } from '@/lib/api';
import type { SearchUserResult } from '@/lib/search';

const ROLE_OPTIONS = Object.entries(ROLE_LABELS);

// Real-time user lookup by name/@handle/role, then a role picker that both
// labels the invite and (on acceptance, server-side) derives which
// department channel the new member lands in.
export function AddCrewMemberModal({
  visible,
  workspaceId,
  onClose,
  onInvited,
}: {
  visible: boolean;
  workspaceId: string;
  onClose: () => void;
  onInvited: () => void;
}) {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  const [results, setResults] = useState<SearchUserResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<SearchUserResult | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setResults(null);
    setQuery('');
    setSelected(null);
    setRole(null);
    setError(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleQueryChange(q: string) {
    setQuery(q);
    if (!q) {
      setResults(null);
      return;
    }
    setSearching(true);
    searchUsers(q)
      .then((res) => setResults(res.results))
      .catch(() => setResults([]))
      .finally(() => setSearching(false));
  }

  async function handleInvite() {
    if (!selected || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await inviteToWorkspace(workspaceId, selected.id, role);
      onInvited();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send that invite.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Add Crew Member</Text>
          <AnimatedPressable haptic="light" onPress={handleClose} hitSlop={12}>
            <Text style={styles.close}>Close</Text>
          </AnimatedPressable>
        </View>

        {!selected ? (
          <>
            <SearchBar onQueryChange={handleQueryChange} placeholder="Search by name, @handle, or role" autoFocus />
            {searching ? <ActivityIndicator color={Colors[colorScheme].tint} style={styles.spinner} /> : null}
            {!searching && query && results?.length === 0 ? (
              <Text style={styles.emptyText}>No filmmakers found for "{query}".</Text>
            ) : null}
            <FlatList
              data={results ?? []}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const avatarUrl = resolveAvatarUrl(item.avatarUrl);
                return (
                  <AnimatedPressable style={styles.resultRow} haptic="light" onPress={() => setSelected(item)}>
                    {avatarUrl ? (
                      <Image source={{ uri: avatarUrl }} style={styles.avatar} />
                    ) : (
                      <View style={[styles.avatar, styles.avatarFallback]}>
                        <Text style={styles.avatarInitial}>{item.name.charAt(0)}</Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.resultName}>{item.name}</Text>
                      <Text style={styles.resultHandle}>@{item.handle}</Text>
                    </View>
                  </AnimatedPressable>
                );
              }}
            />
          </>
        ) : (
          <View style={styles.form}>
            <AnimatedPressable style={styles.selectedRow} haptic="light" onPress={() => setSelected(null)}>
              {resolveAvatarUrl(selected.avatarUrl) ? (
                <Image source={{ uri: resolveAvatarUrl(selected.avatarUrl)! }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <Text style={styles.avatarInitial}>{selected.name.charAt(0)}</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.resultName}>{selected.name}</Text>
                <Text style={styles.resultHandle}>@{selected.handle}</Text>
              </View>
              <Text style={styles.changeLink}>Change</Text>
            </AnimatedPressable>

            <Text style={styles.sectionLabel}>Role on this project (optional)</Text>
            <View style={styles.roleGrid}>
              {ROLE_OPTIONS.map(([value, label]) => {
                const isSelected = value === role;
                return (
                  <AnimatedPressable
                    key={value}
                    style={[styles.roleChip, isSelected && styles.roleChipSelected]}
                    haptic="selection"
                    onPress={() => setRole(isSelected ? null : value)}
                  >
                    <Text style={[styles.roleChipText, isSelected && styles.roleChipTextSelected]}>{label}</Text>
                  </AnimatedPressable>
                );
              })}
            </View>
            <Text style={styles.hint}>
              {role
                ? `On acceptance, they'll be added to the department channel for ${ROLE_LABELS[role] ?? role}.`
                : 'No role picked — they can still post in #general once they accept.'}
            </Text>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <AnimatedPressable style={styles.inviteButton} haptic="medium" onPress={handleInvite} disabled={submitting}>
              {submitting ? (
                <ActivityIndicator color={Colors[colorScheme].background} size="small" />
              ) : (
                <Text style={styles.inviteButtonText}>Send Invite</Text>
              )}
            </AnimatedPressable>
          </View>
        )}
      </View>
    </Modal>
  );
}

const createStyles = (colorScheme: 'light' | 'dark') =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors[colorScheme].background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Space.xl,
    paddingTop: Space.xl,
    paddingBottom: Space.xs,
  },
  title: {
    color: Colors[colorScheme].text,
    ...Type.title,
    fontFamily: Fonts.serif,
  },
  close: {
    color: Colors[colorScheme].tint,
    ...Type.subtitle,
    fontWeight: '600',
  },
  spinner: {
    marginTop: Space.lg,
  },
  emptyText: {
    color: Colors[colorScheme].muted,
    ...Type.body,
    paddingHorizontal: Space.lg,
    marginTop: Space.md,
  },
  list: {
    paddingBottom: Space.xxl,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    paddingHorizontal: Space.lg,
    paddingVertical: Space.sm + 2,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarFallback: {
    backgroundColor: Colors[colorScheme].card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: Colors[colorScheme].text,
    fontWeight: '700',
  },
  resultName: {
    color: Colors[colorScheme].text,
    ...Type.bodyLarge,
    fontWeight: '700',
  },
  resultHandle: {
    color: Colors[colorScheme].muted,
    ...Type.small,
  },
  form: {
    padding: Space.lg,
    gap: Space.md,
  },
  selectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    backgroundColor: Colors[colorScheme].card,
    borderRadius: Radius.lg,
    padding: Space.sm + 2,
  },
  changeLink: {
    color: Colors[colorScheme].tint,
    ...Type.small,
    fontWeight: '700',
  },
  sectionLabel: {
    color: Colors[colorScheme].muted,
    ...Type.small,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: Space.sm,
  },
  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Space.sm,
  },
  roleChip: {
    backgroundColor: Colors[colorScheme].card,
    borderRadius: Radius.pill,
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm - 1,
  },
  roleChipSelected: {
    backgroundColor: Colors[colorScheme].tint,
  },
  roleChipText: {
    color: Colors[colorScheme].text,
    ...Type.small,
    fontWeight: '600',
  },
  roleChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  hint: {
    color: Colors[colorScheme].muted,
    fontSize: 11.5,
    lineHeight: 16,
  },
  errorText: {
    color: Colors[colorScheme].error,
    ...Type.body,
  },
  inviteButton: {
    backgroundColor: Colors[colorScheme].tint,
    borderRadius: Radius.md,
    paddingVertical: Space.md + 1,
    alignItems: 'center',
    marginTop: Space.sm,
  },
  inviteButtonText: {
    color: '#FFFFFF',
    ...Type.bodyLarge,
    fontWeight: '700',
  },
});
