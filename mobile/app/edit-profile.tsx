import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { router, Stack } from 'expo-router';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';

import { AnimatedPressable } from '@/components/AnimatedPressable';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/context/AuthContext';
import Colors from '@/constants/Colors';
import { EXPERIENCE_LABELS, ROLE_LABELS } from '@/constants/Labels';
import { Radius, Space } from '@/constants/Spacing';
import { Type } from '@/constants/Typography';
import { resolveAvatarUrl, updateMyProfile, uploadAvatar, uploadCoverPhoto, type PickedImage } from '@/lib/api';

const ROLE_OPTIONS = Object.entries(ROLE_LABELS);
const EXPERIENCE_OPTIONS = Object.entries(EXPERIENCE_LABELS);

export default function EditProfileScreen() {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  const { user, refreshProfile } = useAuth();

  const [image, setImage] = useState<PickedImage | null>(null);
  const [previewUri, setPreviewUri] = useState<string | null>(resolveAvatarUrl(user?.avatarUrl ?? null));
  const [coverImage, setCoverImage] = useState<PickedImage | null>(null);
  const [coverPreviewUri, setCoverPreviewUri] = useState<string | null>(
    resolveAvatarUrl(user?.coverImageUrl ?? null),
  );
  const [roles, setRoles] = useState<string[]>(user?.primaryRoles ?? []);
  const [experienceLevel, setExperienceLevel] = useState(user?.experienceLevel ?? 'INDIE');
  const [tagline, setTagline] = useState(user?.tagline ?? '');
  const [availabilityStatus, setAvailabilityStatus] = useState(user?.availabilityStatus ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [city, setCity] = useState(user?.city ?? '');
  const [state, setState] = useState(user?.state ?? '');
  // Only non-null once the user explicitly re-locates this session — omitted
  // from the save payload otherwise so existing coordinates are never wiped
  // just because someone edited their bio.
  const [newCoords, setNewCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!user) return null;

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

  async function pickCoverImage(source: 'camera' | 'library') {
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
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7, allowsEditing: true, aspect: [16, 9] })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, allowsEditing: true, aspect: [16, 9] });

    if (result.canceled || result.assets.length === 0) return;

    const asset = result.assets[0];
    setCoverImage({
      uri: asset.uri,
      mimeType: asset.mimeType,
      fileName: asset.fileName,
      file: asset.file,
    });
    setCoverPreviewUri(asset.uri);
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
      setNewCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
    } catch {
      setError("Couldn't get your location. You can still enter city/state manually.");
    } finally {
      setLocating(false);
    }
  }

  async function handleSave() {
    if (roles.length === 0) {
      setError('Keep at least one role selected.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      if (image) {
        await uploadAvatar(image);
      }
      if (coverImage) {
        await uploadCoverPhoto(coverImage);
      }
      await updateMyProfile({
        primaryRoles: roles,
        experienceLevel,
        tagline: tagline.trim() || null,
        availabilityStatus: availabilityStatus.trim() || null,
        bio: bio.trim() || null,
        city: city.trim() || null,
        state: state.trim() || null,
        ...(newCoords ? { latitude: newCoords.lat, longitude: newCoords.lng } : {}),
      });
      await refreshProfile();
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Stack.Screen
        options={{
          title: 'Edit Profile',
          headerStyle: { backgroundColor: Colors[colorScheme].background },
          headerTintColor: Colors[colorScheme].text,
          headerShadowVisible: false,
          headerRight: () =>
            submitting ? (
              <ActivityIndicator color={Colors[colorScheme].tint} />
            ) : (
              <AnimatedPressable haptic="medium" onPress={handleSave} hitSlop={12}>
                <Text style={styles.headerSave}>Save</Text>
              </AnimatedPressable>
            ),
        }}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionLabel}>Cover photo</Text>
        <AnimatedPressable style={styles.coverPreview} haptic="light" onPress={() => pickCoverImage('library')}>
          {coverPreviewUri ? (
            <Image source={{ uri: coverPreviewUri }} style={styles.coverImage} />
          ) : (
            <SymbolView
              name={{ ios: 'photo', android: 'image', web: 'image' }}
              tintColor={Colors[colorScheme].muted}
              size={28}
            />
          )}
        </AnimatedPressable>
        <View style={styles.coverButtons}>
          <AnimatedPressable style={styles.secondaryButton} haptic="light" onPress={() => pickCoverImage('library')}>
            <Text style={styles.secondaryButtonText}>Choose Photo</Text>
          </AnimatedPressable>
          <AnimatedPressable style={styles.secondaryButton} haptic="light" onPress={() => pickCoverImage('camera')}>
            <Text style={styles.secondaryButtonText}>Take Photo</Text>
          </AnimatedPressable>
        </View>

        <View style={styles.avatarSection}>
          <AnimatedPressable style={styles.avatarPreview} haptic="light" onPress={() => pickImage('library')}>
            {previewUri ? (
              <Image source={{ uri: previewUri }} style={styles.avatarImage} />
            ) : (
              <SymbolView
                name={{ ios: 'person.fill', android: 'person', web: 'person' }}
                tintColor={Colors[colorScheme].muted}
                size={36}
              />
            )}
          </AnimatedPressable>
          <View style={styles.avatarButtons}>
            <AnimatedPressable style={styles.secondaryButton} haptic="light" onPress={() => pickImage('library')}>
              <Text style={styles.secondaryButtonText}>Choose Photo</Text>
            </AnimatedPressable>
            <AnimatedPressable style={styles.secondaryButton} haptic="light" onPress={() => pickImage('camera')}>
              <Text style={styles.secondaryButtonText}>Take Photo</Text>
            </AnimatedPressable>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Primary roles</Text>
        <View style={styles.chipRow}>
          {ROLE_OPTIONS.map(([value, label]) => {
            const selected = roles.includes(value);
            return (
              <AnimatedPressable
                key={value}
                style={[styles.chip, selected && styles.chipSelected]}
                haptic="selection"
                onPress={() => toggleRole(value)}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
              </AnimatedPressable>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>Experience level</Text>
        <View style={styles.chipRow}>
          {EXPERIENCE_OPTIONS.map(([value, label]) => {
            const selected = experienceLevel === value;
            return (
              <AnimatedPressable
                key={value}
                style={[styles.chip, selected && styles.chipSelectedAlt]}
                haptic="selection"
                onPress={() => setExperienceLevel(value)}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelectedAlt]}>{label}</Text>
              </AnimatedPressable>
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

        <Text style={styles.sectionLabel}>Status</Text>
        <View style={styles.chipRow}>
          {['Available for Hire', 'On Set', 'Not Available'].map((preset) => {
            const selected = availabilityStatus === preset;
            return (
              <AnimatedPressable
                key={preset}
                style={[styles.chip, selected && styles.chipSelectedAlt]}
                haptic="selection"
                onPress={() => setAvailabilityStatus(selected ? '' : preset)}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelectedAlt]}>{preset}</Text>
              </AnimatedPressable>
            );
          })}
        </View>
        <TextInput
          style={styles.input}
          placeholder='Or write your own — e.g. "On Set until Oct 15"'
          placeholderTextColor={Colors[colorScheme].muted}
          value={availabilityStatus}
          onChangeText={setAvailabilityStatus}
          maxLength={40}
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
        <AnimatedPressable style={styles.secondaryButton} haptic="light" onPress={useCurrentLocation} disabled={locating}>
          <Text style={styles.secondaryButtonText}>{locating ? 'Locating…' : 'Update my coordinates'}</Text>
        </AnimatedPressable>
        {newCoords && (
          <Text style={styles.locationHint}>
            New coordinates set ({newCoords.lat.toFixed(2)}, {newCoords.lng.toFixed(2)})
          </Text>
        )}

        {error && <Text style={styles.error}>{error}</Text>}

        <AnimatedPressable style={styles.button} haptic="medium" onPress={handleSave} disabled={submitting}>
          {submitting ? <ActivityIndicator color={Colors[colorScheme].background} /> : <Text style={styles.buttonText}>Save changes</Text>}
        </AnimatedPressable>
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
    padding: Space.xl,
    gap: Space.sm + 2,
    paddingBottom: Space.huge,
  },
  headerSave: {
    color: Colors[colorScheme].tint,
    ...Type.subtitle,
    fontWeight: '700',
  },
  avatarSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.lg,
    marginBottom: Space.sm,
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
    gap: Space.sm,
    flex: 1,
  },
  coverPreview: {
    width: '100%',
    height: 120,
    borderRadius: Radius.lg,
    backgroundColor: Colors[colorScheme].card,
    borderWidth: 1,
    borderColor: Colors[colorScheme].border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverButtons: {
    flexDirection: 'row',
    gap: Space.sm,
    marginTop: Space.sm,
    marginBottom: Space.sm,
  },
  sectionLabel: {
    color: Colors[colorScheme].text,
    ...Type.bodyLarge,
    fontWeight: '600',
    marginTop: Space.md,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Space.sm,
  },
  chip: {
    borderRadius: Radius.pill,
    paddingHorizontal: Space.md + 2,
    paddingVertical: Space.sm,
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
    ...Type.bodyLarge,
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
    borderRadius: Radius.md,
    paddingHorizontal: Space.md + 2,
    paddingVertical: Space.md,
    color: Colors[colorScheme].text,
    ...Type.subtitle,
  },
  bioInput: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: Space.sm + 2,
  },
  rowInput: {
    flex: 1,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: Colors[colorScheme].border,
    borderRadius: Radius.sm,
    paddingVertical: Space.sm + 1,
    paddingHorizontal: Space.md,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: Colors[colorScheme].text,
    ...Type.body,
    fontWeight: '600',
  },
  locationHint: {
    color: Colors[colorScheme].muted,
    ...Type.small,
  },
  error: {
    color: Colors[colorScheme].error,
    ...Type.body,
    marginTop: Space.xs,
  },
  button: {
    backgroundColor: Colors[colorScheme].tint,
    borderRadius: Radius.md,
    paddingVertical: Space.md + 2,
    alignItems: 'center',
    marginTop: Space.lg,
  },
  buttonText: {
    color: Colors[colorScheme].background,
    ...Type.subtitle,
    fontWeight: '700',
  },
});
