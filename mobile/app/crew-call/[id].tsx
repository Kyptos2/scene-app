import { useCallback, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';

import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { COMPENSATION_LABELS, ROLE_LABELS } from '@/constants/Labels';
import { getCrewCallDetail, resolveAvatarUrl, setCrewCallFilled, type CrewCallDetail } from '@/lib/api';

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function CrewCallManageScreen() {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  const { id } = useLocalSearchParams<{ id: string }>();
  const [crewCall, setCrewCall] = useState<CrewCallDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      getCrewCallDetail(id)
        .then((data) => {
          if (!cancelled) setCrewCall(data);
        })
        .catch(() => {
          if (!cancelled) setError("Couldn't load this crew call.");
        });
      return () => {
        cancelled = true;
      };
    }, [id]),
  );

  async function toggleFilled() {
    if (!crewCall) return;
    setUpdating(true);
    try {
      const updated = await setCrewCallFilled(crewCall.id, !crewCall.isFilled);
      setCrewCall(updated);
    } catch {
      setError('Something went wrong updating this crew call.');
    } finally {
      setUpdating(false);
    }
  }

  return (
    <View style={styles.safeArea}>
      <Stack.Screen
        options={{
          title: 'Manage Crew Call',
          headerStyle: { backgroundColor: Colors[colorScheme].background },
          headerTintColor: Colors[colorScheme].text,
          headerShadowVisible: false,
        }}
      />

      {error ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>{error}</Text>
        </View>
      ) : !crewCall ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors[colorScheme].tint} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>{crewCall.title}</Text>
          <Text style={styles.meta}>
            {ROLE_LABELS[crewCall.roleNeeded] ?? crewCall.roleNeeded}
            {' · '}
            {COMPENSATION_LABELS[crewCall.compensationType] ?? crewCall.compensationType}
          </Text>
          <Text style={styles.meta}>
            {[crewCall.city, crewCall.state].filter(Boolean).join(', ') || 'Location TBD'}
            {crewCall.startDate ? ` · ${formatShortDate(crewCall.startDate)}` : ''}
          </Text>
          {crewCall.description ? <Text style={styles.description}>{crewCall.description}</Text> : null}

          <View style={[styles.statusChip, crewCall.isFilled ? styles.statusChipFilled : styles.statusChipOpen]}>
            <Text style={[styles.statusChipText, crewCall.isFilled ? styles.statusChipTextFilled : styles.statusChipTextOpen]}>
              {crewCall.isFilled ? 'Filled' : 'Open'}
            </Text>
          </View>

          <Pressable style={styles.toggleButton} onPress={toggleFilled} disabled={updating}>
            {updating ? (
              <ActivityIndicator color={Colors[colorScheme].background} />
            ) : (
              <Text style={styles.toggleButtonText}>{crewCall.isFilled ? 'Reopen This Role' : 'Mark as Filled'}</Text>
            )}
          </Pressable>

          <Text style={styles.sectionTitle}>
            Applicants {crewCall.applications.length > 0 ? `(${crewCall.applications.length})` : ''}
          </Text>

          {crewCall.applications.length === 0 ? (
            <Text style={styles.emptyText}>No one has applied yet.</Text>
          ) : (
            crewCall.applications.map((app) => (
              <Pressable
                key={app.id}
                style={styles.applicantRow}
                onPress={() => router.push(`/profile/${app.applicant.id}`)}
              >
                {app.applicant.avatarUrl ? (
                  <Image source={{ uri: resolveAvatarUrl(app.applicant.avatarUrl) ?? undefined }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarFallback]}>
                    <Text style={styles.avatarInitial}>{app.applicant.name.charAt(0)}</Text>
                  </View>
                )}
                <View style={styles.applicantInfo}>
                  <Text style={styles.applicantName}>{app.applicant.name}</Text>
                  <Text style={styles.applicantHandle}>@{app.applicant.username}</Text>
                  {app.message ? (
                    <Text style={styles.applicantMessage} numberOfLines={3}>
                      {app.message}
                    </Text>
                  ) : null}
                </View>
                <Text style={styles.applicantDate}>{formatShortDate(app.createdAt)}</Text>
              </Pressable>
            ))
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
    padding: 32,
  },
  emptyText: {
    color: Colors[colorScheme].muted,
    fontSize: 13,
  },
  content: {
    padding: 16,
    gap: 8,
  },
  title: {
    color: Colors[colorScheme].text,
    fontSize: 20,
    fontWeight: '800',
  },
  meta: {
    color: Colors[colorScheme].muted,
    fontSize: 13,
  },
  description: {
    color: Colors[colorScheme].text,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  statusChip: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    marginTop: 8,
  },
  statusChipOpen: {
    backgroundColor: 'rgba(78, 104, 81, 0.16)',
    borderColor: 'rgba(78, 104, 81, 0.5)',
  },
  statusChipFilled: {
    backgroundColor: 'rgba(184, 58, 45, 0.16)',
    borderColor: 'rgba(184, 58, 45, 0.5)',
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusChipTextOpen: {
    color: Colors[colorScheme].secondary,
  },
  statusChipTextFilled: {
    color: Colors[colorScheme].tint,
  },
  toggleButton: {
    backgroundColor: Colors[colorScheme].tint,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  toggleButtonText: {
    color: Colors[colorScheme].background,
    fontSize: 14,
    fontWeight: '700',
  },
  sectionTitle: {
    color: Colors[colorScheme].muted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 20,
    marginBottom: 4,
  },
  applicantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors[colorScheme].card,
    borderColor: Colors[colorScheme].border,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarFallback: {
    backgroundColor: Colors[colorScheme].background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: Colors[colorScheme].text,
    fontWeight: '700',
  },
  applicantInfo: {
    flex: 1,
    gap: 2,
  },
  applicantName: {
    color: Colors[colorScheme].text,
    fontSize: 14,
    fontWeight: '700',
  },
  applicantHandle: {
    color: Colors[colorScheme].muted,
    fontSize: 12,
  },
  applicantMessage: {
    color: Colors[colorScheme].muted,
    fontSize: 12,
    marginTop: 2,
  },
  applicantDate: {
    color: Colors[colorScheme].muted,
    fontSize: 11,
  },
  bottomSpacer: {
    height: 24,
  },
});
