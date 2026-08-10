import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";

export async function DELETE(_request: Request, ctx: RouteContext<"/api/feed/posts/[id]">) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const post = await prisma.feedPost.findUnique({ where: { id } });
  if (!post) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (post.authorId !== userId) {
    return NextResponse.json({ error: "Only the author can delete this." }, { status: 403 });
  }

  // FeedApplause/FeedComment are polymorphic (itemType/itemId), not FK-linked,
  // so deleting the post doesn't cascade to them automatically.
  await prisma.$transaction([
    prisma.feedApplause.deleteMany({ where: { itemId: id } }),
    prisma.feedComment.deleteMany({ where: { itemId: id } }),
    prisma.feedPost.delete({ where: { id } }),
  ]);

  return NextResponse.json({ ok: true });
}
