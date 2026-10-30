import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  FileText,
  Scale,
  ShieldCheck,
} from "lucide-react";

const sections = [
  {
    id: "acceptance",
    title: "1. Acceptance of These Terms",
    paragraphs: [
      "These Terms & Conditions govern your access to and use of DevMind, including its website, developer tools, code analysis features, and AI-powered functionality.",
      "By accessing or using DevMind, you agree to these Terms. If you do not agree, do not use the service.",
    ],
  },
  {
    id: "eligibility",
    title: "2. Eligibility and Accounts",
    paragraphs: [
      "You must be legally permitted to use DevMind under the laws applicable to you. If you use the service on behalf of an organization, you represent that you have authority to accept these Terms on its behalf.",
      "You are responsible for providing accurate account information, protecting your login credentials, and activities performed through your account. Notify the service operator if you suspect unauthorized access.",
    ],
  },
  {
    id: "acceptable-use",
    title: "3. Acceptable Use",
    paragraphs: [
      "You agree to use DevMind lawfully and responsibly. You must not use the service to violate applicable laws, infringe the rights of others, distribute malicious code, or attempt unauthorized access to systems or data.",
      "You must not interfere with the service, circumvent security controls, abuse usage limits, or attempt to disrupt the availability of DevMind or its infrastructure.",
      "You may only upload, analyze, or submit code and other materials that you own or are authorized to use. You are responsible for obtaining any permissions required for your submissions.",
    ],
  },
  {
    id: "user-content",
    title: "4. Your Code and Submitted Content",
    paragraphs: [
      "You retain the rights you already hold in the code, files, prompts, and other content you submit to DevMind, subject to any rights belonging to other parties.",
      "You authorize DevMind to process submitted content as reasonably necessary to provide the features you request, operate the service, maintain security, and perform related functions described in the Privacy Policy.",
      "You are responsible for ensuring that your submissions do not unlawfully disclose confidential information, personal information, credentials, trade secrets, or third-party intellectual property.",
    ],
  },
  {
    id: "ai-results",
    title: "5. AI-Generated Results",
    paragraphs: [
      "DevMind may provide AI-generated explanations, code suggestions, analysis reports, and other outputs. Such outputs may be incomplete, inaccurate, outdated, insecure, or unsuitable for your particular requirements.",
      "AI-generated results are provided as assistance, not as a substitute for professional judgment, independent testing, security reviews, or qualified legal advice.",
      "You are responsible for reviewing, testing, and validating generated code and recommendations before using them in production or relying on them for important decisions.",
      "Unless expressly stated otherwise in a separate written agreement, DevMind does not guarantee that AI-generated output is unique, error-free, or suitable for a particular purpose.",
    ],
  },
  {
    id: "intellectual-property",
    title: "6. Intellectual Property",
    paragraphs: [
      "The DevMind name, branding, website design, software, and other service materials may be protected by intellectual property laws. Except where permitted by law or expressly authorized, you may not copy, redistribute, modify, or commercially exploit protected service materials.",
      "These Terms do not transfer ownership of your pre-existing content to DevMind. Rights in third-party software, models, libraries, and other materials remain subject to their applicable licenses and terms.",
    ],
  },
  {
    id: "third-party-services",
    title: "7. Third-Party Services",
    paragraphs: [
      "DevMind may integrate with third-party hosting providers, AI services, infrastructure, or other external services. Your use of those services may also be governed by their separate terms and policies.",
      "DevMind is not responsible for independent third-party services beyond the responsibilities imposed by applicable law. Availability and functionality may depend on those providers.",
    ],
  },
  {
    id: "availability",
    title: "8. Availability and Changes",
    paragraphs: [
      "We aim to maintain a useful and reliable service but do not guarantee uninterrupted, secure, or error-free operation.",
      "Features may be modified, suspended, or discontinued as DevMind develops. Where required by applicable law or an applicable agreement, we will provide appropriate notice of material changes.",
    ],
  },
  {
    id: "termination",
    title: "9. Suspension and Termination",
    paragraphs: [
      "Access may be restricted or suspended when reasonably necessary to protect the service, investigate suspected abuse, address security risks, comply with legal obligations, or enforce these Terms.",
      "Where appropriate and legally permitted, we will provide notice and an opportunity to address the issue. You may stop using DevMind at any time.",
      "Termination does not remove obligations or liabilities that arose before termination or provisions that are intended to survive it.",
    ],
  },
  {
    id: "liability",
    title: "10. Disclaimers and Liability",
    paragraphs: [
      "To the extent permitted by applicable law, DevMind is provided on an 'as available' and 'as is' basis, without guarantees that the service will meet every requirement or that its outputs will be accurate or secure.",
      "Nothing in these Terms excludes or limits a right, remedy, or liability that cannot lawfully be excluded or limited. Any permitted limitations of liability must be interpreted in accordance with applicable law.",
      "You should not rely on DevMind as the sole means of protecting critical systems, validating security, or making decisions that require independent professional review.",
    ],
  },
  {
    id: "changes-and-law",
    title: "11. Changes and Applicable Law",
    paragraphs: [
      "We may update these Terms as the service evolves. Updated Terms should include a revised effective date. Where required, we will notify users of material changes before they take effect.",
      "Applicable law and dispute-resolution procedures must be determined and stated by the service operator based on the relevant business, location, and legal requirements. Nothing in these Terms removes mandatory consumer protections that apply to you.",
    ],
  },
];

