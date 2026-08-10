import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";

type Actor = { id: string; name: string; handle: string; avatarUrl: string | null };

function actorOf(u: { id: string; name: string; username: string; avatarUrl: string | null }): Actor {
  return { id: u.id, name: u.name, handle: u.username, avatarUrl: u.avatarUrl };
}

const PERSON_SELECT = { id: true, name: true, username: true, avatarUrl: true } as const;

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const [connections, myCrewCalls, myFeedPosts, myReviewedFilms] = await Promise.all([
    prisma.connection.findMany({
      where: { receiverId: userId, status: "ACCEPTED" },
      include: { requester: { select: PERSON_SELECT } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.productionRequest.findMany({
      where: { postedById: userId },
      select: { id: true, title: true },
    }),
    // Applause/comments were only ever surfaced for crew calls — an
    // announcement or project-launch post's own author never found out
    // someone interacted with it. This closes that gap.
    prisma.feedPost.findMany({
      where: { authorId: userId },
      select: { id: true, headline: true },
    }),
    // Catalog approve/reject only ever fired a push notification — nothing
    // showed up in-app if you missed it (no push permission, etc).
    prisma.project.findMany({
      where: { ownerId: userId, reviewedAt: { not: null } },
      select: { id: true, title: true, catalogStatus: true, reviewedAt: true, rejectionNote: true, reviewedBy: { select: PERSON_SELECT } },
      orderBy: { reviewedAt: "desc" },
      take: 10,
    }),
  ]);

  const myCrewCallIds = myCrewCalls.map((c) => c.id);
  const myFeedPostIds = myFeedPosts.map((p) => p.id);
  const titleByCrewCallId = new Map(myCrewCalls.map((c) => [c.id, c.title]));
  const titleByFeedPostId = new Map(myFeedPosts.map((p) => [p.id, p.headline]));
  const FEED_POST_TYPES = ["announcement", "project_launch"];

  const [applications, applauseOnCrewCalls, applauseOnPosts, commentsOnCrewCalls, commentsOnPosts] = await Promise.all([
    prisma.crewCallApplication.findMany({
      where: { productionRequestId: { in: myCrewCallIds } },
      include: { applicant: { select: PERSON_SELECT } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.feedApplause.findMany({
      where: { itemType: "crew_call", itemId: { in: myCrewCallIds }, NOT: { userId } },
      include: { user: { select: PERSON_SELECT } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.feedApplause.findMany({
      where: { itemType: { in: FEED_POST_TYPES }, itemId: { in: myFeedPostIds }, NOT: { userId } },
      include: { user: { select: PERSON_SELECT } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.feedComment.findMany({
      where: { itemType: "crew_call", itemId: { in: myCrewCallIds }, NOT: { userId } },
      include: { user: { select: PERSON_SELECT } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.feedComment.findMany({
      where: { itemType: { in: FEED_POST_TYPES }, itemId: { in: myFeedPostIds }, NOT: { userId } },
      include: { user: { select: PERSON_SELECT } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const items = [
    ...connections.map((c) => ({
      id: `conn_${c.id}`,
      type: "connection" as const,
      createdAt: c.createdAt,
      actor: actorOf(c.requester),
      summary: `${c.requester.name} connected with you.`,
    })),
    ...applications.map((a) => ({
      id: `app_${a.id}`,
      type: "application" as const,
      createdAt: a.createdAt,
      actor: actorOf(a.applicant),
      summary: `${a.applicant.name} applied to "${titleByCrewCallId.get(a.productionRequestId) ?? "your crew call"}".`,
    })),
    ...applauseOnCrewCalls.map((a) => ({
      id: `applaud_${a.id}`,
      type: "applause" as const,
      createdAt: a.createdAt,
      actor: actorOf(a.user),
      summary: `${a.user.name} applauded "${titleByCrewCallId.get(a.itemId) ?? "your crew call"}".`,
    })),
    ...applauseOnPosts.map((a) => ({
      id: `applaud_${a.id}`,
      type: "applause" as const,
      createdAt: a.createdAt,
      actor: actorOf(a.user),
      summary: `${a.user.name} applauded "${titleByFeedPostId.get(a.itemId) ?? "your post"}".`,
    })),
    ...commentsOnCrewCalls.map((c) => ({
      id: `comment_${c.id}`,
      type: "comment" as const,
      createdAt: c.createdAt,
      actor: actorOf(c.user),
      summary: `${c.user.name} commented on "${titleByCrewCallId.get(c.itemId) ?? "your crew call"}": "${c.body}"`,
    })),
    ...commentsOnPosts.map((c) => ({
      id: `comment_${c.id}`,
      type: "comment" as const,
      createdAt: c.createdAt,
      actor: actorOf(c.user),
      summary: `${c.user.name} commented on "${titleByFeedPostId.get(c.itemId) ?? "your post"}": "${c.body}"`,
    })),
    ...myReviewedFilms.map((p) => ({
      id: `catalog_${p.id}`,
      type: "catalog_review" as const,
      createdAt: p.reviewedAt!,
      actor: p.reviewedBy ? actorOf(p.reviewedBy) : { id: "moderation", name: "SCENE Moderation", handle: "moderation", avatarUrl: null },
      summary:
        p.catalogStatus === "PUBLISHED"
          ? `"${p.title}" is now live in the Indie Catalog.`
          : `"${p.title}" wasn't approved for the Indie Catalog${p.rejectionNote ? `: ${p.rejectionNote}` : "."}`,
    })),
  ];

  items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return NextResponse.json({ results: items.slice(0, 50) });
}
