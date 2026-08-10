import { useCallback, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { AnimatedPressable } from '@/components/AnimatedPressable';
import { useColorScheme } from '@/components/useColorScheme';
import { WorkspacePickerSheet } from '@/components/workspace/WorkspacePickerSheet';
import Colors from '@/constants/Colors';
import { PROJECT_STATUS_LABELS, ROLE_LABELS } from '@/constants/Labels';
import { Radius, Space } from '@/constants/Spacing';
import { Fonts, Type } from '@/constants/Typography';
import { useAuth } from '@/context/AuthContext';
import type { Coordinates } from '@/lib/api';
import {
  acceptWorkspaceInvite,
  declineWorkspaceInvite,
  getAssistanceNeeded,
  getMyProjects,
  getMyWorkspaceInvites,
  getMyWorkspaces,
  getSuggestedUsers,
  resolveAvatarUrl,
  type AssistanceRequest,
  type MyProject,
  type MyWorkspace,
  type MyWorkspaceInvite,
} from '@/lib/api';
import type { SearchUserResult } from '@/lib/search';

// Status dots use a warm amber for "away" that isn't one of the two palette
// accents — the same file-scoped-constant pattern NetworkFeedCard uses for
// its gradient tints, rather than adding a third brand color globally.
const AMBER = { light: '#B8862B', dark: '#C99A4A' } as const;

function greetingForHour(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function statusDotColor(status: string | null, colorScheme: 'light' | 'dark'): string | null {
  if (!status) return null;
  const s = status.toLowerCase();
  if (s.includes('available')) return Colors[colorScheme].secondary;
  if (s.includes('away') || s.includes('on set') || s.includes('busy')) return AMBER[colorScheme];
  return Colors[colorScheme].muted;
}

function AvatarStack({
  avatars,
  count,
  colorScheme,
}: {
  avatars: (string | null)[];
  count: number;
  colorScheme: 'light' | 'dark';
}) {
  const styles = createStyles(colorScheme);
  const shown = avatars.slice(0, 4);
  const extra = count - shown.length;
  if (shown.length === 0) return null;
  return (
    <View style={styles.avatarStackRow}>
      {shown.map((url, i) => {
        const resolved = resolveAvatarUrl(url);
        return (
          <View key={i} style={[styles.stackAvatarWrap, i > 0 && styles.stackAvatarOverlap]}>
            {resolved ? (
              <Image source={{ uri: resolved }} style={styles.stackAvatar} />
            ) : (
              <View style={[styles.stackAvatar, styles.stackAvatarFallback]} />
            )}
          </View>
        );
      })}
      {extra > 0 ? <Text style={styles.stackExtra}>+{extra}</Text> : null}
    </View>
  );
}

function InvitationCard({
  invite,
  onResolved,
}: {
  invite: MyWorkspaceInvite;
  onResolved: (id: string) => void;
}) {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  const [pending, setPending] = useState<'accept' | 'decline' | null>(null);
  const avatarUrl = resolveAvatarUrl(invite.inviter.avatarUrl);

  async function handle(action: 'accept' | 'decline') {
    if (pending) return;
    setPending(action);
    try {
      await (action === 'accept' ? acceptWorkspaceInvite(invite.id) : declineWorkspaceInvite(invite.id));
      onResolved(invite.id);
    } finally {
      setPending(null);
    }
  }

  return (
    <View style={styles.inviteCard}>
      {avatarUrl ? (
        <Image source={{ uri: avatarUrl }} style={styles.inviteAvatar} />
      ) : (
        <View style={[styles.inviteAvatar, styles.inviteAvatarFallback]}>
          <Text style={styles.inviteAvatarInitial}>{invite.inviter.name.charAt(0)}</Text>
        </View>
      )}
      <View style={styles.inviteBody}>
        <Text style={styles.inviteName}>{invite.inviter.name}</Text>
        <Text style={styles.inviteMeta} numberOfLines={1}>
          Invited you to join {invite.workspace.name}
          {invite.role ? ` as ${ROLE_LABELS[invite.role] ?? invite.role}` : ''}
        </Text>
      </View>
      <View style={styles.inviteActions}>
        <AnimatedPressable
          style={styles.inviteDeclineButton}
          haptic="light"
          onPress={() => handle('decline')}
          disabled={pending !== null}
        >
          <SymbolView name={{ ios: 'xmark', android: 'close', web: 'close' }} size={16} tintColor={Colors[colorScheme].text} />
        </AnimatedPressable>
        <AnimatedPressable
          style={styles.inviteAcceptButton}
          haptic="medium"
          onPress={() => handle('accept')}
          disabled={pending !== null}
        >
          <SymbolView
            name={{ ios: 'checkmark', android: 'check', web: 'check' }}
            size={16}
            tintColor={Colors[colorScheme].background}
          />
        </AnimatedPressable>
      </View>
    </View>
  );
}

// "Continue where you left off" + "People you may know" + "Invitations" +
// "Trending Projects" — a richer dashboard header above the network feed,
// matching the reference Home layout's image-forward, avatar-stack-heavy
// visual language. The activity feed itself stays below it: this app is
// feed-first, the reference's Home is dashboard-first, so this reconciles
// the two rather than discarding the feed.
export function HomeDashboard({ coords }: { coords: Coordinates | null }) {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  const { user } = useAuth();
  const [projects, setProjects] = useState<MyProject[] | null>(null);
  const [people, setPeople] = useState<SearchUserResult[] | null>(null);
  const [invites, setInvites] = useState<MyWorkspaceInvite[] | null>(null);
  const [trending, setTrending] = useState<AssistanceRequest[] | null>(null);
  const [workspaces, setWorkspaces] = useState<MyWorkspace[] | null>(null);
  const [showWorkspacePicker, setShowWorkspacePicker] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getMyProjects()
        .then((res) => setProjects(res.results))
        .catch(() => setProjects([]));
      getSuggestedUsers(coords)
        .then((res) => setPeople(res.results))
        .catch(() => setPeople([]));
      getMyWorkspaceInvites()
        .then((res) => setInvites(res.results))
        .catch(() => setInvites([]));
      getAssistanceNeeded(coords)
        .then((res) => setTrending(res.results))
        .catch(() => setTrending([]));
      getMyWorkspaces()
        .then((res) => setWorkspaces(res.results))
        .catch(() => setWorkspaces([]));
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [coords]),
  );

  const firstName = user?.name?.split(' ')[0] ?? 'there';
  const greeting = greetingForHour(new Date().getHours());

  const showProjects = !!projects && projects.length > 0;
  const showPeople = !!people && people.length > 0;
  const showInvites = !!invites && invites.length > 0;
  const showTrending = !!trending && trending.length > 0;

  function handleInviteResolved(id: string) {
    setInvites((prev) => (prev ?? []).filter((i) => i.id !== id));
  }

  function handleOpenWorkspace() {
    if (workspaces === null) return;
    if (workspaces.length === 1) {
      router.push(`/workspace/${workspaces[0].id}`);
      return;
    }
    // Also covers the zero-workspace case — the sheet renders an empty
    // state with a "New Project" CTA instead of a plain list. Alert.alert
    // silently no-ops on web (no native confirm() bridge there, same reason
    // ConfirmDialog exists instead of using it elsewhere in this app), so
    // this can't be a bare alert with no visible sheet to fall back on.
    setShowWorkspacePicker(true);
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.titleRow}>
        <View style={styles.greetingBlock}>
          <Text style={styles.greeting}>
            {greeting}, {firstName}
          </Text>
        </View>
        <View style={styles.actionsColumn}>
          <AnimatedPressable style={styles.newProjectButton} haptic="medium" onPress={() => router.push('/project/new')}>
            <View style={styles.newProjectIcon}>
              <SymbolView name={{ ios: 'plus', android: 'add', web: 'add' }} size={20} tintColor={Colors[colorScheme].background} />
            </View>
            <Text style={styles.newProjectLabel}>New Project</Text>
          </AnimatedPressable>
          <AnimatedPressable style={styles.newProjectButton} haptic="medium" onPress={handleOpenWorkspace}>
            <View style={[styles.newProjectIcon, styles.workspaceIcon]}>
              <SymbolView
                name={{ ios: 'rectangle.3.group', android: 'dashboard', web: 'dashboard' }}
                size={18}
                tintColor={Colors[colorScheme].text}
              />
            </View>
            <Text style={styles.newProjectLabel}>Workspace</Text>
          </AnimatedPressable>
        </View>
      </View>

      <WorkspacePickerSheet
        visible={showWorkspacePicker}
        workspaces={workspaces}
        onClose={() => setShowWorkspacePicker(false)}
        onSelect={(workspace) => {
          setShowWorkspacePicker(false);
          router.push(`/workspace/${workspace.id}`);
        }}
        onCreateNew={() => {
          setShowWorkspacePicker(false);
          router.push('/project/new');
        }}
      />

      {showProjects ? (
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeaderTitle}>Continue where you left off</Text>
            <AnimatedPressable haptic="light" onPress={() => router.push('/(tabs)/films')}>
              <Text style={styles.seeAll}>See all</Text>
            </AnimatedPressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.projectRow}>
            {projects!.map((project) => (
              <AnimatedPressable
                key={project.id}
                style={styles.projectCard}
                haptic="light"
                onPress={() => router.push(`/project/${project.id}`)}
              >
                {project.posterUrl ? (
                  <Image
                    source={{ uri: resolveAvatarUrl(project.posterUrl) ?? undefined }}
                    style={styles.projectImage}
                  />
                ) : (
                  <View style={[styles.projectImage, styles.projectImageFallback]}>
                    <Text style={styles.projectImageFallbackText}>{project.title.charAt(0)}</Text>
                  </View>
                )}
                <View style={styles.projectCardBody}>
                  <Text style={styles.projectTitle} numberOfLines={1}>
                    {project.title}
                  </Text>
                  <Text style={styles.projectMeta} numberOfLines={1}>
                    {PROJECT_STATUS_LABELS[project.status] ?? project.status}
                    {project.genre ? ` · ${project.genre}` : ''}
                  </Text>
                  <View style={styles.projectMetaRow}>
                    <AvatarStack avatars={project.crewAvatars} count={project.crewCount} colorScheme={colorScheme} />
                    <SymbolView
                      name={{ ios: 'bookmark', android: 'bookmark_border', web: 'bookmark_border' }}
                      size={15}
                      tintColor={Colors[colorScheme].muted}
                    />
                  </View>
                </View>
              </AnimatedPressable>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {showPeople ? (
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeaderTitle}>People you may know</Text>
            <AnimatedPressable haptic="light" onPress={() => router.push('/connections')}>
              <Text style={styles.seeAll}>See all</Text>
            </AnimatedPressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.peopleRow}>
            {people!.map((person) => {
              const dot = statusDotColor(person.availabilityStatus ?? null, colorScheme);
              return (
                <AnimatedPressable
                  key={person.id}
                  style={styles.personCard}
                  haptic="light"
                  onPress={() => router.push(`/profile/${person.id}`)}
                >
                  <View style={styles.personAvatarWrap}>
                    {person.avatarUrl ? (
                      <Image source={{ uri: resolveAvatarUrl(person.avatarUrl) ?? undefined }} style={styles.personAvatar} />
                    ) : (
                      <View style={[styles.personAvatar, styles.personAvatarFallback]}>
                        <Text style={styles.personAvatarFallbackText}>{person.name.charAt(0)}</Text>
                      </View>
                    )}
                    {dot ? <View style={[styles.personDot, { backgroundColor: dot }]} /> : null}
                  </View>
                  <Text style={styles.personName} numberOfLines={1}>
                    {person.name}
                  </Text>
                  <Text style={styles.personRole} numberOfLines={1}>
                    {person.roles[0] ? ROLE_LABELS[person.roles[0]] ?? person.roles[0] : ''}
                  </Text>
                </AnimatedPressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      {showInvites ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Invitations</Text>
          <View style={styles.invitesList}>
            {invites!.map((invite) => (
              <InvitationCard key={invite.id} invite={invite} onResolved={handleInviteResolved} />
            ))}
          </View>
        </View>
      ) : null}

      {showTrending ? (
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeaderTitle}>Trending projects</Text>
            <AnimatedPressable haptic="light" onPress={() => router.push('/(tabs)/films')}>
              <Text style={styles.seeAll}>See all</Text>
            </AnimatedPressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trendingRow}>
            {trending!.map((item) => {
              const poster = resolveAvatarUrl(item.projectPosterUrl);
              return (
                <AnimatedPressable
                  key={item.id}
                  style={styles.trendingCard}
                  haptic="light"
                  onPress={() => router.push(`/project/${item.projectId}`)}
                >
                  {poster ? (
                    <Image source={{ uri: poster }} style={styles.trendingImage} />
                  ) : (
                    <View style={[styles.trendingImage, styles.trendingImageFallback]}>
                      <Text style={styles.trendingImageFallbackText}>{item.projectTitle.charAt(0)}</Text>
                    </View>
                  )}
                  <View style={styles.trendingBadge}>
                    <Text style={styles.trendingBadgeText}>Seeking {ROLE_LABELS[item.roleNeeded] ?? item.roleNeeded}</Text>
                  </View>
                  <Text style={styles.trendingTitle} numberOfLines={1}>
                    {item.projectTitle}
                  </Text>
                </AnimatedPressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

const createStyles = (colorScheme: 'light' | 'dark') =>
  StyleSheet.create({
    wrap: {
      paddingTop: Space.md,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginHorizontal: Space.lg,
      marginBottom: Space.xl,
      gap: Space.md,
    },
    greetingBlock: {
      flex: 1,
      gap: 5,
    },
    greeting: {
      color: Colors[colorScheme].text,
      ...Type.display,
      fontFamily: Fonts.serif,
    },
    actionsColumn: {
      flexDirection: 'row',
      gap: Space.sm,
    },
    newProjectButton: {
      alignItems: 'center',
      gap: 4,
    },
    newProjectIcon: {
      width: 48,
      height: 48,
      borderRadius: Radius.xl,
      backgroundColor: Colors[colorScheme].tint,
      alignItems: 'center',
      justifyContent: 'center',
    },
    workspaceIcon: {
      backgroundColor: Colors[colorScheme].surface2,
      borderWidth: 1,
      borderColor: Colors[colorScheme].border,
    },
    newProjectLabel: {
      color: Colors[colorScheme].tint,
      ...Type.caption,
      fontWeight: '700',
    },
    section: {
      marginBottom: Space.xl,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginHorizontal: Space.lg,
      marginBottom: Space.md,
    },
    // Used standalone (e.g. "Invitations"), which isn't inside a row that
    // already carries the horizontal margin — see sectionHeaderTitle below.
    sectionTitle: {
      color: Colors[colorScheme].text,
      ...Type.bodyLarge,
      fontFamily: Fonts.serif,
      marginHorizontal: Space.lg,
      marginBottom: Space.md,
    },
    // Used inside sectionHeaderRow, which already applies marginHorizontal
    // + marginBottom to the whole row — adding them again here double-
    // indented these titles relative to everything else on the screen.
    sectionHeaderTitle: {
      color: Colors[colorScheme].text,
      ...Type.bodyLarge,
      fontFamily: Fonts.serif,
    },
    seeAll: {
      color: Colors[colorScheme].muted,
      ...Type.small,
      fontWeight: '500',
    },
    projectRow: {
      paddingHorizontal: Space.lg,
      gap: Space.md,
    },
    projectCard: {
      width: 138,
      backgroundColor: Colors[colorScheme].card,
      borderWidth: 1,
      borderColor: Colors[colorScheme].border,
      borderRadius: Radius.md,
      overflow: 'hidden',
    },
    projectImage: {
      width: '100%',
      height: 112,
      backgroundColor: Colors[colorScheme].surface2,
    },
    projectImageFallback: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    projectImageFallbackText: {
      color: Colors[colorScheme].muted,
      ...Type.heading,
      fontWeight: '700',
    },
    projectCardBody: {
      paddingHorizontal: Space.sm + 2,
      paddingTop: Space.sm,
      paddingBottom: Space.sm + 2,
    },
    projectTitle: {
      color: Colors[colorScheme].text,
      ...Type.cardTitle,
      fontFamily: Fonts.serif,
    },
    projectMeta: {
      color: Colors[colorScheme].muted,
      ...Type.label,
      marginTop: 2,
      marginBottom: Space.sm,
    },
    projectMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    avatarStackRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    stackAvatarWrap: {
      borderRadius: 12,
      borderWidth: 2,
      borderColor: Colors[colorScheme].background,
    },
    stackAvatarOverlap: {
      marginLeft: -10,
    },
    stackAvatar: {
      width: 22,
      height: 22,
      borderRadius: 11,
    },
    stackAvatarFallback: {
      backgroundColor: Colors[colorScheme].border,
    },
    stackExtra: {
      color: Colors[colorScheme].muted,
      ...Type.caption,
      fontWeight: '700',
      marginLeft: Space.xs,
    },
    peopleRow: {
      paddingHorizontal: Space.lg,
      gap: Space.lg,
    },
    personCard: {
      width: 72,
      alignItems: 'center',
    },
    personAvatarWrap: {
      marginBottom: Space.xs + 2,
    },
    personAvatar: {
      width: 60,
      height: 60,
      borderRadius: 30,
    },
    personAvatarFallback: {
      backgroundColor: Colors[colorScheme].border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    personAvatarFallbackText: {
      color: Colors[colorScheme].text,
      ...Type.subtitle,
      fontWeight: '700',
    },
    personDot: {
      position: 'absolute',
      right: 1,
      bottom: 1,
      width: 13,
      height: 13,
      borderRadius: 7,
      borderWidth: 2,
      borderColor: Colors[colorScheme].background,
    },
    personName: {
      color: Colors[colorScheme].text,
      ...Type.small,
      fontWeight: '700',
      textAlign: 'center',
    },
    personRole: {
      color: Colors[colorScheme].muted,
      ...Type.caption,
      textAlign: 'center',
      marginTop: 1,
    },
    invitesList: {
      paddingHorizontal: Space.lg,
      gap: Space.sm,
    },
    inviteCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Space.md,
      backgroundColor: Colors[colorScheme].card,
      borderColor: Colors[colorScheme].border,
      borderWidth: 1,
      borderRadius: Radius.md,
      padding: Space.md,
    },
    inviteAvatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
    },
    inviteAvatarFallback: {
      backgroundColor: Colors[colorScheme].border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    inviteAvatarInitial: {
      color: Colors[colorScheme].text,
      ...Type.title,
      fontWeight: '700',
    },
    inviteBody: {
      flex: 1,
      gap: 2,
    },
    inviteName: {
      color: Colors[colorScheme].text,
      ...Type.subtitle,
      fontWeight: '700',
    },
    inviteMeta: {
      color: Colors[colorScheme].muted,
      ...Type.small,
    },
    inviteActions: {
      flexDirection: 'row',
      gap: Space.sm,
    },
    inviteDeclineButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: Colors[colorScheme].border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    inviteAcceptButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: Colors[colorScheme].tint,
      alignItems: 'center',
      justifyContent: 'center',
    },
    trendingRow: {
      paddingHorizontal: Space.lg,
      gap: Space.md,
    },
    trendingCard: {
      width: 144,
    },
    trendingImage: {
      width: 144,
      height: 90,
      borderRadius: Radius.md,
      marginBottom: Space.sm,
      backgroundColor: Colors[colorScheme].surface2,
    },
    trendingImageFallback: {
      backgroundColor: Colors[colorScheme].surface2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    trendingImageFallbackText: {
      color: Colors[colorScheme].muted,
      ...Type.heading,
      fontWeight: '700',
    },
    trendingBadge: {
      position: 'absolute',
      left: Space.sm,
      top: 62,
      backgroundColor: Colors[colorScheme].tint,
      borderRadius: Radius.pill,
      paddingHorizontal: Space.sm + 2,
      paddingVertical: 4,
    },
    trendingBadgeText: {
      color: Colors[colorScheme].background,
      ...Type.caption,
      fontWeight: '700',
    },
    trendingTitle: {
      color: Colors[colorScheme].text,
      ...Type.cardTitle,
      fontFamily: Fonts.serif,
    },
  });
