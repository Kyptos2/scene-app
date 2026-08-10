export function About() {
  return (
    <section id="about" className="border-t border-border bg-background">
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-tint">About</p>
        <h2 className="mt-3 font-serif text-3xl font-semibold text-foreground">
          Built by filmmakers, for filmmakers.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-foreground/70">
          General networking tools were never built for how film crews actually find each
          other and work together. SCENE exists to be the one place a production, a submission,
          and a career all live — instead of scattered across a dozen apps that weren&apos;t
          built for this industry.
        </p>
      </div>
    </section>
  );
}
