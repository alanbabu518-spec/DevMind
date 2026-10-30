import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Database,
  FileText,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";

const sections = [
  {
    id: "information-we-collect",
    title: "1. Information We Collect",
    content: [
      {
        heading: "Account information",
        text: "When you create an account, we may process information such as your email address, account identifier, and profile information necessary to provide the service.",
      },
      {
        heading: "Usage and technical information",
        text: "We may process information about your interactions with DevMind, including feature usage, error reports, and technical information needed to operate, maintain, and secure the platform.",
      },
      {
        heading: "Code, files, and prompts",
        text: "When you use code analysis or AI features, you may submit source code, project files, prompts, and related content. Please do not submit passwords, API keys, personal information, or confidential information unless you are authorized to do so.",
      },
    ],
  },
  {
    id: "how-we-use-information",
    title: "2. How We Use Your Information",
    content: [
      {
        heading: "Provide and improve DevMind",
        text: "Information may be used to authenticate users, provide application features, process requests, maintain workspaces, troubleshoot problems, and improve service reliability.",
      },
      {
        heading: "Security and abuse prevention",
        text: "We may process relevant information to detect unauthorized access, investigate misuse, protect our infrastructure, and enforce our Terms & Conditions.",
      },
      {
        heading: "Communications",
        text: "We may use your contact information to send essential account, security, service, or support communications where applicable.",
      },
    ],
  },
  {
    id: "ai-and-third-parties",
    title: "3. AI Processing and Third-Party Services",
    content: [
      {
        heading: "AI providers",
        text: "Some features may rely on third-party AI models or infrastructure. Depending on the feature and implementation, submitted prompts, code, or other relevant content may be sent to those providers to process your request.",
      },
      {
        heading: "Other service providers",
        text: "DevMind may rely on hosting, database, authentication, monitoring, or other infrastructure providers to operate the service.",
      },
      {
        heading: "Provider policies",
        text: "Third-party services may process information under their own terms and privacy policies. Review the relevant providers' policies before submitting sensitive content.",
      },
    ],
  },
  {
    id: "data-storage-and-security",
    title: "4. Data Storage and Security",
    content: [
      {
        heading: "Storage",
        text: "Account information and other application data may be stored in databases or infrastructure used to operate DevMind. The specific information retained depends on the features you use and the application's implementation.",
      },
      {
        heading: "Security measures",
        text: "We aim to use reasonable technical and organizational safeguards to protect information against unauthorized access, loss, or misuse. However, no internet service or storage system can be guaranteed to be completely secure.",
      },
      {
        heading: "Your responsibility",
        text: "You are responsible for protecting your credentials and avoiding the submission of secrets or sensitive information that is unnecessary for the requested operation.",
      },
    ],
  },
  {
    id: "retention-and-deletion",
    title: "5. Data Retention and Deletion",
    content: [
      {
        heading: "Retention",
        text: "Information may be retained for as long as necessary to provide the service, maintain account records, address security concerns, meet legal obligations, and resolve disputes.",
      },
      {
        heading: "Deletion requests",
        text: "You may contact us to request access to, correction of, or deletion of personal information, subject to applicable law and legitimate retention requirements.",
      },
      {
        heading: "Third-party processing",
        text: "Deleting information from DevMind may not automatically delete copies held by third-party providers, where those copies exist. Such requests may need to be handled under the relevant provider's policies.",
      },
    ],
  },
  {
    id: "your-rights",
    title: "6. Your Privacy Rights",
    content: [
      {
        heading: "Access and correction",
        text: "Depending on applicable law, you may have rights to access, correct, delete, or obtain a copy of your personal information.",
      },
      {
        heading: "Objections and requests",
        text: "You may contact us with questions about our handling of your information or requests concerning your privacy rights. We may need to verify your identity before responding.",
      },
    ],
  },
  {
    id: "children-and-changes",
    title: "7. Children and Policy Updates",
    content: [
      {
        heading: "Children",
        text: "DevMind is intended for users who can legally use the service under applicable law. If you believe a child has provided personal information inappropriately, contact us so the matter can be reviewed.",
      },
      {
        heading: "Policy updates",
        text: "We may update this Privacy Policy as DevMind evolves. Material changes should be communicated through appropriate channels where required. The revised policy will include an updated effective date.",
      },
    ],
  },
];

