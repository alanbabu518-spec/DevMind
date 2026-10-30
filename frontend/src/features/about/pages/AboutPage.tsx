import { Link } from "react-router-dom";
import {
  ArrowRight,
  BrainCircuit,
  Code2,
  Lightbulb,
  Target,
  Workflow,
} from "lucide-react";

import { FaGithub } from "react-icons/fa6";

const VALUES = [
  {
    icon: BrainCircuit,
    title: "AI-powered development",
    description:
      "Use AI to help understand code, explore project context, and improve everyday development workflows.",
  },
  {
    icon: Code2,
    title: "Built for developers",
    description:
      "Focus on practical developer needs, from understanding existing codebases to solving complex problems.",
  },
  {
    icon: Workflow,
    title: "Smarter workflows",
    description:
      "Bring useful AI capabilities into a more connected development experience.",
  },
];

export default function AboutPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#080a07] text-white">
      {/* Hero */}
      <section className="relative px-5 pb-24 pt-36 sm:px-8 sm:pt-44">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-20 h-72 w-72 -translate-x-1/2 rounded-full bg-[#76B900]/10 blur-[120px]"
        />

        <div className="relative mx-auto max-w-5xl text-center">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#76B900]/20 bg-[#76B900]/5 px-4 py-2 text-sm text-[#a8c77c]">
            <BrainCircuit size={16} />
            About DevMind
          </div>

          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
            Building a smarter way to{" "}
            <span className="text-[#76B900]">develop with AI.</span>
          </h1>

          <p className="mx-auto mt-7 max-w-2xl text-base leading-8 text-white/55 sm:text-lg">
            DevMind is an AI-powered developer platform designed to help
            developers understand codebases, explore ideas, and build more
            effectively with AI.
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-full bg-[#76B900] px-6 py-3 font-semibold text-[#101509] transition-colors hover:bg-[#91d51b]"
            >
              Get started <ArrowRight size={17} />
            </Link>

            <a
              href="https://github.com/alanbabu518-spec/DevMind"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 px-6 py-3 font-medium text-white/80 transition-colors hover:border-white/30 hover:bg-white/5 hover:text-white"
            >
              <FaGithub size={18} />
              Explore on GitHub
            </a>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="border-y border-white/[0.07] bg-white/[0.015] px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto grid max-w-6xl gap-12 md:grid-cols-2 md:items-center md:gap-20">
          <div>
            <div className="mb-5 flex items-center gap-2 text-sm font-medium uppercase tracking-[0.18em] text-[#76B900]">
              <Target size={17} />
              Our mission
            </div>

            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Make working with complex code feel simpler.
            </h2>

            <p className="mt-6 leading-8 text-white/55">
              Modern software projects can involve large codebases,
              interconnected services, unfamiliar technologies, and complex
              workflows. Understanding everything takes time.
            </p>

            <p className="mt-4 leading-8 text-white/55">
              DevMind aims to make that work easier by bringing AI-assisted code
              understanding and developer-focused tools into one platform.
            </p>
          </div>

          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#0d100b] p-7 sm:p-10">
            <div
              aria-hidden="true"
              className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#76B900]/10 blur-3xl"
            />

            <BrainCircuit size={42} className="relative text-[#76B900]" />

            <h3 className="relative mt-7 text-2xl font-semibold">
              Understand more. Build better.
            </h3>

            <p className="relative mt-4 leading-7 text-white/50">
              Our goal is to help developers spend less time navigating
              complexity and more time creating useful software.
            </p>
          </div>
        </div>
      </section>

      {/* What we offer */}
      <section className="px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-5 flex items-center justify-center gap-2 text-sm font-medium uppercase tracking-[0.18em] text-[#76B900]">
              <Lightbulb size={17} />
              What drives us
            </div>

            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Designed around real developer needs.
            </h2>

            <p className="mt-5 leading-8 text-white/50">
              DevMind focuses on making AI useful, accessible, and practical
              throughout the software development process.
            </p>
          </div>

          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {VALUES.map(({ icon: Icon, title, description }) => (
              <article
                key={title}
                className="rounded-2xl border border-white/10 bg-white/[0.02] p-7 transition-colors duration-300 hover:border-[#76B900]/30 hover:bg-[#76B900]/[0.03]"
              >
                <div className="grid h-12 w-12 place-items-center rounded-xl border border-[#76B900]/20 bg-[#76B900]/10">
                  <Icon size={23} className="text-[#76B900]" />
                </div>

                <h3 className="mt-6 text-xl font-semibold">{title}</h3>

                <p className="mt-3 text-sm leading-7 text-white/50">
                  {description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Vision */}
      <section className="px-5 pb-24 sm:px-8 sm:pb-32">
        <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl border border-[#76B900]/20 bg-gradient-to-br from-[#76B900]/10 via-[#0d100b] to-[#0d100b] px-6 py-14 text-center sm:px-12 sm:py-20">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-0 h-40 w-64 -translate-x-1/2 rounded-full bg-[#76B900]/10 blur-[90px]"
          />

          <div className="relative">
            <h2 className="text-3xl font-bold tracking-tight sm:text-5xl">
              The future of development is{" "}
              <span className="text-[#76B900]">intelligent.</span>
            </h2>

            <p className="mx-auto mt-6 max-w-2xl leading-8 text-white/55">
              We're building DevMind with the belief that AI should do more than
              generate code. It should help developers understand, reason, and
              build with greater confidence.
            </p>

            <Link
              to="/login"
              className="mt-9 inline-flex items-center gap-2 rounded-full bg-[#76B900] px-6 py-3 font-semibold text-[#101509] transition-colors hover:bg-[#91d51b]"
            >
              Explore DevMind <ArrowRight size={17} />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
