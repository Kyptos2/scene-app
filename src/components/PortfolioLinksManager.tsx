"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type PortfolioLink = { id: string; label: string; url: string };

export function PortfolioLinksManager({ links }: { links: PortfolioLink[] }) {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/users/me/portfolio-links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, url }),
    });

    if (!res.ok) {
      setError("Enter a label and a valid URL.");
      setSubmitting(false);
      return;
    }

    setLabel("");
    setUrl("");
    setSubmitting(false);
    router.refresh();
  }

  async function handleDelete(id: string) {
    await fetch(`/api/users/me/portfolio-links/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2">
        {links.map((link) => (
          <li
            key={link.id}
            className="flex items-center justify-between rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm"
          >
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-neutral-900 underline"
            >
              {link.label}
            </a>
            <button
              onClick={() => handleDelete(link.id)}
              className="text-xs text-neutral-500 hover:text-red-600"
              type="button"
            >
              Remove
            </button>
          </li>
        ))}
        {links.length === 0 && (
          <li className="text-sm text-neutral-500">No portfolio links yet.</li>
        )}
      </ul>

      <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="link-label" className="text-xs font-medium text-neutral-600">
            Label
          </label>
          <input
            id="link-label"
            placeholder="Reel, IMDb…"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="link-url" className="text-xs font-medium text-neutral-600">
            URL
          </label>
          <input
            id="link-url"
            placeholder="https://…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-50"
        >
          Add
        </button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
