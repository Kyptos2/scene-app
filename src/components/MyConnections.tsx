import Link from "next/link";
import { prisma } from "@/lib/prisma";

export async function MyConnections({ userId }: { userId: string }) {
  const connections = await prisma.connection.findMany({
    where: {
      status: "ACCEPTED",
      OR: [{ requesterId: userId }, { receiverId: userId }],
    },
    include: {
      requester: { select: { id: true, name: true } },
      receiver: { select: { id: true, name: true } },
      festival: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <ul className="flex flex-col gap-2">
      {connections.map((c) => {
        const other = c.requesterId === userId ? c.receiver : c.requester;
        return (
          <li key={c.id} className="rounded-md border border-neutral-200 bg-white px-3 py-2">
            <Link href={`/profile/${other.id}`} className="text-sm font-medium text-neutral-900 underline">
              {other.name}
            </Link>
            {c.festival && (
              <span className="ml-2 text-xs text-neutral-500">Met at {c.festival.name}</span>
            )}
            {c.note && <p className="mt-1 text-xs text-neutral-600">{c.note}</p>}
          </li>
        );
      })}
      {connections.length === 0 && (
        <li className="text-sm text-neutral-500">
          No connections yet. Share your QR code or scan someone else&apos;s to connect.
        </li>
      )}
    </ul>
  );
}
