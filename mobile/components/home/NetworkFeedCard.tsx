import { useState } from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView } from 'expo-symbols';

import { AnimatedPressable } from '@/components/AnimatedPressable';
import { InteractionBar } from '@/components/home/InteractionBar';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Radius, Space } from '@/constants/Spacing';
import { Fonts, Type } from '@/constants/Typography';
import { applyToCrewCall, resolveAvatarUrl, votePoll, withdrawCrewCallApplication } from '@/lib/api';
import type {
  AnnouncementFeedItem,
  BtsCarouselFeedItem,
  CatalogSpotlightFeedItem,
  ConnectionUpdateFeedItem,
  CrewCallFeedItem,
  FeedActor,
  FestivalSpotlightFeedItem,
  NetworkFeedItem,
  PollFeedItem,
  ProjectLaunchFeedItem,
  WorkspaceActivityFeedItem,
  WorkspaceUpdateFeedItem,
} from '@/lib/networkFeed';

const ANNOUNCEMENT_LABEL: Record<AnnouncementFeedItem['announcementKind'], string> = {
  wrap: 'Wrapped Production',
  poster_reveal: 'Poster Reveal',
  production_launch: 'Now in Production',
  award: 'Award Win',
};

const COMPENSATION_LABEL: Record<NonNullable<CrewCallFeedItem['compensation']>, string> = {
  paid: 'Paid',
  deferred: 'Deferred',
  credit_copy: 'Credit + Copy',
};

// Card-background gradient tints — decorative warm/sage washes that blend
// into the card color, so they need a light-mode counterpart instead of
// the dark-only hex values these started as.
const GRADIENT_TINT = {
  light: { urgent: '#F5E6E1', hiring: '#F1ECE4', workspace: '#EBF0EA', festival: '#E4EDE3' },
  dark: { urgent: '#3A241E', hiring: '#2B2620', workspace: '#1E2A21', festival: '#243128' },
} as const;

function QuickConnectBadge({ availability }: { availability: FeedActor['availability'] }) {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  if (!availability) return null;
  const hiring = availability === 'hiring';
  return (
    <View style={[styles.badge, hiring ? styles.badgeHiring : styles.badgeCollab]}>
      <Text style={[styles.badgeText, { color: hiring ? Colors[colorScheme].tint : Colors[colorScheme].secondary }]}>
        {hiring ? 'Hiring' : 'Open to Collaborate'}
      </Text>
    </View>
  );
}

function ActorRow({
  actor,
  timeAgo,
  distanceKm,
  compact,
}: {
  actor: FeedActor;
  timeAgo: string;
  distanceKm: number | null;
  compact?: boolean;
}) {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  return (
    <Pressable style={styles.actorRow} onPress={() => router.push(`/profile/${actor.id}`)}>
      {actor.avatarUrl ? (
        <Image source={{ uri: resolveAvatarUrl(actor.avatarUrl) ?? undefined }} style={[styles.avatar, compact && styles.avatarCompact]} />
      ) : (
        <View style={[styles.avatar, compact && styles.avatarCompact, styles.avatarFallback]}>
          <Text style={styles.avatarInitial}>{actor.name.charAt(0)}</Text>
        </View>
      )}
      <View style={styles.actorMeta}>
        <View style={styles.actorNameRow}>
          <Text style={styles.actorName}>{actor.name}</Text>
          {actor.verified ? <Text style={styles.verified}>✓</Text> : null}
          {!compact ? <Text style={styles.handle}>@{actor.handle}</Text> : null}
        </View>
        {!compact ? (
          <Text style={styles.tagline} numberOfLines={1}>
            {actor.tagline}
          </Text>
        ) : null}
        <Text style={styles.actorSub}>
          {timeAgo}
          {distanceKm != null ? ` · ${distanceKm.toFixed(0)} km away` : ''}
        </Text>
      </View>
      {!compact ? <QuickConnectBadge availability={actor.availability} /> : null}
    </Pressable>
  );
}

