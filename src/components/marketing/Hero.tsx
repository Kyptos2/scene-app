import Link from "next/link";
import { PhoneMockup } from "@/components/marketing/PhoneMockup";

export function Hero() {
  return (
    <section className="border-b border-border bg-background">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:py-28">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
            The professional network built for filmmakers
          </p>
          <h1 className="mt-4 font-serif text-4xl font-semibold leading-[1.1] text-foreground sm:text-5xl">
            Every great film starts with a{" "}
            <span className="font-serif italic font-medium text-tint">connection.</span>
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-7 text-foreground/70">
            SCENE helps you find verified crew, join production workspaces, and connect at
            festivals and local shoots — instead of scrolling a feed that wasn&apos;t built for
            the film industry.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/signup"
              className="rounded-full bg-tint px-6 py-3 text-sm font-semibold text-white hover:opacity-90"
            >
              Try SCENE free
            </Link>
            <Link
              href="#features"
              className="text-sm font-semibold text-foreground hover:text-tint"
            >
              See what it does →
            </Link>
          </div>
        </div>

        <div className="flex justify-center lg:justify-end">
          <PhoneMockup />
        </div>
      </div>
    </section>
  );
}
