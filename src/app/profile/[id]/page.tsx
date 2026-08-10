import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { RoleBadge } from "@/components/RoleBadge";
import { ProfileEditToggle } from "@/components/ProfileEditToggle";
import { PortfolioLinksManager } from "@/components/PortfolioLinksManager";
import { MutualConnections } from "@/components/MutualConnections";
import { ProfileQRCode } from "@/components/ProfileQRCode";
import { MyConnections } from "@/components/MyConnections";
import { EXPERIENCE_LABELS } from "@/lib/roles";
import { absoluteUrl } from "@/lib/siteUrl";

// Public, unauthenticated OG card so links shared from the app (native
// Share sheet) unfurl with a real name/tagline in iMessage, Slack, etc.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: { name: true, tagline: true, avatarUrl: true, city: true, state: true },
  });
  if (!user) return { title: "Profile not found — SCENE" };

  const location = [user.city, user.state].filter(Boolean).join(", ");
  const description = user.tagline ?? (location ? `Filmmaker based in ${location}` : "Filmmaker on SCENE");

  return {
    title: `${user.name} — SCENE`,
    description,
    openGraph: {
      title: user.name,
      description,
      images: user.avatarUrl ? [{ url: absoluteUrl(user.avatarUrl) }] : undefined,
    },
  };
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [profileUser, currentUser] = await Promise.all([
    prisma.user.findUnique({
      where: { id },
      include: {
        portfolioLinks: true,
        credits: {
          where: { isVerified: true },
          include: { project: true },
          orderBy: [{ project: { releaseYear: "desc" } }, { createdAt: "desc" }],
        },
      },
    }),
    getCurrentUser(),
  ]);

  if (!profileUser) {
    notFound();
  }

  const isOwnProfile = currentUser?.id === profileUser.id;
  const location = [profileUser.city, profileUser.state].filter(Boolean).join(", ");

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-10">
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{profileUser.name}</h1>
            {location && <p className="text-sm text-neutral-600">{location}</p>}
            <p className="text-sm text-neutral-600">
              {EXPERIENCE_LABELS[profileUser.experienceLevel]}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {profileUser.primaryRoles.map((role) => (
            <RoleBadge key={role} role={role} />
          ))}
          {profileUser.primaryRoles.length === 0 && (
            <span className="text-sm text-neutral-500">No roles set yet.</span>
          )}
        </div>

        {profileUser.bio && (
          <p className="whitespace-pre-wrap text-sm text-neutral-800">{profileUser.bio}</p>
        )}

        {isOwnProfile && (
          <ProfileEditToggle
            initial={{
              bio: profileUser.bio,
              city: profileUser.city,
              state: profileUser.state,
              primaryRoles: profileUser.primaryRoles,
              experienceLevel: profileUser.experienceLevel,
            }}
          />
        )}
      </div>

      {currentUser && !isOwnProfile && (
        <MutualConnections viewerId={currentUser.id} profileId={profileUser.id} />
      )}

      {isOwnProfile && (
        <section className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
              My connections
            </h2>
            <MyConnections userId={profileUser.id} />
          </div>
          <div className="flex flex-col items-center gap-2">
            <ProfileQRCode userId={profileUser.id} />
            <Link href="/scan" className="text-sm font-medium text-neutral-900 underline">
              Scan a QR code
            </Link>
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Portfolio
        </h2>
        {isOwnProfile ? (
          <PortfolioLinksManager links={profileUser.portfolioLinks} />
        ) : (
          <ul className="flex flex-col gap-2">
            {profileUser.portfolioLinks.map((link) => (
              <li key={link.id} className="text-sm">
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-neutral-900 underline"
                >
                  {link.label}
                </a>
              </li>
            ))}
            {profileUser.portfolioLinks.length === 0 && (
              <li className="text-sm text-neutral-500">No portfolio links yet.</li>
            )}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Verified filmography
        </h2>
        <ul className="flex flex-col gap-2">
          {profileUser.credits.map((credit) => (
            <li
              key={credit.id}
              className="flex items-center justify-between rounded-md border border-neutral-200 bg-white px-3 py-2"
            >
              <div>
                <Link
                  href={`/projects/${credit.project.id}`}
                  className="text-sm font-medium text-neutral-900 underline"
                >
                  {credit.project.title}
                </Link>
                <p className="text-xs text-neutral-500">
                  {credit.project.releaseYear ?? "Year unknown"}
                </p>
              </div>
              <RoleBadge role={credit.role} />
            </li>
          ))}
          {profileUser.credits.length === 0 && (
            <li className="text-sm text-neutral-500">No verified credits yet.</li>
          )}
        </ul>
      </section>
    </div>
  );
}
