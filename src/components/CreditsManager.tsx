"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FilmRole } from "@/generated/prisma/enums";
import { ROLE_OPTIONS, ROLE_LABELS } from "@/lib/roles";

type Credit = {
  id: string;
  role: FilmRole;
  isVerified: boolean;
  user: { id: string; name: string };
};

type Props = {
  projectId: string;
  credits: Credit[];
  isOwner: boolean;
  currentUserId: string | null;
};

export function CreditsManager({ projectId, credits, isOwner, currentUserId }: Props) {
  const router = useRouter();
  const [tagEmail, setTagEmail] = useState("");
  const [tagRole, setTagRole] = useState<FilmRole>("DIRECTOR");
  const [selfRole, setSelfRole] = useState<FilmRole>("DIRECTOR");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const alreadyCredited = credits.some((c) => c.user.id === currentUserId);

  async function submitCredit(body: { role: FilmRole; userEmail?: string }) {
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/projects/${projectId}/credits`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Something went wrong.");
      setSubmitting(false);
      return;
    }
    setTagEmail("");
    setSubmitting(false);
    router.refresh();
  }

  async function handleVerify(creditId: string) {
    await fetch(`/api/credits/${creditId}/verify`, { method: "POST" });
    router.refresh();
  }

  async function handleRemove(creditId: string) {
    await fetch(`/api/credits/${creditId}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-2">
        {credits.map((credit) => {
          const canRemove = isOwner || credit.user.id === currentUserId;
          return (
            <li
              key={credit.id}
              className="flex flex-col gap-2 rounded-md border border-neutral-200 bg-white px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-neutral-900">
                  {credit.user.name}
                </span>
                <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900 ring-1 ring-inset ring-amber-300">
                  {ROLE_LABELS[credit.role]}
                </span>
                {credit.isVerified ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                      <path
                        fillRule="evenodd"
                        d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Verified
                  </span>
                ) : (
                  <span className="text-xs font-medium text-neutral-500">Pending</span>
                )}
              </div>
              <div className="flex shrink-0 gap-3">
                {isOwner && !credit.isVerified && (
                  <button
                    type="button"
                    onClick={() => handleVerify(credit.id)}
                    className="text-xs font-medium text-green-700 hover:underline"
                  >
                    Verify
                  </button>
                )}
                {canRemove && (
                  <button
                    type="button"
                    onClick={() => handleRemove(credit.id)}
                    className="text-xs text-neutral-500 hover:text-red-600"
                  >
                    Remove
                  </button>
                )}
              </div>
            </li>
          );
        })}
        {credits.length === 0 && (
          <li className="text-sm text-neutral-500">No one is credited yet.</li>
        )}
      </ul>

      {isOwner && (
        <div className="flex flex-col gap-2 rounded-lg border border-neutral-200 bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Tag a collaborator
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <input
              placeholder="Collaborator's email"
              value={tagEmail}
              onChange={(e) => setTagEmail(e.target.value)}
              className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
            />
            <select
              value={tagRole}
              onChange={(e) => setTagRole(e.target.value as FilmRole)}
              className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
            >
              {ROLE_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={submitting || !tagEmail}
              onClick={() => submitCredit({ role: tagRole, userEmail: tagEmail })}
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-50"
            >
              Tag
            </button>
          </div>
        </div>
      )}

      {!isOwner && currentUserId && !alreadyCredited && (
        <div className="flex flex-col gap-2 rounded-lg border border-neutral-200 bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Were you part of this project?
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <select
              value={selfRole}
              onChange={(e) => setSelfRole(e.target.value as FilmRole)}
              className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
            >
              {ROLE_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={submitting}
              onClick={() => submitCredit({ role: selfRole })}
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-50"
            >
              Request credit
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
