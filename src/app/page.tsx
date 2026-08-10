import { getCurrentUser } from "@/lib/auth";
import { HomeFeed } from "@/components/HomeFeed";
import { Hero } from "@/components/marketing/Hero";
import { FeatureIconRow } from "@/components/marketing/FeatureIconRow";
import { FeatureSection } from "@/components/marketing/FeatureSection";
import { ForFilmmakers, ForFestivals } from "@/components/marketing/AudienceSections";
import { Pricing } from "@/components/marketing/Pricing";
import { About } from "@/components/marketing/About";
import { CTABand } from "@/components/marketing/CTABand";
import { Footer } from "@/components/marketing/Footer";

export default async function Home() {
  const user = await getCurrentUser();

  if (user) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10">
        <h1 className="font-serif text-xl font-semibold text-foreground">Home</h1>
        <HomeFeed />
      </div>
    );
  }

  return (
    <>
      <Hero />
      <FeatureIconRow />
      <FeatureSection />
      <ForFilmmakers />
      <ForFestivals />
      <Pricing />
      <About />
      <CTABand />
      <Footer />
    </>
  );
}
