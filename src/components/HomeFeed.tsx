"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FilmRole } from "@/generated/prisma/enums";
import { ROLE_OPTIONS, ROLE_LABELS } from "@/lib/roles";
import { PROJECT_STATUS_LABELS, COMPENSATION_LABELS } from "@/lib/projects";

type Tab = "local-productions" | "assistance-needed" | "festival-collaborations" | "festivals";

const TABS: { id: Tab; label: string; question: string }[] = [
  { id: "local-productions", label: "Local Productions", question: "Who's making films near me?" },
  { id: "assistance-needed", label: "Assistance Needed", question: "Who needs help on a film?" },
  {
    id: "festival-collaborations",
    label: "Festival Collaborators",
    question: "Who's entering a festival near me?",
  },
  { id: "festivals", label: "Upcoming Festivals", question: "Any festivals near me soon?" },
];

type LocalProduction = {
  id: string;
  title: string;
  genre: string | null;
  status: string;
  releaseYear: number | null;
  city: string | null;
  state: string | null;
  ownerName: string;
  distanceKm: number;
};

type AssistanceRequest = {
  id: string;
  title: string;
  projectId: string;
  projectTitle: string;
  roleNeeded: string;
  compensationType: string;
  city: string | null;
  state: string | null;
  distanceKm: number | null;
};

type FestivalCollaboration = {
  id: string;
  title: string;
  projectId: string;
  projectTitle: string;
  roleNeeded: string;
  city: string | null;
  state: string | null;
  festivalId: string;
  festivalName: string;
  festivalStartDate: string;
  distanceKm: number;
};

type FestivalItem = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  startDate: string;
  endDate: string;
  description: string | null;
  distanceKm: number | null;
};

function LocationBadge({ city, state, distanceKm }: { city: string | null; state: string | null; distanceKm: number | null }) {
  const location = [city, state].filter(Boolean).join(", ");
  return (
    <p className="text-xs text-neutral-500">
      {location || "Location unknown"}
      {distanceKm != null && ` · ${distanceKm.toFixed(0)} km away`}
    </p>
  );
}

