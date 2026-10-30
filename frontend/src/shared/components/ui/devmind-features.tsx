import {
  Activity,
  Bot,
  Database,
  MessageSquare,
  Network,
  ShieldCheck,
} from "lucide-react";
import { Reveal } from "./devmind-reveal";

const FEATURES = [
  {
    icon: Network,
    title: "Hybrid Gateway Architecture",
    text: "Deterministic work like auth, validation, routing and timeouts runs in a TypeScript gateway. AI reasoning runs in a separate FastAPI service, so each part stays fast, predictable and easy to debug.",
  },
  {
    icon: MessageSquare,
    title: "Playground & Prompt Library",
    text: "Test prompts and models side by side, then save, organize and reuse the ones that work across every project before anything reaches production.",
  },
  {
    icon: Database,
    title: "Codebase-Aware RAG",
    text: "Ground answers in your own code and docs. Retrieval pulls the right context for each question, so the AI works from your project instead of guessing.",
  },
  {
    icon: Bot,
    title: "Agents That Take Action",
    text: "Build agents that read files, search your codebase and cross-reference context, then return structured results your app can use directly.",
  },
  {
    icon: Activity,
    title: "Observability & Error Center",
    text: "Trace every request, latency and model call. Failures are captured and grouped in one place, so you can find and fix problems quickly.",
  },
  {
    icon: ShieldCheck,
    title: "Secure by Default",
    text: "Email OTP with Google and GitHub sign-in, project-level API keys and role-based access control keep every team member inside the right boundaries.",
  },
];

export default function FeaturesSection() {
  return (
    <section
      id="features"
      className="scroll-mt-20 bg-black px-5 py-20 text-white sm:px-8 md:py-24"
    >
      <Reveal className="mx-auto flex max-w-[900px] flex-col items-center text-center">
        <span className="text-base font-medium text-[#76B900] sm:text-lg">
          Core Features
        </span>

        <h2 className="mt-4 text-4xl font-medium leading-[1.15] tracking-tight text-white [text-wrap:balance] sm:text-5xl lg:text-[56px]">
          An AI Platform Purpose-Built for Developers
        </h2>

        <p className="mt-6 max-w-[800px] text-lg leading-relaxed text-white/50 [text-wrap:balance] sm:text-xl">
          Read your code, search it for context, and ship AI features through a
          gateway designed for production.
        </p>
      </Reveal>

      <Reveal
        delay={0.1}
        className="mx-auto mt-16 w-full max-w-[1500px] lg:w-[78%]"
      >
        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <article
              key={f.title}
              className="bg-black px-7 py-9 transition-colors duration-300 hover:bg-[#0b0b0b] sm:px-9 sm:py-10"
            >
              <span className="grid h-[60px] w-[60px] place-items-center rounded-xl border border-white/15 text-white/90">
                <f.icon size={22} strokeWidth={1.5} />
              </span>

              <h3 className="mt-6 text-xl font-semibold text-white">
                {f.title}
              </h3>

              <p className="mt-3 text-[17px] leading-[25px] text-white/50">
                {f.text}
              </p>
            </article>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
