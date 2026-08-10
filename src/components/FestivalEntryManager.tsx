"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type FestivalEntry = {
  id: string;
  festival: { id: string; name: string; startDate: string };
};

type FestivalOption = { id: string; name: string; startDate: string };

export function FestivalEntryManager({
  projectId,
  entries,
  isOwner,
}: {
  projectId: string;
  entries: FestivalEntry[];
  isOwner: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<FestivalOption[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearching(true);
    setError(null);
    const res = await fetch(`/api/festivals?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    setOptions(data);
    setSearching(false);
  }

  async function handleEnter(festivalId: string) {
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/projects/${projectId}/festival-films`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ festivalId }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Something went wrong.");
      setSubmitting(false);
      return;
    }
    setOptions(null);
    setQuery("");
    setSubmitting(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-wrap gap-2">
        {entries.map((entry) => (
          <li key={entry.id}>
            <Link
              href={`/festivals/${entry.festival.id}`}
              className="rounded-full bg-white px-3 py-1 text-sm font-medium text-neutral-800 ring-1 ring-inset ring-neutral-300 hover:ring-neutral-400"
            >
              {entry.festival.name} ({new Date(entry.festival.startDate).toLocaleDateString()})
            </Link>
          </li>
        ))}
        {entries.length === 0 && (
          <li className="text-sm text-neutral-500">Not entered into any festivals yet.</li>
        )}
      </ul>

      {isOwner && (
        <div className="flex flex-col gap-2 rounded-lg border border-neutral-200 bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Enter into a festival
          </p>
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              placeholder="Search festivals by name…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
            />
            <button
              type="submit"
              disabled={searching}
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-50"
            >
              Search
            </button>
            <Link
              href="/festivals/new"
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
            >
              + New festival
            </Link>
          </form>

          {options && (
            <ul className="flex flex-col gap-1">
              {options.map((festival) => (
                <li key={festival.id} className="flex items-center justify-between text-sm">
                  <span>
                    {festival.name} ({new Date(festival.startDate).toLocaleDateString()})
                  </span>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleEnter(festival.id)}
                    className="text-xs font-medium text-neutral-700 underline disabled:opacity-50"
                  >
                    Enter
                  </button>
                </li>
              ))}
              {options.length === 0 && (
                <li className="text-sm text-neutral-500">No festivals match that search.</li>
              )}
            </ul>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      )}
    </div>
  );
}
