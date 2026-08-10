import type { User } from "@/generated/prisma/client";

// Every endpoint that returns a full profile (own or someone else's) must
// include these same relations, or the client-side `UserProfile` type is a
// lie and screens that trust it (e.g. re-rendering after a PATCH) crash on
// `undefined.length`. Keep GET /api/users/[id], GET /api/users/me, and
// PATCH /api/users/me all using this one constant.
export const PROFILE_INCLUDE = {
  portfolioLinks: true,
  credits: {
    where: { isVerified: true },
    include: {
      project: {
        include: {
          festivalFilms: { include: { festival: true } },
        },
      },
    },
    orderBy: [{ project: { releaseYear: "desc" as const } }, { createdAt: "desc" as const }],
  },
};

export function toPublicUser(user: User) {
  const { passwordHash: _passwordHash, ...publicUser } = user;
  return publicUser;
}
