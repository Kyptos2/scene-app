import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { getSharedProjects } from "@/lib/connections";
import { CONVERSATION_PARTICIPANT_SELECT } from "@/lib/messaging";

// GET /api/conversations/requests — the Message Request Sandbox: cold
// outreach from users I'm not connected to, awaiting my Accept/Deny/Block.
export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const requests = await prisma.conversation.findMany({
    where: {
      status: "PENDING_REQUEST",
      initiatorId: { not: userId },
      OR: [{ userAId: userId }, { userBId: userId }],
    },
    include: {
      userA: { select: CONVERSATION_PARTICIPANT_SELECT },
      userB: { select: CONVERSATION_PARTICIPANT_SELECT },
    },
    orderBy: { createdAt: "desc" },
  });

  const results = await Promise.all(
    requests.map(async (r) => {
      const requester = r.userAId === userId ? r.userB : r.userA;
      const shared = await getSharedProjects(userId, requester.id);
      return {
        id: r.id,
        requester,
        note: r.requestNote,
        mutualProject: shared[0]?.project ? { id: shared[0].project.id, title: shared[0].project.title } : null,
        createdAt: r.createdAt,
      };
    }),
  );

  return NextResponse.json({ results });
}
