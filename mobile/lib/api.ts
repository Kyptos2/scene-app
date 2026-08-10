import Constants from 'expo-constants';

import { getAuthToken } from '@/lib/authToken';
import type { NetworkFeedItem } from '@/lib/networkFeed';
import type { SearchUserResult } from '@/lib/search';

// Points at the same SLATE backend built for the web app (Next.js API routes).
// Derives the dev machine's LAN IP from Metro's hostUri so it works out of the
// box from a physical device over Expo Go, without hand-editing an IP address.
function getApiBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(':')[0];
    return `http://${host}:3000`;
  }
  return 'http://localhost:3000';
}

export const API_BASE_URL = getApiBaseUrl();

export type LocalProduction = {
  id: string;
  title: string;
  genre: string | null;
  status: string;
  releaseYear: number | null;
  city: string | null;
  state: string | null;
  ownerId: string;
  ownerName: string;
  distanceKm: number;
};

export type AssistanceRequest = {
  id: string;
  title: string;
  projectId: string;
  projectTitle: string;
  projectPosterUrl: string | null;
  postedById: string;
  roleNeeded: string;
  compensationType: string;
  city: string | null;
  state: string | null;
  distanceKm: number | null;
};

export type FestivalCollaboration = {
  id: string;
  title: string;
  projectId: string;
  projectTitle: string;
  postedById: string;
  roleNeeded: string;
  city: string | null;
  state: string | null;
  festivalId: string;
  festivalName: string;
  festivalStartDate: string;
  distanceKm: number;
};

export type SubmissionStatus = 'unset' | 'open' | 'deadline_soon' | 'closed';

export type UpcomingFestival = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  startDate: string;
  endDate: string;
  description: string | null;
  distanceKm: number | null;
  isAttending: boolean;
  submissionUrl: string | null;
  submissionDeadline: string | null;
  urlLastCheckedAt: string | null;
  urlReachable: boolean | null;
  submissionStatus: SubmissionStatus;
};

export type PortfolioLink = { id: string; label: string; url: string };

export type FilmReview = {
  id: string;
  rating: number; // half-star units: 1 = 0.5★ … 10 = 5.0★
  body: string | null;
  createdAt: string;
  user: { id: string; name: string; avatarUrl: string | null };
};

export type FestivalScreening = { id: string; name: string; startDate: string };

export type Credit = {
  id: string;
  role: string;
  project: {
    id: string;
    title: string;
    genre: string | null;
    releaseYear: number | null;
    festivalFilms: { festival: FestivalScreening }[];
  };
};

export type UserProfile = {
  id: string;
  name: string;
  username: string;
  tagline: string | null;
  bio: string | null;
  avatarUrl: string | null;
  coverImageUrl: string | null;
  city: string | null;
  state: string | null;
  latitude: number | null;
  longitude: number | null;
  primaryRoles: string[];
  experienceLevel: string;
  directorDpExperience: string | null;
  technicalSkills: string[];
  accolades: string[];
  portfolioLinks: PortfolioLink[];
  credits: Credit[];
  isModerator: boolean;
  viewerHasBlocked?: boolean;
  viewerConnectionStatus?: 'self' | 'none' | 'pending' | 'connected';
  connectionsCount?: number;
  profileViewsCount?: number;
  emailVerifiedAt: string | null;
  availabilityStatus: string | null;
  subscriptionTier: SubscriptionTier;
  subscriptionUpdatedAt: string | null;
};

export type AuthResult = { id: string; email: string; name: string; token: string };

export type NetworkConnection = {
  id: string;
  name: string;
  primaryRoles: string[];
  city: string | null;
  state: string | null;
};

export type Coordinates = { latitude: number; longitude: number };

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

// Resolves a relative avatarUrl (e.g. "/uploads/avatars/x.jpg") returned by
// the backend into an absolute URL an <Image> can load. Anything that
// already has a scheme is left untouched — not just http(s), but also the
// local blob:/file:/data: URIs used for optimistic image-message previews
// (a picked file's own URI, shown before the server upload resolves), which
// a bare `startsWith('http')` check would otherwise mistake for a relative
// path and corrupt by prepending the API origin to them.
const HAS_SCHEME = /^[a-z][a-z\d+\-.]*:/i;

