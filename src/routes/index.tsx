import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { Stats } from "@/components/landing/Stats";
import { StoryFeed } from "@/components/landing/StoryFeed";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Industries } from "@/components/landing/Industries";
import { WhyItWorks } from "@/components/landing/WhyItWorks";
import { CTASection } from "@/components/landing/CTASection";
import { Footer } from "@/components/landing/Footer";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "StoryLens AI — Cinematic Story Videos for Every Business" },
      {
        name: "description",
        content:
          "Turn real life situations into cinematic story videos with AI. Built for restaurants, real estate, gyms, auto, education and more.",
      },
      { property: "og:title", content: "StoryLens AI — Cinematic Story Videos" },
      {
        property: "og:description",
        content: "AI Story Marketing, built for every business. Ready in minutes.",
      },
    ],
  }),
});

function Index() {
  return (
    <main className="bg-[#070709] text-white min-h-screen">
      <Navbar />
      <Hero />
      <Stats />
      <StoryFeed />
      <HowItWorks />
      <Industries />
      <WhyItWorks />
      <CTASection />
      <Footer />
    </main>
  );
}
