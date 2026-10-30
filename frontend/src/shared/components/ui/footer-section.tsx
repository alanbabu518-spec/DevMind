import type { FC } from "react";
import { Link } from "react-router-dom";
import {
  FaGithub,
  FaInstagram,
  FaLinkedin,
  FaXTwitter,
} from "react-icons/fa6";
import { FiArrowUpRight } from "react-icons/fi";
import { BrainIcon } from "lucide-react";

interface FooterLink {
  label: string;
  href: string;
  badge?: string;
  external?: boolean;
}

interface FooterColumn {
  title: string;
  links: FooterLink[];
}

interface SocialLink {
  icon: FC<{ className?: string }>;
  href: string;
  label: string;
}

interface FooterProps {
  description?: string;
  columns?: FooterColumn[];
  socialLinks?: SocialLink[];
  copyright?: string;
}

const DEFAULT_COLUMNS: FooterColumn[] = [
  {
    title: "PLATFORM",
    links: [
      { label: "AI Code Assistant", href: "/Home" },
      { label: "Codebase Analysis", href: "/Home" },
      { label: "AI Agents", href: "/Home" },
      { label: "Prompt Playground", href: "/Home" },
    ],
  },
  {
    title: "DEVELOPERS",
    links: [
      { label: "Getting Started", href: "/docs" },
      { label: "Documentation", href: "/docs" },
      {
        label: "GitHub Repository",
        href: "https://github.com/alanbabu518-spec/DevMind",
        external: true,
      },
      {
        label: "Report an Issue",
        href: "https://github.com/",
        external: true,
      },
    ],
  },
  {
    title: "RESOURCES",
    links: [
      { label: "About DevMind", href: "/about" },
      { label: "Contact Us", href: "mailto:support@devmind.app" },
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms & Conditions", href: "/terms" },
    ],
  },
];

const DEFAULT_SOCIAL_LINKS: SocialLink[] = [
  {
    icon: FaGithub,
    href: "https://github.com/alanbabu518-spec",
    label: "GitHub",
  },
  {
    icon: FaXTwitter,
    href: "https://x.com/Alan1161816",
    label: "X",
  },
  {
    icon: FaLinkedin,
    href: "https://www.linkedin.com/in/alan-babu-921ba92a6/",
    label: "LinkedIn",
  },
  {
    icon: FaInstagram,
    href: "https://www.instagram.com/",
    label: "Instagram",
  },
];

const linkClassName =
  "group inline-flex items-center gap-1.5 text-[15px] leading-6 text-white/50 transition-colors duration-200 hover:text-[#76B900] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#76B900]";

function FooterNavigationLink({ link }: { link: FooterLink }) {
  const { label, href, badge, external } = link;

  const content = (
    <>
      <span>{label}</span>

      {badge && (
        <span className="rounded bg-[#76B900]/15 px-1.5 py-0.5 text-[10px] font-medium text-[#76B900]">
          {badge}
        </span>
      )}

      {external && (
        <FiArrowUpRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
      )}
    </>
  );

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClassName}
      >
        {content}
      </a>
    );
  }

  if (href.startsWith("mailto:")) {
    return (
      <a href={href} className={linkClassName}>
        {content}
      </a>
    );
  }

  return (
    <Link to={href} className={linkClassName}>
      {content}
    </Link>
  );
}

export const Footer: FC<FooterProps> = ({
  description = "Build smarter with AI. Understand your codebase, explore project context, and create reliable AI-powered developer workflows from one platform.",
  columns = DEFAULT_COLUMNS,
  socialLinks = DEFAULT_SOCIAL_LINKS,
  copyright = `© ${new Date().getFullYear()} DevMind. All rights reserved.`,
}) => {
  return (
    <footer
      id="devmind-footer"
      className="relative w-full overflow-hidden border-t border-white/10 bg-black px-5 text-white sm:px-8"
    >
      {/* NVIDIA-green top accent */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#76B900]/60 to-transparent"
      />

      <div className="mx-auto max-w-[1500px] py-16 sm:py-20 lg:w-[78%]">
        {/* Brand and navigation */}
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
          {/* DevMind brand */}
          <div className="flex flex-col items-start">
            <Link
              to="/"
              aria-label="DevMind home"
              className="group inline-flex items-center gap-2.5"
            >
              <span className="grid h-9 w-9 place-items-center rounded-lg border border-[#76B900]/25 bg-[#76B900]/10 transition group-hover:bg-[#76B900]/20">
                <BrainIcon className="h-5 w-5 text-[#76B900]" />
              </span>

              <span className="text-xl font-extrabold tracking-tighter text-white">
                DevMind<span className="text-[#76B900]">.</span>
              </span>
            </Link>

            <p className="mt-5 max-w-md text-[17px] leading-[25px] text-white/50">
              {description}
            </p>

            {/* Social media */}
            <div className="mt-6 flex items-center gap-3">
              {socialLinks.map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 text-white/50 transition-all duration-300 hover:-translate-y-0.5 hover:border-[#76B900]/40 hover:bg-[#76B900]/10 hover:text-[#76B900] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#76B900]"
                >
                  <Icon className="h-[18px] w-[18px]" />
                </a>
              ))}
            </div>
          </div>

          {/* Footer navigation */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 sm:gap-x-8">
            {columns.map((column) => (
              <nav key={column.title} aria-label={column.title}>
                <h3 className="text-sm font-semibold tracking-[0.12em] text-white">
                  {column.title}
                </h3>

                <ul className="mt-6 space-y-4">
                  {column.links.map((link) => (
                    <li key={`${column.title}-${link.label}`}>
                      <FooterNavigationLink link={link} />
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-14 flex flex-col gap-5 border-t border-white/10 pt-7 text-sm text-white/40 sm:flex-row sm:items-center sm:justify-between">
          <p>{copyright}</p>

          <nav
            aria-label="Legal navigation"
            className="flex flex-wrap gap-5"
          >
            <Link
              to="/privacy"
              className="transition-colors hover:text-[#76B900]"
            >
              Privacy
            </Link>

            <Link
              to="/terms"
              className="transition-colors hover:text-[#76B900]"
            >
              Terms
            </Link>

            <Link
              to="/docs"
              className="transition-colors hover:text-[#76B900]"
            >
              Docs
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
};

export default Footer;