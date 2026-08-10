import Link from "next/link";
import { getSharedProjects, getMutualCollaborators } from "@/lib/connections";
import { RoleBadge } from "@/components/RoleBadge";

export async function MutualConnections({
  viewerId,
  profileId,
}: {
  viewerId: string;
  profileId: string;
}) {
  const [sharedProjects, mutualCollaborators] = await Promise.all([
    getSharedProjects(viewerId, profileId),
    getMutualCollaborators(viewerId, profileId),
  ]);

  if (sharedProjects.length === 0 && mutualCollaborators.length === 0) {
    return null;
  }

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
      {sharedProjects.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-amber-900">
            You both worked on {sharedProjects.length}{" "}
            {sharedProjects.length === 1 ? "project" : "projects"} together
          </p>
          <ul className="flex flex-col gap-1.5">
            {sharedProjects.map(({ project, roleA, roleB }) => (
              <li key={project.id} className="flex items-center gap-2 text-sm">
                <Link href={`/projects/${project.id}`} className="font-medium underline">
                  {project.title}
                </Link>
                <RoleBadge role={roleA} />
                <span className="text-neutral-500">·</span>
                <RoleBadge role={roleB} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {mutualCollaborators.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-amber-900">
            {mutualCollaborators.length} mutual{" "}
            {mutualCollaborators.length === 1 ? "collaborator" : "collaborators"}
          </p>
          <ul className="flex flex-wrap gap-2">
            {mutualCollaborators.map((collaborator) => (
              <li key={collaborator.id}>
                <Link
                  href={`/profile/${collaborator.id}`}
                  className="rounded-full bg-white px-3 py-1 text-sm font-medium text-neutral-800 ring-1 ring-inset ring-amber-200 hover:ring-amber-400"
                >
                  {collaborator.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
