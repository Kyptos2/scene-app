import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { createPoll } from '@/lib/api';

const DURATION_OPTIONS: { label: string; hours: number }[] = [
  { label: '24 hours', hours: 24 },
  { label: '3 days', hours: 24 * 3 },
  { label: '7 days', hours: 24 * 7 },
  { label: '14 days', hours: 24 * 14 },
];

const MAX_OPTIONS = 6;
const MIN_OPTIONS = 2;

export function PostPollSheet({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [durationHours, setDurationHours] = useState(DURATION_OPTIONS[1].hours);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function updateOption(index: number, value: string) {
    setOptions((prev) => prev.map((opt, i) => (i === index ? value : opt)));
  }

  function addOption() {
    if (options.length >= MAX_OPTIONS) return;
    setOptions((prev) => [...prev, '']);
  }

  function removeOption(index: number) {
    if (options.length <= MIN_OPTIONS) return;
    setOptions((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    const trimmedQuestion = question.trim();
    const trimmedOptions = options.map((o) => o.trim()).filter(Boolean);
    if (!trimmedQuestion) {
      setError('Ask a question.');
      return;
    }
    if (trimmedOptions.length < MIN_OPTIONS) {
      setError('Add at least 2 options.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await createPoll({ question: trimmedQuestion, options: trimmedOptions, durationHours });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create a Poll</Text>

      <Text style={styles.label}>Question</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Which lens for a rainy night shoot?"
        placeholderTextColor={Colors[colorScheme].muted}
        value={question}
        onChangeText={setQuestion}
        maxLength={280}
        multiline
      />

      <Text style={styles.label}>Options</Text>
      {options.map((opt, index) => (
        <View key={index} style={styles.optionRow}>
          <TextInput
            style={[styles.input, styles.optionInput]}
            placeholder={`Option ${index + 1}`}
            placeholderTextColor={Colors[colorScheme].muted}
            value={opt}
            onChangeText={(v) => updateOption(index, v)}
            maxLength={80}
          />
          {options.length > MIN_OPTIONS ? (
            <Pressable style={styles.removeOption} onPress={() => removeOption(index)} hitSlop={8}>
              <Text style={styles.removeOptionText}>✕</Text>
            </Pressable>
          ) : null}
        </View>
      ))}
      {options.length < MAX_OPTIONS ? (
        <Pressable style={styles.addOption} onPress={addOption}>
          <Text style={styles.addOptionText}>+ Add option</Text>
        </Pressable>
      ) : null}

      <Text style={styles.label}>Open for</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {DURATION_OPTIONS.map((opt) => {
          const selected = opt.hours === durationHours;
          return (
            <Pressable
              key={opt.hours}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => setDurationHours(opt.hours)}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{opt.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.actions}>
        <Pressable style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </Pressable>
        <Pressable style={styles.submitButton} onPress={handleSubmit} disabled={submitting}>
          {submitting ? <ActivityIndicator color={Colors[colorScheme].background} /> : <Text style={styles.submitButtonText}>Post Poll</Text>}
        </Pressable>
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
  label: {
    color: Colors[colorScheme].muted,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
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
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  optionInput: {
    flex: 1,
  },
  removeOption: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors[colorScheme].background,
  },
  removeOptionText: {
    color: Colors[colorScheme].muted,
    fontSize: 13,
    fontWeight: '700',
  },
  addOption: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  addOptionText: {
    color: Colors[colorScheme].secondary,
    fontSize: 13,
    fontWeight: '700',
  },
  chipRow: {
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: Colors[colorScheme].border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipSelected: {
    backgroundColor: Colors[colorScheme].secondary,
    borderColor: Colors[colorScheme].secondary,
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
    backgroundColor: Colors[colorScheme].secondary,
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
