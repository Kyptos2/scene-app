import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { sendPushToUsers } from "@/lib/push";
import { autoFlagIfSlur } from "@/lib/moderation";

async function assertMember(workspaceId: string, channelId: string, userId: string) {
  const channel = await prisma.channel.findUnique({ where: { id: channelId } });
  if (!channel || channel.workspaceId !== workspaceId) return "not_found" as const;

  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
  if (!membership) return "not_authorized" as const;

  return "ok" as const;
}

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/workspaces/[id]/channels/[channelId]/messages">,
) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id: workspaceId, channelId } = await ctx.params;
  const check = await assertMember(workspaceId, channelId, userId);
  if (check === "not_found") return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (check === "not_authorized") return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const messages = await prisma.channelMessage.findMany({
    where: { channelId },
    include: { sender: { select: { id: true, name: true, username: true, avatarUrl: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ results: messages });
}

const bodySchema = z.object({ body: z.string().trim().min(1).max(2000) });

export async function POST(
  request: Request,
  ctx: RouteContext<"/api/workspaces/[id]/channels/[channelId]/messages">,
) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id: workspaceId, channelId } = await ctx.params;
  const check = await assertMember(workspaceId, channelId, userId);
  if (check === "not_found") return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (check === "not_authorized") return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const message = await prisma.channelMessage.create({
    data: { channelId, senderId: userId, body: parsed.data.body },
    include: { sender: { select: { id: true, name: true, username: true, avatarUrl: true } } },
  });

  void autoFlagIfSlur({ text: message.body, targetType: "WORKSPACE_MESSAGE", targetId: message.id });

  const [channel, otherMembers] = await Promise.all([
    prisma.channel.findUnique({ where: { id: channelId }, select: { name: true } }),
    prisma.workspaceMember.findMany({
      where: { workspaceId, userId: { not: userId } },
      select: { userId: true },
    }),
  ]);
  if (otherMembers.length > 0) {
    void sendPushToUsers(
      otherMembers.map((m) => m.userId),
      {
        title: `#${channel?.name ?? "channel"} · ${message.sender.name}`,
        body: parsed.data.body,
        data: { type: "channel_message", workspaceId, channelId },
      }
    );
  }

  return NextResponse.json(message, { status: 201 });
}
