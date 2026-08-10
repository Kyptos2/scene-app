import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { SectionHeader } from '@/components/home/SectionHeader';
import { ProductionCard, RequestCard } from '@/components/home/ProductionCard';
import { FestivalCard } from '@/components/home/FestivalCard';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { COMPENSATION_LABELS } from '@/constants/Labels';
import { useLocation } from '@/hooks/useLocation';
import {
  getAssistanceNeeded,
  getFestivalCollaborations,
  getLocalProductions,
  getUpcomingFestivals,
  type AssistanceRequest,
  type FestivalCollaboration,
  type LocalProduction,
  type UpcomingFestival,
} from '@/lib/api';

export function LocalFeedTab() {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  const { coords, status } = useLocation();

  const [productions, setProductions] = useState<LocalProduction[] | null>(null);
  const [requests, setRequests] = useState<AssistanceRequest[] | null>(null);
  const [collaborations, setCollaborations] = useState<FestivalCollaboration[] | null>(null);
  const [festivals, setFestivals] = useState<UpcomingFestival[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!coords) return;

    let cancelled = false;
    setLoadError(null);

    Promise.all([
      getLocalProductions(coords),
      getAssistanceNeeded(coords),
      getFestivalCollaborations(coords),
      getUpcomingFestivals(coords),
    ])
      .then(([local, assist, collab, fest]) => {
        if (cancelled) return;
        setProductions(local.results);
        setRequests(assist.results);
        setCollaborations(collab.results);
        setFestivals(fest.results);
      })
      .catch(() => {
        if (!cancelled) setLoadError("Couldn't reach SCENE. Is the dev server running?");
      });

    return () => {
      cancelled = true;
    };
  }, [coords]);

  if (status === 'loading') {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors[colorScheme].tint} />
      </View>
    );
  }

  if (status === 'denied' || status === 'error') {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>
          SCENE needs your location to show what&apos;s happening near you. Enable location
          access in Settings and reopen the app.
        </Text>
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>{loadError}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <SectionHeader question="Who's making films in my area?" />
      {productions === null ? (
        <ActivityIndicator color={Colors[colorScheme].tint} style={styles.sectionSpinner} />
      ) : productions.length === 0 ? (
        <Text style={styles.emptyInline}>No local productions nearby right now.</Text>
      ) : (
        productions.slice(0, 4).map((item) => <ProductionCard key={item.id} item={item} />)
      )}

      <SectionHeader question="Who needs assistance with a film?" />
      {requests === null ? (
        <ActivityIndicator color={Colors[colorScheme].tint} style={styles.sectionSpinner} />
      ) : requests.length === 0 ? (
        <Text style={styles.emptyInline}>No open crew requests right now.</Text>
      ) : (
        requests
          .slice(0, 4)
          .map((item) => (
            <RequestCard
              key={item.id}
              title={item.title}
              projectTitle={item.projectTitle}
              role={item.roleNeeded}
              meta={COMPENSATION_LABELS[item.compensationType] ?? item.compensationType}
              location={[item.city, item.state].filter(Boolean).join(', ')}
              distanceKm={item.distanceKm}
              posterId={item.postedById}
            />
          ))
      )}

      <SectionHeader question="Who's entering a festival in my area?" />
      {collaborations === null ? (
        <ActivityIndicator color={Colors[colorScheme].tint} style={styles.sectionSpinner} />
      ) : collaborations.length === 0 ? (
        <Text style={styles.emptyInline}>No festival teams recruiting nearby right now.</Text>
      ) : (
        collaborations
          .slice(0, 4)
          .map((item) => (
            <RequestCard
              key={item.id}
              title={item.title}
              projectTitle={`${item.projectTitle} · entering ${item.festivalName}`}
              role={item.roleNeeded}
              meta={new Date(item.festivalStartDate).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              })}
              location={[item.city, item.state].filter(Boolean).join(', ')}
              distanceKm={item.distanceKm}
              posterId={item.postedById}
            />
          ))
      )}

      <SectionHeader question="Any festivals in my area this week?" />
      {festivals === null ? (
        <ActivityIndicator color={Colors[colorScheme].tint} style={styles.sectionSpinner} />
      ) : festivals.length === 0 ? (
        <Text style={styles.emptyInline}>No festivals coming up in the next 7 days.</Text>
      ) : (
        festivals.slice(0, 4).map((item) => <FestivalCard key={item.id} item={item} />)
      )}

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
    paddingBottom: 24,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: Colors[colorScheme].background,
  },
  emptyText: {
    color: Colors[colorScheme].muted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyInline: {
    color: Colors[colorScheme].muted,
    fontSize: 13,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sectionSpinner: {
    marginVertical: 12,
  },
  bottomSpacer: {
    height: 24,
  },
});
