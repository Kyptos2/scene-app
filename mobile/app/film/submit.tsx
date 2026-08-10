import { useEffect, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { router, Stack } from 'expo-router';
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

import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import {
  getMyProjects,
  submitToCatalog,
  uploadProjectPoster,
  type MyProject,
  type PickedImage,
} from '@/lib/api';

type LinkDraft = { label: string; url: string };

export default function SubmitFilmScreen() {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  const [projects, setProjects] = useState<MyProject[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [image, setImage] = useState<PickedImage | null>(null);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [links, setLinks] = useState<LinkDraft[]>([{ label: 'Watch', url: '' }]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getMyProjects()
      .then((res) =>
        setProjects(res.results.filter((p) => p.catalogStatus === 'NOT_SUBMITTED' || p.catalogStatus === 'REJECTED')),
      )
      .catch(() => setProjects([]));
  }, []);

  async function pickPoster() {
    setError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError("Couldn't access your photos. Check your permissions.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: true,
      aspect: [2, 3],
    });
    if (result.canceled || result.assets.length === 0) return;
    const asset = result.assets[0];
    setImage({ uri: asset.uri, mimeType: asset.mimeType, fileName: asset.fileName, file: asset.file });
    setPreviewUri(asset.uri);
  }

  function updateLink(index: number, field: keyof LinkDraft, value: string) {
    setLinks((prev) => prev.map((l, i) => (i === index ? { ...l, [field]: value } : l)));
  }

  function addLink() {
    setLinks((prev) => [...prev, { label: '', url: '' }]);
  }

  function removeLink(index: number) {
    setLinks((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    if (!selectedId) {
      setError('Pick a project to submit.');
      return;
    }
    if (!image) {
      setError('Add a poster.');
      return;
    }
    const validLinks = links.filter((l) => l.label.trim() && l.url.trim());

    setSubmitting(true);
    setError(null);
    try {
      await uploadProjectPoster(selectedId, image);
      await submitToCatalog(selectedId, validLinks);
      router.replace(`/project/${selectedId}`);
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
          title: 'Submit a Film',
          headerStyle: { backgroundColor: Colors[colorScheme].background },
          headerTintColor: Colors[colorScheme].text,
          headerShadowVisible: false,
        }}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.label}>Which project?</Text>
        {projects === null ? (
          <ActivityIndicator color={Colors[colorScheme].tint} />
        ) : projects.length === 0 ? (
          <Text style={styles.hint}>
            No eligible projects — create one from your profile first, or all of yours are already
            submitted or published.
          </Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {projects.map((p) => {
              const selected = p.id === selectedId;
              return (
                <Pressable
                  key={p.id}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => setSelectedId(p.id)}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]} numberOfLines={1}>
                    {p.title}
                    {p.catalogStatus === 'REJECTED' ? ' (resubmit)' : ''}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        <Text style={styles.label}>Poster</Text>
        <Pressable style={styles.posterPicker} onPress={pickPoster}>
          {previewUri ? (
            <Image source={{ uri: previewUri }} style={styles.posterPreview} />
          ) : (
            <Text style={styles.posterPickerText}>Choose Poster</Text>
          )}
        </Pressable>

        <Text style={styles.label}>Links (optional)</Text>
        {links.map((link, index) => (
          <View key={index} style={styles.linkRow}>
            <TextInput
              style={[styles.input, styles.linkLabelInput]}
              placeholder="Watch"
              placeholderTextColor={Colors[colorScheme].muted}
              value={link.label}
              onChangeText={(v) => updateLink(index, 'label', v)}
            />
            <TextInput
              style={[styles.input, styles.linkUrlInput]}
              placeholder="https://…"
              placeholderTextColor={Colors[colorScheme].muted}
              value={link.url}
              onChangeText={(v) => updateLink(index, 'url', v)}
              autoCapitalize="none"
              keyboardType="url"
            />
            {links.length > 1 ? (
              <Pressable onPress={() => removeLink(index)} hitSlop={8}>
                <Text style={styles.removeLink}>✕</Text>
              </Pressable>
            ) : null}
          </View>
        ))}
        <Pressable onPress={addLink} hitSlop={8}>
          <Text style={styles.addLink}>+ Add another link</Text>
        </Pressable>

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable style={styles.submitButton} onPress={handleSubmit} disabled={submitting}>
          {submitting ? (
            <ActivityIndicator color={Colors[colorScheme].background} />
          ) : (
            <Text style={styles.submitButtonText}>Submit for Review</Text>
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
  hint: {
    color: Colors[colorScheme].muted,
    fontSize: 13,
    lineHeight: 18,
  },
  chipRow: {
    gap: 8,
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors[colorScheme].border,
    backgroundColor: Colors[colorScheme].card,
    maxWidth: 200,
  },
  chipSelected: {
    backgroundColor: Colors[colorScheme].tint,
    borderColor: Colors[colorScheme].tint,
  },
  chipText: {
    color: Colors[colorScheme].text,
    fontSize: 14,
    fontWeight: '500',
  },
  chipTextSelected: {
    color: Colors[colorScheme].background,
    fontWeight: '700',
  },
  posterPicker: {
    width: 140,
    height: 210,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors[colorScheme].border,
    backgroundColor: Colors[colorScheme].card,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  posterPreview: {
    width: '100%',
    height: '100%',
  },
  posterPickerText: {
    color: Colors[colorScheme].tint,
    fontSize: 13,
    fontWeight: '700',
  },
  linkRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
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
  linkLabelInput: {
    flex: 0.35,
  },
  linkUrlInput: {
    flex: 0.65,
  },
  removeLink: {
    color: Colors[colorScheme].muted,
    fontSize: 16,
    paddingHorizontal: 4,
  },
  addLink: {
    color: Colors[colorScheme].tint,
    fontSize: 13,
    fontWeight: '700',
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
