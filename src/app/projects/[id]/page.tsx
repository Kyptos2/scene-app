import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { CreditsManager } from "@/components/CreditsManager";
import { ProductionRequestsManager } from "@/components/ProductionRequestsManager";
import { FestivalEntryManager } from "@/components/FestivalEntryManager";
import { PROJECT_STATUS_LABELS } from "@/lib/projects";
import { absoluteUrl } from "@/lib/siteUrl";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    select: { title: true, logline: true, genre: true, posterUrl: true },
  });
  if (!project) return { title: "Film not found — SCENE" };

  const description = project.logline ?? (project.genre ? `A ${project.genre} film on SCENE.` : "A film on SCENE.");

  return {
    title: `${project.title} — SCENE`,
    description,
    openGraph: {
      title: project.title,
      description,
      images: project.posterUrl ? [{ url: absoluteUrl(project.posterUrl) }] : undefined,
    },
  };
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [project, currentUser] = await Promise.all([
    prisma.project.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true } },
        credits: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { createdAt: "asc" },
        },
        productionRequests: { orderBy: { createdAt: "desc" } },
        festivalFilms: {
          include: { festival: { select: { id: true, name: true, startDate: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
    }),
    getCurrentUser(),
  ]);

  if (!project) {
    notFound();
  }

  const isOwner = currentUser?.id === project.ownerId;
  const location = [project.city, project.state].filter(Boolean).join(", ");

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">{project.title}</h1>
        <div className="flex flex-wrap gap-2 text-sm text-neutral-600">
          <span>{PROJECT_STATUS_LABELS[project.status]}</span>
          {project.genre && <span>· {project.genre}</span>}
          {project.releaseYear && <span>· {project.releaseYear}</span>}
          {location && <span>· {location}</span>}
        </div>
        <p className="text-sm text-neutral-600">
          Owned by{" "}
          <Link href={`/profile/${project.owner.id}`} className="font-medium text-neutral-900 underline">
            {project.owner.name}
          </Link>
        </p>
        {project.logline && <p className="text-sm text-neutral-800">{project.logline}</p>}
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Credits
        </h2>
        <CreditsManager
          projectId={project.id}
          credits={project.credits}
          isOwner={isOwner}
          currentUserId={currentUser?.id ?? null}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Crew needed
        </h2>
        <ProductionRequestsManager
          projectId={project.id}
          requests={project.productionRequests}
          isOwner={isOwner}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Festivals
        </h2>
        <FestivalEntryManager
          projectId={project.id}
          entries={project.festivalFilms.map((f) => ({
            id: f.id,
            festival: {
              id: f.festival.id,
              name: f.festival.name,
              startDate: f.festival.startDate.toISOString(),
            },
          }))}
          isOwner={isOwner}
        />
      </section>
    </div>
  );
}
