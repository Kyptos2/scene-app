import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Linking, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router, Stack, useLocalSearchParams } from 'expo-router';

import { AnimatedPressable } from '@/components/AnimatedPressable';
import { CommentThread } from '@/components/home/CommentThread';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { RoleBadge } from '@/components/RoleBadge';
import { StarRating, StarRatingInput } from '@/components/home/StarRating';
import { FeedSkeletonList } from '@/components/SkeletonLoader';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { COMPENSATION_LABELS, PROJECT_STATUS_LABELS, ROLE_LABELS } from '@/constants/Labels';
import { Radius, Space } from '@/constants/Spacing';
import { Type } from '@/constants/Typography';
import { useAuth } from '@/context/AuthContext';
import {
  createProjectWorkspace,
  deleteProject,
  deleteReview,
  getFilmReviews,
  getProjectDetail,
  resolveAvatarUrl,
  submitReview,
  updateProjectGuide,
  uploadProjectPoster,
  type FilmReview,
  type ProjectDetail,
} from '@/lib/api';
import { swatchFor } from '@/lib/posterSwatch';
import { shareProject } from '@/lib/shareLinks';

const CATALOG_LABELS: Record<ProjectDetail['catalogStatus'], string> = {
  NOT_SUBMITTED: '',
  PENDING: 'Pending Review',
  PUBLISHED: 'In Catalog',
  REJECTED: 'Not Approved',
};

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ProjectDetailScreen() {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creatingWorkspace, setCreatingWorkspace] = useState(false);
  const [reviews, setReviews] = useState<FilmReview[] | null>(null);
  const [writingReview, setWritingReview] = useState(false);
  const [reviewRating, setReviewRating] = useState(0); // half-star units: 1 = 0.5★ … 10 = 5.0★
  const [reviewBody, setReviewBody] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [confirmingDeleteProject, setConfirmingDeleteProject] = useState(false);
  const [deletingProject, setDeletingProject] = useState(false);
  const [confirmingDeleteReview, setConfirmingDeleteReview] = useState(false);
  const [deletingReview, setDeletingReview] = useState(false);
  const [editingGuide, setEditingGuide] = useState(false);
  const [guideDraft, setGuideDraft] = useState('');
  const [savingGuide, setSavingGuide] = useState(false);
  const [uploadingPoster, setUploadingPoster] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getProjectDetail(id)
      .then((data) => {
        if (!cancelled) setProject(data);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load this project. Is the dev server running?");
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (project?.catalogStatus !== 'PUBLISHED') return;
    let cancelled = false;
    getFilmReviews(project.id)
      .then((data) => {
        if (!cancelled) setReviews(data);
      })
      .catch(() => {
        if (!cancelled) setReviews([]);
      });
    return () => {
      cancelled = true;
    };
  }, [project?.id, project?.catalogStatus]);

  async function handleSubmitReview() {
    if (!project || reviewRating === 0) return;
    setSubmittingReview(true);
    try {
      const review = await submitReview(project.id, reviewRating, reviewBody.trim() || null);
      setReviews((prev) => {
        const withoutMine = (prev ?? []).filter((r) => r.user.id !== review.user.id);
        return [review, ...withoutMine];
      });
      setWritingReview(false);
      setReviewRating(0);
      setReviewBody('');
    } catch {
      setError("Couldn't post your review.");
    } finally {
      setSubmittingReview(false);
    }
  }

  async function handleSaveGuide() {
    if (!project) return;
    setSavingGuide(true);
    try {
      const trimmed = guideDraft.trim();
      const result = await updateProjectGuide(project.id, trimmed || null);
      setProject((prev) => (prev ? { ...prev, productionGuide: result.productionGuide } : prev));
      setEditingGuide(false);
    } catch {
      setError("Couldn't save your guide.");
    } finally {
      setSavingGuide(false);
    }
  }

  async function handleChangePoster() {
    if (!project) return;
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
    setUploadingPoster(true);
    try {
      const { posterUrl } = await uploadProjectPoster(project.id, {
        uri: asset.uri,
        mimeType: asset.mimeType,
        fileName: asset.fileName,
        file: asset.file,
      });
      setProject((prev) => (prev ? { ...prev, posterUrl } : prev));
    } catch {
      setError("Couldn't upload that poster. Try a different photo.");
    } finally {
      setUploadingPoster(false);
    }
  }

  async function handleDeleteProject() {
    if (!project) return;
    setConfirmingDeleteProject(false);
    setDeletingProject(true);
    try {
      await deleteProject(project.id);
      router.replace(`/profile/${project.ownerId}`);
    } catch {
      setError("Couldn't delete this project.");
      setDeletingProject(false);
    }
  }

  async function handleDeleteReview() {
    if (!project) return;
    setConfirmingDeleteReview(false);
    setDeletingReview(true);
    try {
      await deleteReview(project.id);
      setReviews((prev) => (prev ?? []).filter((r) => r.user.id !== user?.id));
    } catch {
      setError("Couldn't delete your review.");
    } finally {
      setDeletingReview(false);
    }
  }

  const isOwner = !!project && !!user && project.ownerId === user.id;
  const isVerifiedCrew =
    !!project && !!user && project.credits.some((c) => c.user.id === user.id && c.isVerified);
  const canSeeWorkspace = isOwner || isVerifiedCrew;
  const hasWorkspace = !!project && project.workspaces.length > 0;

  async function handleWorkspacePress() {
    if (!project) return;
    if (hasWorkspace) {
      router.push(`/workspace/${project.workspaces[0].id}`);
      return;
    }
    setCreatingWorkspace(true);
    try {
      const workspace = await createProjectWorkspace(project.id);
      router.push(`/workspace/${workspace.id}`);
    } catch {
      setError('Something went wrong creating the workspace.');
    } finally {
      setCreatingWorkspace(false);
    }
  }

  return (
    <View style={styles.safeArea}>
      <Stack.Screen
        options={{
          title: 'Project',
          headerStyle: { backgroundColor: Colors[colorScheme].background },
          headerTintColor: Colors[colorScheme].text,
          headerShadowVisible: false,
        }}
      />

      {error ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>{error}</Text>
        </View>
      ) : !project ? (
        <View style={styles.safeArea}>
          <FeedSkeletonList count={2} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.posterWrap}>
            {project.posterUrl ? (
              <Image source={{ uri: resolveAvatarUrl(project.posterUrl) ?? undefined }} style={styles.posterImage} />
            ) : (
              <View style={[styles.poster, { backgroundColor: swatchFor(project.id) }]}>
                <Text style={styles.posterTitle} numberOfLines={4}>
                  {project.title}
                </Text>
              </View>
            )}

            {isOwner ? (
              <AnimatedPressable
                style={styles.posterEditButton}
                haptic="light"
                onPress={handleChangePoster}
                disabled={uploadingPoster}
              >
                {uploadingPoster ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.posterEditButtonText}>
                    {project.posterUrl ? 'Change Poster' : '+ Add Poster'}
                  </Text>
                )}
              </AnimatedPressable>
            ) : null}
          </View>

          <View style={styles.statusRow}>
            <View style={styles.statusChip}>
              <Text style={styles.statusChipText}>{PROJECT_STATUS_LABELS[project.status] ?? project.status}</Text>
            </View>
            {project.catalogStatus !== 'NOT_SUBMITTED' ? (
              <View
                style={[
                  styles.catalogChip,
                  project.catalogStatus === 'PUBLISHED' && styles.catalogChipPublished,
                  project.catalogStatus === 'REJECTED' && styles.catalogChipRejected,
                ]}
              >
                <Text style={styles.catalogChipText}>{CATALOG_LABELS[project.catalogStatus]}</Text>
              </View>
            ) : null}
            {project.genre ? <Text style={styles.meta}>{project.genre}</Text> : null}
            {project.releaseYear ? <Text style={styles.meta}>{project.releaseYear}</Text> : null}
          </View>

          {isOwner && project.catalogStatus === 'REJECTED' && project.rejectionNote ? (
            <Text style={styles.rejectionNote}>Not approved: {project.rejectionNote}</Text>
          ) : null}

          {isOwner && (project.catalogStatus === 'NOT_SUBMITTED' || project.catalogStatus === 'REJECTED') ? (
            <AnimatedPressable style={styles.catalogSubmitButton} haptic="medium" onPress={() => router.push('/film/submit')}>
              <Text style={styles.catalogSubmitButtonText}>
                {project.catalogStatus === 'REJECTED' ? 'Resubmit to Catalog' : '+ Submit to Indie Catalog'}
              </Text>
            </AnimatedPressable>
          ) : null}

          {project.logline ? <Text style={styles.logline}>{project.logline}</Text> : null}

          {project.links.length > 0 ? (
            <View style={styles.linkRow}>
              {project.links.map((l) => (
                <AnimatedPressable key={l.id} style={styles.linkChip} onPress={() => Linking.openURL(l.url)}>
                  <Text style={styles.linkChipText}>
                    {l.label}
                    {l.urlReachable === false ? ' · may be broken' : ''}
                  </Text>
                </AnimatedPressable>
              ))}
            </View>
          ) : null}

          <View style={styles.ownerRowWrap}>
            <AnimatedPressable style={styles.ownerRow} onPress={() => router.push(`/profile/${project.owner.id}`)}>
              {project.owner.avatarUrl ? (
                <Image source={{ uri: resolveAvatarUrl(project.owner.avatarUrl) ?? undefined }} style={styles.ownerAvatar} />
              ) : (
                <View style={[styles.ownerAvatar, styles.ownerAvatarFallback]}>
                  <Text style={styles.ownerAvatarInitial}>{project.owner.name.charAt(0)}</Text>
                </View>
              )}
              <View>
                <Text style={styles.ownerName}>{project.owner.name}</Text>
                <Text style={styles.ownerHandle}>@{project.owner.username}</Text>
              </View>
            </AnimatedPressable>
            <View style={styles.ownerActions}>
              <AnimatedPressable onPress={() => shareProject({ id: project.id, title: project.title })} hitSlop={8}>
                <Text style={styles.reportLink}>Share</Text>
              </AnimatedPressable>
              {!isOwner ? (
                <AnimatedPressable
                  onPress={() =>
                    router.push({
                      pathname: '/report',
                      params: { targetType: 'PROJECT', targetId: project.id, label: project.title },
                    })
                  }
                  hitSlop={8}
                >
                  <Text style={styles.reportLink}>Report</Text>
                </AnimatedPressable>
              ) : (
                <AnimatedPressable onPress={() => setConfirmingDeleteProject(true)} hitSlop={8}>
                  <Text style={styles.deleteLink}>Delete Project</Text>
                </AnimatedPressable>
              )}
            </View>
          </View>

          {canSeeWorkspace ? (
            <AnimatedPressable style={styles.workspaceButton} haptic="medium" onPress={handleWorkspacePress} disabled={creatingWorkspace}>
              {creatingWorkspace ? (
                <ActivityIndicator color={Colors[colorScheme].background} size="small" />
              ) : (
                <Text style={styles.workspaceButtonText}>
                  {hasWorkspace ? 'Open Team Workspace' : '+ Create Team Workspace'}
                </Text>
              )}
            </AnimatedPressable>
          ) : null}

          {(() => {
            const visibleRequests = isOwner
              ? project.productionRequests
              : project.productionRequests.filter((pr) => !pr.isFilled);
            if (visibleRequests.length === 0) return null;
            return (
              <>
                <Text style={styles.sectionTitle}>Crew Needed</Text>
                {visibleRequests.map((pr) => {
                  const content = (
                    <>
                      <View style={styles.crewRowHeader}>
                        <Text style={styles.rowTitle}>{ROLE_LABELS[pr.roleNeeded] ?? pr.roleNeeded}</Text>
                        {pr.isFilled ? (
                          <View style={styles.filledBadge}>
                            <Text style={styles.filledBadgeText}>Filled</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.rowMeta}>
                        {[pr.city, pr.state].filter(Boolean).join(', ') || 'Location TBD'}
                        {pr.startDate ? ` · ${formatShortDate(pr.startDate)}` : ''}
                        {' · '}
                        {COMPENSATION_LABELS[pr.compensationType] ?? pr.compensationType}
                        {isOwner ? ` · ${pr._count.applications} applicant${pr._count.applications === 1 ? '' : 's'}` : ''}
                      </Text>
                    </>
                  );
                  return isOwner ? (
                    <AnimatedPressable key={pr.id} style={styles.crewRow} onPress={() => router.push(`/crew-call/${pr.id}`)}>
                      {content}
                    </AnimatedPressable>
                  ) : (
                    <View key={pr.id} style={styles.crewRow}>
                      {content}
                    </View>
                  );
                })}
              </>
            );
          })()}

          <Text style={styles.sectionTitle}>Credits & Contact</Text>
          {project.credits.length === 0 ? (
            <Text style={styles.emptyText}>No verified credits yet.</Text>
          ) : (
            project.credits.map((credit) => (
              <View key={credit.id} style={styles.creditRow}>
                <AnimatedPressable style={styles.creditHeader} onPress={() => router.push(`/profile/${credit.user.id}`)}>
                  <Text style={styles.rowTitle}>{credit.user.name}</Text>
                  <RoleBadge role={credit.role} />
                </AnimatedPressable>
                {credit.user.portfolioLinks.length > 0 ? (
                  <View style={styles.linkRow}>
                    {credit.user.portfolioLinks.map((link) => (
                      <AnimatedPressable
                        key={link.id}
                        style={styles.linkChip}
                        haptic="light"
                        onPress={() => Linking.openURL(link.url)}
                      >
                        <Text style={styles.linkChipText}>{link.label}</Text>
                      </AnimatedPressable>
                    ))}
                  </View>
                ) : null}
              </View>
            ))
          )}

          <Text style={styles.sectionTitle}>How This Was Made</Text>
          {editingGuide ? (
            <View style={styles.reviewComposer}>
              <TextInput
                style={[styles.reviewInput, styles.guideInput]}
                placeholder="Share your process — gear, budget, what you'd do differently. Help the next filmmaker."
                placeholderTextColor={Colors[colorScheme].muted}
                value={guideDraft}
                onChangeText={setGuideDraft}
                multiline
              />
              <View style={styles.reviewComposerActions}>
                <AnimatedPressable style={styles.cancelReviewButton} onPress={() => setEditingGuide(false)}>
                  <Text style={styles.cancelReviewButtonText}>Cancel</Text>
                </AnimatedPressable>
                <AnimatedPressable
                  style={styles.postReviewButton}
                  haptic="medium"
                  onPress={handleSaveGuide}
                  disabled={savingGuide}
                >
                  {savingGuide ? (
                    <ActivityIndicator color={Colors[colorScheme].background} size="small" />
                  ) : (
                    <Text style={styles.postReviewButtonText}>Save Guide</Text>
                  )}
                </AnimatedPressable>
              </View>
            </View>
          ) : project.productionGuide ? (
            <View style={styles.guideCard}>
              <Text style={styles.guideBody}>{project.productionGuide}</Text>
              {isOwner ? (
                <AnimatedPressable
                  onPress={() => {
                    setGuideDraft(project.productionGuide ?? '');
                    setEditingGuide(true);
                  }}
                  hitSlop={8}
                >
                  <Text style={styles.reportLink}>Edit guide</Text>
                </AnimatedPressable>
              ) : null}
            </View>
          ) : isOwner ? (
            <AnimatedPressable
              style={styles.writeReviewButton}
              onPress={() => {
                setGuideDraft('');
                setEditingGuide(true);
              }}
            >
              <Text style={styles.writeReviewButtonText}>+ Write a Production Guide</Text>
            </AnimatedPressable>
          ) : (
            <Text style={styles.emptyText}>The team hasn't shared how they made this one yet.</Text>
          )}

          {project.festivalFilms.length > 0 ? (
            <>
              <Text style={styles.sectionTitle}>Festival Circuit</Text>
              {project.festivalFilms.map((ff) => (
                <View key={ff.id} style={styles.row}>
                  <Text style={styles.rowTitle}>{ff.festival.name}</Text>
                  <Text style={styles.rowMeta}>{formatShortDate(ff.festival.startDate)}</Text>
                </View>
              ))}
            </>
          ) : null}

          <Text style={styles.sectionTitle}>Reviews</Text>
          {project.catalogStatus !== 'PUBLISHED' ? (
            <Text style={styles.emptyText}>Reviews unlock once this film is published to the catalog.</Text>
          ) : (
            <>
              {writingReview ? (
                <View style={styles.reviewComposer}>
                  <StarRatingInput value={reviewRating} onChange={setReviewRating} />
                  <TextInput
                    style={styles.reviewInput}
                    placeholder="What did you think? (optional)"
                    placeholderTextColor={Colors[colorScheme].muted}
                    value={reviewBody}
                    onChangeText={setReviewBody}
                    multiline
                  />
                  <View style={styles.reviewComposerActions}>
                    <AnimatedPressable style={styles.cancelReviewButton} onPress={() => setWritingReview(false)}>
                      <Text style={styles.cancelReviewButtonText}>Cancel</Text>
                    </AnimatedPressable>
                    <AnimatedPressable
                      style={styles.postReviewButton}
                      haptic="medium"
                      onPress={handleSubmitReview}
                      disabled={submittingReview || reviewRating === 0}
                    >
                      {submittingReview ? (
                        <ActivityIndicator color={Colors[colorScheme].background} size="small" />
                      ) : (
                        <Text style={styles.postReviewButtonText}>Post Review</Text>
                      )}
                    </AnimatedPressable>
                  </View>
                </View>
              ) : (
                <AnimatedPressable style={styles.writeReviewButton} onPress={() => setWritingReview(true)}>
                  <Text style={styles.writeReviewButtonText}>+ Write a Review</Text>
                </AnimatedPressable>
              )}

              {reviews === null ? (
                <ActivityIndicator color={Colors[colorScheme].tint} />
              ) : reviews.length === 0 ? (
                <Text style={styles.emptyText}>No reviews yet — be the first.</Text>
              ) : (
                reviews.map((r) => (
                  <View key={r.id} style={styles.reviewRow}>
                    <View style={styles.reviewHeaderRow}>
                      <Text style={styles.rowTitle}>{r.user.name}</Text>
                      <StarRating rating={r.rating} />
                    </View>
                    {r.body ? <Text style={styles.reviewBody}>{r.body}</Text> : null}
                    {r.user.id !== user?.id ? (
                      <AnimatedPressable
                        onPress={() =>
                          router.push({
                            pathname: '/report',
                            params: { targetType: 'REVIEW', targetId: r.id, label: `${r.user.name}'s review` },
                          })
                        }
                        hitSlop={8}
                      >
                        <Text style={styles.reportLink}>Report</Text>
                      </AnimatedPressable>
                    ) : (
                      <AnimatedPressable onPress={() => setConfirmingDeleteReview(true)} disabled={deletingReview} hitSlop={8}>
                        <Text style={styles.deleteLink}>{deletingReview ? 'Deleting…' : 'Delete'}</Text>
                      </AnimatedPressable>
                    )}
                  </View>
                ))
              )}
            </>
          )}

          <Text style={styles.sectionTitle}>Discussion — Ideas & Questions</Text>
          <CommentThread itemType="project" itemId={project.id} />

          <View style={styles.bottomSpacer} />
        </ScrollView>
      )}

      {deletingProject ? (
        <View style={styles.deleteOverlay}>
          <ActivityIndicator color={Colors[colorScheme].tint} />
        </View>
      ) : null}

      <ConfirmDialog
        visible={confirmingDeleteProject}
        title="Delete this project?"
        message="This permanently removes the project, its credits, crew calls, reviews, and festival entries. This can't be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDeleteProject}
        onCancel={() => setConfirmingDeleteProject(false)}
      />
      <ConfirmDialog
        visible={confirmingDeleteReview}
        title="Delete your review?"
        confirmLabel="Delete"
        destructive
        onConfirm={handleDeleteReview}
        onCancel={() => setConfirmingDeleteReview(false)}
      />
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
    padding: Space.xxxl,
  },
  emptyText: {
    color: Colors[colorScheme].muted,
    ...Type.body,
  },
  content: {
    padding: Space.lg,
    gap: Space.md,
  },
  posterWrap: {
    width: '100%',
    position: 'relative',
  },
  poster: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: Radius.lg,
    padding: Space.lg,
    justifyContent: 'flex-end',
  },
  posterImage: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: Radius.lg,
    backgroundColor: Colors[colorScheme].card,
  },
  posterTitle: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 22,
    fontWeight: '800',
  },
  posterEditButton: {
    position: 'absolute',
    right: Space.md,
    bottom: Space.md,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: Radius.pill,
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm - 1,
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  posterEditButtonText: {
    color: '#fff',
    ...Type.small,
    fontWeight: '700',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm + 2,
  },
  statusChip: {
    backgroundColor: 'rgba(184, 58, 45, 0.16)',
    borderColor: 'rgba(184, 58, 45, 0.5)',
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: Space.sm + 2,
    paddingVertical: 3,
  },
  statusChipText: {
    color: Colors[colorScheme].tint,
    ...Type.small,
    fontWeight: '700',
  },
  catalogChip: {
    backgroundColor: 'rgba(78, 104, 81, 0.16)',
    borderColor: 'rgba(78, 104, 81, 0.5)',
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: Space.sm + 2,
    paddingVertical: 3,
  },
  catalogChipPublished: {
    backgroundColor: 'rgba(78, 104, 81, 0.16)',
    borderColor: 'rgba(78, 104, 81, 0.5)',
  },
  catalogChipRejected: {
    backgroundColor: Colors[colorScheme].background,
    borderColor: Colors[colorScheme].border,
  },
  catalogChipText: {
    color: Colors[colorScheme].secondary,
    ...Type.small,
    fontWeight: '700',
  },
  rejectionNote: {
    color: Colors[colorScheme].tint,
    ...Type.body,
  },
  catalogSubmitButton: {
    borderWidth: 1,
    borderColor: Colors[colorScheme].tint,
    borderRadius: Radius.md,
    paddingVertical: Space.sm + 3,
    alignItems: 'center',
  },
  catalogSubmitButtonText: {
    color: Colors[colorScheme].tint,
    ...Type.bodyLarge,
    fontWeight: '700',
  },
  meta: {
    color: Colors[colorScheme].muted,
    ...Type.body,
  },
  logline: {
    color: Colors[colorScheme].text,
    ...Type.subtitle,
  },
  linkRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Space.sm,
  },
  linkChip: {
    borderWidth: 1,
    borderColor: Colors[colorScheme].border,
    borderRadius: Radius.pill,
    paddingHorizontal: Space.sm + 2,
    paddingVertical: 5,
  },
  linkChipText: {
    color: Colors[colorScheme].tint,
    ...Type.small,
    fontWeight: '600',
  },
  ownerRowWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ownerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md + 2,
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm + 2,
    paddingVertical: Space.sm,
  },
  reportLink: {
    color: Colors[colorScheme].muted,
    ...Type.small,
    fontWeight: '600',
  },
  deleteLink: {
    color: Colors[colorScheme].tint,
    ...Type.small,
    fontWeight: '600',
  },
  ownerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  ownerAvatarFallback: {
    backgroundColor: Colors[colorScheme].card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ownerAvatarInitial: {
    color: Colors[colorScheme].text,
    fontWeight: '700',
  },
  ownerName: {
    color: Colors[colorScheme].text,
    ...Type.bodyLarge,
    fontWeight: '700',
  },
  ownerHandle: {
    color: Colors[colorScheme].muted,
    ...Type.small,
  },
  workspaceButton: {
    backgroundColor: Colors[colorScheme].secondary,
    borderRadius: Radius.md,
    paddingVertical: Space.md,
    alignItems: 'center',
  },
  workspaceButtonText: {
    color: Colors[colorScheme].background,
    ...Type.bodyLarge,
    fontWeight: '700',
  },
  sectionTitle: {
    color: Colors[colorScheme].muted,
    ...Type.small,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: Space.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors[colorScheme].card,
    borderColor: Colors[colorScheme].border,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm + 2,
  },
  rowTitle: {
    color: Colors[colorScheme].text,
    ...Type.bodyLarge,
    fontWeight: '600',
  },
  rowMeta: {
    color: Colors[colorScheme].muted,
    ...Type.small,
  },
  creditRow: {
    backgroundColor: Colors[colorScheme].card,
    borderColor: Colors[colorScheme].border,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm + 2,
    gap: Space.sm,
  },
  creditHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  guideCard: {
    backgroundColor: Colors[colorScheme].card,
    borderColor: Colors[colorScheme].border,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Space.md,
    gap: Space.sm,
  },
  guideBody: {
    color: Colors[colorScheme].text,
    ...Type.body,
    lineHeight: 21,
  },
  guideInput: {
    minHeight: 120,
  },
  crewRow: {
    backgroundColor: Colors[colorScheme].card,
    borderColor: Colors[colorScheme].border,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm + 2,
    gap: Space.xs,
  },
  crewRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filledBadge: {
    backgroundColor: 'rgba(184, 58, 45, 0.16)',
    borderColor: 'rgba(184, 58, 45, 0.5)',
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: Space.xs + 4,
    paddingVertical: 2,
  },
  filledBadgeText: {
    color: Colors[colorScheme].tint,
    ...Type.caption,
    fontWeight: '700',
  },
  writeReviewButton: {
    borderWidth: 1,
    borderColor: Colors[colorScheme].tint,
    borderRadius: Radius.md,
    paddingVertical: Space.sm + 3,
    alignItems: 'center',
  },
  writeReviewButtonText: {
    color: Colors[colorScheme].tint,
    ...Type.bodyLarge,
    fontWeight: '700',
  },
  reviewComposer: {
    backgroundColor: Colors[colorScheme].card,
    borderColor: Colors[colorScheme].border,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Space.md + 2,
    gap: Space.sm + 2,
  },
  reviewInput: {
    backgroundColor: Colors[colorScheme].background,
    borderColor: Colors[colorScheme].border,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm + 2,
    color: Colors[colorScheme].text,
    ...Type.bodyLarge,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  reviewComposerActions: {
    flexDirection: 'row',
    gap: Space.sm + 2,
  },
  cancelReviewButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors[colorScheme].border,
    borderRadius: Radius.md,
    paddingVertical: Space.sm + 3,
    alignItems: 'center',
  },
  cancelReviewButtonText: {
    color: Colors[colorScheme].text,
    ...Type.bodyLarge,
    fontWeight: '600',
  },
  postReviewButton: {
    flex: 1,
    backgroundColor: Colors[colorScheme].tint,
    borderRadius: Radius.md,
    paddingVertical: Space.sm + 3,
    alignItems: 'center',
  },
  postReviewButtonText: {
    color: Colors[colorScheme].background,
    ...Type.bodyLarge,
    fontWeight: '700',
  },
  reviewRow: {
    backgroundColor: Colors[colorScheme].card,
    borderColor: Colors[colorScheme].border,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Space.md,
    gap: Space.xs,
  },
  reviewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reviewBody: {
    color: Colors[colorScheme].text,
    ...Type.body,
  },
  bottomSpacer: {
    height: Space.xxl,
  },
  deleteOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
