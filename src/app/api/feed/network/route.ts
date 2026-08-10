import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getBlockedUserIds } from "@/lib/blocks";
import { getRequestOrigin, getRadiusKm } from "@/lib/geo";
import { ROLE_LABELS } from "@/lib/roles";
import type { FilmRole } from "@/generated/prisma/enums";

type ActorFields = {
  actorId: string;
  actorName: string;
  actorUsername: string;
  actorTagline: string | null;
  actorAvatarUrl: string | null;
  actorRoles: string[];
  actorVerified: boolean;
};

type CrewCallRow = ActorFields & {
  id: string;
  createdAt: Date;
  title: string;
  projectId: string;
  projectTitle: string;
  roleNeeded: string;
  compensationType: string;
  city: string | null;
  state: string | null;
  startDate: Date | null;
  endDate: Date | null;
  distanceKm: number | null;
  viewerHasApplied: boolean;
};

type NewConnectionRow = ActorFields & {
  id: string;
  createdAt: Date;
  otherName: string;
  distanceKm: number | null;
};

type NewCreditRow = ActorFields & {
  id: string;
  createdAt: Date;
  role: string;
  projectId: string;
  projectTitle: string;
  distanceKm: number | null;
};

type FeedPostRow = ActorFields & {
  id: string;
  createdAt: Date;
  kind: string;
  headline: string;
  body: string | null;
  posterUrl: string | null;
  videoUrl: string | null;
  logline: string | null;
  seekingFeedback: boolean;
  seekingFestivalPartner: boolean;
  projectId: string | null;
  projectTitle: string | null;
  distanceKm: number | null;
};

type PollRow = {
  id: string;
  createdAt: Date;
  question: string;
  closesAt: Date;
  totalVotes: number;
  viewerVoteId: string | null;
  actorId: string;
  actorName: string;
  actorUsername: string;
  actorTagline: string | null;
  actorAvatarUrl: string | null;
  actorRoles: string[];
  actorVerified: boolean;
  options: { id: string; label: string; votes: number }[];
};

type WorkspaceUpdateRow = ActorFields & {
  id: string;
  createdAt: Date;
  body: string;
  channelName: string;
  workspaceId: string;
  projectTitle: string | null;
};

type FestivalSpotlightRow = {
  id: string;
  createdAt: Date;
  festivalId: string;
  festivalName: string;
  city: string | null;
  state: string | null;
  submissionDeadline: Date;
  submissionUrl: string | null;
};

type BtsCarouselRow = ActorFields & {
  id: string;
  createdAt: Date;
  projectId: string;
  projectTitle: string;
  images: { id: string; url: string; caption: string }[];
};

type WorkspaceActivityRow = {
  id: string;
  createdAt: Date;
  workspaceId: string;
  projectId: string | null;
  projectTitle: string;
  channelName: string;
  messageCount: number;
};

type CatalogSpotlightRow = {
  id: string;
  createdAt: Date;
  projectId: string;
  projectTitle: string;
  genre: string | null;
  posterUrl: string;
  logline: string | null;
  reviewCount: number;
  ownerId: string;
  ownerName: string;
  ownerUsername: string;
  ownerAvatarUrl: string | null;
  ownerIsStudent: boolean;
};

function makeActorFrom(viewerId: string | null, connectedActorIds: Set<string>) {
  return function actorFrom(row: ActorFields, availability: "hiring" | "collaborating" | null) {
    return {
      id: row.actorId,
      name: row.actorName,
      handle: row.actorUsername,
      tagline: row.actorTagline ?? (row.actorRoles[0] ? ROLE_LABELS[row.actorRoles[0] as FilmRole] ?? row.actorRoles[0] : "Filmmaker"),
      avatarUrl: row.actorAvatarUrl,
      roles: row.actorRoles,
      verified: row.actorVerified,
      availability,
      viewerIsSelf: viewerId !== null && row.actorId === viewerId,
      viewerHasConnected: connectedActorIds.has(row.actorId),
    };
  };
}

