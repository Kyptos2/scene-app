import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import {
  createFeedPost,
  getMyProjects,
  uploadFeedPostImage,
  type FeedPostKind,
  type MyProject,
  type PickedImage,
} from '@/lib/api';

const KIND_OPTIONS: { value: FeedPostKind; label: string }[] = [
  { value: 'wrap', label: 'Wrapped Production' },
  { value: 'poster_reveal', label: 'Poster Reveal' },
  { value: 'production_launch', label: 'Now in Production' },
  { value: 'award', label: 'Award Win' },
  { value: 'project_launch', label: 'Project Launch (Trailer/Teaser)' },
];

export function PostUpdateSheet({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  const [kind, setKind] = useState<FeedPostKind>('wrap');
  const [projects, setProjects] = useState<MyProject[] | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [headline, setHeadline] = useState('');
  const [detail, setDetail] = useState('');
  const [seekingFeedback, setSeekingFeedback] = useState(false);
  const [seekingFestivalPartner, setSeekingFestivalPartner] = useState(false);
  const [image, setImage] = useState<PickedImage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getMyProjects()
      .then((res) => setProjects(res.results))
      .catch(() => setProjects([]));
  }, []);

  const isLaunch = kind === 'project_launch';

  async function handlePickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError("Couldn't access your photos. Check your permissions.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: true,
      aspect: [4, 5],
    });
    if (result.canceled || result.assets.length === 0) return;
    const asset = result.assets[0];
    setImage({ uri: asset.uri, mimeType: asset.mimeType, fileName: asset.fileName, file: asset.file });
  }

  async function handleSubmit() {
    if (!headline.trim()) {
      setError(isLaunch ? 'Give your project a title.' : 'Give your update a headline.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const post = await createFeedPost({
        kind,
        headline: headline.trim(),
        body: isLaunch ? null : detail.trim() || null,
        logline: isLaunch ? detail.trim() || null : null,
        projectId: selectedProjectId,
        seekingFeedback: isLaunch ? seekingFeedback : false,
        seekingFestivalPartner: isLaunch ? seekingFestivalPartner : false,
      });
      if (image) {
        await uploadFeedPostImage(post.id, image);
      }
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Share an Update</Text>

      <Text style={styles.label}>Type</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {KIND_OPTIONS.map((opt) => {
          const selected = opt.value === kind;
          return (
            <Pressable key={opt.value} style={[styles.chip, selected && styles.chipSelected]} onPress={() => setKind(opt.value)}>
              <Text style={[styles.chipText, selected && styles.chipTextSelected]} numberOfLines={1}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {projects && projects.length > 0 ? (
        <>
          <Text style={styles.label}>Project (optional)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {projects.map((p) => {
              const selected = p.id === selectedProjectId;
              return (
                <Pressable
                  key={p.id}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => setSelectedProjectId(selected ? null : p.id)}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]} numberOfLines={1}>
                    {p.title}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </>
      ) : null}

      <Text style={styles.label}>Photo (optional)</Text>
      {image ? (
        <View style={styles.imagePreviewWrap}>
          <Image source={{ uri: image.uri }} style={styles.imagePreview} />
          <Pressable style={styles.imageRemove} onPress={() => setImage(null)} hitSlop={8}>
            <Text style={styles.imageRemoveText}>Remove</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable style={styles.imagePicker} onPress={handlePickImage}>
          <Text style={styles.imagePickerText}>+ Add a photo</Text>
        </Pressable>
      )}

      <Text style={styles.label}>{isLaunch ? 'Project title' : 'Headline'}</Text>
      <TextInput
        style={styles.input}
        placeholder={isLaunch ? 'e.g. "Solaris Short"' : 'e.g. "Just wrapped principal photography!"'}
        placeholderTextColor={Colors[colorScheme].muted}
        value={headline}
        onChangeText={setHeadline}
        maxLength={200}
      />

      <Text style={styles.label}>{isLaunch ? 'Logline' : 'Details (optional)'}</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        placeholder={isLaunch ? 'A one-line pitch for the film…' : 'Say a bit more…'}
        placeholderTextColor={Colors[colorScheme].muted}
        value={detail}
        onChangeText={setDetail}
        multiline
      />

      {isLaunch ? (
        <>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Seeking feedback</Text>
            <Switch value={seekingFeedback} onValueChange={setSeekingFeedback} />
          </View>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Seeking a festival partner</Text>
            <Switch value={seekingFestivalPartner} onValueChange={setSeekingFestivalPartner} />
          </View>
        </>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.actions}>
        <Pressable style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </Pressable>
        <Pressable style={styles.submitButton} onPress={handleSubmit} disabled={submitting}>
          {submitting ? <ActivityIndicator color={Colors[colorScheme].background} /> : <Text style={styles.submitButtonText}>Post</Text>}
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
  chipRow: {
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
  imagePicker: {
    borderWidth: 1,
    borderColor: Colors[colorScheme].border,
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 18,
    alignItems: 'center',
  },
  imagePickerText: {
    color: Colors[colorScheme].secondary,
    fontSize: 13,
    fontWeight: '700',
  },
  imagePreviewWrap: {
    position: 'relative',
    borderRadius: 10,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    aspectRatio: 4 / 5,
    borderRadius: 10,
    backgroundColor: Colors[colorScheme].background,
  },
  imageRemove: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  imageRemoveText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  toggleLabel: {
    color: Colors[colorScheme].text,
    fontSize: 13,
    fontWeight: '600',
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