export function resolveAvatarUrl(avatarUrl: string | null): string | null {
  if (!avatarUrl) return null;
  if (HAS_SCHEME.test(avatarUrl)) return avatarUrl;
  return `${API_BASE_URL}${avatarUrl}`;
}

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const token = getAuthToken();
  return {
    ...extra,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(body?.error ?? 'Request failed', res.status);
  }
  return res.json();
}

async function getJson<T>(path: string, params: Record<string, string | number | undefined>): Promise<T> {
  const query = Object.entries(params)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
    .join('&');

  const res = await fetch(`${API_BASE_URL}${path}${query ? `?${query}` : ''}`, {
    headers: authHeaders(),
  });
  return handleResponse<T>(res);
}

async function postJson<T>(path: string, body: unknown, method: 'POST' | 'PATCH' = 'POST'): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
  });
  return handleResponse<T>(res);
}

async function deleteJson<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'DELETE',
    headers: authHeaders(body !== undefined ? { 'Content-Type': 'application/json' } : undefined),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(res);
}

export function getLocalProductions(coords: Coordinates, radiusKm?: number) {
  return getJson<{ radiusKm: number; results: LocalProduction[] }>('/api/feed/local-productions', {
    lat: coords.latitude,
    lng: coords.longitude,
    radius: radiusKm,
  });
}

export function getAssistanceNeeded(coords: Coordinates | null, role?: string) {
  return getJson<{ role: string | null; radiusKm: number | null; results: AssistanceRequest[] }>(
    '/api/feed/assistance-needed',
    {
      lat: coords?.latitude,
      lng: coords?.longitude,
      role,
    }
  );
}

export function getFestivalCollaborations(coords: Coordinates, radiusKm?: number) {
  return getJson<{ radiusKm: number; results: FestivalCollaboration[] }>(
    '/api/feed/festival-collaborations',
    { lat: coords.latitude, lng: coords.longitude, radius: radiusKm }
  );
}

export function getUpcomingFestivals(coords: Coordinates | null, withinDays?: number) {
  return getJson<{ withinDays: number; radiusKm: number | null; results: UpcomingFestival[] }>(
    '/api/feed/festivals',
    { lat: coords?.latitude, lng: coords?.longitude, within_days: withinDays }
  );
}

export function createFestival(input: {
  name: string;
  city?: string | null;
  state?: string | null;
  startDate: string;
  endDate: string;
  description?: string | null;
  submissionUrl?: string | null;
  submissionDeadline?: string | null;
}) {
  return postJson<{ id: string }>('/api/festivals', input);
}

export function attendFestival(festivalId: string) {
  return postJson<{ id?: string; alreadyAttending?: boolean }>(`/api/festivals/${festivalId}/attend`, {});
}

export function unattendFestival(festivalId: string) {
  return deleteJson<{ ok: boolean }>(`/api/festivals/${festivalId}/attend`);
}

export type FeaturedFestival = {
  id: string;
  name: string;
  posterUrl: string | null;
  city: string | null;
  state: string | null;
  startDate: string;
  endDate: string;
  attendeeCount: number;
};

// Always returns up to 3 festivals regardless of the viewer's location or
// how far out they're scheduled — the "feels alive immediately" teaser row,
// as opposed to getUpcomingFestivals' nearby/within-N-days list.
export function getFeaturedFestivals() {
  return getJson<{ results: FeaturedFestival[] }>('/api/festivals/featured', {});
}

export async function uploadFestivalPoster(festivalId: string, image: PickedImage): Promise<{ posterUrl: string }> {
  const formData = new FormData();
  const mimeType = image.mimeType ?? 'image/jpeg';
  const filename = image.fileName ?? image.uri.split('/').pop() ?? 'poster.jpg';

  if (image.file) {
    formData.append('file', image.file);
  } else {
    formData.append('file', { uri: image.uri, name: filename, type: mimeType } as unknown as Blob);
  }

  const res = await fetch(`${API_BASE_URL}/api/festivals/${festivalId}/poster`, {
    method: 'POST',
    headers: authHeaders(),
    body: formData,
  });
  return handleResponse(res);
}