const engagementDefaults = { applaudCount: 0, commentCount: 0, viewerHasApplauded: false };

export async function GET(request: Request) {
  const url = new URL(request.url);
  const currentUser = await getCurrentUser();
  const origin = getRequestOrigin(url, currentUser);
  const radiusKm = getRadiusKm(url);
  const viewerId = currentUser?.id ?? null;
  const { lat, lng } = origin ?? { lat: null, lng: null };

  const [viewerConnections, blockedUserIds] = await Promise.all([
    viewerId
      ? prisma.connection.findMany({
          where: { status: "ACCEPTED", OR: [{ requesterId: viewerId }, { receiverId: viewerId }] },
          select: { requesterId: true, receiverId: true },
        })
      : Promise.resolve([]),
    getBlockedUserIds(viewerId),
  ]);
  const connectedActorIds = new Set(
    viewerConnections.map((c) => (c.requesterId === viewerId ? c.receiverId : c.requesterId)),
  );
  const actorFrom = makeActorFrom(viewerId, connectedActorIds);

  const [
    crewCallsRaw,
    newConnectionsRaw,
    newCreditsRaw,
    feedPostsRaw,
    pollsRaw,
    pinnedMessagesRaw,
    festivalsRaw,
    btsCarouselsRaw,
    catalogSpotlightRaw,
    workspaceActivityRaw,
  ] = await Promise.all([
    prisma.$queryRaw<CrewCallRow[]>`
      SELECT
        pr.id, pr."createdAt", pr.title, pr."projectId", pj.title AS "projectTitle",
        pr."roleNeeded"::text AS "roleNeeded", pr."compensationType"::text AS "compensationType",
        pr.city, pr.state, pr."startDate", pr."endDate",
        u.id AS "actorId", u.name AS "actorName", u.username AS "actorUsername",
        u.tagline AS "actorTagline", u."avatarUrl" AS "actorAvatarUrl",
        u."primaryRoles"::text[] AS "actorRoles",
        EXISTS(SELECT 1 FROM "Credit" c WHERE c."userId" = u.id AND c."isVerified" = true) AS "actorVerified",
        CASE WHEN ${lat}::float8 IS NOT NULL AND pr.geog IS NOT NULL
          THEN ST_Distance(pr.geog, ST_SetSRID(ST_MakePoint(${lng}::float8, ${lat}::float8), 4326)::geography) / 1000
          ELSE NULL
        END AS "distanceKm",
        EXISTS(
          SELECT 1 FROM "CrewCallApplication" cca
          WHERE cca."productionRequestId" = pr.id AND ${viewerId}::text IS NOT NULL AND cca."applicantId" = ${viewerId}::text
        ) AS "viewerHasApplied"
      FROM "ProductionRequest" pr
      JOIN "Project" pj ON pj.id = pr."projectId"
      JOIN "User" u ON u.id = pr."postedById"
      WHERE pr."isFilled" = false
      ORDER BY pr."createdAt" DESC
      LIMIT 30
    `,
    prisma.$queryRaw<NewConnectionRow[]>`
      SELECT
        c.id, c."createdAt", ru.name AS "otherName",
        u.id AS "actorId", u.name AS "actorName", u.username AS "actorUsername",
        u.tagline AS "actorTagline", u."avatarUrl" AS "actorAvatarUrl",
        u."primaryRoles"::text[] AS "actorRoles",
        EXISTS(SELECT 1 FROM "Credit" cr WHERE cr."userId" = u.id AND cr."isVerified" = true) AS "actorVerified",
        CASE WHEN ${lat}::float8 IS NOT NULL AND u.geog IS NOT NULL
          THEN ST_Distance(u.geog, ST_SetSRID(ST_MakePoint(${lng}::float8, ${lat}::float8), 4326)::geography) / 1000
          ELSE NULL
        END AS "distanceKm"
      FROM "Connection" c
      JOIN "User" u ON u.id = c."requesterId"
      JOIN "User" ru ON ru.id = c."receiverId"
      WHERE c.status = 'ACCEPTED'
      ORDER BY c."createdAt" DESC
      LIMIT 15
    `,
    prisma.$queryRaw<NewCreditRow[]>`
      SELECT
        cr.id, cr."createdAt", cr.role::text AS "role", pj.id AS "projectId", pj.title AS "projectTitle",
        u.id AS "actorId", u.name AS "actorName", u.username AS "actorUsername",
        u.tagline AS "actorTagline", u."avatarUrl" AS "actorAvatarUrl",
        u."primaryRoles"::text[] AS "actorRoles",
        true AS "actorVerified",
        CASE WHEN ${lat}::float8 IS NOT NULL AND u.geog IS NOT NULL
          THEN ST_Distance(u.geog, ST_SetSRID(ST_MakePoint(${lng}::float8, ${lat}::float8), 4326)::geography) / 1000
          ELSE NULL
        END AS "distanceKm"
      FROM "Credit" cr
      JOIN "User" u ON u.id = cr."userId"
      JOIN "Project" pj ON pj.id = cr."projectId"
      WHERE cr."isVerified" = true
      ORDER BY cr."createdAt" DESC
      LIMIT 15
    `,
    prisma.$queryRaw<FeedPostRow[]>`
      SELECT
        fp.id, fp."createdAt", fp.kind, fp.headline, fp.body, fp."posterUrl", fp."videoUrl",
        fp.logline, fp."seekingFeedback", fp."seekingFestivalPartner",
        fp."projectId", pj.title AS "projectTitle",
        u.id AS "actorId", u.name AS "actorName", u.username AS "actorUsername",
        u.tagline AS "actorTagline", u."avatarUrl" AS "actorAvatarUrl",
        u."primaryRoles"::text[] AS "actorRoles",
        EXISTS(SELECT 1 FROM "Credit" c WHERE c."userId" = u.id AND c."isVerified" = true) AS "actorVerified",
        CASE WHEN ${lat}::float8 IS NOT NULL AND u.geog IS NOT NULL
          THEN ST_Distance(u.geog, ST_SetSRID(ST_MakePoint(${lng}::float8, ${lat}::float8), 4326)::geography) / 1000
          ELSE NULL
        END AS "distanceKm"
      FROM "FeedPost" fp
      JOIN "User" u ON u.id = fp."authorId"
      LEFT JOIN "Project" pj ON pj.id = fp."projectId"
      ORDER BY fp."createdAt" DESC
      LIMIT 20
    `,
    prisma.poll
      .findMany({
        where: { closesAt: { gt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2) } },
        include: {
          author: { select: { id: true, name: true, username: true, tagline: true, avatarUrl: true, primaryRoles: true } },
          options: { orderBy: { order: "asc" }, include: { _count: { select: { votes: true } } } },
          votes: viewerId ? { where: { userId: viewerId }, select: { optionId: true } } : false,
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      })
      .then((polls) =>
        polls.map(
          (poll): PollRow => ({
            id: poll.id,
            createdAt: poll.createdAt,
            question: poll.question,
            closesAt: poll.closesAt,
            totalVotes: poll.options.reduce((sum, o) => sum + o._count.votes, 0),
            viewerVoteId: poll.votes?.[0]?.optionId ?? null,
            actorId: poll.author.id,
            actorName: poll.author.name,
            actorUsername: poll.author.username,
            actorTagline: poll.author.tagline,
            actorAvatarUrl: poll.author.avatarUrl,
            actorRoles: poll.author.primaryRoles,
            actorVerified: false,
            options: poll.options.map((o) => ({ id: o.id, label: o.label, votes: o._count.votes })),
          }),
        ),
      ),
    viewerId
      ? prisma.channelMessage
          .findMany({
            where: { pinned: true, channel: { workspace: { members: { some: { userId: viewerId } } } } },
            include: {
              sender: { select: { id: true, name: true, username: true, tagline: true, avatarUrl: true, primaryRoles: true } },
              channel: {
                select: { name: true, workspaceId: true, workspace: { select: { project: { select: { title: true } } } } },
              },
            },
            orderBy: { createdAt: "desc" },
            take: 15,
          })
          .then((rows) =>
            rows.map(
              (m): WorkspaceUpdateRow => ({
                id: m.id,
                createdAt: m.createdAt,
                body: m.body,
                channelName: m.channel.name,
                workspaceId: m.channel.workspaceId,
                projectTitle: m.channel.workspace.project?.title ?? null,
                actorId: m.sender.id,
                actorName: m.sender.name,
                actorUsername: m.sender.username,
                actorTagline: m.sender.tagline,
                actorAvatarUrl: m.sender.avatarUrl,
                actorRoles: m.sender.primaryRoles,
                actorVerified: false,
              }),
            ),
          )
      : Promise.resolve([] as WorkspaceUpdateRow[]),
    prisma.festival
      .findMany({
        where: { submissionDeadline: { gte: new Date(), lte: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14) } },
        select: { id: true, name: true, city: true, state: true, submissionDeadline: true, submissionUrl: true },
        orderBy: { submissionDeadline: "asc" },
        take: 5,
      })
      .then((festivals) =>
        festivals.map(
          (f): FestivalSpotlightRow => ({
            id: `festival-spotlight-${f.id}`,
            createdAt: new Date(), // always "fresh" — deadline urgency matters more than a fixed post date
            festivalId: f.id,
            festivalName: f.name,
            city: f.city,
            state: f.state,
            submissionDeadline: f.submissionDeadline!,
            submissionUrl: f.submissionUrl,
          }),
        ),
      ),
    // A "BTS carousel" is a project with several recent image posts — no
    // multi-image upload exists, so this composes one out of that project's
    // last few single-image FeedPosts instead of needing a new upload flow.
    prisma.feedPost
      .findMany({
        where: { posterUrl: { not: null }, projectId: { not: null } },
        select: {
          id: true,
          createdAt: true,
          posterUrl: true,
          headline: true,
          projectId: true,
          project: { select: { title: true } },
          author: {
            select: { id: true, name: true, username: true, tagline: true, avatarUrl: true, primaryRoles: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 40,
      })
      .then((posts) => {
        const byProject = new Map<string, typeof posts>();
        for (const post of posts) {
          if (!post.projectId) continue;
          const group = byProject.get(post.projectId) ?? [];
          group.push(post);
          byProject.set(post.projectId, group);
        }
        const carousels: BtsCarouselRow[] = [];
        for (const [projectId, group] of byProject) {
          if (group.length < 2) continue;
          const [latest] = group;
          carousels.push({
            id: `bts-${projectId}`,
            createdAt: latest.createdAt,
            projectId,
            projectTitle: latest.project?.title ?? "Untitled",
            images: group.slice(0, 6).map((p) => ({ id: p.id, url: p.posterUrl!, caption: p.headline })),
            actorId: latest.author.id,
            actorName: latest.author.name,
            actorUsername: latest.author.username,
            actorTagline: latest.author.tagline,
            actorAvatarUrl: latest.author.avatarUrl,
            actorRoles: latest.author.primaryRoles,
            actorVerified: false,
          });
          if (carousels.length >= 3) break;
        }
        return carousels;
      }),
    // "Featured Film" — a promotional-style slot for the feed, but sourced
    // from real published catalog entries rather than a paid ad system
    // (there is no advertiser model in this app). Rotates through recently
    // published films so it doesn't fossilize on the very first one.
    prisma.project
      .findMany({
        where: { catalogStatus: "PUBLISHED", posterUrl: { not: null } },
        select: {
          id: true,
          title: true,
          genre: true,
          posterUrl: true,
          logline: true,
          reviewedAt: true,
          _count: { select: { reviews: true } },
          owner: { select: { id: true, name: true, username: true, avatarUrl: true, experienceLevel: true } },
        },
        orderBy: { reviewedAt: "desc" },
        take: 6,
      })
      .then((films) => {
        const picked = films.length > 2 ? films.slice(0, 2) : films;
        return picked.map(
          (f): CatalogSpotlightRow => ({
            id: `catalog-spotlight-${f.id}`,
            createdAt: f.reviewedAt ?? new Date(),
            projectId: f.id,
            projectTitle: f.title,
            genre: f.genre,
            posterUrl: f.posterUrl!,
            logline: f.logline,
            ownerIsStudent: f.owner.experienceLevel === "STUDENT",
            reviewCount: f._count.reviews,
            ownerId: f.owner.id,
            ownerName: f.owner.name,
            ownerUsername: f.owner.username,
            ownerAvatarUrl: f.owner.avatarUrl,
          }),
        );
      }),
    // Elevates Studio Workspace from a hidden feature to a Home surface:
    // one digest card per active workspace, naming its busiest channel over
    // the last 2 days. This counts recent message volume, not true per-user
    // unread state — there's no read-receipt tracking on WorkspaceMember yet.
    viewerId
      ? prisma.channelMessage
          .findMany({
            where: {
              createdAt: { gte: new Date(Date.now() - 1000 * 60 * 60 * 48) },
              senderId: { not: viewerId },
              channel: { workspace: { members: { some: { userId: viewerId } } } },
            },
            select: {
              createdAt: true,
              channel: {
                select: {
                  id: true,
                  name: true,
                  workspaceId: true,
                  workspace: { select: { project: { select: { id: true, title: true } } } },
                },
              },
            },
          })
          .then((rows) => {
            const byWorkspace = new Map<
              string,
              { channelName: string; count: number; latest: Date; projectTitle: string; projectId: string | null }
            >();
            for (const row of rows) {
              const key = row.channel.workspaceId;
              const existing = byWorkspace.get(key);
              if (!existing || row.createdAt > existing.latest) {
                byWorkspace.set(key, {
                  channelName: row.channel.name,
                  count: (existing?.count ?? 0) + 1,
                  latest: row.createdAt,
                  projectTitle: row.channel.workspace.project?.title ?? "Workspace",
                  projectId: row.channel.workspace.project?.id ?? null,
                });
              } else {
                existing.count += 1;
              }
            }
            return [...byWorkspace.entries()]
              .sort((a, b) => b[1].latest.getTime() - a[1].latest.getTime())
              .slice(0, 3)
              .map(
                ([workspaceId, info]): WorkspaceActivityRow => ({
                  id: `workspace-activity-${workspaceId}`,
                  createdAt: info.latest,
                  projectId: info.projectId,
                  workspaceId,
                  projectTitle: info.projectTitle,
                  channelName: info.channelName,
                  messageCount: info.count,
                }),
              );
          })
      : Promise.resolve([] as WorkspaceActivityRow[]),
  ]);

  const notBlocked = (row: ActorFields) => !blockedUserIds.has(row.actorId);
  const crewCalls = crewCallsRaw.filter(notBlocked);
  const newConnections = newConnectionsRaw.filter(notBlocked);
  const newCredits = newCreditsRaw.filter(notBlocked);
  const feedPosts = feedPostsRaw.filter(notBlocked);
  const polls = pollsRaw.filter(notBlocked);
  const pinnedMessages = pinnedMessagesRaw.filter(notBlocked);
  const btsCarousels = btsCarouselsRaw.filter(notBlocked);
  const catalogSpotlight = catalogSpotlightRaw.filter((row) => !blockedUserIds.has(row.ownerId));

  const items = [
    ...crewCalls.map((row) => ({
      id: row.id,
      type: "crew_call" as const,
      createdAt: row.createdAt,
      actor: actorFrom(row, "hiring" as const),
      distanceKm: row.distanceKm,
      ...engagementDefaults,
      projectId: row.projectId,
      projectTitle: row.projectTitle,
      roleNeeded: ROLE_LABELS[row.roleNeeded as FilmRole] ?? row.roleNeeded,
      location: [row.city, row.state].filter(Boolean).join(", ") || "Location TBD",
      startDate: row.startDate,
      urgent: row.startDate ? row.startDate.getTime() - Date.now() < 1000 * 60 * 60 * 24 * 7 : false,
      compensation:
        row.compensationType === "PAID" ? "paid" : row.compensationType === "DEFERRED" ? "deferred" : "credit_copy",
      viewerHasApplied: row.viewerHasApplied,
    })),
    ...newConnections.map((row) => ({
      id: row.id,
      type: "connection_update" as const,
      createdAt: row.createdAt,
      actor: actorFrom(row, null),
      distanceKm: row.distanceKm,
      ...engagementDefaults,
      updateKind: "new_connection" as const,
      summary: `${row.actorName} connected with ${row.otherName}.`,
      relatedProjectId: null,
    })),
    ...newCredits.map((row) => ({
      id: row.id,
      type: "connection_update" as const,
      createdAt: row.createdAt,
      actor: actorFrom(row, null),
      distanceKm: row.distanceKm,
      ...engagementDefaults,
      updateKind: "new_credit" as const,
      summary: `${row.actorName} was verified as ${ROLE_LABELS[row.role as FilmRole] ?? row.role} on "${row.projectTitle}".`,
      relatedProjectId: row.projectId,
    })),
    ...feedPosts
      .filter((row) => row.kind === "project_launch")
      .map((row) => ({
        id: row.id,
        type: "project_launch" as const,
        createdAt: row.createdAt,
        actor: actorFrom(row, null),
        distanceKm: row.distanceKm,
        ...engagementDefaults,
        projectId: row.projectId ?? "",
        projectTitle: row.projectTitle ?? row.headline,
        videoUrl: row.videoUrl,
        posterUrl: row.posterUrl,
        logline: row.logline ?? row.body ?? "",
        seekingFeedback: row.seekingFeedback,
        seekingFestivalPartner: row.seekingFestivalPartner,
      })),
    ...feedPosts
      .filter((row) => row.kind !== "project_launch")
      .map((row) => ({
        id: row.id,
        type: "announcement" as const,
        createdAt: row.createdAt,
        actor: actorFrom(row, null),
        distanceKm: row.distanceKm,
        ...engagementDefaults,
        announcementKind: row.kind as "wrap" | "poster_reveal" | "production_launch" | "award",
        projectId: row.projectId ?? "",
        projectTitle: row.projectTitle ?? "",
        posterUrl: row.posterUrl,
        headline: row.headline,
        body: row.body,
      })),
    ...polls.map((row) => ({
      id: row.id,
      type: "poll" as const,
      createdAt: row.createdAt,
      actor: actorFrom(row, null),
      distanceKm: null,
      ...engagementDefaults,
      question: row.question,
      closesAt: row.closesAt,
      options: row.options,
      totalVotes: row.totalVotes,
      viewerVoteId: row.viewerVoteId,
    })),
    ...pinnedMessages.map((row) => ({
      id: row.id,
      type: "workspace_update" as const,
      createdAt: row.createdAt,
      actor: actorFrom(row, null),
      distanceKm: null,
      ...engagementDefaults,
      channelName: row.channelName,
      workspaceId: row.workspaceId,
      projectTitle: row.projectTitle ?? "Workspace",
      body: row.body,
      pinned: true,
    })),
    ...festivalsRaw.map((row) => ({
      id: row.id,
      type: "festival_spotlight" as const,
      createdAt: row.createdAt,
      actor: {
        id: `festival:${row.festivalId}`,
        name: row.festivalName,
        handle: "festivals",
        tagline: "Open for submissions",
        avatarUrl: null,
        roles: [],
        verified: false,
        availability: null,
        viewerIsSelf: false,
        viewerHasConnected: false,
      },
      distanceKm: null,
      ...engagementDefaults,
      festivalId: row.festivalId,
      festivalName: row.festivalName,
      city: row.city,
      state: row.state,
      submissionDeadline: row.submissionDeadline,
      submissionUrl: row.submissionUrl,
    })),
    ...btsCarousels.map((row) => ({
      id: row.id,
      type: "bts_carousel" as const,
      createdAt: row.createdAt,
      actor: actorFrom(row, null),
      distanceKm: null,
      ...engagementDefaults,
      projectId: row.projectId,
      projectTitle: row.projectTitle,
      images: row.images,
    })),
    ...catalogSpotlight.map((row) => ({
      id: row.id,
      type: "catalog_spotlight" as const,
      createdAt: row.createdAt,
      actor: {
        id: row.ownerId,
        name: row.ownerName,
        handle: row.ownerUsername,
        tagline: row.ownerIsStudent ? "Student Filmmaker" : "Featured Film",
        avatarUrl: row.ownerAvatarUrl,
        roles: [],
        verified: false,
        availability: null,
        viewerIsSelf: viewerId !== null && row.ownerId === viewerId,
        viewerHasConnected: connectedActorIds.has(row.ownerId),
      },
      distanceKm: null,
      ...engagementDefaults,
      projectId: row.projectId,
      projectTitle: row.projectTitle,
      genre: row.genre,
      posterUrl: row.posterUrl,
      logline: row.logline,
      reviewCount: row.reviewCount,
      isStudentFilm: row.ownerIsStudent,
    })),
    ...workspaceActivityRaw.map((row) => ({
      id: row.id,
      type: "workspace_activity" as const,
      createdAt: row.createdAt,
      actor: {
        id: `workspace:${row.workspaceId}`,
        name: row.projectTitle,
        handle: "workspace",
        tagline: "Studio Workspace",
        avatarUrl: null,
        roles: [],
        verified: false,
        availability: null,
        viewerIsSelf: false,
        viewerHasConnected: false,
      },
      distanceKm: null,
      ...engagementDefaults,
      workspaceId: row.workspaceId,
      projectId: row.projectId,
      projectTitle: row.projectTitle,
      channelName: row.channelName,
      messageCount: row.messageCount,
    })),
  ];

  items.sort((a, b) => {
    const aNear = a.distanceKm != null && a.distanceKm <= radiusKm ? 0 : 1;
    const bNear = b.distanceKm != null && b.distanceKm <= radiusKm ? 0 : 1;
    if (aNear !== bNear) return aNear - bNear;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  const page = items.slice(0, 50);
  const itemIds = page.map((item) => item.id);
  const [applause, comments] = await Promise.all([
    prisma.feedApplause.findMany({ where: { itemId: { in: itemIds } } }),
    prisma.feedComment.groupBy({ by: ["itemId"], where: { itemId: { in: itemIds } }, _count: { itemId: true } }),
  ]);
  const applauseByItem = new Map<string, { count: number; viewerApplauded: boolean }>();
  for (const row of applause) {
    const entry = applauseByItem.get(row.itemId) ?? { count: 0, viewerApplauded: false };
    entry.count += 1;
    if (viewerId && row.userId === viewerId) entry.viewerApplauded = true;
    applauseByItem.set(row.itemId, entry);
  }
  const commentCountByItem = new Map(comments.map((row) => [row.itemId, row._count.itemId]));

  const results = page.map((item) => {
    const engagement = applauseByItem.get(item.id);
    return {
      ...item,
      applaudCount: engagement?.count ?? 0,
      viewerHasApplauded: engagement?.viewerApplauded ?? false,
      commentCount: commentCountByItem.get(item.id) ?? 0,
    };
  });

  return NextResponse.json({ radiusKm: origin ? radiusKm : null, results });
}
