import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';

import { AccordionSection } from '@/components/profile/AccordionSection';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { ExperienceAccordion } from '@/components/profile/ExperienceAccordion';
import { FilmographyGrid } from '@/components/profile/FilmographyGrid';
import { NetworkConnectionsTab } from '@/components/profile/NetworkConnectionsTab';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { FeedSkeletonList } from '@/components/SkeletonLoader';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Radius, Space } from '@/constants/Spacing';
import { Type } from '@/constants/Typography';
import { useAuth } from '@/context/AuthContext';
import { getUserNetwork, getUserProfile, type NetworkConnection, type UserProfile } from '@/lib/api';

// The tab shell's header is now the shared AppHeader (search + notifications
// on every tab), so it can no longer host a per-screen "Log out" action —
// it lives here instead, in the one place it's actually relevant.

function SectionTitle({ children }: { children: string }) {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

export function ProfileScreenContent({ userId }: { userId: string }) {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  const { user, logout } = useAuth();
  const isOwnProfile = user?.id === userId;
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [network, setNetwork] = useState<NetworkConnection[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setError(null);

      Promise.all([getUserProfile(userId), getUserNetwork(userId)])
        .then(([profileData, networkData]) => {
          if (cancelled) return;
          setProfile(profileData);
          setNetwork(networkData);
        })
        .catch(() => {
          if (!cancelled) setError("Couldn't load this profile. Is the dev server running?");
        });

      return () => {
        cancelled = true;
      };
    }, [userId]),
  );

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.container}>
        <FeedSkeletonList count={2} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <ProfileHeader profile={profile} editable={isOwnProfile} onProfileUpdated={setProfile} />

      <View style={styles.sectionHeaderRow}>
        <SectionTitle>Filmography</SectionTitle>
        {isOwnProfile ? (
          <AnimatedPressable haptic="light" onPress={() => router.push('/project/new')} hitSlop={8}>
            <Text style={styles.newProjectLink}>+ New Project</Text>
          </AnimatedPressable>
        ) : null}
      </View>
      <FilmographyGrid credits={profile.credits} />

      <View style={styles.accordionWrap}>
        <ExperienceAccordion profile={profile} />
      </View>

      {profile.portfolioLinks.length > 0 && (
        <View style={styles.accordionWrap}>
          <AccordionSection title="Portfolio">
            <View style={styles.portfolioList}>
              {profile.portfolioLinks.map((link) => (
                <Text key={link.id} style={styles.portfolioLink}>
                  {link.label} — {link.url}
                </Text>
              ))}
            </View>
          </AccordionSection>
        </View>
      )}

      <SectionTitle>Network Connections</SectionTitle>
      <NetworkConnectionsTab connections={network ?? []} />

      {isOwnProfile ? (
        <>
          <View style={styles.accordionWrap}>
            <AnimatedPressable style={styles.settingsRow} haptic="light" onPress={() => router.push('/settings')}>
              <Text style={styles.settingsRowText}>Settings</Text>
              <Text style={styles.settingsRowChevron}>›</Text>
            </AnimatedPressable>
          </View>
          <View style={styles.legalRow}>
            <AnimatedPressable haptic="light" onPress={() => router.push('/terms')} hitSlop={8}>
              <Text style={styles.legalLink}>Terms of Service</Text>
            </AnimatedPressable>
            <Text style={styles.legalDivider}>·</Text>
            <AnimatedPressable haptic="light" onPress={() => router.push('/privacy')} hitSlop={8}>
              <Text style={styles.legalLink}>Privacy Policy</Text>
            </AnimatedPressable>
          </View>
          <AnimatedPressable style={styles.logoutRow} haptic="medium" onPress={logout} hitSlop={8}>
            <Text style={styles.logoutText}>Log out</Text>
          </AnimatedPressable>
        </>
      ) : null}

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const createStyles = (colorScheme: 'light' | 'dark') =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors[colorScheme].background,
  },
  content: {
    paddingBottom: Space.xxl,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Space.xxxl,
    backgroundColor: Colors[colorScheme].background,
  },
  errorText: {
    color: Colors[colorScheme].muted,
    ...Type.bodyLarge,
    textAlign: 'center',
  },
  sectionTitle: {
    color: Colors[colorScheme].muted,
    ...Type.body,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: Space.lg,
    paddingTop: Space.xl,
    paddingBottom: Space.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  newProjectLink: {
    color: Colors[colorScheme].tint,
    ...Type.small,
    fontWeight: '700',
    marginRight: Space.lg,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors[colorScheme].card,
    borderColor: Colors[colorScheme].border,
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingHorizontal: Space.md + 2,
    paddingVertical: Space.md,
  },
  settingsRowText: {
    color: Colors[colorScheme].text,
    ...Type.bodyLarge,
    fontWeight: '600',
  },
  settingsRowChevron: {
    color: Colors[colorScheme].muted,
    ...Type.title,
  },
  accordionWrap: {
    paddingHorizontal: Space.lg,
    marginTop: Space.sm,
  },
  portfolioList: {
    gap: Space.xs + 2,
  },
  portfolioLink: {
    color: Colors[colorScheme].tint,
    ...Type.body,
  },
  bottomSpacer: {
    height: 140, // clears the floating [+] tab button
  },
  legalRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Space.sm,
    marginTop: 28,
  },
  legalLink: {
    color: Colors[colorScheme].muted,
    ...Type.small,
    fontWeight: '600',
  },
  legalDivider: {
    color: Colors[colorScheme].muted,
    ...Type.small,
  },
  logoutRow: {
    alignItems: 'center',
    marginTop: Space.lg,
  },
  logoutText: {
    color: Colors[colorScheme].tint,
    ...Type.body,
    fontWeight: '700',
  },
});
