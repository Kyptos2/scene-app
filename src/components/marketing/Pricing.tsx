import Link from "next/link";

const FREE_FEATURES = [
  "Filmmaker profile & portfolio",
  "Networking, messaging & connections",
  "Team project workspaces",
  "Post & apply to crew calls",
];

const GOLD_FEATURES = [
  "Everything in Free",
  "Full festival listings & submission tracking",
  "Exclusive festival networking",
  "RSVP and see who's attending",
];

export function Pricing() {
  return (
    <section id="pricing" className="border-t border-border bg-background">
      <div className="mx-auto max-w-5xl px-4 py-20">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-tint">Pricing</p>
        <h2 className="mt-3 font-serif text-3xl font-semibold text-foreground">
          Everything you need to work is free.
        </h2>
        <p className="mt-2 max-w-xl text-foreground/70">
          Gold adds full festival access — for the crews actively submitting and traveling to
          festivals.
        </p>

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-8">
            <h3 className="font-serif text-xl font-semibold text-foreground">Free</h3>
            <p className="mt-1 text-3xl font-semibold text-foreground">$0</p>
            <ul className="mt-6 flex flex-col gap-3">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="text-sm text-foreground/80">
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/signup"
              className="mt-8 block rounded-full border border-border py-3 text-center text-sm font-semibold text-foreground hover:bg-surface2"
            >
              Get started
            </Link>
          </div>

          <div className="rounded-2xl border-2 border-tint bg-card p-8">
            <h3 className="font-serif text-xl font-semibold text-foreground">Gold</h3>
            <p className="mt-1 text-3xl font-semibold text-foreground">
              $45<span className="text-base font-normal text-foreground/60">/month</span>
            </p>
            <ul className="mt-6 flex flex-col gap-3">
              {GOLD_FEATURES.map((f) => (
                <li key={f} className="text-sm text-foreground/80">
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/signup"
              className="mt-8 block rounded-full bg-tint py-3 text-center text-sm font-semibold text-white hover:opacity-90"
            >
              Get started
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
