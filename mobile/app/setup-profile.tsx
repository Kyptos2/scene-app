import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';

import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/context/AuthContext';
import Colors from '@/constants/Colors';
import { EXPERIENCE_LABELS, ROLE_LABELS } from '@/constants/Labels';
import { updateMyProfile, uploadAvatar, type PickedImage } from '@/lib/api';

const ROLE_OPTIONS = Object.entries(ROLE_LABELS);
const EXPERIENCE_OPTIONS = Object.entries(EXPERIENCE_LABELS);

export default function SetupProfileScreen() {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  const { refreshProfile } = useAuth();

  const [image, setImage] = useState<PickedImage | null>(null);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [experienceLevel, setExperienceLevel] = useState('INDIE');
  const [availabilityStatus, setAvailabilityStatus] = useState('');
  const [tagline, setTagline] = useState('');
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function toggleRole(role: string) {
    setRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));
  }

  async function pickImage(source: 'camera' | 'library') {
    setError(null);
    const permissionResult =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      setError(
        source === 'camera'
          ? "Couldn't access the camera. Check your permissions."
          : "Couldn't access your photos. Check your permissions."
      );
      return;
    }

    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.6, allowsEditing: true, aspect: [1, 1] })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6, allowsEditing: true, aspect: [1, 1] });

    if (result.canceled || result.assets.length === 0) return;

    const asset = result.assets[0];
    setImage({
      uri: asset.uri,
      mimeType: asset.mimeType,
      fileName: asset.fileName,
      file: asset.file,
    });
    setPreviewUri(asset.uri);
  }

  async function useCurrentLocation() {
    setLocating(true);
    setError(null);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
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

  async function handleSubmit() {
    if (!image) {
      setError('Add a profile picture to continue.');
      return;
    }
    if (roles.length === 0) {
      setError('Select at least one role.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await uploadAvatar(image);
      await updateMyProfile({
        primaryRoles: roles,
        experienceLevel,
        availabilityStatus: availabilityStatus || null,
        tagline: tagline || null,
        bio: bio || null,
        city: city || null,
        state: state || null,
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
      });
      // Stack.Protected in app/_layout.tsx swaps to the main tabs on its own
      // once refreshProfile() updates the auth context's isProfileComplete.
      await refreshProfile();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Set up your profile</Text>
        <Text style={styles.subtitle}>
          Tell other filmmakers what you do — a photo and at least one role are required.
        </Text>

        <View style={styles.avatarSection}>
          <Pressable
            style={styles.avatarPreview}
            onPress={() => pickImage('library')}
          >
            {previewUri ? (
              <Image source={{ uri: previewUri }} style={styles.avatarImage} />
            ) : (
              <SymbolView
                name={{ ios: 'person.fill', android: 'person', web: 'person' }}
                tintColor={Colors[colorScheme].muted}
                size={36}
              />
            )}
          </Pressable>
          <View style={styles.avatarButtons}>
            <Pressable style={styles.secondaryButton} onPress={() => pickImage('library')}>
              <Text style={styles.secondaryButtonText}>Choose Photo</Text>
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={() => pickImage('camera')}>
              <Text style={styles.secondaryButtonText}>Take Photo</Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Primary roles</Text>
        <View style={styles.chipRow}>
          {ROLE_OPTIONS.map(([value, label]) => {
            const selected = roles.includes(value);
            return (
              <Pressable
                key={value}
                style={[styles.chip, selected && styles.chipSelected]}
                onPress={() => toggleRole(value)}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>Experience level</Text>
        <View style={styles.chipRow}>
          {EXPERIENCE_OPTIONS.map(([value, label]) => {
            const selected = experienceLevel === value;
            return (
              <Pressable
                key={value}
                style={[styles.chip, selected && styles.chipSelectedAlt]}
                onPress={() => setExperienceLevel(value)}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelectedAlt]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>Status (optional)</Text>
        <View style={styles.chipRow}>
          {['Available for Hire', 'On Set', 'Not Available'].map((preset) => {
            const selected = availabilityStatus === preset;
            return (
              <Pressable
                key={preset}
                style={[styles.chip, selected && styles.chipSelectedAlt]}
                onPress={() => setAvailabilityStatus(selected ? '' : preset)}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelectedAlt]}>{preset}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>Tagline</Text>
        <TextInput
          style={styles.input}
          placeholder='e.g. "Director | Seeking Sound Mixer"'
          placeholderTextColor={Colors[colorScheme].muted}
          value={tagline}
          onChangeText={setTagline}
          maxLength={160}
        />

        <Text style={styles.sectionLabel}>Bio</Text>
        <TextInput
          style={[styles.input, styles.bioInput]}
          placeholder="A sentence or two about the kind of work you do."
          placeholderTextColor={Colors[colorScheme].muted}
          value={bio}
          onChangeText={setBio}
          multiline
        />

        <Text style={styles.sectionLabel}>Location</Text>
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
          <Text style={styles.secondaryButtonText}>
            {locating ? 'Locating…' : 'Use my current location'}
          </Text>
        </Pressable>
        {coords && (
          <Text style={styles.locationHint}>
            Location set ({coords.lat.toFixed(2)}, {coords.lng.toFixed(2)})
          </Text>
        )}

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable style={styles.button} onPress={handleSubmit} disabled={submitting}>
          {submitting ? (
            <ActivityIndicator color={Colors[colorScheme].background} />
          ) : (
            <Text style={styles.buttonText}>Finish setup</Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
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
  title: {
    color: Colors[colorScheme].text,
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    color: Colors[colorScheme].muted,
    fontSize: 14,
    marginBottom: 8,
  },
  avatarSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 8,
  },
  avatarPreview: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors[colorScheme].card,
    borderWidth: 1,
    borderColor: Colors[colorScheme].border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarButtons: {
    gap: 8,
    flex: 1,
  },
  sectionLabel: {
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
  bioInput: {
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
