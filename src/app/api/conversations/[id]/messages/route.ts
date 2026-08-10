import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { sendPushToUser } from "@/lib/push";
import { autoFlagIfSlur } from "@/lib/moderation";

// IMAGE messages are created body-less (a caption can follow later, but
// none is required) — the file itself lands via a second call to the
// .../[messageId]/image route, mirroring the feed-post image flow. TEXT
// and STICKER both carry their content directly in `body` (a sticker's
// body is just the emoji character), so those still require non-empty text.
const bodySchema = z
  .object({
    kind: z.enum(["TEXT", "IMAGE", "STICKER"]).optional().default("TEXT"),
    body: z.string().trim().max(2000).optional().default(""),
  })
  .refine((data) => data.kind === "IMAGE" || data.body.length > 0, {
    message: "Message can't be empty.",
    path: ["body"],
  });

function pushPreviewText(kind: "TEXT" | "IMAGE" | "STICKER", body: string): string {
  if (kind === "IMAGE") return "📷 Photo";
  if (kind === "STICKER") return `Sent a sticker ${body}`;
  return body;
}

export async function POST(request: Request, ctx: RouteContext<"/api/conversations/[id]/messages">) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const conversation = await prisma.conversation.findUnique({ where: { id } });
  if (!conversation) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (conversation.userAId !== userId && conversation.userBId !== userId) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }
  if (conversation.status !== "ACCEPTED") {
    return NextResponse.json({ error: "This conversation isn't open yet." }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [message] = await prisma.$transaction([
    prisma.message.create({
      data: { conversationId: id, senderId: userId, kind: parsed.data.kind, body: parsed.data.body },
    }),
    prisma.conversation.update({ where: { id }, data: { updatedAt: new Date() } }),
  ]);

  if (message.body) {
    void autoFlagIfSlur({ text: message.body, targetType: "MESSAGE", targetId: message.id });
  }

  const recipientId = conversation.userAId === userId ? conversation.userBId : conversation.userAId;
  const sender = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  void sendPushToUser(recipientId, {
    title: sender?.name ?? "New message",
    body: pushPreviewText(parsed.data.kind, parsed.data.body),
    data: { type: "dm", conversationId: id },
  });

  return NextResponse.json(message, { status: 201 });
}