export default function PrivacyPolicyPage() {
  const effectiveDate = "October 30, 2026";

  return (
    <main className="min-h-screen bg-[#090b08] text-white">
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 lg:py-16">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-white/60 transition hover:text-[#76B900]"
        >
          <ArrowLeft size={16} />
          Back to DevMind
        </Link>

        <header className="mt-10 border-b border-white/10 pb-10 sm:mt-14">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#76B900]/30 bg-[#76B900]/10 px-3 py-1.5 text-sm text-[#9ed447]">
            <ShieldCheck size={16} />
            Privacy & Data Protection
          </div>

          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Privacy <span className="text-[#76B900]">Policy.</span>
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-7 text-white/60 sm:text-lg">
            Learn how DevMind may collect, use, store, and process information
            when you use our developer tools and AI-powered features.
          </p>

          <p className="mt-5 text-sm text-white/40">
            Effective date: {effectiveDate}
          </p>
        </header>

        <div className="grid gap-10 py-10 lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-16">
          <aside className="h-fit rounded-2xl border border-white/10 bg-white/[0.025] p-5 lg:sticky lg:top-8">
            <h2 className="mb-4 text-sm font-semibold text-white">
              On this page
            </h2>

            <nav aria-label="Privacy policy sections">
              <ul className="space-y-3">
                {sections.map((section) => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      className="text-sm leading-6 text-white/50 transition hover:text-[#9ed447]"
                    >
                      {section.title}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          <div className="min-w-0">
            <div className="mb-8 rounded-2xl border border-[#76B900]/20 bg-[#76B900]/[0.06] p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <LockKeyhole
                  size={21}
                  className="mt-1 shrink-0 text-[#76B900]"
                />
                <div>
                  <h2 className="font-semibold">Your code deserves care.</h2>
                  <p className="mt-2 text-sm leading-7 text-white/60">
                    Before submitting code or project files, remove credentials,
                    private keys, and other secrets. Review how the relevant
                    features and third-party providers process submitted
                    content.
                  </p>
                </div>
              </div>
            </div>

            {sections.map((section) => (
              <section
                key={section.id}
                id={section.id}
                className="scroll-mt-8 border-b border-white/10 py-8 first:pt-0"
              >
                <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
                  {section.title}
                </h2>

                <div className="mt-5 space-y-6">
                  {section.content.map((item) => (
                    <div key={item.heading}>
                      <h3 className="font-medium text-white/90">
                        {item.heading}
                      </h3>
                      <p className="mt-2 text-sm leading-7 text-white/60 sm:text-base">
                        {item.text}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            ))}

            <section className="mt-8 rounded-2xl border border-white/10 p-6">
              <div className="flex items-start gap-3">
                <Database size={20} className="mt-1 shrink-0 text-[#76B900]" />
                <div>
                  <h2 className="font-semibold">Questions about your data?</h2>
                  <p className="mt-2 text-sm leading-7 text-white/60">
                    Contact the DevMind team through the official support
                    channel provided by the service. A verified contact address
                    should be published here before launch.
                  </p>
                </div>
              </div>
            </section>

            <div className="mt-10 flex flex-wrap gap-5 border-t border-white/10 pt-6">
              <Link
                to="/terms"
                className="inline-flex items-center gap-2 text-sm text-[#9ed447] hover:text-white"
              >
                Read Terms & Conditions <ArrowRight size={15} />
              </Link>

              <Link
                to="/docs"
                className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-[#9ed447]"
              >
                <FileText size={15} />
                Documentation
              </Link>
            </div>
          </div>
        </div>

        <footer className="border-t border-white/10 pt-6 text-sm text-white/40">
          © {new Date().getFullYear()} DevMind. All rights reserved.
        </footer>
      </div>
    </main>
  );
}
