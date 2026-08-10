import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';

import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { ROLE_LABELS } from '@/constants/Labels';
import { createCrewCall, getMyProjects, type MyProject } from '@/lib/api';

const ROLE_OPTIONS = Object.entries(ROLE_LABELS);
const COMPENSATION_OPTIONS: { value: 'PAID' | 'DEFERRED' | 'CREDIT_COPY'; label: string }[] = [
  { value: 'PAID', label: 'Paid' },
  { value: 'DEFERRED', label: 'Deferred' },
  { value: 'CREDIT_COPY', label: 'Credit + Copy' },
];

export function PostCrewCallSheet({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  const [projects, setProjects] = useState<MyProject[] | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [roleNeeded, setRoleNeeded] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [compensationType, setCompensationType] = useState<'PAID' | 'DEFERRED' | 'CREDIT_COPY'>('PAID');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getMyProjects()
      .then((res) => setProjects(res.results))
      .catch(() => setProjects([]));
  }, []);

  async function handleSubmit() {
    if (!selectedProjectId) {
      setError('Pick which project this is for.');
      return;
    }
    if (!title.trim()) {
      setError('Give the crew call a title.');
      return;
    }
    if (!roleNeeded) {
      setError('Pick the role you need.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await createCrewCall(selectedProjectId, {
        title: title.trim(),
        roleNeeded,
        description: description.trim() || null,
        compensationType,
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Post a Crew Call</Text>

      {projects === null ? (
        <ActivityIndicator color={Colors[colorScheme].tint} />
      ) : projects.length === 0 ? (
        <>
          <Text style={styles.hint}>You need a project you own to post a crew call.</Text>
          <Pressable style={styles.newProjectButton} onPress={() => router.push('/project/new')}>
            <Text style={styles.newProjectButtonText}>+ Create a Project</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text style={styles.label}>Project</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {projects.map((p) => {
              const selected = p.id === selectedProjectId;
              return (
                <Pressable
                  key={p.id}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => setSelectedProjectId(p.id)}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]} numberOfLines={1}>
                    {p.title}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.input}
            placeholder='e.g. "Need a Gaffer for a 2-day short next weekend"'
            placeholderTextColor={Colors[colorScheme].muted}
            value={title}
            onChangeText={setTitle}
            maxLength={200}
          />

          <Text style={styles.label}>Role needed</Text>
          <View style={styles.chipRowWrap}>
            {ROLE_OPTIONS.map(([value, label]) => {
              const selected = value === roleNeeded;
              return (
                <Pressable
                  key={value}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => setRoleNeeded(value)}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.label}>Compensation</Text>
          <View style={styles.chipRowWrap}>
            {COMPENSATION_OPTIONS.map((opt) => {
              const selected = opt.value === compensationType;
              return (
                <Pressable
                  key={opt.value}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => setCompensationType(opt.value)}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{opt.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.label}>Details (optional)</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            placeholder="Dates, gear, location specifics…"
            placeholderTextColor={Colors[colorScheme].muted}
            value={description}
            onChangeText={setDescription}
            multiline
          />
        </>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.actions}>
        <Pressable style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </Pressable>
        {projects && projects.length > 0 ? (
          <Pressable style={styles.submitButton} onPress={handleSubmit} disabled={submitting}>
            {submitting ? (
              <ActivityIndicator color={Colors[colorScheme].background} />
            ) : (
              <Text style={styles.submitButtonText}>Post Crew Call</Text>
            )}
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const createStyles = (colorScheme: 'light' | 'dark') =>
  StyleSheet.create({
  container: {
    backgroundColor: Colors[colorScheme].card,
    borderColor: Colors[colorScheme].border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  title: {
    color: Colors[colorScheme].text,
    fontSize: 15,
    fontWeight: '700',
  },
  hint: {
    color: Colors[colorScheme].muted,
    fontSize: 13,
    lineHeight: 18,
  },
  newProjectButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: Colors[colorScheme].tint,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 4,
  },
  newProjectButtonText: {
    color: Colors[colorScheme].tint,
    fontSize: 13,
    fontWeight: '700',
  },
  label: {
    color: Colors[colorScheme].muted,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  chipRow: {
    gap: 8,
  },
  chipRowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: Colors[colorScheme].border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    maxWidth: 220,
  },
  chipSelected: {
    backgroundColor: Colors[colorScheme].tint,
    borderColor: Colors[colorScheme].tint,
  },
  chipText: {
    color: Colors[colorScheme].text,
    fontSize: 13,
    fontWeight: '500',
  },
  chipTextSelected: {
    color: Colors[colorScheme].background,
    fontWeight: '700',
  },
  input: {
    backgroundColor: Colors[colorScheme].background,
    borderColor: Colors[colorScheme].border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors[colorScheme].text,
    fontSize: 14,
  },
  multiline: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  error: {
    color: Colors[colorScheme].error,
    fontSize: 13,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors[colorScheme].border,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: Colors[colorScheme].text,
    fontSize: 14,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    backgroundColor: Colors[colorScheme].tint,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  submitButtonText: {
    color: Colors[colorScheme].background,
    fontSize: 14,
    fontWeight: '700',
  },
});
