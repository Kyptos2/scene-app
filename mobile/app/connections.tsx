import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, Stack, useFocusEffect } from 'expo-router';

import { AnimatedPressable } from '@/components/AnimatedPressable';
import { MessageRequestCard } from '@/components/messages/MessageRequestCard';
import { FeedSkeletonList } from '@/components/SkeletonLoader';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { ROLE_LABELS } from '@/constants/Labels';
import { Radius, Space } from '@/constants/Spacing';
import { Type } from '@/constants/Typography';
import {
  acceptMessageRequest,
  acceptWorkspaceInvite,
  blockConversation,
  declineWorkspaceInvite,
  denyMessageRequest,
  getMessageRequests,
  getMyConnections,
  getMyWorkspaceInvites,
  getProfileViews,
  resolveAvatarUrl,
  type ConnectionPerson,
  type MessageRequestSummary,
  type MyConnection,
  type MyWorkspaceInvite,
  type ProfileViewer,
} from '@/lib/api';

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60) return `${Math.max(minutes, 1)}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function PersonAvatar({ person, size = 44 }: { person: ConnectionPerson; size?: number }) {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  const avatarUrl = resolveAvatarUrl(person.avatarUrl);
  const style = { width: size, height: size, borderRadius: size / 2 };
  return avatarUrl ? (
    <Image source={{ uri: avatarUrl }} style={style} />
  ) : (
    <View style={[style, styles.avatarFallback]}>
      <Text style={styles.avatarInitial}>{person.name.charAt(0)}</Text>
    </View>
  );
}

function WorkspaceInviteCard({
  invite,
  onAccept,
  onDecline,
}: {
  invite: MyWorkspaceInvite;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
}) {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  const [pending, setPending] = useState<'accept' | 'decline' | null>(null);

  async function handle(action: 'accept' | 'decline', fn: (id: string) => Promise<unknown>) {
    if (pending) return;
    setPending(action);
    try {
      await fn(invite.id);
      (action === 'accept' ? onAccept : onDecline)(invite.id);
    } finally {
      setPending(null);
    }
  }

  return (
    <View style={styles.inviteCard}>
      <View style={styles.inviteHeader}>
        <PersonAvatar
          person={{ ...invite.inviter, tagline: null, primaryRoles: [], availabilityStatus: null, experienceLevel: 'INDIE' }}
          size={40}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.inviteText}>
            <Text style={styles.inviteName}>{invite.inviter.name}</Text> invited you to join{' '}
            <Text style={styles.inviteName}>{invite.workspace.name}</Text>
            {invite.role ? ` as ${ROLE_LABELS[invite.role] ?? invite.role}` : ''}
          </Text>
          <Text style={styles.inviteTime}>{relativeTime(invite.createdAt)} ago</Text>
        </View>
      </View>
      <View style={styles.inviteActions}>
        <AnimatedPressable
          style={styles.inviteDeclineButton}
          haptic="light"
          onPress={() => handle('decline', declineWorkspaceInvite)}
          disabled={pending !== null}
        >
          {pending === 'decline' ? (
            <ActivityIndicator color={Colors[colorScheme].text} size="small" />
          ) : (
            <Text style={styles.inviteDeclineText}>Decline</Text>
          )}
        </AnimatedPressable>
        <AnimatedPressable
          style={styles.inviteAcceptButton}
          haptic="medium"
          onPress={() => handle('accept', acceptWorkspaceInvite)}
          disabled={pending !== null}
        >
          {pending === 'accept' ? (
            <ActivityIndicator color={Colors[colorScheme].background} size="small" />
          ) : (
            <Text style={styles.inviteAcceptText}>Accept</Text>
          )}
        </AnimatedPressable>
      </View>
    </View>
  );
}

function ConnectionRow({ connection }: { connection: MyConnection }) {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  const person = connection.otherUser;
  return (
    <AnimatedPressable style={styles.connectionRow} haptic="light" onPress={() => router.push(`/profile/${person.id}`)}>
      <PersonAvatar person={person} />
      <View style={{ flex: 1 }}>
        <Text style={styles.connectionName}>{person.name}</Text>
        <Text style={styles.connectionMeta} numberOfLines={1}>
          {person.tagline ?? (person.primaryRoles[0] ? ROLE_LABELS[person.primaryRoles[0]] ?? person.primaryRoles[0] : '')}
        </Text>
      </View>
      {person.availabilityStatus ? (
        <View style={styles.statusChip}>
          <Text style={styles.statusChipText} numberOfLines={1}>
            {person.availabilityStatus}
          </Text>
        </View>
      ) : null}
    </AnimatedPressable>
  );
}

function ViewerRow({ entry }: { entry: ProfileViewer }) {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  const person = entry.viewer;
  return (
    <AnimatedPressable style={styles.connectionRow} haptic="light" onPress={() => router.push(`/profile/${person.id}`)}>
      <PersonAvatar person={person} size={36} />
      <View style={{ flex: 1 }}>
        <Text style={styles.connectionName}>{person.name}</Text>
        <Text style={styles.connectionMeta} numberOfLines={1}>
          viewed your profile · {relativeTime(entry.viewedAt)} ago
        </Text>
      </View>
    </AnimatedPressable>
  );
}

function SectionTitle({ children }: { children: string }) {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

const ROLE_FILTERS: { label: string; value: string }[] = [
  { label: 'Director', value: 'DIRECTOR' },
  { label: 'DP', value: 'DIRECTOR_OF_PHOTOGRAPHY' },
  { label: 'Student', value: 'STUDENT' },
  { label: 'Gaffer', value: 'GAFFER' },
  { label: 'Producer', value: 'PRODUCER' },
];

const AVAILABILITY_FILTERS: { label: string; value: string }[] = [
  { label: 'Available for Hire', value: 'available for hire' },
  { label: 'On Set', value: 'on set' },
];

function matchesRole(person: ConnectionPerson, role: string | null): boolean {
  if (!role) return true;
  if (role === 'STUDENT') return person.experienceLevel === 'STUDENT';
  return person.primaryRoles.includes(role);
}

function matchesAvailability(person: ConnectionPerson, availability: string | null): boolean {
  if (!availability) return true;
  return (person.availabilityStatus ?? '').toLowerCase().includes(availability);
}

function FilterChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  return (
    <AnimatedPressable style={[styles.filterChip, selected && styles.filterChipSelected]} haptic="selection" onPress={onPress}>
      <Text style={[styles.filterChipText, selected && styles.filterChipTextSelected]}>{label}</Text>
    </AnimatedPressable>
  );
}

export default function ConnectionsScreen() {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  const [connections, setConnections] = useState<MyConnection[] | null>(null);
  const [requests, setRequests] = useState<MessageRequestSummary[] | null>(null);
  const [invites, setInvites] = useState<MyWorkspaceInvite[] | null>(null);
  const [viewers, setViewers] = useState<ProfileViewer[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [availabilityFilter, setAvailabilityFilter] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [connRes, reqRes, inviteRes, viewRes] = await Promise.all([
        getMyConnections(),
        getMessageRequests(),
        getMyWorkspaceInvites(),
        getProfileViews(),
      ]);
      setConnections(connRes);
      setRequests(reqRes.results);
      setInvites(inviteRes.results);
      setViewers(viewRes.results);
    } catch {
      setError("Couldn't load your network. Is the dev server running?");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function handleAcceptRequest(id: string) {
    await acceptMessageRequest(id);
    setRequests((prev) => (prev ? prev.filter((r) => r.id !== id) : prev));
    router.push(`/messages/${id}`);
  }
  async function handleDenyRequest(id: string) {
    await denyMessageRequest(id);
    setRequests((prev) => (prev ? prev.filter((r) => r.id !== id) : prev));
  }
  async function handleBlockRequest(id: string) {
    await blockConversation(id);
    setRequests((prev) => (prev ? prev.filter((r) => r.id !== id) : prev));
  }
  function handleInviteResolved(id: string) {
    setInvites((prev) => (prev ? prev.filter((i) => i.id !== id) : prev));
  }

  const loading = connections === null && !error;
  const pendingCount = (requests?.length ?? 0) + (invites?.length ?? 0);
  const filteredConnections = useMemo(
    () =>
      (connections ?? []).filter(
        (c) => matchesRole(c.otherUser, roleFilter) && matchesAvailability(c.otherUser, availabilityFilter),
      ),
    [connections, roleFilter, availabilityFilter],
  );
  const filtersActive = roleFilter !== null || availabilityFilter !== null;

  return (
    <View style={styles.safeArea}>
      <Stack.Screen
        options={{
          title: 'Connections',
          headerStyle: { backgroundColor: Colors[colorScheme].background },
          headerTintColor: Colors[colorScheme].text,
          headerShadowVisible: false,
        }}
      />

      {loading ? (
        <View style={styles.safeArea}>
          <FeedSkeletonList count={3} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>{error}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {pendingCount > 0 ? (
            <>
              <SectionTitle>{`Pending (${pendingCount})`}</SectionTitle>
              {invites?.map((invite) => (
                <WorkspaceInviteCard
                  key={invite.id}
                  invite={invite}
                  onAccept={handleInviteResolved}
                  onDecline={handleInviteResolved}
                />
              ))}
              {requests?.map((request) => (
                <MessageRequestCard
                  key={request.id}
                  request={request}
                  onAccept={handleAcceptRequest}
                  onDeny={handleDenyRequest}
                  onBlock={handleBlockRequest}
                />
              ))}
            </>
          ) : null}

          {viewers && viewers.length > 0 ? (
            <>
              <SectionTitle>Recently Viewed You</SectionTitle>
              {viewers.slice(0, 6).map((entry) => (
                <ViewerRow key={entry.viewer.id} entry={entry} />
              ))}
            </>
          ) : null}

          <SectionTitle>{`Your Network (${connections?.length ?? 0})`}</SectionTitle>
          {connections && connections.length > 0 ? (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
                {ROLE_FILTERS.map((f) => (
                  <FilterChip
                    key={f.value}
                    label={f.label}
                    selected={roleFilter === f.value}
                    onPress={() => setRoleFilter((prev) => (prev === f.value ? null : f.value))}
                  />
                ))}
              </ScrollView>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
                {AVAILABILITY_FILTERS.map((f) => (
                  <FilterChip
                    key={f.value}
                    label={f.label}
                    selected={availabilityFilter === f.value}
                    onPress={() => setAvailabilityFilter((prev) => (prev === f.value ? null : f.value))}
                  />
                ))}
              </ScrollView>
            </>
          ) : null}
          {!connections || connections.length === 0 ? (
            <Text style={styles.emptyText}>
              No connections yet — connect with filmmakers from Search or the feed.
            </Text>
          ) : filteredConnections.length === 0 ? (
            <Text style={styles.emptyText}>
              {filtersActive ? 'No connections match those filters.' : 'No connections yet.'}
            </Text>
          ) : (
            filteredConnections.map((c) => <ConnectionRow key={c.id} connection={c} />)
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
    paddingBottom: Space.xxl,
  },
  sectionTitle: {
    color: Colors[colorScheme].muted,
    ...Type.small,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: Space.lg,
    paddingTop: Space.xl,
    paddingBottom: Space.sm,
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
  filterRow: {
    paddingHorizontal: Space.lg,
    gap: Space.sm,
    paddingBottom: Space.sm,
  },
  filterChip: {
    borderWidth: 1,
    borderColor: Colors[colorScheme].border,
    borderRadius: Radius.pill,
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm - 2,
  },
  filterChipSelected: {
    backgroundColor: Colors[colorScheme].secondary,
    borderColor: Colors[colorScheme].secondary,
  },
  filterChipText: {
    color: Colors[colorScheme].text,
    ...Type.small,
    fontWeight: '600',
  },
  filterChipTextSelected: {
    color: Colors[colorScheme].background,
    fontWeight: '700',
  },
  connectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    paddingHorizontal: Space.lg,
    paddingVertical: Space.sm + 2,
  },
  connectionName: {
    color: Colors[colorScheme].text,
    ...Type.subtitle,
    fontWeight: '700',
  },
  connectionMeta: {
    color: Colors[colorScheme].muted,
    ...Type.small,
    marginTop: 1,
  },
  statusChip: {
    backgroundColor: 'rgba(78, 104, 81, 0.22)',
    borderRadius: Radius.pill,
    paddingHorizontal: Space.sm + 1,
    paddingVertical: 4,
    maxWidth: 130,
  },
  statusChipText: {
    color: Colors[colorScheme].secondary,
    fontSize: 10.5,
    fontWeight: '700',
  },
  inviteCard: {
    backgroundColor: Colors[colorScheme].card,
    borderRadius: Radius.xl,
    padding: Space.md + 2,
    marginHorizontal: Space.lg,
    marginBottom: Space.md,
    gap: Space.sm + 2,
    borderLeftWidth: 3,
    borderLeftColor: Colors[colorScheme].secondary,
  },
  inviteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm + 2,
  },
  inviteText: {
    color: Colors[colorScheme].text,
    ...Type.body,
  },
  inviteName: {
    fontWeight: '700',
  },
  inviteTime: {
    color: Colors[colorScheme].muted,
    ...Type.label,
    marginTop: 2,
  },
  inviteActions: {
    flexDirection: 'row',
    gap: Space.sm,
  },
  inviteDeclineButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors[colorScheme].border,
    borderRadius: Radius.md,
    paddingVertical: Space.sm + 2,
    alignItems: 'center',
  },
  inviteDeclineText: {
    color: Colors[colorScheme].text,
    ...Type.body,
    fontWeight: '600',
  },
  inviteAcceptButton: {
    flex: 1.4,
    backgroundColor: Colors[colorScheme].secondary,
    borderRadius: Radius.md,
    paddingVertical: Space.sm + 2,
    alignItems: 'center',
  },
  inviteAcceptText: {
    color: Colors[colorScheme].background,
    ...Type.body,
    fontWeight: '700',
  },
  bottomSpacer: {
    height: Space.xxl,
  },
});
