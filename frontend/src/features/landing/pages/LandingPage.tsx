import DevMindNavbar from "../../../shared/components/ui/devmind-navbar";
import DevMindHero from "../../../shared/components/ui/devmind-hero";
import FeaturesSection from "../../../shared/components/ui/devmind-features";
import FaqSection from "@/shared/components/ui/devmind-faq";
import UseCasesSection from "@/shared/components/ui/devmind-usecases";
import HowItWorks from "@/shared/components/ui/how-it-works";
import FooterSection from "@/shared/components/ui/footer-section";

export default function LandingPage() {
  return (
    <main className="relative min-h-screen w-full overflow-x-clip bg-[#090b08] text-white">
      <DevMindNavbar />
      <DevMindHero />
      <UseCasesSection />
      <FeaturesSection />
      <HowItWorks />
      <FaqSection />
      {/* <DevMindCta /> */}
      <FooterSection />
    </main>
  );
}
