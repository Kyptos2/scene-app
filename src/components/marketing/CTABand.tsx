import Link from "next/link";
import { DemoQRCode } from "@/components/marketing/DemoQRCode";

export function CTABand() {
  return (
    <section className="border-t border-border bg-card">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-8 px-4 py-16 sm:flex-row sm:justify-between">
        <div className="text-center sm:text-left">
          <p className="font-serif text-2xl font-semibold text-foreground">The industry is here.</p>
          <p className="font-serif text-2xl italic font-medium text-tint">Join the scene.</p>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-border bg-background p-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Get started free</p>
            <p className="text-xs text-foreground/70">Scan to sign up on your phone.</p>
            <Link href="/signup" className="mt-2 inline-block text-xs font-semibold text-tint hover:underline">
              Or sign up here →
            </Link>
          </div>
          <DemoQRCode />
        </div>
      </div>
    </section>
  );
}
