import { useCallback, useState } from 'react';
import { ActivityIndicator, Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import Animated from 'react-native-reanimated';

import { AnimatedPressable } from '@/components/AnimatedPressable';
import { FeedSkeletonList } from '@/components/SkeletonLoader';
import { useViewfinderPullRefresh, ViewfinderRefreshHeader } from '@/components/home/ViewfinderRefreshHeader';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Radius, Space } from '@/constants/Spacing';
import { Fonts, Type } from '@/constants/Typography';
import { useAuth } from '@/context/AuthContext';
import { useLocation } from '@/hooks/useLocation';
import {
  attendFestival,
  getFeaturedFestivals,
  getUpcomingFestivals,
  resolveAvatarUrl,
  unattendFestival,
  type FeaturedFestival,
  type SubmissionStatus,
  type UpcomingFestival,
} from '@/lib/api';

const WITHIN_DAYS = 30;
const GOLD = { light: '#9C7A28', dark: '#C9A24B' } as const;

function formatDateRange(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const startLabel = start.toLocaleDateString(undefined, opts);
  const endLabel = end.toLocaleDateString(undefined, opts);
  return startLabel === endLabel ? startLabel : `${startLabel} – ${endLabel}`;
}

function daysUntil(iso: string): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
}

function FeaturedFestivalCard({ festival }: { festival: FeaturedFestival }) {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  const location = [festival.city, festival.state].filter(Boolean).join(', ');
  const posterUrl = resolveAvatarUrl(festival.posterUrl);

  return (
    <View style={styles.featuredCard}>
      {posterUrl ? (
        <Image source={{ uri: posterUrl }} style={styles.featuredImage} />
      ) : (
        <View style={[styles.featuredImage, styles.featuredImageFallback]}>
          <Text style={styles.featuredImageFallbackText}>{festival.name.charAt(0)}</Text>
        </View>
      )}
      <View style={styles.featuredBody}>
        <Text style={styles.featuredName} numberOfLines={1}>
          {festival.name}
        </Text>
        <Text style={styles.featuredMeta} numberOfLines={1}>
          {formatDateRange(festival.startDate, festival.endDate)}
          {location ? ` · ${location}` : ''}
        </Text>
        {festival.attendeeCount > 0 ? (
          <View style={styles.attendeeRow}>
            <SymbolView
              name={{ ios: 'person.2.fill', android: 'group', web: 'group' }}
              size={12}
              tintColor={Colors[colorScheme].muted}
            />
            <Text style={styles.attendeeText}>
              {festival.attendeeCount} attending
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function SubmissionBadge({ status, deadline }: { status: SubmissionStatus; deadline: string | null }) {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  if (status === 'unset') return null;
  if (status === 'open') {
    return (
      <View style={[styles.badge, styles.badgeOpen]}>
        <Text style={[styles.badgeText, styles.badgeTextOpen]}>Submissions Open</Text>
      </View>
    );
  }
  if (status === 'deadline_soon') {
    const days = deadline ? daysUntil(deadline) : null;
    return (
      <View style={[styles.badge, styles.badgeSoon]}>
        <Text style={[styles.badgeText, styles.badgeTextSoon]}>
          Deadline Approaching{days != null ? ` — ${days}d` : ''}
        </Text>
      </View>
    );
  }
  return (
    <View style={[styles.badge, styles.badgeClosed]}>
      <Text style={[styles.badgeText, styles.badgeTextClosed]}>Submissions Closed</Text>
    </View>
  );
}

function FestivalCard({ festival, onToggled }: { festival: UpcomingFestival; onToggled: (id: string, attending: boolean) => void }) {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleToggle() {
    setPending(true);
    setError(null);
    try {
      if (festival.isAttending) {
        await unattendFestival(festival.id);
        onToggled(festival.id, false);
      } else {
        await attendFestival(festival.id);
        onToggled(festival.id, true);
      }
    } catch {
      setError("Couldn't update that. Try again.");
    } finally {
      setPending(false);
    }
  }

  const location = [festival.city, festival.state].filter(Boolean).join(', ');

  return (
    <View style={styles.card}>
      <Text style={styles.name}>{festival.name}</Text>
      <Text style={styles.meta}>
        {formatDateRange(festival.startDate, festival.endDate)}
        {location ? ` · ${location}` : ''}
        {festival.distanceKm != null ? ` · ${festival.distanceKm.toFixed(0)} km away` : ''}
      </Text>
      <SubmissionBadge status={festival.submissionStatus} deadline={festival.submissionDeadline} />
      {festival.description ? (
        <Text style={styles.description} numberOfLines={3}>
          {festival.description}
        </Text>
      ) : null}
      {festival.submissionUrl ? (
        <Pressable onPress={() => Linking.openURL(festival.submissionUrl as string)}>
          <Text style={styles.link} numberOfLines={1}>
            {festival.submissionUrl}
            {festival.urlReachable === false ? '  ·  Link may be broken' : ''}
          </Text>
        </Pressable>
      ) : null}
      <Pressable
        style={[styles.attendButton, festival.isAttending && styles.attendButtonActive]}
        onPress={handleToggle}
        disabled={pending}
      >
        {pending ? (
          <ActivityIndicator color={festival.isAttending ? Colors[colorScheme].text : Colors[colorScheme].background} size="small" />
        ) : (
          <Text style={[styles.attendButtonText, festival.isAttending && styles.attendButtonTextActive]}>
            {festival.isAttending ? 'Attending ✓' : 'Attend'}
          </Text>
        )}
      </Pressable>
      {error ? <Text style={styles.attendErrorText}>{error}</Text> : null}
    </View>
  );
}

function UpgradePrompt() {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  return (
    <View style={styles.upgradeCard}>
      <SymbolView name={{ ios: 'star.fill', android: 'star', web: 'star' }} size={22} tintColor={GOLD[colorScheme]} />
      <Text style={styles.upgradeTitle}>Festivals is a Gold feature</Text>
      <Text style={styles.upgradeBody}>
        See full festival listings, submission links, and RSVP — plus exclusive Festival networking — with Gold.
      </Text>
      <AnimatedPressable
        style={styles.upgradeButton}
        haptic="medium"
        onPress={() => router.push('/subscription')}
      >
        <Text style={styles.upgradeButtonText}>Upgrade to Gold — $45/mo</Text>
      </AnimatedPressable>
    </View>
  );
}

export function FestivalsTab() {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  const { coords } = useLocation();
  const { user } = useAuth();
  const isGold = user?.subscriptionTier === 'GOLD';
  const [featured, setFeatured] = useState<FeaturedFestival[] | null>(null);
  const [festivals, setFestivals] = useState<UpcomingFestival[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    getFeaturedFestivals()
      .then((res) => setFeatured(res.results))
      .catch(() => setFeatured([]));
    if (!isGold) {
      setFestivals([]);
      return;
    }
    try {
      const res = await getUpcomingFestivals(coords, WITHIN_DAYS);
      setFestivals(res.results);
    } catch {
      setError("Couldn't load festivals. Is the dev server running?");
    }
  }, [coords, isGold]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const { scrollHandler, pullDistance, refreshing } = useViewfinderPullRefresh(load);

  function handleToggled(id: string, attending: boolean) {
    setFestivals((prev) => (prev ? prev.map((f) => (f.id === id ? { ...f, isAttending: attending } : f)) : prev));
  }

  if (featured === null && !error) {
    return (
      <View style={styles.container}>
        <FeedSkeletonList count={3} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ViewfinderRefreshHeader pullDistance={pullDistance} refreshing={refreshing} />
      <Animated.ScrollView contentContainerStyle={styles.content} onScroll={scrollHandler} scrollEventThrottle={16}>
        {featured && featured.length > 0 ? (
          <View style={styles.featuredSection}>
            <Text style={styles.sectionTitle}>Featured Festivals</Text>
            <Animated.ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.featuredRow}
            >
              {featured.map((festival) => (
                <FeaturedFestivalCard key={festival.id} festival={festival} />
              ))}
            </Animated.ScrollView>
          </View>
        ) : null}

        {!isGold ? (
          <UpgradePrompt />
        ) : (
          <>
            <Pressable style={styles.submitButton} onPress={() => router.push('/festival/new')}>
              <Text style={styles.submitButtonText}>+ Add a Festival</Text>
            </Pressable>
            {error ? (
              <Text style={styles.emptyText}>{error}</Text>
            ) : festivals?.length === 0 ? (
              <Text style={styles.emptyText}>No festivals coming up in the next {WITHIN_DAYS} days.</Text>
            ) : (
              festivals?.map((festival) => <FestivalCard key={festival.id} festival={festival} onToggled={handleToggled} />)
            )}
          </>
        )}
      </Animated.ScrollView>
    </View>
  );
}

const createStyles = (colorScheme: 'light' | 'dark') =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors[colorScheme].background,
  },
  content: {
    paddingTop: 16,
    paddingBottom: 24,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors[colorScheme].background,
    padding: 24,
  },
  emptyText: {
    color: Colors[colorScheme].muted,
    fontSize: 13,
    paddingHorizontal: 16,
    textAlign: 'center',
  },
  sectionTitle: {
    color: Colors[colorScheme].text,
    ...Type.bodyLarge,
    fontFamily: Fonts.serif,
    marginHorizontal: 16,
    marginBottom: Space.sm,
  },
  featuredSection: {
    marginBottom: Space.lg,
  },
  featuredRow: {
    paddingHorizontal: 16,
    gap: Space.md,
  },
  featuredCard: {
    width: 144,
    backgroundColor: Colors[colorScheme].card,
    borderWidth: 1,
    borderColor: Colors[colorScheme].border,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  featuredImage: {
    width: '100%',
    height: 90,
    backgroundColor: Colors[colorScheme].surface2,
  },
  featuredImageFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredImageFallbackText: {
    color: Colors[colorScheme].muted,
    ...Type.heading,
    fontWeight: '700',
  },
  featuredBody: {
    padding: Space.sm + 2,
    gap: 3,
  },
  featuredName: {
    color: Colors[colorScheme].text,
    ...Type.cardTitle,
    fontFamily: Fonts.serif,
  },
  featuredMeta: {
    color: Colors[colorScheme].muted,
    ...Type.label,
  },
  attendeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  attendeeText: {
    color: Colors[colorScheme].muted,
    ...Type.caption,
  },
  upgradeCard: {
    marginHorizontal: 16,
    backgroundColor: Colors[colorScheme].card,
    borderWidth: 1.5,
    borderColor: GOLD[colorScheme],
    borderRadius: Radius.xl,
    padding: Space.lg,
    alignItems: 'center',
    gap: Space.xs,
  },
  upgradeTitle: {
    color: Colors[colorScheme].text,
    ...Type.title,
    fontFamily: Fonts.serif,
    marginTop: Space.xs,
    textAlign: 'center',
  },
  upgradeBody: {
    color: Colors[colorScheme].muted,
    ...Type.body,
    textAlign: 'center',
    marginBottom: Space.sm,
  },
  upgradeButton: {
    backgroundColor: GOLD[colorScheme],
    borderRadius: Radius.pill,
    paddingHorizontal: Space.lg,
    paddingVertical: Space.sm + 2,
  },
  upgradeButtonText: {
    color: '#FFFFFF',
    ...Type.body,
    fontWeight: '700',
  },
  submitButton: {
    borderWidth: 1,
    borderColor: Colors[colorScheme].tint,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
  },
  submitButtonText: {
    color: Colors[colorScheme].tint,
    fontSize: 14,
    fontWeight: '700',
  },
  card: {
    backgroundColor: Colors[colorScheme].card,
    borderColor: Colors[colorScheme].border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 10,
    gap: 6,
  },
  name: {
    color: Colors[colorScheme].text,
    ...Type.cardTitle,
    fontFamily: Fonts.serif,
  },
  meta: {
    color: Colors[colorScheme].muted,
    fontSize: 12,
  },
  description: {
    color: Colors[colorScheme].text,
    fontSize: 13,
    lineHeight: 18,
  },
  link: {
    color: Colors[colorScheme].tint,
    fontSize: 12,
  },
  badge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeOpen: {
    backgroundColor: 'rgba(78, 104, 81, 0.22)',
    borderColor: 'rgba(78, 104, 81, 0.5)',
  },
  badgeSoon: {
    backgroundColor: 'rgba(184, 58, 45, 0.16)',
    borderColor: 'rgba(184, 58, 45, 0.5)',
  },
  badgeClosed: {
    backgroundColor: Colors[colorScheme].background,
    borderColor: Colors[colorScheme].border,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  badgeTextOpen: {
    color: Colors[colorScheme].secondary,
  },
  badgeTextSoon: {
    color: Colors[colorScheme].tint,
  },
  badgeTextClosed: {
    color: Colors[colorScheme].muted,
  },
  attendButton: {
    marginTop: 6,
    borderRadius: 999,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: Colors[colorScheme].tint,
  },
  attendButtonActive: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors[colorScheme].secondary,
  },
  attendButtonText: {
    color: Colors[colorScheme].background,
    fontSize: 13,
    fontWeight: '700',
  },
  attendButtonTextActive: {
    color: Colors[colorScheme].secondary,
  },
  attendErrorText: {
    color: Colors[colorScheme].error,
    fontSize: 11,
    marginTop: 4,
  },
});
