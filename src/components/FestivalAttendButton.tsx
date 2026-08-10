"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function FestivalAttendButton({
  festivalId,
  initiallyAttending,
}: {
  festivalId: string;
  initiallyAttending: boolean;
}) {
  const router = useRouter();
  const [attending, setAttending] = useState(initiallyAttending);
  const [submitting, setSubmitting] = useState(false);

  async function toggle() {
    setSubmitting(true);
    await fetch(`/api/festivals/${festivalId}/attend`, {
      method: attending ? "DELETE" : "POST",
    });
    setAttending(!attending);
    setSubmitting(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={submitting}
      className={`w-fit rounded-md px-3 py-1.5 text-sm font-medium transition disabled:opacity-50 ${
        attending
          ? "border border-neutral-300 text-neutral-700 hover:bg-neutral-100"
          : "bg-neutral-900 text-white hover:bg-neutral-700"
      }`}
    >
      {attending ? "I'm no longer attending" : "I'm attending"}
    </button>
  );
}