function ProjectLink({ projectId, children }: { projectId: string | null; children: React.ReactNode }) {
  if (!projectId) return <>{children}</>;
  return <Pressable onPress={() => router.push(`/project/${projectId}`)}>{children}</Pressable>;
}

// A still/poster gets the cinematic full-bleed treatment (edge-to-edge
// image, gradient scrim caption); a text-only update keeps the readable
// card layout below. Same component, two silhouettes, driven by content.
function CinematicMedia({
  posterUrl,
  kicker,
  headline,
}: {
  posterUrl: string;
  kicker: string;
  headline: string;
}) {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  return (
    <View style={styles.mediaWrap}>
      <Image source={{ uri: resolveAvatarUrl(posterUrl) ?? undefined }} style={styles.mediaImage} />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.05)', 'rgba(0,0,0,0.85)']}
        locations={[0, 0.45, 1]}
        style={styles.mediaScrim}
      />
      <View style={styles.mediaCaption}>
        <Text style={styles.mediaKicker}>{kicker}</Text>
        <Text style={styles.mediaHeadline} numberOfLines={2}>
          {headline}
        </Text>
      </View>
    </View>
  );
}

function AnnouncementCard({
  item,
  timeAgo,
  onDeleted,
}: {
  item: AnnouncementFeedItem;
  timeAgo: string;
  onDeleted?: (item: NetworkFeedItem) => void;
}) {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  const cinematic = !!item.posterUrl;
  return (
    <View style={[styles.card, cinematic && styles.cardBleed]}>
      <View style={cinematic ? styles.pad : undefined}>
        <ActorRow actor={item.actor} timeAgo={timeAgo} distanceKm={item.distanceKm} compact={cinematic} />
      </View>
      {cinematic ? (
        <ProjectLink projectId={item.projectId}>
          <CinematicMedia posterUrl={item.posterUrl!} kicker={ANNOUNCEMENT_LABEL[item.announcementKind]} headline={item.headline} />
        </ProjectLink>
      ) : (
        <View style={styles.pad}>
          <Text style={styles.kicker}>{ANNOUNCEMENT_LABEL[item.announcementKind]}</Text>
          <ProjectLink projectId={item.projectId}>
            <Text style={styles.headline}>{item.headline}</Text>
          </ProjectLink>
        </View>
      )}
      {item.body ? <Text style={[styles.body, styles.pad]}>{item.body}</Text> : null}
      <View style={styles.pad}>
        <InteractionBar item={item} onDeleted={onDeleted} />
      </View>
    </View>
  );
}

function ApplyButton({ item }: { item: CrewCallFeedItem }) {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  const [applied, setApplied] = useState(item.viewerHasApplied);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePress() {
    setPending(true);
    setError(null);
    try {
      if (applied) {
        await withdrawCrewCallApplication(item.id);
        setApplied(false);
      } else {
        await applyToCrewCall(item.id);
        setApplied(true);
      }
    } catch {
      setError("Couldn't update your application. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <View>
      <AnimatedPressable
        style={[styles.applyButton, applied && styles.applyButtonActive]}
        haptic="medium"
        onPress={handlePress}
        disabled={pending}
      >
        <Text style={[styles.applyButtonText, applied && styles.applyButtonTextActive]}>
          {pending ? '…' : applied ? 'Applied ✓' : "I'm Interested →"}
        </Text>
      </AnimatedPressable>
      {error ? <Text style={styles.applyErrorText}>{error}</Text> : null}
    </View>
  );
}

function CrewCallCard({ item, timeAgo }: { item: CrewCallFeedItem; timeAgo: string }) {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  return (
    <LinearGradient
      colors={
        item.urgent
          ? [GRADIENT_TINT[colorScheme].urgent, Colors[colorScheme].card]
          : [GRADIENT_TINT[colorScheme].hiring, Colors[colorScheme].card]
      }
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0.6 }}
      style={[styles.card, styles.hiringCard]}
    >
      <ActorRow actor={item.actor} timeAgo={timeAgo} distanceKm={item.distanceKm} compact />
      <View style={styles.tagRow}>
        <View style={[styles.tag, styles.tagRole]}>
          <Text style={styles.tagRoleText}>HIRING · {item.roleNeeded}</Text>
        </View>
        <View style={[styles.tag, styles.tagLoc]}>
          <Text style={styles.tagLocText}>{item.location}</Text>
        </View>
        {item.compensation ? (
          <View style={[styles.tag, styles.tagPay]}>
            <Text style={styles.tagPayText}>{COMPENSATION_LABEL[item.compensation]}</Text>
          </View>
        ) : null}
        {item.urgent ? (
          <View style={[styles.tag, styles.tagUrgent]}>
            <Text style={styles.tagUrgentText}>FILLING FAST</Text>
          </View>
        ) : null}
      </View>
      <ProjectLink projectId={item.projectId}>
        <Text style={styles.hiringTitle}>
          {item.roleNeeded} needed{item.projectTitle ? ` for "${item.projectTitle}"` : ''}
        </Text>
      </ProjectLink>
      {item.startDate ? <Text style={styles.hiringSub}>Starts {formatShortDate(item.startDate)}</Text> : null}
      {item.actor.viewerIsSelf ? null : <ApplyButton item={item} />}
      <InteractionBar item={item} />
    </LinearGradient>
  );
}

