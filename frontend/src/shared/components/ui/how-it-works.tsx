import type React from "react";
import { Layers, Search, Zap } from "lucide-react";
import { cn } from "../../lib/utils";

interface HowItWorksProps extends React.HTMLAttributes<HTMLElement> {}

interface StepCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  benefits: string[];
}

const steps = [
  {
    icon: <Search className="h-6 w-6" />,
    title: "Analyze Your Code",
    description:
      "Submit your code to DevMind and let the analysis engine inspect its structure, quality, and potential issues.",
    benefits: [
      "Analyze code from multiple languages",
      "Identify readability and code smells",
      "Get structured analysis results",
    ],
  },
  {
    icon: <Layers className="h-6 w-6" />,
    title: "Understand the Issues",
    description:
      "Explore findings with clear explanations of root causes, security risks, and opportunities to improve your code.",
    benefits: [
      "Understand why an issue matters",
      "Review security vulnerabilities",
      "Explore actionable recommendations",
    ],
  },
  {
    icon: <Zap className="h-6 w-6" />,
    title: "Improve Your Code",
    description:
      "Use AI-assisted recommendations to improve your implementation and prepare your application for deployment.",
    benefits: [
      "Get practical improvement suggestions",
      "Improve error handling and reliability",
      "Review deployment readiness",
    ],
  },
];

function StepCard({
  icon,
  title,
  description,
  benefits,
}: StepCardProps) {
  return (
    <article
      className={cn(
        "relative rounded-2xl border border-white/10 bg-[#0d0d0d] p-6 text-white",
        "transition-all duration-300 ease-in-out",
        "hover:-translate-y-1 hover:border-white/30",
        "hover:bg-[#111111] hover:shadow-[0_12px_40px_rgba(255,255,255,0.04)]",
      )}
    >
      {/* Icon */}
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-white">
        {icon}
      </div>

      {/* Title and description */}
      <h3 className="mb-3 text-xl font-semibold tracking-tight">
        {title}
      </h3>

      <p className="mb-6 text-sm leading-6 text-white/60">
        {description}
      </p>

      {/* Benefits */}
      <ul className="space-y-3">
        {benefits.map((benefit) => (
          <li key={benefit} className="flex items-start gap-3">
            <span className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white/10">
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
            </span>

            <span className="text-sm leading-5 text-white/65">
              {benefit}
            </span>
          </li>
        ))}
      </ul>
    </article>
  );
}

export function HowItWorks({
  className,
  ...props
}: HowItWorksProps) {
  return (
    <section
      id="how-it-works"
      aria-labelledby="how-it-works-title"
      className={cn(
        "w-full scroll-mt-20 bg-black px-5 py-12 text-white sm:px-8 sm:py-16 lg:px-10 lg:py-20",
        className,
      )}
      {...props}
    >
      <div className="mx-auto max-w-[1288px]">
        {/* Section heading */}
        <header className="mx-auto mb-10 max-w-4xl text-center">
          <p className="mb-4 text-sm font-medium tracking-[0.18em] text-[#76B900]">
            HOW IT WORKS
          </p>

          <h2
            id="how-it-works-title"
            className="text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl"
          >
            From Code to Clarity in Three Steps
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-white/55 sm:text-lg">
            Understand your code, discover potential problems, and get
            actionable AI-powered recommendations with DevMind.
          </p>
        </header>

        {/* Numbered step indicators */}
        <div className="relative mx-auto mb-6 hidden max-w-4xl md:block">
          <div
            aria-hidden="true"
            className="absolute left-[16.6667%] top-1/2 h-px w-[66.6667%] -translate-y-1/2 bg-white/20"
          />

          <div className="relative grid grid-cols-3">
            {steps.map((step, index) => (
              <div
                key={step.title}
                className="flex h-9 w-9 items-center justify-center justify-self-center rounded-full border border-white/25 bg-[#101010] text-sm font-semibold text-white ring-4 ring-black"
              >
                {index + 1}
              </div>
            ))}
          </div>
        </div>

        {/* Responsive step cards */}
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 md:grid-cols-3 lg:gap-5">
          {steps.map((step) => (
            <StepCard
              key={step.title}
              icon={step.icon}
              title={step.title}
              description={step.description}
              benefits={step.benefits}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export default HowItWorks;