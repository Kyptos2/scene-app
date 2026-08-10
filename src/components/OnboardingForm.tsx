"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FilmRole, ExperienceLevel } from "@/generated/prisma/enums";
import { ROLE_OPTIONS, EXPERIENCE_OPTIONS } from "@/lib/roles";

export function OnboardingForm({ userId }: { userId: string }) {
  const router = useRouter();
  const [roles, setRoles] = useState<FilmRole[]>([]);
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>("INDIE");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function toggleRole(role: FilmRole) {
    setRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  }

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
        setError("Couldn't get your location. You can still enter your city/state manually.");
        setLocating(false);
      }
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (roles.length === 0) {
      setError("Select at least one role.");
      return;
    }
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/users/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        primaryRoles: roles,
        experienceLevel,
        city: city || null,
        state: state || null,
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
      }),
    });

    if (!res.ok) {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
      return;
    }

    router.push(`/profile/${userId}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Primary roles</legend>
        <div className="flex flex-wrap gap-2">
          {ROLE_OPTIONS.map(([value, label]) => {
            const selected = roles.includes(value);
            return (
              <button
                type="button"
                key={value}
                onClick={() => toggleRole(value)}
                aria-pressed={selected}
                className={`rounded-full px-3 py-1.5 text-sm font-medium ring-1 ring-inset transition ${
                  selected
                    ? "bg-neutral-900 text-white ring-neutral-900"
                    : "bg-white text-neutral-700 ring-neutral-300 hover:ring-neutral-400"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Experience level</legend>
        <div className="flex flex-wrap gap-2">
          {EXPERIENCE_OPTIONS.map(([value, label]) => (
            <label
              key={value}
              className={`cursor-pointer rounded-full px-3 py-1.5 text-sm font-medium ring-1 ring-inset transition ${
                experienceLevel === value
                  ? "bg-amber-100 text-amber-900 ring-amber-300"
                  : "bg-white text-neutral-700 ring-neutral-300 hover:ring-neutral-400"
              }`}
            >
              <input
                type="radio"
                name="experienceLevel"
                value={value}
                checked={experienceLevel === value}
                onChange={() => setExperienceLevel(value)}
                className="sr-only"
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

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

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
      >
        {submitting ? "Saving…" : "Finish setup"}
      </button>
    </form>
  );
}