export function getUserProfile(userId: string) {
  return getJson<UserProfile>(`/api/users/${userId}`, {});
}

export function getUserNetwork(userId: string) {
  return getJson<NetworkConnection[]>(`/api/users/${userId}/network`, {});
}

export function signup(input: { name: string; email: string; password: string }) {
  return postJson<AuthResult>('/api/auth/signup', input);
}

export function login(input: { email: string; password: string }) {
  return postJson<AuthResult>('/api/auth/login', input);
}

export function oauthGoogleLogin(idToken: string) {
  return postJson<AuthResult>('/api/auth/oauth/google', { idToken });
}

export function oauthAppleLogin(identityToken: string, fullName?: string | null) {
  return postJson<AuthResult>('/api/auth/oauth/apple', { identityToken, fullName });
}

export function forgotPassword(email: string) {
  return postJson<{ message: string }>('/api/auth/forgot-password', { email });
}

export function resetPassword(token: string, newPassword: string) {
  return postJson<{ ok: boolean }>('/api/auth/reset-password', { token, newPassword });
}

export function verifyEmail(token: string) {
  return postJson<{ ok: boolean }>('/api/auth/verify-email', { token });
}

export function resendVerificationEmail() {
  return postJson<{ ok: boolean; alreadyVerified?: boolean }>('/api/auth/resend-verification', {});
}

export function getMyProfile() {
  return getJson<UserProfile>('/api/users/me', {});
}

export function updateMyProfile(input: Partial<{
  name: string;
  tagline: string | null;
  bio: string | null;
  city: string | null;
  state: string | null;
  latitude: number | null;
  longitude: number | null;
  primaryRoles: string[];
  experienceLevel: string;
  availabilityStatus: string | null;
}>) {
  return postJson<UserProfile>('/api/users/me', input, 'PATCH');
}

export type PickedImage = {
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
  // Only present on web (expo-image-picker's web implementation attaches
  // the real browser File so it can be appended to FormData directly —
  // the {uri, name, type} shape below only works on native's fetch/FormData).
  file?: File;
};

export async function uploadAvatar(image: PickedImage): Promise<{ avatarUrl: string }> {
  const formData = new FormData();
  const mimeType = image.mimeType ?? 'image/jpeg';
  const filename = image.fileName ?? image.uri.split('/').pop() ?? 'avatar.jpg';

  if (image.file) {
    formData.append('file', image.file);
  } else {
    formData.append(
      'file',
      { uri: image.uri, name: filename, type: mimeType } as unknown as Blob
    );
  }

  const res = await fetch(`${API_BASE_URL}/api/users/me/avatar`, {
    method: 'POST',
    headers: authHeaders(),
    body: formData,
  });
  return handleResponse(res);
}

export async function uploadCoverPhoto(image: PickedImage): Promise<{ coverImageUrl: string }> {
  const formData = new FormData();
  const mimeType = image.mimeType ?? 'image/jpeg';
  const filename = image.fileName ?? image.uri.split('/').pop() ?? 'cover.jpg';

  if (image.file) {
    formData.append('file', image.file);
  } else {
    formData.append(
      'file',
      { uri: image.uri, name: filename, type: mimeType } as unknown as Blob
    );
  }

  const res = await fetch(`${API_BASE_URL}/api/users/me/cover`, {
    method: 'POST',
    headers: authHeaders(),
    body: formData,
  });
  return handleResponse(res);
}

export function createConnection(targetUserId: string) {
  return postJson<{ id: string }>('/api/connections', { targetUserId });
}

export type ConnectionPerson = {
  id: string;
  name: string;
  username: string;
  avatarUrl: string | null;
  tagline: string | null;
  primaryRoles: string[];
  availabilityStatus: string | null;
  experienceLevel: 'STUDENT' | 'INDIE' | 'PROFESSIONAL' | 'VETERAN';
};

export type MyConnection = {
  id: string;
  otherUser: ConnectionPerson;
  note: string | null;
  festival: { id: string; name: string } | null;
  createdAt: string;
};

export function getMyConnections() {
  return getJson<MyConnection[]>('/api/connections', {});
}

