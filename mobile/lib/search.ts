export type SearchUserResult = {
  id: string;
  name: string;
  handle: string;
  tagline: string;
  avatarUrl: string | null;
  availabilityStatus: string | null;
  roles: string[];
  verified: boolean;
  distanceKm: number | null;
  connectionStatus: 'none' | 'pending' | 'connected';
};

// Payload shape for GET /api/search/users?q=...
// {
//   "results": [
//     {
//       "id": "cms5by2xv000093upkqqkjo9v",
//       "name": "Maya Okafor",
//       "handle": "mayaokafor",
//       "tagline": "DP of \"Neon City\"",
//       "avatarUrl": null,
//       "roles": ["DIRECTOR_OF_PHOTOGRAPHY"],
//       "verified": true,
//       "distanceKm": 4.1,
//       "connectionStatus": "none"
//     }
//   ]
// }
