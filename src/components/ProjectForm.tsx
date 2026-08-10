"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FilmRole, ProjectStatus } from "@/generated/prisma/enums";
import { ROLE_OPTIONS } from "@/lib/roles";
import { PROJECT_STATUS_OPTIONS } from "@/lib/projects";

export function ProjectForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("PRE_PRODUCTION");
  const [releaseYear, setReleaseYear] = useState("");
  const [logline, setLogline] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [ownerRole, setOwnerRole] = useState<FilmRole | "">("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setError("Location services aren't available in this browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
        setLocating(false);
      },
      () => {
        setError("Couldn't get your location. You can still enter city/state manually.");
        setLocating(false);
      }
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        genre: genre || null,
        status,
        releaseYear: releaseYear ? Number(releaseYear) : null,
        logline: logline || null,
        city: city || null,
        state: state || null,
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
        ownerRole: ownerRole || null,
      }),
    });

    if (!res.ok) {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
      return;
    }

    const project = await res.json();
    router.push(`/projects/${project.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="title" className="text-sm font-medium">
          Title
        </label>
        <input
          id="title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="genre" className="text-sm font-medium">
            Genre
          </label>
          <input
            id="genre"
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="releaseYear" className="text-sm font-medium">
            Release year
          </label>
          <input
            id="releaseYear"
            type="number"
            value={releaseYear}
            onChange={(e) => setReleaseYear(e.target.value)}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="status" className="text-sm font-medium">
          Status
        </label>
        <select
          id="status"
          value={status}
          onChange={(e) => setStatus(e.target.value as ProjectStatus)}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
        >
          {PROJECT_STATUS_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="logline" className="text-sm font-medium">
          Logline
        </label>
        <textarea
          id="logline"
          value={logline}
          onChange={(e) => setLogline(e.target.value)}
          rows={3}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="city" className="text-sm font-medium">
            City
          </label>
          <input
            id="city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="state" className="text-sm font-medium">
            State
          </label>
          <input
            id="state"
            value={state}
            onChange={(e) => setState(e.target.value)}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={useCurrentLocation}
          disabled={locating}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-50"
        >
          {locating ? "Locating…" : "Use my current location"}
        </button>
        {coords && (
          <span className="text-xs text-neutral-500">
            Location set ({coords.lat.toFixed(2)}, {coords.lng.toFixed(2)})
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="ownerRole" className="text-sm font-medium">
          Your role on this project (optional)
        </label>
        <select
          id="ownerRole"
          value={ownerRole}
          onChange={(e) => setOwnerRole(e.target.value as FilmRole | "")}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
        >
          <option value="">Not on this project</option>
          {ROLE_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
      >
        {submitting ? "Creating…" : "Create project"}
      </button>
    </form>
  );
}