export type ProfileViewer = {
  viewer: ConnectionPerson;
  viewedAt: string;
};

export function getProfileViews() {
  return getJson<{ results: ProfileViewer[] }>('/api/users/me/profile-views', {});
}

export function searchUsers(query: string, coords?: Coordinates | null) {
  return getJson<{ results: SearchUserResult[] }>('/api/search/users', {
    q: query,
    lat: coords?.latitude,
    lng: coords?.longitude,
  });
}

export function getSuggestedUsers(coords?: Coordinates | null) {
  return getJson<{ results: SearchUserResult[] }>('/api/users/suggested', {
    lat: coords?.latitude,
    lng: coords?.longitude,
  });
}

export function getNetworkFeed(coords: Coordinates | null, radiusKm?: number) {
  return getJson<{ radiusKm: number | null; results: NetworkFeedItem[] }>('/api/feed/network', {
    lat: coords?.latitude,
    lng: coords?.longitude,
    radius: radiusKm,
  });
}

export function applaudFeedItem(itemType: string, itemId: string) {
  return postJson<{ applauded: boolean; count: number }>('/api/feed/applaud', { itemType, itemId });
}

export function votePoll(pollId: string, optionId: string) {
  return postJson<{ options: { id: string; label: string; votes: number }[]; totalVotes: number; viewerVoteId: string }>(
    `/api/polls/${pollId}/vote`,
    { optionId },
  );
}

export function createPoll(input: { question: string; options: string[]; durationHours: number }) {
  return postJson<{ id: string }>('/api/polls', input);
}

export type MyProject = {
  id: string;
  title: string;
  genre: string | null;
  releaseYear: number | null;
  status: string;
  logline: string | null;
  posterUrl: string | null;
  catalogStatus: 'NOT_SUBMITTED' | 'PENDING' | 'PUBLISHED' | 'REJECTED';
  crewAvatars: (string | null)[];
  crewCount: number;
};

export type MyWorkspace = {
  id: string;
  name: string;
  projectTitle: string | null;
  posterUrl: string | null;
  memberCount: number;
};

export function getMyWorkspaces() {
  return getJson<{ results: MyWorkspace[] }>('/api/users/me/workspaces', {});
}

export function getMyProjects() {
  return getJson<{ results: MyProject[] }>('/api/projects', {});
}

export function createCrewCall(
  projectId: string,
  input: {
    title: string;
    roleNeeded: string;
    description?: string | null;
    compensationType?: 'PAID' | 'DEFERRED' | 'CREDIT_COPY';
    startDate?: string | null;
    endDate?: string | null;
  },
) {
  return postJson(`/api/projects/${projectId}/requests`, input);
}

export function applyToCrewCall(productionRequestId: string, message?: string | null) {
  return postJson<{ id?: string; alreadyApplied?: boolean }>(`/api/production-requests/${productionRequestId}/apply`, {
    message: message ?? null,
  });
}

export function withdrawCrewCallApplication(productionRequestId: string) {
  return deleteJson<{ ok: boolean }>(`/api/production-requests/${productionRequestId}/apply`);
}

export type FeedCommentEntry = {
  id: string;
  body: string;
  createdAt: string;
  authorId: string;
  authorName: string;
  authorHandle: string;
  authorAvatarUrl: string | null;
};

export function getFeedComments(itemType: string, itemId: string) {
  return getJson<{ results: FeedCommentEntry[] }>('/api/feed/comments', { itemType, itemId });
}

export function postFeedComment(itemType: string, itemId: string, body: string) {
  return postJson<FeedCommentEntry>('/api/feed/comments', { itemType, itemId, body });
}

export type NotificationItem = {
  id: string;
  type: 'connection' | 'application' | 'applause' | 'comment' | 'catalog_review';
  createdAt: string;
  actor: { id: string; name: string; handle: string; avatarUrl: string | null };
  summary: string;
};

export function getNotifications() {
  return getJson<{ results: NotificationItem[] }>('/api/notifications', {});
}

export type FeedPostKind = 'wrap' | 'poster_reveal' | 'production_launch' | 'award' | 'project_launch';

