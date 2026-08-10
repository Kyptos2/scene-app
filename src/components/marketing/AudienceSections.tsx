import { SceneMark } from "@/components/marketing/SceneMark";

const FILMMAKER_POINTS = [
  "Search by role — director, DP, editor, actor — not just a keyword box.",
  "A team workspace for every project: channels, crew invites, pinned announcements.",
  "Post a crew call, review applicants, hire — all in one thread.",
];

const FESTIVAL_POINTS = [
  "Track submission deadlines across every festival you've entered.",
  "RSVP and see who else from your network is attending.",
  "Gold members get exclusive festival-only networking.",
];

// Each panel is a large decorative card built from the brand mark rather
// than a stock photo — there's no real production-still library to pull
// from yet, and an unrelated stock image would look more like padding than
// content.
function DecorativePanel({ className }: { className?: string }) {
  return (
    <div className={`flex aspect-[4/3] items-center justify-center rounded-2xl border border-border bg-surface2 ${className ?? ""}`}>
      <SceneMark size={96} color="var(--tint)" />
    </div>
  );
}

export function ForFilmmakers() {
  return (
    <section id="for-filmmakers" className="border-t border-border bg-background">
      <div className="mx-auto grid max-w-5xl items-center gap-12 px-4 py-20 lg:grid-cols-2">
        <DecorativePanel />
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-tint">For filmmakers</p>
          <h2 className="mt-3 font-serif text-3xl font-semibold text-foreground">
            From first connection to final cut.
          </h2>
          <p className="mt-3 text-foreground/70">
            Whether you&apos;re a director, cinematographer, editor, or just getting started,
            SCENE gives you the tools to find your team and get to work.
          </p>
          <ul className="mt-6 flex flex-col gap-3">
            {FILMMAKER_POINTS.map((point) => (
              <li key={point} className="flex gap-3 text-sm text-foreground/80">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-tint" />
                {point}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export function ForFestivals() {
  return (
    <section id="for-festivals" className="border-t border-border bg-card">
      <div className="mx-auto grid max-w-5xl items-center gap-12 px-4 py-20 lg:grid-cols-2">
        <div className="order-2 lg:order-1">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-tint">For festivals</p>
          <h2 className="mt-3 font-serif text-3xl font-semibold text-foreground">
            Festival season, actually organized.
          </h2>
          <p className="mt-3 text-foreground/70">
            Stop tracking deadlines in a spreadsheet. SCENE keeps submissions, dates, and the
            people you&apos;ll meet there in one place.
          </p>
          <ul className="mt-6 flex flex-col gap-3">
            {FESTIVAL_POINTS.map((point) => (
              <li key={point} className="flex gap-3 text-sm text-foreground/80">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-tint" />
                {point}
              </li>
            ))}
          </ul>
        </div>
        <DecorativePanel className="order-1 lg:order-2" />
      </div>
    </section>
  );
}