function ConnectionUpdateCard({ item, timeAgo }: { item: ConnectionUpdateFeedItem; timeAgo: string }) {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  return (
    <View style={[styles.card, styles.pad]}>
      <ActorRow actor={item.actor} timeAgo={timeAgo} distanceKm={item.distanceKm} />
      <Text style={styles.body}>{item.summary}</Text>
      <InteractionBar item={item} />
    </View>
  );
}

function ProjectLaunchCard({
  item,
  timeAgo,
  onDeleted,
}: {
  item: ProjectLaunchFeedItem;
  timeAgo: string;
  onDeleted?: (item: NetworkFeedItem) => void;
}) {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  const cinematic = !!item.posterUrl;
  return (
    <View style={[styles.card, cinematic && styles.cardBleed]}>
      <View style={cinematic ? styles.pad : undefined}>
        <ActorRow actor={item.actor} timeAgo={timeAgo} distanceKm={item.distanceKm} compact={cinematic} />
      </View>
      {cinematic ? (
        <ProjectLink projectId={item.projectId}>
          <CinematicMedia posterUrl={item.posterUrl!} kicker="Project Launch" headline={item.projectTitle} />
        </ProjectLink>
      ) : (
        <View style={styles.pad}>
          <Text style={styles.kicker}>Project Launch</Text>
          <ProjectLink projectId={item.projectId}>
            <Text style={styles.headline}>{item.projectTitle}</Text>
          </ProjectLink>
        </View>
      )}
      <View style={styles.pad}>
        <Text style={styles.body}>{item.logline}</Text>
        {item.seekingFeedback || item.seekingFestivalPartner ? (
          <View style={styles.seekingRow}>
            {item.seekingFeedback ? (
              <View style={styles.seekingTag}>
                <Text style={styles.seekingTagText}>Seeking Feedback</Text>
              </View>
            ) : null}
            {item.seekingFestivalPartner ? (
              <View style={styles.seekingTag}>
                <Text style={styles.seekingTagText}>Seeking Festival Partner</Text>
              </View>
            ) : null}
          </View>
        ) : null}
        <InteractionBar item={item} onDeleted={onDeleted} />
      </View>
    </View>
  );
}