export function createFeedPost(input: {
  kind: FeedPostKind;
  headline: string;
  body?: string | null;
  projectId?: string | null;
  logline?: string | null;
  seekingFeedback?: boolean;
  seekingFestivalPartner?: boolean;
}) {
  return postJson<{ id: string }>('/api/feed/posts', input);
}

export async function uploadFeedPostImage(postId: string, image: PickedImage): Promise<{ posterUrl: string }> {
  const formData = new FormData();
  const mimeType = image.mimeType ?? 'image/jpeg';
  const filename = image.fileName ?? image.uri.split('/').pop() ?? 'photo.jpg';

  if (image.file) {
    formData.append('file', image.file);
  } else {
    formData.append('file', { uri: image.uri, name: filename, type: mimeType } as unknown as Blob);
  }

  const res = await fetch(`${API_BASE_URL}/api/feed/posts/${postId}/image`, {
    method: 'POST',
    headers: authHeaders(),
    body: formData,
  });
  return handleResponse(res);
}

export type ProjectPerson = { id: string; name: string; username: string; avatarUrl: string | null };

export type CrewMember = ProjectPerson & {
  portfolioLinks: { id: string; label: string; url: string }[];
};

export type ProjectCredit = {
  id: string;
  role: string;
  isVerified: boolean;
  user: CrewMember;
};

export type ProjectFestivalFilm = {
  id: string;
  festival: { id: string; name: string; startDate: string };
};

export type ProjectCrewCall = {
  id: string;
  title: string;
  roleNeeded: string;
  compensationType: string;
  city: string | null;
  state: string | null;
  startDate: string | null;
  isFilled: boolean;
  _count: { applications: number };
};

export type ProjectDetail = {
  id: string;
  title: string;
  genre: string | null;
  status: string;
  releaseYear: number | null;
  logline: string | null;
  // A "how we made this" writeup the owner can publish so other aspiring
  // filmmakers browsing the catalog can learn from the approach.
  productionGuide: string | null;
  city: string | null;
  state: string | null;
  ownerId: string;
  owner: ProjectPerson;
  credits: ProjectCredit[];
  festivalFilms: ProjectFestivalFilm[];
  productionRequests: ProjectCrewCall[];
  workspaces: { id: string }[];
  posterUrl: string | null;
  catalogStatus: 'NOT_SUBMITTED' | 'PENDING' | 'PUBLISHED' | 'REJECTED';
  rejectionNote: string | null;
  links: { id: string; label: string; url: string; urlReachable: boolean | null }[];
};

export function getProjectDetail(projectId: string) {
  return getJson<ProjectDetail>(`/api/projects/${projectId}`, {});
}

export function updateProjectGuide(projectId: string, productionGuide: string | null) {
  return postJson<{ id: string; productionGuide: string | null }>(
    `/api/projects/${projectId}`,
    { productionGuide },
    'PATCH',
  );
}

export type CrewCallApplicant = {
  id: string;
  message: string | null;
  createdAt: string;
  applicant: ProjectPerson;
};

export type CrewCallDetail = {
  id: string;
  title: string;
  roleNeeded: string;
  description: string | null;
  compensationType: string;
  city: string | null;
  state: string | null;
  startDate: string | null;
  isFilled: boolean;
  postedById: string;
  project: { id: string; title: string; ownerId: string };
  applications: CrewCallApplicant[];
};

export function getCrewCallDetail(productionRequestId: string) {
  return getJson<CrewCallDetail>(`/api/production-requests/${productionRequestId}`, {});
}

export function setCrewCallFilled(productionRequestId: string, isFilled: boolean) {
  return postJson<CrewCallDetail>(`/api/production-requests/${productionRequestId}`, { isFilled }, 'PATCH');
}

export function createProject(input: {
  title: string;
  genre?: string | null;
  status?: string;
  releaseYear?: number | null;
  logline?: string | null;
  city?: string | null;
  state?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  ownerRole?: string | null;
}) {
  return postJson<{ id: string }>('/api/projects', input);
}

export function getFilmReviews(projectId: string) {
  return getJson<FilmReview[]>(`/api/projects/${projectId}/reviews`, {});
}

export function submitReview(projectId: string, rating: number, body?: string | null) {
  return postJson<FilmReview>(`/api/projects/${projectId}/reviews`, { rating, body: body ?? null });
}