export default function TermsPage() {
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
            <Scale size={16} />
            Platform Agreement
          </div>

          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Terms & <span className="text-[#76B900]">Conditions.</span>
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-7 text-white/60 sm:text-lg">
            These terms explain the rules, responsibilities, and limitations
            that apply when you use DevMind.
          </p>

          <p className="mt-5 text-sm text-white/40">
            Effective date: {effectiveDate}
          </p>
        </header>

        <div className="grid gap-10 py-10 lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-16">
          <aside className="h-fit rounded-2xl border border-white/10 bg-white/[0.025] p-5 lg:sticky lg:top-8">
            <h2 className="mb-4 text-sm font-semibold">On this page</h2>

            <nav aria-label="Terms and conditions sections">
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
                <ShieldCheck
                  size={21}
                  className="mt-1 shrink-0 text-[#76B900]"
                />

                <div>
                  <h2 className="font-semibold">Use AI responsibly.</h2>
                  <p className="mt-2 text-sm leading-7 text-white/60">
                    Review AI-generated code, verify security-sensitive
                    recommendations, and ensure that you have permission to
                    submit any code or files you analyze.
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

                <div className="mt-5 space-y-4">
                  {section.paragraphs.map((paragraph, index) => (
                    <p
                      key={`${section.id}-${index}`}
                      className="text-sm leading-7 text-white/60 sm:text-base"
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            ))}

            <section className="mt-8 rounded-2xl border border-white/10 p-6">
              <div className="flex items-start gap-3">
                <FileText size={20} className="mt-1 shrink-0 text-[#76B900]" />

                <div>
                  <h2 className="font-semibold">
                    Questions about these terms?
                  </h2>
                  <p className="mt-2 text-sm leading-7 text-white/60">
                    Contact the DevMind team through the official support
                    channel provided by the service. Publish a verified contact
                    address before making this page publicly available.
                  </p>
                </div>
              </div>
            </section>

            <div className="mt-10 flex flex-wrap gap-5 border-t border-white/10 pt-6">
              <Link
                to="/privacy"
                className="inline-flex items-center gap-2 text-sm text-[#9ed447] hover:text-white"
              >
                Privacy Policy <ArrowRight size={15} />
              </Link>

              <Link
                to="/docs"
                className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-[#9ed447]"
              >
                <BookOpen size={15} />
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
