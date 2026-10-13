import { Code2, UsersRound, BrainCircuit } from "lucide-react";

const useCases = [
  {
    title: "Individual Developers",
    description:
      "Analyze your code, identify bugs and security issues, and get AI-powered recommendations to write cleaner, more reliable software.",
    icon: Code2,
  },
  {
    title: "Development Teams",
    description:
      "Improve code quality across projects, review architecture, and help your team follow consistent development standards.",
    icon: UsersRound,
  },
  {
    title: "AI/ML Engineers",
    description:
      "Review Python code, identify potential issues in AI pipelines, and improve the maintainability of machine learning projects.",
    icon: BrainCircuit,
  },
];

export default function UseCasesSection() {
  return (
    <section
      id="use-cases"
      className="w-full scroll-mt-20 bg-black px-6 py-12 text-white sm:px-10 sm:py-16 lg:py-20"
    >
      <div className="mx-auto max-w-[1288px]">
        {/* Section heading */}
        <div className="mb-10 text-center">
          <p className="mb-4 text-sm font-medium tracking-[0.18em] text-[#76B900]">
            USE CASES
          </p>

          <h2 className="text-4xl font-semibold tracking-tight sm:text-5xl lg:text-[52px] lg:leading-[1.15]">
            Who Is DevMind For?
          </h2>
        </div>

        {/* Three cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {useCases.map(({ title, description, icon: Icon }) => (
            <article
              key={title}
              className="flex min-h-[280px] flex-col rounded-[8px] border border-[#292929] bg-black px-6 pb-8 pt-8 transition-colors duration-200 hover:border-[#76B900]/50 sm:px-[34px]"
            >
              {/* Illustration */}
              <div className="mb-7 flex h-[64px] items-center justify-center">
                <Icon
                  size={58}
                  strokeWidth={1.15}
                  className="text-white"
                  aria-hidden="true"
                />
              </div>

              {/* Card content */}
              <div className="mt-auto">
                <h3 className="mb-3 text-[18px] font-semibold leading-snug text-white">
                  {title}
                </h3>

                <p className="text-[15px] leading-[1.6] text-[#999999]">
                  {description}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}