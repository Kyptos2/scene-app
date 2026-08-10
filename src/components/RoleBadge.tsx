import { FilmRole } from "@/generated/prisma/enums";
import { ROLE_LABELS } from "@/lib/roles";

export function RoleBadge({ role }: { role: FilmRole }) {
  return (
    <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900 ring-1 ring-inset ring-amber-300">
      {ROLE_LABELS[role]}
    </span>
  );
}
