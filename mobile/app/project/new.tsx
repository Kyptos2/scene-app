import { useState } from 'react';
import * as Location from 'expo-location';
import { router, Stack } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { PROJECT_STATUS_LABELS, ROLE_LABELS } from '@/constants/Labels';
import { createProject } from '@/lib/api';

const STATUS_OPTIONS = Object.entries(PROJECT_STATUS_LABELS);
const ROLE_OPTIONS = Object.entries(ROLE_LABELS);

export default function NewProjectScreen() {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState('');
  const [status, setStatus] = useState('PRE_PRODUCTION');
  const [releaseYear, setReleaseYear] = useState('');
  const [logline, setLogline] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [ownerRole, setOwnerRole] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function useCurrentLocation() {
    setLocating(true);
    setError(null);
    const { status: permStatus } = await Location.requestForegroundPermissionsAsync();
    if (permStatus !== 'granted') {
      setError("Couldn't get your location. You can still enter city/state manually.");
      setLocating(false);
      return;
    }
    try {
      const position = await Location.getCurrentPositionAsync({});
      setCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
    } catch {
      setError("Couldn't get your location. You can still enter city/state manually.");
    } finally {
      setLocating(false);
    }
  }

  async function handleCreate() {
    if (!title.trim()) {
      setError('Give the project a title.');
      return;
    }
    const year = releaseYear.trim() ? Number(releaseYear.trim()) : null;
    if (releaseYear.trim() && (!Number.isInteger(year) || (year as number) < 1888)) {
      setError('Release year looks off.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const project = await createProject({
        title: title.trim(),
        genre: genre.trim() || null,
        status,
        releaseYear: year,
        logline: logline.trim() || null,
        city: city.trim() || null,
        state: state.trim() || null,
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
        ownerRole,
      });
      router.replace(`/project/${project.id}`);
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
          title: 'New Project',
          headerStyle: { backgroundColor: Colors[colorScheme].background },
          headerTintColor: Colors[colorScheme].text,
          headerShadowVisible: false,
        }}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.label}>Title</Text>
        <TextInput
          style={styles.input}
          placeholder='e.g. "Solaris Short"'
          placeholderTextColor={Colors[colorScheme].muted}
          value={title}
          onChangeText={setTitle}
          maxLength={200}
        />

        <Text style={styles.label}>Genre</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Thriller"
          placeholderTextColor={Colors[colorScheme].muted}
          value={genre}
          onChangeText={setGenre}
        />

        <Text style={styles.label}>Status</Text>
        <View style={styles.chipRow}>
          {STATUS_OPTIONS.map(([value, label]) => {
            const selected = value === status;
            return (
              <Pressable key={value} style={[styles.chip, selected && styles.chipSelected]} onPress={() => setStatus(value)}>
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>Release year (optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="2026"
          placeholderTextColor={Colors[colorScheme].muted}
          value={releaseYear}
          onChangeText={setReleaseYear}
          keyboardType="number-pad"
          maxLength={4}
        />

        <Text style={styles.label}>Logline</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          placeholder="A one-line pitch for the film…"
          placeholderTextColor={Colors[colorScheme].muted}
          value={logline}
          onChangeText={setLogline}
          multiline
        />

        <Text style={styles.label}>Your role on this project (optional)</Text>
        <View style={styles.chipRow}>
          {ROLE_OPTIONS.map(([value, label]) => {
            const selected = value === ownerRole;
            return (
              <Pressable
                key={value}
                style={[styles.chip, selected && styles.chipSelectedAlt]}
                onPress={() => setOwnerRole(selected ? null : value)}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelectedAlt]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>Location</Text>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.rowInput]}
            placeholder="City"
            placeholderTextColor={Colors[colorScheme].muted}
            value={city}
            onChangeText={setCity}
          />
          <TextInput
            style={[styles.input, styles.rowInput]}
            placeholder="State"
            placeholderTextColor={Colors[colorScheme].muted}
            value={state}
            onChangeText={setState}
          />
        </View>
        <Pressable style={styles.secondaryButton} onPress={useCurrentLocation} disabled={locating}>
          <Text style={styles.secondaryButtonText}>{locating ? 'Locating…' : 'Use my current location'}</Text>
        </Pressable>
        {coords && (
          <Text style={styles.locationHint}>
            Location set ({coords.lat.toFixed(2)}, {coords.lng.toFixed(2)})
          </Text>
        )}

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable style={styles.button} onPress={handleCreate} disabled={submitting}>
          {submitting ? <ActivityIndicator color={Colors[colorScheme].background} /> : <Text style={styles.buttonText}>Create Project</Text>}
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
    backgroundColor: Colors[colorScheme].text,
    borderColor: Colors[colorScheme].text,
  },
  chipSelectedAlt: {
    backgroundColor: 'rgba(184, 58, 45, 0.16)',
    borderColor: Colors[colorScheme].tint,
  },
  chipText: {
    color: Colors[colorScheme].text,
    fontSize: 14,
    fontWeight: '500',
  },
  chipTextSelected: {
    color: Colors[colorScheme].background,
  },
  chipTextSelectedAlt: {
    color: Colors[colorScheme].tint,
    fontWeight: '700',
  },
  input: {
    backgroundColor: Colors[colorScheme].card,
    borderColor: Colors[colorScheme].border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: Colors[colorScheme].text,
    fontSize: 15,
  },
  multiline: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  rowInput: {
    flex: 1,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: Colors[colorScheme].border,
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: Colors[colorScheme].text,
    fontSize: 13,
    fontWeight: '600',
  },
  locationHint: {
    color: Colors[colorScheme].muted,
    fontSize: 12,
  },
  error: {
    color: Colors[colorScheme].error,
    fontSize: 13,
    marginTop: 4,
  },
  button: {
    backgroundColor: Colors[colorScheme].tint,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: {
    color: Colors[colorScheme].background,
    fontSize: 15,
    fontWeight: '700',
  },
});
