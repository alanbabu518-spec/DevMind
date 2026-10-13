import {
  ArrowRight,
  ArrowUpRight,
  Code2,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";

const footerGroups = [
  {
    title: "Platform",
    links: [
      { label: "Features", href: "#features" },
      { label: "How It Works", href: "#how-it-works" },
      { label: "Use Cases", href: "#use-cases" },
      { label: "FAQ", href: "#faq" },
    ],
  },
  {
    title: "Get Started",
    links: [
      { label: "Sign In", href: "/devmind/login" },
      { label: "Start Building", href: "/devmind/login" },
    ],
  },
];

export default function FooterSection() {
  return (
    <footer className="relative w-full overflow-hidden border-t border-white/10 bg-black text-white">
      {/* Subtle green glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 left-1/2 h-64 w-[600px] -translate-x-1/2 rounded-full bg-[#76B900]/[0.06] blur-[100px]"
      />

      <div className="relative mx-auto max-w-[1288px] px-5 sm:px-8 lg:px-10">
        {/* CTA */}
        <div className="border-b border-white/10 py-14 sm:py-16">
          <div className="flex flex-col gap-7 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#76B900]/25 bg-[#76B900]/[0.07] px-3 py-1.5 text-xs font-medium tracking-wide text-[#91d51b]">
                <Sparkles size={13} />
                BUILT FOR DEVELOPERS
              </div>

              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl lg:text-[42px] lg:leading-tight">
                Write better code.
                <span className="text-white/45"> Build with confidence.</span>
              </h2>

              <p className="mt-4 max-w-xl text-sm leading-6 text-white/50 sm:text-base">
                Analyze code, discover issues, and turn AI-powered insights
                into better software with DevMind.
              </p>
            </div>

            <Link
              to="/devmind/login"
              className="group inline-flex w-fit shrink-0 items-center justify-center gap-2 rounded-lg bg-[#76B900] px-5 py-3 text-sm font-semibold text-black transition-all duration-200 hover:bg-[#91d51b] hover:shadow-[0_0_28px_rgba(118,185,0,0.18)]"
            >
              Get Started
              <ArrowRight
                size={16}
                className="transition-transform duration-200 group-hover:translate-x-1"
              />
            </Link>
          </div>
        </div>

        {/* Main footer content */}
        <div className="grid grid-cols-1 gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr] lg:gap-16 lg:py-14">
          {/* Brand */}
          <div className="max-w-sm">
            <Link
              to="/"
              aria-label="DevMind home"
              className="group inline-flex items-center gap-3"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#76B900]/30 bg-[#76B900]/[0.08] transition-colors group-hover:bg-[#76B900]/15">
                <Code2
                  size={22}
                  strokeWidth={1.8}
                  className="text-[#76B900]"
                />
              </span>

              <span className="text-xl font-bold tracking-tight">
                DevMind
              </span>
            </Link>

            <p className="mt-5 text-sm leading-6 text-white/45">
              Your AI-powered workspace for code analysis, engineering
              intelligence, and building reliable software.
            </p>

            {/* <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              aria-label="GitHub"
              className="mt-6 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-white/60 transition-all hover:border-[#76B900]/40 hover:text-[#91d51b]"
            >
              <Github size={18} />
            </a> */}
          </div>

          {/* Link groups */}
          {footerGroups.map((group) => (
            <div key={group.title}>
              <h3 className="mb-5 text-sm font-semibold text-white">
                {group.title}
              </h3>

              <nav
                aria-label={`${group.title} links`}
                className="flex flex-col items-start gap-4"
              >
                {group.links.map((item) => {
                  const isInternalRoute = item.href.startsWith("/");

                  const className =
                    "group inline-flex items-center gap-1.5 text-sm text-white/50 transition-colors hover:text-[#91d51b]";

                  return isInternalRoute ? (
                    <Link
                      key={item.label}
                      to={item.href}
                      className={className}
                    >
                      {item.label}
                      <ArrowUpRight
                        size={13}
                        className="opacity-0 transition-opacity group-hover:opacity-100"
                      />
                    </Link>
                  ) : (
                    <a
                      key={item.label}
                      href={item.href}
                      className={className}
                    >
                      {item.label}
                    </a>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col gap-3 border-t border-white/10 py-6 text-xs text-white/35 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} DevMind. All rights reserved.
          </p>

          <p className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#76B900]" />
            Built for developers. Powered by AI.
          </p>
        </div>
      </div>
    </footer>
  );
}
