"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FilmRole, CompensationType } from "@/generated/prisma/enums";
import { ROLE_OPTIONS, ROLE_LABELS } from "@/lib/roles";
import { COMPENSATION_LABELS } from "@/lib/projects";

type Request = {
  id: string;
  title: string;
  roleNeeded: FilmRole;
  compensationType: CompensationType;
  isFilled: boolean;
};

export function ProductionRequestsManager({
  projectId,
  requests,
  isOwner,
}: {
  projectId: string;
  requests: Request[];
  isOwner: boolean;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [roleNeeded, setRoleNeeded] = useState<FilmRole>("PRODUCTION_ASSISTANT");
  const [compensationType, setCompensationType] = useState<CompensationType>("CREDIT_COPY");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch(`/api/projects/${projectId}/requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, roleNeeded, compensationType }),
    });

    if (!res.ok) {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
      return;
    }

    setTitle("");
    setShowForm(false);
    setSubmitting(false);
    router.refresh();
  }

  async function toggleFilled(id: string, isFilled: boolean) {
    await fetch(`/api/production-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isFilled: !isFilled }),
    });
    router.refresh();
  }

  async function handleDelete(id: string) {
    await fetch(`/api/production-requests/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2">
        {requests.map((req) => (
          <li
            key={req.id}
            className="flex flex-col gap-2 rounded-md border border-neutral-200 bg-white px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className={`text-sm font-medium ${req.isFilled ? "text-neutral-400 line-through" : "text-neutral-900"}`}>
                {req.title}
              </span>
              <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900 ring-1 ring-inset ring-amber-300">
                {ROLE_LABELS[req.roleNeeded]}
              </span>
              <span className="text-xs text-neutral-500">
                {COMPENSATION_LABELS[req.compensationType]}
              </span>
            </div>
            {isOwner && (
              <div className="flex shrink-0 gap-3">
                <button
                  type="button"
                  onClick={() => toggleFilled(req.id, req.isFilled)}
                  className="text-xs font-medium text-neutral-600 hover:underline"
                >
                  {req.isFilled ? "Mark open" : "Mark filled"}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(req.id)}
                  className="text-xs text-neutral-500 hover:text-red-600"
                >
                  Remove
                </button>
              </div>
            )}
          </li>
        ))}
        {requests.length === 0 && (
          <li className="text-sm text-neutral-500">No crew needed right now.</li>
        )}
      </ul>

      {isOwner && !showForm && (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="w-fit rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
        >
          Post a crew request
        </button>
      )}

      {isOwner && showForm && (
        <form onSubmit={handleCreate} className="flex flex-col gap-2 rounded-lg border border-neutral-200 bg-white p-3">
          <input
            required
            placeholder="e.g. Need a boom op for a weekend shoot"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
          />
          <div className="flex flex-wrap items-end gap-2">
            <select
              value={roleNeeded}
              onChange={(e) => setRoleNeeded(e.target.value as FilmRole)}
              className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
            >
              {ROLE_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <select
              value={compensationType}
              onChange={(e) => setCompensationType(e.target.value as CompensationType)}
              className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
            >
              {Object.entries(COMPENSATION_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
            >
              Post
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