export function HomeFeed() {
  const [tab, setTab] = useState<Tab>("local-productions");
  const [role, setRole] = useState<FilmRole | "">("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localProductions, setLocalProductions] = useState<LocalProduction[] | null>(null);
  const [assistanceRequests, setAssistanceRequests] = useState<AssistanceRequest[] | null>(null);
  const [festivalCollaborations, setFestivalCollaborations] = useState<FestivalCollaboration[] | null>(null);
  const [festivals, setFestivals] = useState<FestivalItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      let url = `/api/feed/${tab}`;
      if (tab === "assistance-needed" && role) {
        url += `?role=${role}`;
      }

      const res = await fetch(url);
      if (cancelled) return;

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Something went wrong.");
        setLoading(false);
        return;
      }

      const data = await res.json();
      if (tab === "local-productions") setLocalProductions(data.results);
      if (tab === "assistance-needed") setAssistanceRequests(data.results);
      if (tab === "festival-collaborations") setFestivalCollaborations(data.results);
      if (tab === "festivals") setFestivals(data.results);
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [tab, role]);

  const activeTab = TABS.find((t) => t.id === tab)!;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2 border-b border-neutral-200 pb-3">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
              tab === t.id
                ? "bg-neutral-900 text-white"
                : "bg-white text-neutral-700 ring-1 ring-inset ring-neutral-300 hover:ring-neutral-400"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <p className="text-sm text-neutral-500">{activeTab.question}</p>

      {tab === "assistance-needed" && (
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as FilmRole | "")}
          className="w-fit rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        >
          <option value="">All roles</option>
          {ROLE_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      )}

      {tab === "festivals" && (
        <Link
          href="/festivals/new"
          className="w-fit rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
        >
          + List a festival
        </Link>
      )}

      {loading && <p className="text-sm text-neutral-500">Loading…</p>}

      {error && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          {error}{" "}
          <Link href="/profile" className="underline">
            Set your location
          </Link>
        </div>
      )}

      {!loading && !error && tab === "local-productions" && (
        <ul className="flex flex-col gap-2">
          {localProductions?.map((project) => (
            <li key={project.id} className="rounded-md border border-neutral-200 bg-white px-3 py-2">
              <Link href={`/projects/${project.id}`} className="font-medium text-neutral-900 underline">
                {project.title}
              </Link>
              <p className="text-xs text-neutral-600">
                {PROJECT_STATUS_LABELS[project.status as keyof typeof PROJECT_STATUS_LABELS]}
                {project.genre && ` · ${project.genre}`} · by {project.ownerName}
              </p>
              <LocationBadge city={project.city} state={project.state} distanceKm={project.distanceKm} />
            </li>
          ))}
          {localProductions?.length === 0 && (
            <li className="text-sm text-neutral-500">No local productions nearby right now.</li>
          )}
        </ul>
      )}

      {!loading && !error && tab === "assistance-needed" && (
        <ul className="flex flex-col gap-2">
          {assistanceRequests?.map((req) => (
            <li key={req.id} className="rounded-md border border-neutral-200 bg-white px-3 py-2">
              <div className="flex items-center gap-2">
                <Link href={`/projects/${req.projectId}`} className="font-medium text-neutral-900 underline">
                  {req.title}
                </Link>
                <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900 ring-1 ring-inset ring-amber-300">
                  {ROLE_LABELS[req.roleNeeded as FilmRole]}
                </span>
              </div>
              <p className="text-xs text-neutral-600">
                {req.projectTitle} ·{" "}
                {COMPENSATION_LABELS[req.compensationType as keyof typeof COMPENSATION_LABELS] ??
                  req.compensationType}
              </p>
              <LocationBadge city={req.city} state={req.state} distanceKm={req.distanceKm} />
            </li>
          ))}
          {assistanceRequests?.length === 0 && (
            <li className="text-sm text-neutral-500">No open requests match right now.</li>
          )}
        </ul>
      )}

      {!loading && !error && tab === "festival-collaborations" && (
        <ul className="flex flex-col gap-2">
          {festivalCollaborations?.map((req) => (
            <li key={req.id} className="rounded-md border border-neutral-200 bg-white px-3 py-2">
              <div className="flex items-center gap-2">
                <Link href={`/projects/${req.projectId}`} className="font-medium text-neutral-900 underline">
                  {req.title}
                </Link>
                <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900 ring-1 ring-inset ring-amber-300">
                  {ROLE_LABELS[req.roleNeeded as FilmRole]}
                </span>
              </div>
              <p className="text-xs text-neutral-600">
                {req.projectTitle} · entering {req.festivalName} (
                {new Date(req.festivalStartDate).toLocaleDateString()})
              </p>
              <LocationBadge city={req.city} state={req.state} distanceKm={req.distanceKm} />
            </li>
          ))}
          {festivalCollaborations?.length === 0 && (
            <li className="text-sm text-neutral-500">No festival teams recruiting nearby right now.</li>
          )}
        </ul>
      )}

      {!loading && !error && tab === "festivals" && (
        <ul className="flex flex-col gap-2">
          {festivals?.map((festival) => (
            <li key={festival.id} className="rounded-md border border-neutral-200 bg-white px-3 py-2">
              <p className="font-medium text-neutral-900">{festival.name}</p>
              <p className="text-xs text-neutral-600">
                {new Date(festival.startDate).toLocaleDateString()} –{" "}
                {new Date(festival.endDate).toLocaleDateString()}
              </p>
              <LocationBadge city={festival.city} state={festival.state} distanceKm={festival.distanceKm} />
            </li>
          ))}
          {festivals?.length === 0 && (
            <li className="text-sm text-neutral-500">No festivals coming up in this window.</li>
          )}
        </ul>
      )}
    </div>
  );
}
