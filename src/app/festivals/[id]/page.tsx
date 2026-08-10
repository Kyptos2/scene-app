import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { FestivalAttendButton } from "@/components/FestivalAttendButton";

export default async function FestivalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [festival, currentUser] = await Promise.all([
    prisma.festival.findUnique({
      where: { id },
      include: {
        featuredFilms: { include: { project: { select: { id: true, title: true } } } },
        attendees: { include: { user: { select: { id: true, name: true } } } },
      },
    }),
    getCurrentUser(),
  ]);

  if (!festival) {
    notFound();
  }

  const location = [festival.city, festival.state].filter(Boolean).join(", ");
  const isAttending = currentUser
    ? festival.attendees.some((a) => a.user.id === currentUser.id)
    : false;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">{festival.name}</h1>
        <p className="text-sm text-neutral-600">
          {festival.startDate.toLocaleDateString()} – {festival.endDate.toLocaleDateString()}
          {location && ` · ${location}`}
        </p>
        {festival.description && (
          <p className="text-sm text-neutral-800">{festival.description}</p>
        )}
        {currentUser && (
          <FestivalAttendButton festivalId={festival.id} initiallyAttending={isAttending} />
        )}
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Featured films
        </h2>
        <ul className="flex flex-col gap-2">
          {festival.featuredFilms.map((entry) => (
            <li key={entry.id} className="rounded-md border border-neutral-200 bg-white px-3 py-2">
              <Link href={`/projects/${entry.project.id}`} className="font-medium text-neutral-900 underline">
                {entry.project.title}
              </Link>
            </li>
          ))}
          {festival.featuredFilms.length === 0 && (
            <li className="text-sm text-neutral-500">No films entered yet.</li>
          )}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Attendees ({festival.attendees.length})
        </h2>
        <p className="text-xs text-neutral-500">
          Tap someone here, or scan their QR code on-site, to connect instantly.
        </p>
        <ul className="flex flex-wrap gap-2">
          {festival.attendees.map((attendee) => (
            <li key={attendee.id}>
              <Link
                href={`/profile/${attendee.user.id}`}
                className="rounded-full bg-white px-3 py-1 text-sm font-medium text-neutral-800 ring-1 ring-inset ring-neutral-300 hover:ring-neutral-400"
              >
                {attendee.user.name}
              </Link>
            </li>
          ))}
          {festival.attendees.length === 0 && (
            <li className="text-sm text-neutral-500">No attendees tagged yet.</li>
          )}
        </ul>
      </section>
    </div>
  );
}