export function deleteReview(projectId: string) {
  return deleteJson<{ ok: boolean }>(`/api/projects/${projectId}/reviews`);
}

export function deleteProject(projectId: string) {
  return deleteJson<{ ok: boolean }>(`/api/projects/${projectId}`);
}

export function deleteFeedPost(postId: string) {
  return deleteJson<{ ok: boolean }>(`/api/feed/posts/${postId}`);
}

export type ConversationPerson = {
  id: string;
  name: string;
  username: string;
  avatarUrl: string | null;
  tagline: string | null;
};

export type MessageKind = 'TEXT' | 'IMAGE' | 'STICKER';

export type ConversationSummary = {
  id: string;
  otherUser: ConversationPerson;
  lastMessage:
    | { kind: MessageKind; body: string; senderId: string; createdAt: string; deletedAt: string | null }
    | null;
  unread: boolean;
  updatedAt: string;
};

export type MessageRequestSummary = {
  id: string;
  requester: ConversationPerson;
  note: string | null;
  mutualProject: { id: string; title: string } | null;
  createdAt: string;
};

export type ConversationMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  kind: MessageKind;
  body: string;
  imageUrl: string | null;
  createdAt: string;
  readAt: string | null;
  deletedAt: string | null;
};

export type ConversationThread = {
  id: string;
  status: 'PENDING_REQUEST' | 'ACCEPTED' | 'DECLINED' | 'BLOCKED';
  initiatorId: string;
  otherUser: ConversationPerson;
  messages: ConversationMessage[];
};

export function getConversations() {
  return getJson<{ results: ConversationSummary[] }>('/api/conversations', {});
}

export function getMessageRequests() {
  return getJson<{ results: MessageRequestSummary[] }>('/api/conversations/requests', {});
}

export function getConversationThread(conversationId: string) {
  return getJson<ConversationThread>(`/api/conversations/${conversationId}`, {});
}

export function startConversation(recipientId: string, body: string) {
  return postJson<{ conversation: { id: string }; status?: string; message?: unknown }>('/api/conversations', {
    recipientId,
    body,
  });
}

export function sendConversationMessage(conversationId: string, body: string, kind: MessageKind = 'TEXT') {
  return postJson<ConversationMessage>(`/api/conversations/${conversationId}/messages`, { body, kind });
}

export async function uploadConversationMessageImage(
  conversationId: string,
  messageId: string,
  image: PickedImage,
): Promise<ConversationMessage> {
  const formData = new FormData();
  const mimeType = image.mimeType ?? 'image/jpeg';
  const filename = image.fileName ?? image.uri.split('/').pop() ?? 'photo.jpg';

  if (image.file) {
    formData.append('file', image.file);
  } else {
    formData.append('file', { uri: image.uri, name: filename, type: mimeType } as unknown as Blob);
  }

  const res = await fetch(`${API_BASE_URL}/api/conversations/${conversationId}/messages/${messageId}/image`, {
    method: 'POST',
    headers: authHeaders(),
    body: formData,
  });
  return handleResponse(res);
}

export function deleteConversationMessage(conversationId: string, messageId: string) {
  return deleteJson<ConversationMessage>(`/api/conversations/${conversationId}/messages/${messageId}`, {});
}

export function acceptMessageRequest(conversationId: string) {
  return postJson<{ id: string; status: string }>(`/api/conversations/${conversationId}/accept`, {});
}

export function denyMessageRequest(conversationId: string) {
  return postJson<{ id: string; status: string }>(`/api/conversations/${conversationId}/deny`, {});
}

export function blockConversation(conversationId: string) {
  return postJson<{ ok: boolean }>(`/api/conversations/${conversationId}/block`, {});
}

export type WorkspaceChannel = { id: string; name: string; createdAt: string };

export type WorkspaceMemberSummary = { id: string; name: string; username: string; avatarUrl: string | null };

export type WorkspaceDetail = {
  id: string;
  name: string;
  project: { id: string; title: string };
  channels: WorkspaceChannel[];
  members: WorkspaceMemberSummary[];
};

