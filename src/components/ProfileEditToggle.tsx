"use client";

import { useState } from "react";
import { FilmRole, ExperienceLevel } from "@/generated/prisma/enums";
import { ProfileEditForm } from "@/components/ProfileEditForm";

type Props = {
  initial: {
    bio: string | null;
    city: string | null;
    state: string | null;
    primaryRoles: FilmRole[];
    experienceLevel: ExperienceLevel;
  };
};

export function ProfileEditToggle({ initial }: Props) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return <ProfileEditForm initial={initial} onClose={() => setEditing(false)} />;
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="w-fit rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
    >
      Edit profile
    </button>
  );
}