function PollCard({ item }: { item: PollFeedItem }) {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  const [options, setOptions] = useState(item.options);
  const [totalVotes, setTotalVotes] = useState(item.totalVotes);
  const [viewerVoteId, setViewerVoteId] = useState(item.viewerVoteId);
  const [voting, setVoting] = useState(false);
  const closed = new Date(item.closesAt).getTime() < Date.now();

  async function handleVote(optionId: string) {
    if (voting || closed) return;
    setVoting(true);
    try {
      const result = await votePoll(item.id, optionId);
      setOptions(result.options);
      setTotalVotes(result.totalVotes);
      setViewerVoteId(result.viewerVoteId);
    } catch {
      // silent — vote UI just doesn't update; poll remains tappable to retry
    } finally {
      setVoting(false);
    }
  }

  return (
    <View style={[styles.cardElevated, styles.pad]}>
      <ActorRow actor={item.actor} timeAgo="Community poll" distanceKm={null} compact />
      <Text style={styles.pollQuestion}>{item.question}</Text>
      {options.map((opt) => {
        const pct = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0;
        const mine = opt.id === viewerVoteId;
        return (
          <AnimatedPressable
            key={opt.id}
            onPress={() => handleVote(opt.id)}
            disabled={closed}
            haptic="selection"
            style={styles.pollOpt}
          >
            <View style={[styles.pollFill, { width: `${pct}%` }, mine && styles.pollFillMine]} />
            <View style={styles.pollOptRow}>
              <Text style={[styles.pollOptLabel, mine && styles.pollOptLabelMine]} numberOfLines={1}>
                {mine ? '✓ ' : ''}
                {opt.label}
              </Text>
              <Text style={styles.pollOptPct}>{pct}%</Text>
            </View>
          </AnimatedPressable>
        );
      })}
      <Text style={styles.pollFoot}>
        {totalVotes} vote{totalVotes === 1 ? '' : 's'} · {closed ? 'Closed' : `${hoursLeft(item.closesAt)} left`}
      </Text>
    </View>
  );
}

function WorkspaceUpdateCard({ item }: { item: WorkspaceUpdateFeedItem }) {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  return (
    <LinearGradient
      colors={[GRADIENT_TINT[colorScheme].workspace, Colors[colorScheme].card]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0.6 }}
      style={[styles.card, styles.workspaceCard]}
    >
      <Pressable onPress={() => router.push(`/workspace/${item.workspaceId}`)}>
        <View style={styles.workspaceChanRow}>
          <Text style={styles.workspaceChan}>#{item.channelName}</Text>
        </View>
        <ActorRow actor={item.actor} timeAgo={relativeTime(item.createdAt)} distanceKm={null} compact />
        <Text style={styles.workspaceBody}>{item.body}</Text>
        <Text style={styles.workspaceProject}>{item.projectTitle}</Text>
      </Pressable>
    </LinearGradient>
  );
}

function WorkspaceActivityCard({ item }: { item: WorkspaceActivityFeedItem }) {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  return (
    <Pressable onPress={() => router.push(`/workspace/${item.workspaceId}`)}>
      <LinearGradient
        colors={[GRADIENT_TINT[colorScheme].workspace, Colors[colorScheme].card]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0.6 }}
        style={[styles.card, styles.pad, styles.activityCard]}
      >
        <View style={styles.activityIcon}>
          <SymbolView name={{ ios: 'bolt.fill', android: 'bolt', web: 'bolt' }} size={14} tintColor={Colors[colorScheme].secondary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.activityKicker}>Studio Workspace</Text>
          <Text style={styles.activityBody}>
            <Text style={styles.activityProject}>{item.projectTitle}</Text> · {item.messageCount} new message
            {item.messageCount === 1 ? '' : 's'} in #{item.channelName}
          </Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function FestivalSpotlightCard({ item }: { item: FestivalSpotlightFeedItem }) {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  const days = daysUntil(item.submissionDeadline);
  const location = [item.city, item.state].filter(Boolean).join(', ');

  return (
    <LinearGradient
      colors={[GRADIENT_TINT[colorScheme].workspace, GRADIENT_TINT[colorScheme].festival, Colors[colorScheme].card]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.card, styles.festivalCard]}
    >
      <View style={styles.festivalTagRow}>
        <View style={styles.festivalOpenTag}>
          <Text style={styles.festivalOpenTagText}>OPEN SUBMISSIONS</Text>
        </View>
        <Text style={styles.festivalDeadline}>
          {days <= 0 ? 'Closes today' : `${days} day${days === 1 ? '' : 's'} left`}
        </Text>
      </View>
      <Text style={styles.festivalName}>{item.festivalName}</Text>
      {location ? <Text style={styles.festivalLocation}>{location}</Text> : null}
      {item.submissionUrl ? (
        <AnimatedPressable style={styles.festivalCta} haptic="medium" onPress={() => Linking.openURL(item.submissionUrl!)}>
          <Text style={styles.festivalCtaText}>Submit Your Film →</Text>
        </AnimatedPressable>
      ) : null}
    </LinearGradient>
  );
}

