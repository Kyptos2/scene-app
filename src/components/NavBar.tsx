import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { LogoutButton } from "@/components/LogoutButton";
import { SceneMark } from "@/components/marketing/SceneMark";

const MARKETING_LINKS = [
  { href: "/#features", label: "Features" },
  { href: "/#for-filmmakers", label: "For Filmmakers" },
  { href: "/#for-festivals", label: "For Festivals" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#about", label: "About" },
];

export async function NavBar() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-card/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <SceneMark size={20} color="currentColor" className="text-foreground" />
          <span className="text-lg font-bold tracking-[0.15em] text-foreground">SCENE</span>
        </Link>

        {user ? (
          <nav className="flex items-center gap-5 text-sm">
            <Link href="/projects/new" className="text-foreground/70 hover:text-foreground">
              New Project
            </Link>
            <Link href="/scan" className="text-foreground/70 hover:text-foreground">
              Scan
            </Link>
            <Link href={`/profile/${user.id}`} className="text-foreground/70 hover:text-foreground">
              My Profile
            </Link>
            <LogoutButton />
          </nav>
        ) : (
          <>
            <nav className="hidden items-center gap-6 text-sm text-foreground/70 lg:flex">
              {MARKETING_LINKS.map((link) => (
                <Link key={link.href} href={link.href} className="hover:text-foreground">
                  {link.label}
                </Link>
              ))}
            </nav>
            <div className="flex items-center gap-4 text-sm">
              <Link href="/login" className="text-foreground/70 hover:text-foreground">
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-tint px-4 py-1.5 font-medium text-white hover:opacity-90"
              >
                Get started
              </Link>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
