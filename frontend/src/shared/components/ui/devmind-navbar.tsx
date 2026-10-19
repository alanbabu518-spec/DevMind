import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BrainIcon, Menu, X } from "lucide-react";

// `href` = scroll to a section on this page, `to` = router page
const LINKS: { name: string; href?: string; to?: string }[] = [
  { name: "Platform", href: "#platform" },
  { name: "Features", href: "#features" },
  { name: "Docs", to: "/docs" }, // change to your real docs route
  { name: "How it works", href: "#how-it-works" },
];

const linkClass =
  "rounded-full px-4 py-2 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white";

export default function DevMindNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const go = (e: React.MouseEvent, href: string) => {
    e.preventDefault();
    setOpen(false);
    document
      .querySelector(href)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const renderLink = (l: (typeof LINKS)[number], extra = "") =>
    l.to ? (
      <Link
        key={l.name}
        to={l.to}
        onClick={() => setOpen(false)}
        className={`${linkClass} ${extra}`}
      >
        {l.name}
      </Link>
    ) : (
      <a
        key={l.name}
        href={l.href}
        onClick={(e) => go(e, l.href!)}
        className={`${linkClass} ${extra}`}
      >
        {l.name}
      </a>
    );

  return (
    // No outer padding: the bar touches the top, left and right edges
    <header className="fixed inset-x-0 top-0 z-50">
      <nav
        className={`flex h-[68px] items-center justify-between border-b px-5 transition-colors duration-300 sm:px-8 md:grid md:grid-cols-[1fr_auto_1fr] md:px-10 lg:px-14 ${
          scrolled || open
            ? "border-white/15 bg-[#0b0e08]/85 backdrop-blur-xl"
            : "border-white/10 bg-transparent"
        }`}
      >
        {/* Left: brand */}
       <a
            href="/"
            aria-label="DevMind home"
            className="group inline-flex items-center gap-2.5"
          >
            <span className="grid h-9 w-9 place-items-center rounded-lg border border-[#76B900]/25 bg-[#76B900]/10 transition group-hover:bg-[#76B900]/20">
              <BrainIcon className="h-5 w-5 text-[#76B900]" />
            </span>
            <span className="text-xl font-extrabold tracking-tighter text-white">
              DevMind<span className="text-[#76B900]">.</span>
            </span>
          </a>

        {/* Center: links */}
        <div className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => renderLink(l))}
        </div>

        {/* Right: CTA */}
        <div className="flex items-center gap-2 justify-self-end">
          <Link
            to="/login"
            className="hidden items-center gap-2 rounded-full bg-[#76B900] px-5 py-2.5 text-sm font-semibold text-[#101509] transition-colors hover:bg-[#91d51b] sm:inline-flex"
          >
            Get started <ArrowRight size={16} />
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="grid h-10 w-10 place-items-center rounded-full text-white transition-colors hover:bg-white/10 md:hidden"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {open && (
        <div className="mx-3 mt-2 rounded-2xl border border-white/15 bg-[#0b0e08]/95 p-3 backdrop-blur-xl md:hidden">
          {LINKS.map((l) => renderLink(l, "block rounded-2xl py-3 text-base"))}
          <Link
            to="/login"
            className="mt-2 flex items-center justify-center gap-2 rounded-2xl bg-[#76B900] px-4 py-3 font-semibold text-[#101509]"
          >
            Get started <ArrowRight size={16} />
          </Link>
        </div>
      )}
    </header>
  );
}