export function createProjectWorkspace(projectId: string) {
  return postJson<{ id: string }>(`/api/projects/${projectId}/workspace`, {});
}

export function getWorkspace(workspaceId: string) {
  return getJson<WorkspaceDetail>(`/api/workspaces/${workspaceId}`, {});
}

// ---------------------------------------------------------------------------
// Workspace Board: a Milanote-style freeform canvas, one per workspace.
// Node x/y/width/height are canvas-space units, independent of the client's
// current pan/zoom — the server never needs to know the viewport.
// ---------------------------------------------------------------------------

export type BoardNode = {
  id: string;
  boardId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  text: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
};

export type Board = {
  id: string;
  workspaceId: string;
  createdAt: string;
  nodes: BoardNode[];
};

export function getWorkspaceBoard(workspaceId: string) {
  return getJson<Board>(`/api/workspaces/${workspaceId}/board`, {});
}

export function createBoardNode(
  workspaceId: string,
  input: { x: number; y: number; width?: number; height?: number; color?: string; text?: string },
) {
  return postJson<BoardNode>(`/api/workspaces/${workspaceId}/board`, input);
}

export function updateBoardNode(
  workspaceId: string,
  nodeId: string,
  patch: Partial<{ x: number; y: number; width: number; height: number; color: string; text: string }>,
) {
  return postJson<BoardNode>(`/api/workspaces/${workspaceId}/board/nodes/${nodeId}`, patch, 'PATCH');
}

export function deleteBoardNode(workspaceId: string, nodeId: string) {
  return deleteJson<{ ok: true }>(`/api/workspaces/${workspaceId}/board/nodes/${nodeId}`);
}

export type ChannelMessage = {
  id: string;
  channelId: string;
  senderId: string;
  body: string;
  pinned?: boolean;
  createdAt: string;
  sender: WorkspaceMemberSummary;
};

export function getChannelMessages(workspaceId: string, channelId: string) {
  return getJson<{ results: ChannelMessage[] }>(`/api/workspaces/${workspaceId}/channels/${channelId}/messages`, {});
}

export function sendChannelMessage(workspaceId: string, channelId: string, body: string) {
  return postJson<ChannelMessage>(`/api/workspaces/${workspaceId}/channels/${channelId}/messages`, { body });
}

export function pinChannelMessage(workspaceId: string, channelId: string, messageId: string) {
  return postJson<{ pinned: boolean }>(
    `/api/workspaces/${workspaceId}/channels/${channelId}/messages/${messageId}/pin`,
    {},
  );
}

export type WorkspaceInviteStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED';

export type WorkspaceInvite = {
  id: string;
  workspaceId: string;
  role: string | null;
  status: WorkspaceInviteStatus;
  createdAt: string;
  respondedAt: string | null;
  inviter: WorkspaceMemberSummary;
  invitee: WorkspaceMemberSummary;
};

export function getWorkspaceInvites(workspaceId: string) {
  return getJson<{ results: WorkspaceInvite[] }>(`/api/workspaces/${workspaceId}/invites`, {});
}

export function inviteToWorkspace(workspaceId: string, inviteeId: string, role: string | null) {
  return postJson<WorkspaceInvite>(`/api/workspaces/${workspaceId}/invites`, { inviteeId, role });
}

export type MyWorkspaceInvite = {
  id: string;
  role: string | null;
  createdAt: string;
  inviter: WorkspaceMemberSummary;
  workspace: { id: string; name: string };
};

export function getMyWorkspaceInvites() {
  return getJson<{ results: MyWorkspaceInvite[] }>('/api/users/me/workspace-invites', {});
}

export function acceptWorkspaceInvite(id: string) {
  return postJson<{ ok: boolean; workspaceId: string }>(`/api/workspace-invites/${id}/accept`, {});
}

export function declineWorkspaceInvite(id: string) {
  return postJson<{ ok: boolean }>(`/api/workspace-invites/${id}/decline`, {});
}

export type FilmLink = { id: string; label: string; url: string; urlReachable: boolean | null };

export type CatalogFilm = {
  id: string;
  title: string;
  genre: string | null;
  releaseYear: number | null;
  logline: string | null;
  posterUrl: string | null;
  owner: ProjectPerson;
  credits: ProjectCredit[];
  links: FilmLink[];
};

