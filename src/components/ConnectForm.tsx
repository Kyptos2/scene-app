"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type FestivalOption = { id: string; name: string };

export function ConnectForm({
  targetUserId,
  festivals,
}: {
  targetUserId: string;
  festivals: FestivalOption[];
}) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [festivalId, setFestivalId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/connections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetUserId,
        note: note || null,
        festivalId: festivalId || null,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Something went wrong.");
      setSubmitting(false);
      return;
    }

    setDone(true);
    setSubmitting(false);
    router.refresh();
  }

  if (done) {
    return (
      <div className="rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-800">
        Connected! You can find each other on SCENE from now on.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="note" className="text-sm font-medium">
          Note (private, only you&apos;ll see it)
        </label>
        <textarea
          id="note"
          placeholder='e.g. "Met at Sundance Q&A"'
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
      </div>

      {festivals.length > 0 && (
        <div className="flex flex-col gap-1">
          <label htmlFor="festival" className="text-sm font-medium">
            Met at this festival? (optional)
          </label>
          <select
            id="festival"
            value={festivalId}
            onChange={(e) => setFestivalId(e.target.value)}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
          >
            <option value="">Not at a festival</option>
            {festivals.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
      >
        {submitting ? "Connecting…" : "Save connection"}
      </button>
    </form>
  );
}
