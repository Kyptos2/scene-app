export function canonicalPair(userIdA: string, userIdB: string): [string, string] {
  return userIdA < userIdB ? [userIdA, userIdB] : [userIdB, userIdA];
}

export const CONVERSATION_PARTICIPANT_SELECT = {
  id: true,
  name: true,
  username: true,
  avatarUrl: true,
  tagline: true,
} as const;
