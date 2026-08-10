import { prisma } from "@/lib/prisma";

export async function getSharedProjects(userIdA: string, userIdB: string) {
  if (userIdA === userIdB) return [];

  const creditsA = await prisma.credit.findMany({
    where: { userId: userIdA, isVerified: true },
    select: { projectId: true, role: true },
  });
  const projectIdsA = creditsA.map((c) => c.projectId);
  if (projectIdsA.length === 0) return [];

  const creditsB = await prisma.credit.findMany({
    where: { userId: userIdB, isVerified: true, projectId: { in: projectIdsA } },
    include: { project: true },
  });

  const roleByProjectA = new Map(creditsA.map((c) => [c.projectId, c.role]));

  return creditsB.map((creditB) => ({
    project: creditB.project,
    roleA: roleByProjectA.get(creditB.projectId)!,
    roleB: creditB.role,
  }));
}

export async function getMutualCollaborators(userIdA: string, userIdB: string) {
  if (userIdA === userIdB) return [];

  const [creditsA, creditsB] = await Promise.all([
    prisma.credit.findMany({ where: { userId: userIdA, isVerified: true }, select: { projectId: true } }),
    prisma.credit.findMany({ where: { userId: userIdB, isVerified: true }, select: { projectId: true } }),
  ]);
  const projectIdsA = creditsA.map((c) => c.projectId);
  const projectIdsB = creditsB.map((c) => c.projectId);
  if (projectIdsA.length === 0 || projectIdsB.length === 0) return [];

  const [collaboratorsA, collaboratorsB] = await Promise.all([
    prisma.credit.findMany({
      where: {
        projectId: { in: projectIdsA },
        userId: { notIn: [userIdA, userIdB] },
        isVerified: true,
      },
      select: { userId: true },
      distinct: ["userId"],
    }),
    prisma.credit.findMany({
      where: {
        projectId: { in: projectIdsB },
        userId: { notIn: [userIdA, userIdB] },
        isVerified: true,
      },
      select: { userId: true },
      distinct: ["userId"],
    }),
  ]);

  const setB = new Set(collaboratorsB.map((c) => c.userId));
  const mutualIds = [...new Set(collaboratorsA.map((c) => c.userId))].filter((id) => setB.has(id));
  if (mutualIds.length === 0) return [];

  return prisma.user.findMany({
    where: { id: { in: mutualIds } },
    select: { id: true, name: true, primaryRoles: true, city: true, state: true },
  });
}
