import Link from "next/link";
import { SceneMark } from "@/components/marketing/SceneMark";

const LINKS = [
  { href: "#features", label: "Features" },
  { href: "#pricing", label: "Pricing" },
  { href: "#about", label: "About" },
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
];

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 px-4 py-12 text-center sm:flex-row sm:justify-between sm:text-left">
        <Link href="/" className="flex items-center gap-2">
          <SceneMark size={16} color="var(--muted)" />
          <span className="text-sm font-semibold tracking-[0.15em] text-muted">SCENE</span>
        </Link>
        <nav className="flex flex-wrap items-center justify-center gap-5 text-sm text-foreground/70">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-foreground">
              {link.label}
            </Link>
          ))}
        </nav>
        <p className="text-xs text-muted">{new Date().getFullYear()} SCENE</p>
      </div>
    </footer>
  );
}
