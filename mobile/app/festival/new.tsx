import { useState } from 'react';
import { router, Stack } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { createFestival } from '@/lib/api';

function parseDate(value: string): Date | null {
  if (!value.trim()) return null;
  const date = new Date(value.trim());
  return Number.isNaN(date.getTime()) ? null : date;
}

export default function NewFestivalScreen() {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [description, setDescription] = useState('');
  const [submissionUrl, setSubmissionUrl] = useState('');
  const [submissionDeadline, setSubmissionDeadline] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!name.trim()) {
      setError('Give the festival a name.');
      return;
    }
    const start = parseDate(startDate);
    if (!start) {
      setError('Enter a valid start date (e.g. 2026-10-14).');
      return;
    }
    const end = parseDate(endDate) ?? start;
    if (end < start) {
      setError('End date must be after the start date.');
      return;
    }
    const deadline = parseDate(submissionDeadline);

    setSubmitting(true);
    setError(null);
    try {
      await createFestival({
        name: name.trim(),
        city: city.trim() || null,
        state: state.trim() || null,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        description: description.trim() || null,
        submissionUrl: submissionUrl.trim() || null,
        submissionDeadline: deadline ? deadline.toISOString() : null,
      });
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.safeArea}>
      <Stack.Screen
        options={{
          title: 'Add a Festival',
          headerStyle: { backgroundColor: Colors[colorScheme].background },
          headerTintColor: Colors[colorScheme].text,
          headerShadowVisible: false,
        }}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.label}>Festival name</Text>
        <TextInput
          style={styles.input}
          placeholder='e.g. "Golden Gate Film Fest"'
          placeholderTextColor={Colors[colorScheme].muted}
          value={name}
          onChangeText={setName}
          maxLength={200}
        />

        <View style={styles.row}>
          <View style={styles.rowItem}>
            <Text style={styles.label}>City</Text>
            <TextInput
              style={styles.input}
              placeholder="San Francisco"
              placeholderTextColor={Colors[colorScheme].muted}
              value={city}
              onChangeText={setCity}
            />
          </View>
          <View style={styles.rowItem}>
            <Text style={styles.label}>State</Text>
            <TextInput
              style={styles.input}
              placeholder="CA"
              placeholderTextColor={Colors[colorScheme].muted}
              value={state}
              onChangeText={setState}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.rowItem}>
            <Text style={styles.label}>Start date</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={Colors[colorScheme].muted}
              value={startDate}
              onChangeText={setStartDate}
              autoCapitalize="none"
            />
          </View>
          <View style={styles.rowItem}>
            <Text style={styles.label}>End date</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={Colors[colorScheme].muted}
              value={endDate}
              onChangeText={setEndDate}
              autoCapitalize="none"
            />
          </View>
        </View>

        <Text style={styles.label}>Description (optional)</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          placeholder="What's this festival about?"
          placeholderTextColor={Colors[colorScheme].muted}
          value={description}
          onChangeText={setDescription}
          multiline
        />

        <Text style={styles.label}>Submission link (optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="https://filmfreeway.com/…"
          placeholderTextColor={Colors[colorScheme].muted}
          value={submissionUrl}
          onChangeText={setSubmissionUrl}
          autoCapitalize="none"
          keyboardType="url"
        />

        <Text style={styles.label}>Submission deadline (optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={Colors[colorScheme].muted}
          value={submissionDeadline}
          onChangeText={setSubmissionDeadline}
          autoCapitalize="none"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable style={styles.submitButton} onPress={handleSubmit} disabled={submitting}>
          {submitting ? (
            <ActivityIndicator color={Colors[colorScheme].background} />
          ) : (
            <Text style={styles.submitButtonText}>Add Festival</Text>
          )}
        </Pressable>
      </ScrollView>
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
    gap: 10,
    paddingBottom: 40,
  },
  label: {
    color: Colors[colorScheme].text,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  rowItem: {
    flex: 1,
  },
  input: {
    backgroundColor: Colors[colorScheme].card,
    borderColor: Colors[colorScheme].border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors[colorScheme].text,
    fontSize: 14,
  },
  multiline: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  error: {
    color: Colors[colorScheme].error,
    fontSize: 13,
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: Colors[colorScheme].tint,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  submitButtonText: {
    color: Colors[colorScheme].background,
    fontSize: 15,
    fontWeight: '700',
  },
});
