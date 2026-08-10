import { prisma } from "@/lib/prisma";

// Union of "users I blocked" and "users who blocked me" — a block is mutual
// in effect even though only one side created the row, so both feed and
// search results stay symmetric regardless of who blocked whom.
export async function getBlockedUserIds(viewerId: string | null): Promise<Set<string>> {
  if (!viewerId) return new Set();

  const blocks = await prisma.block.findMany({
    where: { OR: [{ blockerId: viewerId }, { blockedId: viewerId }] },
    select: { blockerId: true, blockedId: true },
  });

  return new Set(blocks.map((b) => (b.blockerId === viewerId ? b.blockedId : b.blockerId)));
}
