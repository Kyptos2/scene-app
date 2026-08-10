import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, ctx: RouteContext<"/api/users/[id]/network">) {
  const { id } = await ctx.params;

  const connections = await prisma.connection.findMany({
    where: {
      status: "ACCEPTED",
      OR: [{ requesterId: id }, { receiverId: id }],
    },
    include: {
      requester: {
        select: { id: true, name: true, primaryRoles: true, city: true, state: true },
      },
      receiver: {
        select: { id: true, name: true, primaryRoles: true, city: true, state: true },
      },
    },
  });

  const network = connections.map((c) => (c.requesterId === id ? c.receiver : c.requester));

  return NextResponse.json(network);
}