export type PendingFilm = {
  id: string;
  title: string;
  logline: string | null;
  posterUrl: string | null;
  submittedAt: string | null;
  owner: ProjectPerson;
  links: FilmLink[];
};

export function getCatalog() {
  return getJson<{ results: CatalogFilm[] }>('/api/catalog', {});
}

export function getPendingFilms() {
  return getJson<{ results: PendingFilm[] }>('/api/catalog/pending', {});
}

export async function uploadProjectPoster(projectId: string, image: PickedImage): Promise<{ posterUrl: string }> {
  const formData = new FormData();
  const mimeType = image.mimeType ?? 'image/jpeg';
  const filename = image.fileName ?? image.uri.split('/').pop() ?? 'poster.jpg';

  if (image.file) {
    formData.append('file', image.file);
  } else {
    formData.append('file', { uri: image.uri, name: filename, type: mimeType } as unknown as Blob);
  }

  const res = await fetch(`${API_BASE_URL}/api/projects/${projectId}/poster`, {
    method: 'POST',
    headers: authHeaders(),
    body: formData,
  });
  return handleResponse(res);
}

export function submitToCatalog(projectId: string, links: { label: string; url: string }[]) {
  return postJson<{ catalogStatus: string }>(`/api/projects/${projectId}/catalog/submit`, { links });
}

export function approveFilm(projectId: string) {
  return postJson(`/api/projects/${projectId}/catalog/approve`, {});
}

export function rejectFilm(projectId: string, note?: string | null) {
  return postJson(`/api/projects/${projectId}/catalog/reject`, { note: note ?? null });
}

export type ReportTargetType =
  | 'USER'
  | 'PROJECT'
  | 'REVIEW'
  | 'FEED_POST'
  | 'PRODUCTION_REQUEST'
  | 'FEED_COMMENT'
  | 'MESSAGE'
  | 'WORKSPACE_MESSAGE';

export function submitReport(input: {
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
  note?: string | null;
}) {
  return postJson('/api/reports', input);
}

export type ReportSummary = {
  id: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
  note: string | null;
  status: 'PENDING' | 'REVIEWED' | 'DISMISSED';
  source: 'USER' | 'AUTO_SLUR';
  createdAt: string;
  // Null for automated (AUTO_SLUR) flags — there's no human reporter.
  reporter: { id: string; name: string; username: string; avatarUrl: string | null } | null;
};

export function getReportsQueue(status: 'PENDING' | 'REVIEWED' | 'DISMISSED' = 'PENDING') {
  return getJson<{ results: ReportSummary[] }>('/api/reports', { status });
}

export function resolveReport(id: string, status: 'REVIEWED' | 'DISMISSED') {
  return postJson(`/api/reports/${id}/resolve`, { status });
}

export function blockUser(userId: string) {
  return postJson(`/api/users/${userId}/block`, {});
}

export function unblockUser(userId: string) {
  return deleteJson<{ ok: boolean }>(`/api/users/${userId}/block`);
}

export function registerPushToken(token: string, platform: string) {
  return postJson<{ ok: boolean }>('/api/push-tokens', { token, platform });
}

export function unregisterPushToken(token: string) {
  return deleteJson<{ ok: boolean }>('/api/push-tokens', { token });
}

export type SubscriptionTier = 'FREE' | 'GOLD';
export type SubscriptionStatus = { subscriptionTier: SubscriptionTier; subscriptionUpdatedAt: string | null };

export function getSubscription() {
  return getJson<SubscriptionStatus>('/api/users/me/subscription', {});
}

// No payment processor is wired in — the backend validates these fields
// look like a real card (Luhn check, non-expired), then discards them and
// simply marks the account Gold. Nothing card-related is stored.
export function subscribeGold(payment: {
  cardholderName: string;
  cardNumber: string;
  expiryMonth: number;
  expiryYear: number;
  cvv: string;
  billingZip: string;
}) {
  return postJson<SubscriptionStatus>('/api/users/me/subscription', payment);
}

export function cancelSubscription() {
  return deleteJson<SubscriptionStatus>('/api/users/me/subscription');
}
