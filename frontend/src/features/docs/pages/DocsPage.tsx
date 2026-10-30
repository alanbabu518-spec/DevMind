import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  FileSearch,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";

const sections = [
  {
    icon: BookOpen,
    title: "Getting Started",
    description: "Learn how to create an account and set up your workspace.",
    items: [
      "Create your DevMind account.",
      "Complete the onboarding process.",
      "Explore the main workspace.",
    ],
  },
  {
    icon: FileSearch,
    title: "Codebase Analysis",
    description: "Understand how to analyze code and review findings.",
    items: [
      "Provide supported source code or project files.",
      "Run an analysis using the available tools.",
      "Review findings and recommendations.",
    ],
  },
  {
    icon: MessageSquare,
    title: "AI Code Assistant",
    description: "Learn how to ask questions about your code.",
    items: [
      "Describe the problem you want to solve.",
      "Provide relevant code and context.",
      "Review AI responses before applying changes.",
    ],
  },
  {
    icon: ShieldCheck,
    title: "Security and Privacy",
    description: "Understand your responsibilities when submitting code.",
    items: [
      "Never submit passwords, API keys, or other secrets.",
      "Review AI-generated recommendations before using them.",
      "Read the Privacy Policy to understand data handling.",
    ],
  },
];

export default function DocsPage() {
  return (
    <main className="min-h-screen bg-[#090b08] px-5 py-12 text-white sm:px-8">
      <div className="mx-auto max-w-5xl">
        <Link
          to="/"
          className="mb-10 inline-flex items-center gap-2 text-sm text-white/60 transition hover:text-[#76B900]"
        >
          <ArrowLeft size={16} />
          Back to DevMind
        </Link>

        <header className="border-b border-white/10 pb-10">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#76B900]/30 bg-[#76B900]/10 px-3 py-1.5 text-sm text-[#9ed447]">
            <BookOpen size={16} />
            DevMind Documentation
          </div>

          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Learn how to use{" "}
            <span className="text-[#76B900]">DevMind.</span>
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-7 text-white/60 sm:text-lg">
            Explore guides to help you understand DevMind's features, analyze
            code, and work more effectively with AI-powered developer tools.
          </p>
        </header>

        <section
          aria-label="Documentation topics"
          className="grid gap-5 py-10 md:grid-cols-2"
        >
          {sections.map((section) => {
            const Icon = section.icon;

            return (
              <article
                key={section.title}
                className="rounded-2xl border border-white/10 bg-white/[0.025] p-6 transition-colors hover:border-[#76B900]/40 hover:bg-white/[0.04] sm:p-8"
              >
                <div className="mb-5 grid h-11 w-11 place-items-center rounded-xl border border-[#76B900]/20 bg-[#76B900]/10">
                  <Icon className="h-5 w-5 text-[#76B900]" />
                </div>

                <h2 className="text-xl font-semibold">{section.title}</h2>

                <p className="mt-3 text-sm leading-6 text-white/60">
                  {section.description}
                </p>

                <ul className="mt-5 space-y-3">
                  {section.items.map((item) => (
                    <li
                      key={item}
                      className="flex gap-3 text-sm leading-6 text-white/75"
                    >
                      <span
                        aria-hidden="true"
                        className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#76B900]"
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </section>

        <section className="flex flex-col gap-5 rounded-2xl border border-white/10 bg-white/[0.025] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <h2 className="text-xl font-semibold">Legal information</h2>
            <p className="mt-2 text-sm leading-6 text-white/60">
              Learn how DevMind handles privacy and the terms that govern
              your use of the platform.
            </p>
          </div>

          <div className="flex flex-wrap gap-4">
            <Link
              to="/privacy"
              className="inline-flex items-center gap-2 text-sm text-[#9ed447] hover:text-white"
            >
              Privacy Policy <ArrowRight size={15} />
            </Link>

            <Link
              to="/terms"
              className="inline-flex items-center gap-2 text-sm text-[#9ed447] hover:text-white"
            >
              Terms & Conditions <ArrowRight size={15} />
            </Link>
          </div>
        </section>

        <footer className="mt-12 border-t border-white/10 pt-6 text-sm text-white/40">
          © {new Date().getFullYear()} DevMind. All rights reserved.
        </footer>
      </div>
    </main>
  );
}