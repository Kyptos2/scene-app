const FEATURES = [
  {
    title: "Find your crew",
    body: "Search verified filmmakers by role — directors, DPs, editors, actors — and connect with the people you'd actually want on your next shoot.",
  },
  {
    title: "Team workspaces",
    body: "Every project gets its own space: department channels, crew invites, pinned announcements. The whole production, in one place.",
  },
  {
    title: "Festival networking",
    body: "Track submissions and deadlines, RSVP to festivals near you, and network with the filmmakers actually attending — not a static listings page.",
  },
  {
    title: "Indie catalog",
    body: "Showcase finished work, browse what other filmmakers are making, and leave reviews once you've actually watched it.",
  },
  {
    title: "Crew calls & messaging",
    body: "Post an open crew call, review applicants, and message collaborators directly — a request-based inbox keeps it free of cold-outreach spam.",
  },
] as const;

export function FeatureSection() {
  return (
    <section id="features" className="border-t border-border bg-card">
      <div className="mx-auto max-w-5xl px-4 py-20">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-tint">Features</p>
        <h2 className="mt-3 font-serif text-3xl font-semibold text-foreground">
          Everything a production actually needs
        </h2>
        <p className="mt-2 max-w-xl text-foreground/70">
          Not a job board. Not another LinkedIn feed. A network built around how film crews
          actually work together.
        </p>

        <div className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2">
          {FEATURES.map((feature) => (
            <div key={feature.title}>
              <h3 className="font-serif text-xl font-semibold text-foreground">{feature.title}</h3>
              <p className="mt-2 text-[15px] leading-6 text-foreground/70">{feature.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
