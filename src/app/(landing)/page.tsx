import { Demos } from "@/components/landing/demos";
import { Hero } from "@/components/landing/hero";
import { CustomCursor, SmoothScroll } from "@/components/landing/motion-kit";
import { Closing, Features, HowItWorks, Proof } from "@/components/landing/sections";

export default function LandingPage() {
  return (
    <main className="overflow-x-clip bg-cream text-ink">
      <SmoothScroll />
      <CustomCursor />
      <Hero />
      <HowItWorks />
      <Features />
      <Demos />
      <Proof />
      <Closing />
    </main>
  );
}
