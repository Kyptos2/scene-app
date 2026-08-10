export type FeedActor = {
  id: string;
  name: string;
  handle: string;
  tagline: string;
  avatarUrl: string | null;
  roles: string[];
  verified: boolean;
  availability: 'hiring' | 'collaborating' | null;
  viewerIsSelf: boolean;
  viewerHasConnected: boolean;
};

interface FeedItemBase {
  id: string;
  createdAt: string;
  actor: FeedActor;
  distanceKm: number | null;
  applaudCount: number;
  commentCount: number;
  viewerHasApplauded: boolean;
}

export interface AnnouncementFeedItem extends FeedItemBase {
  type: 'announcement';
  announcementKind: 'wrap' | 'poster_reveal' | 'production_launch' | 'award';
  projectId: string;
  projectTitle: string;
  posterUrl: string | null;
  headline: string;
  body: string | null;
}

export interface CrewCallFeedItem extends FeedItemBase {
  type: 'crew_call';
  projectId: string | null;
  projectTitle: string | null;
  roleNeeded: string;
  location: string;
  startDate: string | null;
  urgent: boolean;
  compensation: 'paid' | 'deferred' | 'credit_copy' | null;
  viewerHasApplied: boolean;
}

export interface ConnectionUpdateFeedItem extends FeedItemBase {
  type: 'connection_update';
  updateKind: 'new_credit' | 'new_connection' | 'profile_milestone';
  summary: string;
  relatedProjectId: string | null;
}

export interface ProjectLaunchFeedItem extends FeedItemBase {
  type: 'project_launch';
  projectId: string;
  projectTitle: string;
  videoUrl: string | null;
  posterUrl: string | null;
  logline: string;
  seekingFeedback: boolean;
  seekingFestivalPartner: boolean;
}

export interface PollOptionResult {
  id: string;
  label: string;
  votes: number;
}

export interface PollFeedItem extends FeedItemBase {
  type: 'poll';
  question: string;
  options: PollOptionResult[];
  totalVotes: number;
  viewerVoteId: string | null;
  closesAt: string;
}

export interface WorkspaceUpdateFeedItem extends FeedItemBase {
  type: 'workspace_update';
  channelName: string;
  workspaceId: string;
  projectTitle: string;
  body: string;
  pinned: boolean;
}

export interface FestivalSpotlightFeedItem extends FeedItemBase {
  type: 'festival_spotlight';
  festivalId: string;
  festivalName: string;
  city: string | null;
  state: string | null;
  submissionDeadline: string;
  submissionUrl: string | null;
}

export interface BtsImage {
  id: string;
  url: string;
  caption: string;
}

export interface BtsCarouselFeedItem extends FeedItemBase {
  type: 'bts_carousel';
  projectId: string;
  projectTitle: string;
  images: BtsImage[];
}

export interface CatalogSpotlightFeedItem extends FeedItemBase {
  type: 'catalog_spotlight';
  projectId: string;
  projectTitle: string;
  genre: string | null;
  posterUrl: string;
  logline: string | null;
  reviewCount: number;
  isStudentFilm: boolean;
}

export interface WorkspaceActivityFeedItem extends FeedItemBase {
  type: 'workspace_activity';
  workspaceId: string;
  projectId: string | null;
  projectTitle: string;
  channelName: string;
  messageCount: number;
}

export type NetworkFeedItem =
  | AnnouncementFeedItem
  | CrewCallFeedItem
  | ConnectionUpdateFeedItem
  | ProjectLaunchFeedItem
  | PollFeedItem
  | WorkspaceUpdateFeedItem
  | FestivalSpotlightFeedItem
  | BtsCarouselFeedItem
  | CatalogSpotlightFeedItem
  | WorkspaceActivityFeedItem;

// Example payload shape for GET /api/feed/network (not yet built):
// {
//   "results": [
//     {
//       "id": "cfi_01",
//       "type": "crew_call",
//       "createdAt": "2026-07-29T18:00:00.000Z",
//       "actor": {
//         "id": "u_92",
//         "name": "Theo Marsh",
//         "handle": "theomarsh",
//         "tagline": "Director | Seeking Sound Mixer",
//         "avatarUrl": "https://.../theo.jpg",
//         "roles": ["director"],
//         "verified": true,
//         "availability": "hiring"
//       },
//       "distanceKm": 3.2,
//       "applaudCount": 4,
//       "commentCount": 1,
//       "viewerHasApplauded": false,
//       "projectId": "cms5by32j000s93upcfl9kuxe",
//       "projectTitle": "Midnight Static",
//       "roleNeeded": "Sound Mixer",
//       "location": "Austin, TX",
//       "startDate": "2026-08-02",
//       "urgent": true,
//       "compensation": "paid",
//       "viewerHasApplied": false
//     }
//   ]
// }