function BtsCarouselCard({ item }: { item: BtsCarouselFeedItem }) {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  return (
    <View style={styles.cardElevated}>
      <View style={styles.pad}>
        <ActorRow actor={item.actor} timeAgo={relativeTime(item.createdAt)} distanceKm={null} compact />
        <Text style={styles.btsKicker}>Behind the Scenes · {item.projectTitle}</Text>
      </View>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        style={styles.btsScroll}
      >
        {item.images.map((img) => (
          <View key={img.id} style={styles.btsSlide}>
            <Image source={{ uri: resolveAvatarUrl(img.url) ?? undefined }} style={styles.btsImage} />
            {img.caption ? (
              <View style={styles.btsCaptionWrap}>
                <Text style={styles.btsCaption} numberOfLines={1}>
                  {img.caption}
                </Text>
              </View>
            ) : null}
          </View>
        ))}
      </ScrollView>
      <View style={styles.btsDots}>
        {item.images.map((img) => (
          <View key={img.id} style={styles.btsDot} />
        ))}
      </View>
    </View>
  );
}

function CatalogSpotlightCard({ item }: { item: CatalogSpotlightFeedItem }) {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  return (
    <AnimatedPressable
      style={[styles.card, styles.cardBleed]}
      haptic="light"
      scaleTo={0.98}
      onPress={() => router.push(`/project/${item.projectId}`)}
    >
      <View style={styles.spotlightMediaWrap}>
        <Image source={{ uri: resolveAvatarUrl(item.posterUrl) ?? undefined }} style={styles.spotlightImage} />
        <LinearGradient
          colors={['rgba(0,0,0,0.35)', 'transparent', 'rgba(0,0,0,0.9)']}
          locations={[0, 0.4, 1]}
          style={styles.mediaScrim}
        />
        <View style={styles.spotlightTag}>
          <Text style={styles.spotlightTagText}>{item.isStudentFilm ? 'STUDENT SPOTLIGHT' : 'TRENDING FILM'}</Text>
        </View>
        <View style={styles.spotlightCaption}>
          <Text style={styles.spotlightTitle} numberOfLines={1}>
            {item.projectTitle}
          </Text>
          <Text style={styles.spotlightMeta} numberOfLines={1}>
            {[item.genre, `${item.reviewCount} review${item.reviewCount === 1 ? '' : 's'}`].filter(Boolean).join(' · ')}
          </Text>
          {item.logline ? (
            <Text style={styles.spotlightLogline} numberOfLines={2}>
              {item.logline}
            </Text>
          ) : null}
          <Text style={styles.spotlightByline}>from the Indie Catalog · by {item.actor.name}</Text>
        </View>
      </View>
    </AnimatedPressable>
  );
}

