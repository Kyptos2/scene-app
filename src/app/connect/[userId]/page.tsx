import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { ConnectForm } from "@/components/ConnectForm";
import { RoleBadge } from "@/components/RoleBadge";

export default async function ConnectPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect(`/login?next=/connect/${userId}`);
  }

  const targetUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!targetUser) {
    notFound();
  }

  if (targetUser.id === currentUser.id) {
    return (
      <div className="mx-auto flex max-w-lg flex-col gap-4 px-4 py-16">
        <h1 className="text-xl font-bold">This is your own QR code</h1>
        <p className="text-sm text-neutral-600">
          Have someone else scan it from your profile to connect with you.
        </p>
        <Link href={`/profile/${currentUser.id}`} className="text-sm font-medium text-neutral-900 underline">
          Back to your profile
        </Link>
      </div>
    );
  }

  const festivals = await prisma.festival.findMany({
    orderBy: { startDate: "desc" },
    take: 20,
    select: { id: true, name: true },
  });

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-16">
      <div>
        <h1 className="text-xl font-bold">Connect with {targetUser.name}</h1>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {targetUser.primaryRoles.map((role) => (
            <RoleBadge key={role} role={role} />
          ))}
        </div>
      </div>
      <ConnectForm targetUserId={targetUser.id} festivals={festivals} />
    </div>
  );
}
