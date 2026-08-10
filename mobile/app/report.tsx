import { useState } from 'react';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { submitReport, type ReportTargetType } from '@/lib/api';

const REASONS = ['Spam', 'Harassment', 'Inappropriate content', 'Impersonation', 'Scam or fraud', 'Other'];

export default function ReportScreen() {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  const { targetType, targetId, label } = useLocalSearchParams<{
    targetType: ReportTargetType;
    targetId: string;
    label?: string;
  }>();
  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!reason) {
      setError('Pick a reason.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await submitReport({ targetType, targetId, reason, note: note.trim() || null });
      setDone(true);
    } catch {
      setError("Couldn't submit this report. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.safeArea}>
      <Stack.Screen
        options={{
          title: 'Report',
          headerStyle: { backgroundColor: Colors[colorScheme].background },
          headerTintColor: Colors[colorScheme].text,
          headerShadowVisible: false,
        }}
      />
      <View style={styles.content}>
        {done ? (
          <>
            <Text style={styles.confirmation}>
              Thanks — we've received your report{label ? ` about ${label}` : ''} and a moderator will review it.
            </Text>
            <Pressable style={styles.button} onPress={() => router.back()}>
              <Text style={styles.buttonText}>Done</Text>
            </Pressable>
          </>
        ) : (
          <>
            {label ? <Text style={styles.subject}>Reporting: {label}</Text> : null}
            <Text style={styles.label}>Why are you reporting this?</Text>
            <View style={styles.chipRow}>
              {REASONS.map((r) => {
                const selected = r === reason;
                return (
                  <Pressable
                    key={r}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => setReason(r)}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{r}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.label}>Details (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Anything that would help a moderator review this…"
              placeholderTextColor={Colors[colorScheme].muted}
              value={note}
              onChangeText={setNote}
              multiline
            />

            {error && <Text style={styles.error}>{error}</Text>}

            <Pressable style={styles.button} onPress={handleSubmit} disabled={submitting}>
              {submitting ? (
                <ActivityIndicator color={Colors[colorScheme].background} />
              ) : (
                <Text style={styles.buttonText}>Submit Report</Text>
              )}
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

const createStyles = (colorScheme: 'light' | 'dark') =>
  StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors[colorScheme].background,
  },
  content: {
    padding: 20,
    gap: 12,
  },
  confirmation: {
    color: Colors[colorScheme].text,
    fontSize: 15,
    lineHeight: 21,
  },
  subject: {
    color: Colors[colorScheme].muted,
    fontSize: 13,
  },
  label: {
    color: Colors[colorScheme].text,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors[colorScheme].border,
    backgroundColor: Colors[colorScheme].card,
  },
  chipSelected: {
    backgroundColor: Colors[colorScheme].tint,
    borderColor: Colors[colorScheme].tint,
  },
  chipText: {
    color: Colors[colorScheme].text,
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: Colors[colorScheme].background,
  },
  input: {
    backgroundColor: Colors[colorScheme].card,
    borderColor: Colors[colorScheme].border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: Colors[colorScheme].text,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  error: {
    color: Colors[colorScheme].error,
    fontSize: 13,
  },
  button: {
    backgroundColor: Colors[colorScheme].tint,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: Colors[colorScheme].background,
    fontSize: 15,
    fontWeight: '700',
  },
});