export function NetworkFeedCard({
  item,
  onDeleted,
}: {
  item: NetworkFeedItem;
  onDeleted?: (item: NetworkFeedItem) => void;
}) {
  const timeAgo = relativeTime(item.createdAt);
  switch (item.type) {
    case 'announcement':
      return <AnnouncementCard item={item} timeAgo={timeAgo} onDeleted={onDeleted} />;
    case 'crew_call':
      return <CrewCallCard item={item} timeAgo={timeAgo} />;
    case 'connection_update':
      return <ConnectionUpdateCard item={item} timeAgo={timeAgo} />;
    case 'project_launch':
      return <ProjectLaunchCard item={item} timeAgo={timeAgo} onDeleted={onDeleted} />;
    case 'poll':
      return <PollCard item={item} />;
    case 'festival_spotlight':
      return <FestivalSpotlightCard item={item} />;
    case 'bts_carousel':
      return <BtsCarouselCard item={item} />;
    case 'workspace_update':
      return <WorkspaceUpdateCard item={item} />;
    case 'catalog_spotlight':
      return <CatalogSpotlightCard item={item} />;
    case 'workspace_activity':
      return <WorkspaceActivityCard item={item} />;
  }
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60) return `${Math.max(minutes, 1)}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function hoursLeft(iso: string): string {
  const diffMs = new Date(iso).getTime() - Date.now();
  const hours = Math.round(diffMs / (1000 * 60 * 60));
  if (hours < 1) return '<1h';
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const createStyles = (colorScheme: 'light' | 'dark') =>
  StyleSheet.create({
  card: {
    backgroundColor: Colors[colorScheme].card,
    borderRadius: Radius.xl,
    marginHorizontal: Space.lg,
    marginBottom: Space.lg,
    overflow: 'hidden',
  },
  // One step up the elevation ramp — reserved for cards that should read as
  // richer/more "featured" than a routine text update (rich media, polls,
  // promotional spotlights), so hierarchy is visible, not just implied.
  cardElevated: {
    backgroundColor: Colors[colorScheme].surface2,
    borderRadius: Radius.xl,
    marginHorizontal: Space.lg,
    marginBottom: Space.lg,
    overflow: 'hidden',
  },
  cardBleed: {
    gap: Space.sm,
    paddingBottom: Space.sm,
  },
  pad: {
    paddingHorizontal: Space.md,
    gap: Space.sm,
  },
  actorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
    paddingTop: Space.md,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarCompact: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  avatarFallback: {
    backgroundColor: Colors[colorScheme].border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: Colors[colorScheme].text,
    fontWeight: '700',
  },
  actorMeta: {
    flex: 1,
  },
  actorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actorName: {
    color: Colors[colorScheme].text,
    ...Type.bodyLarge,
    fontWeight: '700',
  },
  verified: {
    color: Colors[colorScheme].secondary,
    ...Type.small,
  },
  handle: {
    color: Colors[colorScheme].muted,
    ...Type.small,
  },
  tagline: {
    color: Colors[colorScheme].text,
    ...Type.small,
    fontWeight: '600',
  },
  actorSub: {
    color: Colors[colorScheme].muted,
    ...Type.label,
  },
  badge: {
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: Space.sm,
    paddingVertical: 3,
  },
  badgeHiring: {
    backgroundColor: 'rgba(184, 58, 45, 0.16)',
    borderColor: 'rgba(184, 58, 45, 0.5)',
  },
  badgeCollab: {
    backgroundColor: 'rgba(78, 104, 81, 0.22)',
    borderColor: 'rgba(78, 104, 81, 0.5)',
  },
  badgeText: {
    ...Type.label,
    fontWeight: '700',
  },
  kicker: {
    color: Colors[colorScheme].secondary,
    ...Type.label,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  headline: {
    color: Colors[colorScheme].text,
    ...Type.subtitle,
    fontWeight: '700',
  },
  body: {
    color: Colors[colorScheme].text,
    ...Type.body,
  },
  // ---------- cinematic media ----------
  mediaWrap: {
    width: '100%',
    aspectRatio: 16 / 9,
    position: 'relative',
  },
  mediaImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  mediaScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '70%',
  },
  mediaCaption: {
    position: 'absolute',
    left: Space.md,
    right: Space.md,
    bottom: Space.sm,
  },
  mediaKicker: {
    color: Colors[colorScheme].tint,
    ...Type.caption,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  mediaHeadline: {
    color: '#FFFFFF',
    ...Type.cardTitle,
    fontFamily: Fonts.serif,
    marginTop: 2,
  },
  // ---------- catalog spotlight ----------
  spotlightMediaWrap: {
    width: '100%',
    aspectRatio: 2 / 3,
    position: 'relative',
  },
  spotlightImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  // gold, not sage — "featured/trending" is promotional energy, distinct
  // from sage's "settled/positive" meaning (connected, attending, published)
  spotlightTag: {
    position: 'absolute',
    top: Space.md,
    left: Space.md,
    backgroundColor: 'rgba(201, 162, 75, 0.9)',
    borderRadius: Radius.pill,
    paddingHorizontal: Space.md,
    paddingVertical: 4,
  },
  spotlightTagText: {
    color: '#241C08',
    ...Type.caption,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  spotlightCaption: {
    position: 'absolute',
    left: Space.md + 2,
    right: Space.md + 2,
    bottom: Space.md + 2,
  },
  spotlightTitle: {
    color: '#FFFFFF',
    ...Type.heading,
    fontFamily: Fonts.serif,
  },
  spotlightMeta: {
    color: Colors[colorScheme].accent,
    ...Type.small,
    fontWeight: '700',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  spotlightLogline: {
    color: 'rgba(255,255,255,0.85)',
    ...Type.body,
    marginTop: Space.xs + 2,
  },
  spotlightByline: {
    color: 'rgba(255,255,255,0.55)',
    ...Type.caption,
    marginTop: Space.sm,
  },
  seekingRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  seekingTag: {
    borderWidth: 1,
    borderColor: 'rgba(78, 104, 81, 0.5)',
    backgroundColor: 'rgba(78, 104, 81, 0.22)',
    borderRadius: Radius.pill,
    paddingHorizontal: Space.sm,
    paddingVertical: 3,
  },
  seekingTagText: {
    color: Colors[colorScheme].secondary,
    ...Type.label,
    fontWeight: '700',
  },
  applyButton: {
    alignSelf: 'flex-start',
    backgroundColor: Colors[colorScheme].tint,
    borderRadius: Radius.pill,
    paddingHorizontal: Space.lg,
    paddingVertical: 9,
  },
  applyButtonActive: {
    backgroundColor: Colors[colorScheme].secondary,
  },
  applyButtonText: {
    color: '#FFFFFF',
    ...Type.body,
    fontWeight: '700',
  },
  applyButtonTextActive: {
    color: Colors[colorScheme].background,
  },
  applyErrorText: {
    color: Colors[colorScheme].error,
    ...Type.label,
    marginTop: 2,
  },
  // ---------- hiring banner ----------
  hiringCard: {
    borderLeftWidth: 3,
    borderLeftColor: Colors[colorScheme].tint,
    padding: Space.md,
    gap: Space.sm,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    borderRadius: Radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  tagRole: {
    backgroundColor: Colors[colorScheme].tint,
  },
  tagRoleText: {
    color: '#FFFFFF',
    ...Type.caption,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  tagLoc: {
    backgroundColor: 'rgba(220,201,169,0.12)',
  },
  tagLocText: {
    color: Colors[colorScheme].text,
    ...Type.caption,
    fontWeight: '700',
  },
  tagPay: {
    backgroundColor: 'rgba(78,104,81,0.32)',
  },
  tagPayText: {
    color: '#CFE0CF',
    ...Type.caption,
    fontWeight: '700',
  },
  tagUrgent: {
    backgroundColor: 'rgba(220,201,169,0.12)',
    borderWidth: 1,
    borderColor: Colors[colorScheme].tint,
  },
  tagUrgentText: {
    color: Colors[colorScheme].tint,
    ...Type.caption,
    fontWeight: '800',
  },
  hiringTitle: {
    color: Colors[colorScheme].text,
    ...Type.subtitle,
    fontWeight: '700',
  },
  hiringSub: {
    color: Colors[colorScheme].muted,
    ...Type.label,
  },
  // ---------- poll ----------
  pollQuestion: {
    color: Colors[colorScheme].text,
    ...Type.bodyLarge,
    fontWeight: '700',
    lineHeight: 20,
  },
  pollOpt: {
    borderRadius: Radius.sm + 1,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  pollFill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(78,104,81,0.24)',
  },
  pollFillMine: {
    backgroundColor: 'rgba(78,104,81,0.4)',
  },
  pollOptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 9,
    gap: Space.sm,
  },
  pollOptLabel: {
    color: Colors[colorScheme].text,
    ...Type.small,
    flex: 1,
  },
  pollOptLabelMine: {
    color: Colors[colorScheme].secondary,
    fontWeight: '700',
  },
  pollOptPct: {
    color: Colors[colorScheme].secondary,
    ...Type.label,
    fontWeight: '700',
  },
  pollFoot: {
    color: Colors[colorScheme].muted,
    ...Type.label,
  },
  // ---------- workspace update ----------
  workspaceCard: {
    borderLeftWidth: 3,
    borderLeftColor: Colors[colorScheme].secondary,
    padding: Space.md,
    gap: Space.xs + 2,
  },
  workspaceChanRow: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(78,104,81,0.22)',
    borderRadius: Radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 3,
    marginBottom: Space.xs,
  },
  workspaceChan: {
    color: Colors[colorScheme].secondary,
    ...Type.label,
    fontWeight: '700',
  },
  workspaceBody: {
    color: Colors[colorScheme].text,
    ...Type.small,
    lineHeight: 18,
    marginTop: Space.xs,
  },
  workspaceProject: {
    color: Colors[colorScheme].muted,
    ...Type.label,
    marginTop: Space.xs,
  },
  // ---------- workspace activity digest ----------
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm + 2,
    borderLeftWidth: 3,
    borderLeftColor: Colors[colorScheme].secondary,
  },
  activityIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(78,104,81,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityKicker: {
    color: Colors[colorScheme].secondary,
    ...Type.label,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  activityBody: {
    color: Colors[colorScheme].text,
    ...Type.body,
    marginTop: 2,
  },
  activityProject: {
    fontWeight: '700',
  },
  // ---------- festival spotlight ----------
  // gold, not sage — "act before the deadline" is different energy than
  // sage's "settled/positive" (attending, connected)
  festivalCard: {
    padding: Space.lg - 2,
    gap: Space.sm,
  },
  festivalTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  festivalOpenTag: {
    backgroundColor: Colors[colorScheme].accent,
    borderRadius: Radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  festivalOpenTagText: {
    color: '#241C08',
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  festivalDeadline: {
    color: Colors[colorScheme].accent,
    ...Type.label,
    fontWeight: '700',
  },
  festivalName: {
    color: Colors[colorScheme].text,
    ...Type.title,
    fontFamily: Fonts.serif,
  },
  festivalLocation: {
    color: Colors[colorScheme].muted,
    ...Type.small,
  },
  festivalCta: {
    alignSelf: 'flex-start',
    backgroundColor: Colors[colorScheme].accent,
    borderRadius: Radius.pill,
    paddingHorizontal: Space.lg,
    paddingVertical: 9,
    marginTop: Space.xs,
  },
  festivalCtaText: {
    color: '#241C08',
    ...Type.body,
    fontWeight: '800',
  },
  // ---------- BTS carousel ----------
  btsKicker: {
    color: Colors[colorScheme].muted,
    ...Type.label,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 2,
  },
  btsScroll: {
    marginTop: Space.sm,
  },
  btsSlide: {
    width: 320,
    aspectRatio: 4 / 3,
    position: 'relative',
  },
  btsImage: {
    width: '100%',
    height: '100%',
  },
  btsCaptionWrap: {
    position: 'absolute',
    left: Space.sm,
    bottom: Space.sm,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: Radius.sm - 2,
    paddingHorizontal: Space.sm,
    paddingVertical: 3,
  },
  btsCaption: {
    color: '#FFFFFF',
    ...Type.label,
    fontWeight: '600',
  },
  btsDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: Space.md - 2,
  },
  btsDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Colors[colorScheme].border,
  },
});
