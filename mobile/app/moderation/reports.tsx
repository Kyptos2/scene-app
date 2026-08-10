import { useCallback, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, Stack, useFocusEffect } from 'expo-router';

import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { getReportsQueue, resolveReport, resolveAvatarUrl, type ReportSummary } from '@/lib/api';

const TARGET_LABEL: Record<ReportSummary['targetType'], string> = {
  USER: 'Profile',
  PROJECT: 'Project',
  REVIEW: 'Review',
  FEED_POST: 'Post',
  PRODUCTION_REQUEST: 'Crew Call',
  FEED_COMMENT: 'Comment',
  MESSAGE: 'Message',
  WORKSPACE_MESSAGE: 'Workspace Message',
};

function ReportRow({ report, onResolved }: { report: ReportSummary; onResolved: (id: string) => void }) {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  const [pending, setPending] = useState<'dismiss' | 'review' | null>(null);
  const isAuto = report.source === 'AUTO_SLUR' || !report.reporter;
  const avatarUrl = report.reporter ? resolveAvatarUrl(report.reporter.avatarUrl) : null;

  async function handle(status: 'REVIEWED' | 'DISMISSED', which: 'dismiss' | 'review') {
    setPending(which);
    try {
      await resolveReport(report.id, status);
      onResolved(report.id);
    } finally {
      setPending(null);
    }
  }

  return (
    <View style={styles.row}>
      <View style={styles.headerRow}>
        {isAuto ? (
          <View style={[styles.avatar, styles.avatarFallback, styles.avatarAuto]}>
            <Text style={styles.avatarInitial}>⚑</Text>
          </View>
        ) : avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarInitial}>{report.reporter!.name.charAt(0)}</Text>
          </View>
        )}
        <View style={styles.headerMeta}>
          <Text style={styles.reporter}>
            {isAuto
              ? `Automated scan flagged a ${TARGET_LABEL[report.targetType]}`
              : `@${report.reporter!.username} reported a ${TARGET_LABEL[report.targetType]}`}
          </Text>
          <Text style={styles.targetId} numberOfLines={1}>ID: {report.targetId}</Text>
        </View>
      </View>

      {isAuto ? (
        <View style={styles.autoChip}>
          <Text style={styles.autoChipText}>AUTO-FLAGGED · POSSIBLE SLUR</Text>
        </View>
      ) : null}

      <View style={styles.reasonChip}>
        <Text style={styles.reasonChipText}>{report.reason}</Text>
      </View>
      {report.note ? <Text style={styles.note}>{report.note}</Text> : null}

      <View style={styles.actions}>
        <Pressable style={styles.dismissButton} onPress={() => handle('DISMISSED', 'dismiss')} disabled={pending !== null}>
          {pending === 'dismiss' ? (
            <ActivityIndicator color={Colors[colorScheme].text} size="small" />
          ) : (
            <Text style={styles.dismissButtonText}>Dismiss</Text>
          )}
        </Pressable>
        <Pressable style={styles.reviewButton} onPress={() => handle('REVIEWED', 'review')} disabled={pending !== null}>
          {pending === 'review' ? (
            <ActivityIndicator color={Colors[colorScheme].background} size="small" />
          ) : (
            <Text style={styles.reviewButtonText}>Mark Reviewed</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

export default function ReportsQueueScreen() {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  const { user } = useAuth();
  const [reports, setReports] = useState<ReportSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      getReportsQueue('PENDING')
        .then((res) => {
          if (!cancelled) setReports(res.results);
        })
        .catch(() => {
          if (!cancelled) setError("Couldn't load reports.");
        });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  function handleResolved(id: string) {
    setReports((prev) => (prev ? prev.filter((r) => r.id !== id) : prev));
  }

  return (
    <View style={styles.safeArea}>
      <Stack.Screen
        options={{
          title: 'Reports',
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
      ) : reports === null ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors[colorScheme].tint} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {reports.length === 0 ? (
            <Text style={styles.emptyText}>No pending reports.</Text>
          ) : (
            reports.map((r) => <ReportRow key={r.id} report={r} onResolved={handleResolved} />)
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
    gap: 8,
  },
  headerRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarFallback: {
    backgroundColor: Colors[colorScheme].background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarAuto: {
    backgroundColor: Colors[colorScheme].tint,
  },
  avatarInitial: {
    color: Colors[colorScheme].text,
    fontWeight: '700',
  },
  autoChip: {
    alignSelf: 'flex-start',
    backgroundColor: Colors[colorScheme].tint,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  autoChipText: {
    color: Colors[colorScheme].background,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  headerMeta: {
    flex: 1,
  },
  reporter: {
    color: Colors[colorScheme].text,
    fontSize: 13,
    fontWeight: '600',
  },
  targetId: {
    color: Colors[colorScheme].muted,
    fontSize: 11,
  },
  reasonChip: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(184, 58, 45, 0.16)',
    borderColor: 'rgba(184, 58, 45, 0.5)',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  reasonChipText: {
    color: Colors[colorScheme].tint,
    fontSize: 12,
    fontWeight: '700',
  },
  note: {
    color: Colors[colorScheme].text,
    fontSize: 13,
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  dismissButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors[colorScheme].border,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  dismissButtonText: {
    color: Colors[colorScheme].text,
    fontSize: 13,
    fontWeight: '700',
  },
  reviewButton: {
    flex: 1,
    backgroundColor: Colors[colorScheme].secondary,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  reviewButtonText: {
    color: Colors[colorScheme].background,
    fontSize: 13,
    fontWeight: '700',
  },
});
