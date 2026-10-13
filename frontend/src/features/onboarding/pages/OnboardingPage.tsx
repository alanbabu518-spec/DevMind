import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, BrainIcon, Check} from "lucide-react";
import {useNavigate } from "react-router-dom";

const questions = [
  {
    eyebrow: "YOUR GOAL",
    title: "What do you want to achieve with DevMind?",
    options: [
      "Build better software",
      "Find bugs and security issues",
      "Improve code quality",
      "Prepare projects for deployment",
      "Learn and understand code",
    ],
  },
  {
    eyebrow: "YOUR ROLE",
    title: "What best describes you?",
    options: [
      "Frontend Developer",
      "Backend Developer",
      "Full Stack Developer",
      "AI/ML Engineer",
      "Student or New Graduate",
      "Other",
    ],
  },
  {
    eyebrow: "YOUR EXPERIENCE",
    title: "How long have you been coding?",
    options: [
      "Just getting started",
      "Less than 1 year",
      "1–3 years",
      "3–5 years",
      "5+ years",
    ],
  },
  {
    eyebrow: "YOUR CHALLENGE",
    title: "What takes the most time in your workflow?",
    options: [
      "Finding bugs",
      "Understanding unfamiliar code",
      "Fixing security vulnerabilities",
      "Improving code quality",
      "Reviewing architecture",
      "Preparing for deployment",
    ],
  },
  {
    eyebrow: "YOUR WORKFLOW",
    title: "What do you want to analyze?",
    options: [
      "Individual code files",
      "Entire projects",
      "AI/ML and Python code",
      "APIs and backend services",
      "Multiple repositories",
    ],
  },
  {
    eyebrow: "YOUR USAGE",
    title: "How will you mainly use DevMind?",
    options: [
      "Personal projects",
      "Learning and experimentation",
      "Professional development",
      "Team projects",
      "Production applications",
    ],
  },
];

const plans = [
  {
    name: "Free",
    price: "$0",
    description: "Explore DevMind and start improving your code.",
    features: [
      "Basic code analysis",
      "Limited AI assistance",
      "Essential code quality insights",
    ],
    action: "Get Started for Free",
    featured: false,
  },
  {
    name: "Pro",
    price: "$29",
    description: "For developers who want deeper code intelligence.",
    features: [
      "Advanced AI code analysis",
      "Security and code quality insights",
      "Detailed recommendations",
      "Higher usage limits",
    ],
    action: "Choose Pro",
    featured: true,
  },
  {
    name: "Team",
    price: "$50",
    description: "For teams building and maintaining better software.",
    features: [
      "Everything in Pro",
      "Team-oriented workflows",
      "Project-level insights",
      "Higher team usage limits",
    ],
    action: "Choose Team",
    featured: false,
  },
];

type Answers = Record<number, string>;
type Screen = "welcome" | "questions" | "pricing";
type Direction = "forward" | "back";

const ADVANCE_DELAY = 320;

export default function OnboardingPage() {
  const navigate = useNavigate();

  const [screen, setScreen] = useState<Screen>("welcome");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [direction, setDirection] = useState<Direction>("forward");

  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const locked = useRef(false);

  const progress = ((step + 1) / questions.length) * 100;

  useEffect(() => {
    return () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    };
  }, []);

  function cancelPendingAdvance() {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = null;
    locked.current = false;
  }

  function startOnboarding() {
    setDirection("forward");
    setScreen("questions");
  }

  // Selecting an answer highlights it, then automatically moves to the next question
  function selectAnswer(answer: string) {
    if (locked.current) return;
    locked.current = true;

    setAnswers((previous) => ({ ...previous, [step]: answer }));

    advanceTimer.current = setTimeout(() => {
      setDirection("forward");

      if (step < questions.length - 1) {
        setStep((previous) => previous + 1);
      } else {
        setScreen("pricing");
      }

      locked.current = false;
    }, ADVANCE_DELAY);
  }

  function goBack() {
    cancelPendingAdvance();
    setDirection("back");

    if (screen === "pricing") {
      setScreen("questions");
      setStep(questions.length - 1);
      return;
    }

    if (step === 0) {
      setScreen("welcome");
      return;
    }

    setStep((previous) => previous - 1);
  }

  function skipOnboarding() {
    cancelPendingAdvance();
    setDirection("forward");
    setScreen("pricing");
  }

  function choosePlan(planName: string) {
    navigate("/devmind/dashboard", {
      state: {
        onboardingAnswers: answers,
        selectedPlan: planName,
      },
    });
  }

  return (
    <main className="dm-mono relative min-h-dvh overflow-x-hidden bg-black text-white">
      {/* Fonts + animations */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600;700&display=swap');

        .dm-mono { font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-feature-settings: 'calt' 1, 'ss02' 1; }
        .dm-sans { font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif; }

        @keyframes dm-slide-in-right {
          from { opacity: 0; transform: translateX(40px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes dm-slide-in-left {
          from { opacity: 0; transform: translateX(-40px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes dm-fade-up {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .dm-slide-forward { animation: dm-slide-in-right 0.45s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .dm-slide-back    { animation: dm-slide-in-left 0.45s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .dm-fade-up       { animation: dm-fade-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .dm-option        { animation: dm-fade-up 0.45s cubic-bezier(0.22, 1, 0.36, 1) both; }
        @media (prefers-reduced-motion: reduce) {
          .dm-slide-forward, .dm-slide-back, .dm-fade-up, .dm-option { animation: none; }
        }
      `}</style>

      {/* Subtle green background glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/3 h-80 w-80 -translate-x-1/2 rounded-full bg-[#76B900]/[0.035] blur-[120px]"
      />

      {/* Header: back + logo + progress line + step + skip */}
      <header className="relative z-10 flex h-17 items-center gap-4 px-5 sm:px-8">
        {screen !== "welcome" && (
          <button
            type="button"
            onClick={goBack}
            aria-label="Go back"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/50 transition-colors hover:bg-white/5 hover:text-white"
          >
            <ArrowLeft size={19} />
          </button>
        )}

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

        {screen === "questions" ? (
          <>
            <div
              className="h-px flex-1 overflow-hidden bg-white/10"
              role="progressbar"
              aria-label="Onboarding progress"
              aria-valuemin={1}
              aria-valuemax={questions.length}
              aria-valuenow={step + 1}
            >
              <div
                className="h-full bg-[#76B900] transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>

            <span className="hidden whitespace-nowrap text-[10px] tracking-wider text-white/40 sm:block sm:text-xs">
              STEP {String(step + 1).padStart(2, "0")} /{" "}
              {String(questions.length).padStart(2, "0")}
            </span>
          </>
        ) : (
          <div className="flex-1" />
        )}

        {screen !== "pricing" && (
          <button
            type="button"
            onClick={skipOnboarding}
            className="shrink-0 text-sm text-white/50 transition-colors hover:text-white"
          >
            Skip for now
          </button>
        )}
      </header>

      {/* Welcome */}
      {screen === "welcome" && (
        <section className="relative flex min-h-[calc(100dvh-68px)] items-center justify-center px-5 pb-24">
          <div className="dm-fade-up w-full max-w-175">
            <p className="mb-5 text-xs tracking-[0.2em] text-[#76B900]">
              LET&apos;S BEGIN
            </p>

            <h1 className="text-4xl font-semibold leading-[1.15] tracking-tight sm:text-5xl">
              Build better software with DevMind.
            </h1>

            <p className="dm-sans mt-6 max-w-155 text-base leading-7 text-white/55 sm:text-lg">
              A few quick questions, then you&apos;ll see the plan that fits
              your workflow. About 2 minutes, no account needed yet.
            </p>

            <button
              type="button"
              onClick={startOnboarding}
              className="mt-9 inline-flex h-15 items-center gap-3 rounded-xl bg-[#76B900] px-8 text-base font-semibold text-black transition-all hover:bg-[#91d51b]"
            >
              Start
              <ArrowRight size={18} />
            </button>
          </div>
        </section>
      )}

      {/* Questions */}
      {screen === "questions" && (
        <section className="relative flex min-h-[calc(100dvh-68px)] items-center justify-center px-5 pb-24">
          <div
            key={step}
            className={`w-full max-w-175 ${
              direction === "forward" ? "dm-slide-forward" : "dm-slide-back"
            }`}
          >
            <p className="mb-4 text-xs tracking-[0.2em] text-[#76B900]">
              {questions[step].eyebrow}
            </p>

            <h1 className="mb-8 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
              {questions[step].title}
            </h1>

            <div className="space-y-3">
              {questions[step].options.map((option, index) => {
                const selected = answers[step] === option;

                return (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => selectAnswer(option)}
                    style={{ animationDelay: `${index * 60}ms` }}
                    className={`dm-option flex min-h-16.5 w-full items-center justify-between gap-4 rounded-xl border px-5 py-4 text-left text-base transition-all duration-200 ${
                      selected
                        ? "border-[#76B900]/70 bg-[#76B900]/8 text-white"
                        : "border-white/9 bg-[#0a0a0d] text-white/90 hover:border-[#76B900]/40 hover:bg-[#101014]"
                    }`}
                  >
                    <span>{option}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Pricing: fits one screen on desktop, stacks and scrolls only on mobile */}
      {screen === "pricing" && (
        <section className="relative mx-auto flex w-full max-w-275 flex-col justify-center px-5 pb-8 sm:px-8 md:h-[calc(100dvh-68px)] md:pb-6">
          <div className="dm-fade-up mx-auto mb-5 max-w-2xl text-center md:mb-[clamp(12px,3vh,32px)]">
            <h1 className="text-3xl font-semibold tracking-tight md:text-[clamp(26px,4.6vh,40px)]">
              Choose your plan.
            </h1>

            <p className="dm-sans mt-2 text-sm leading-6 text-white/55 md:text-[clamp(13px,1.9vh,15px)]">
              Start for free and upgrade whenever your development needs grow.
            </p>
          </div>

          <div className="grid grid-cols-1 items-stretch gap-3 md:grid-cols-3 md:gap-4">
            {plans.map((plan, index) => (
              <article
                key={plan.name}
                style={{ animationDelay: `${index * 100}ms` }}
                className={`dm-fade-up relative flex flex-col rounded-2xl border p-5 md:p-[clamp(16px,2.6vh,24px)] ${
                  plan.featured
                    ? "border-[#76B900]/60 bg-[#76B900]/45"
                    : "border-white/10 bg-[#0b0b0d]"
                }`}
              >
                {plan.featured && (
                  <span className="absolute right-4 top-4 rounded-full bg-[#76B900] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-black">
                    Popular
                  </span>
                )}

                <h2 className="text-base font-semibold">{plan.name}</h2>

                <p className="dm-sans mt-2 text-[13px] leading-5 text-white/50 md:min-h-10">
                  {plan.description}
                </p>

                <div className="mt-4 flex items-baseline gap-1 md:mt-[clamp(8px,1.8vh,16px)]">
                  <span className="text-4xl font-semibold tracking-tight md:text-[clamp(28px,4.8vh,38px)]">
                    {plan.price}
                  </span>
                  <span className="text-xs text-white/40">/ month</span>
                </div>

                <div className="my-4 h-px bg-white/10 md:my-[clamp(10px,2vh,18px)]" />

                <ul className="flex-1 space-y-2.5 md:space-y-[clamp(6px,1.3vh,10px)]">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="dm-sans flex items-start gap-2.5 text-[13px] leading-5 text-white/70"
                    >
                      <Check
                        size={15}
                        className="mt-0.5 shrink-0 text-[#76B900]"
                      />
                      {feature}
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={() => choosePlan(plan.name)}
                  className={`mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors md:mt-[clamp(12px,2.4vh,20px)] ${
                    plan.featured
                      ? "bg-[#76B900] text-black hover:bg-[#91d51b]"
                      : "border border-white/15 bg-white/3 text-white hover:border-[#76B900]/50 hover:bg-white/06"
                  }`}
                >
                  {plan.action}
                  <ArrowRight size={15} />
                </button>
              </article>
            ))}
          </div>

          <p className="dm-sans mt-4 text-center text-[11px] leading-4 text-white/30 md:mt-[clamp(8px,1.8vh,16px)]">
            Pricing is a UI preview. Billing, plan limits, and payment
            processing must be configured before launch.
          </p>
        </section>
      )}
    </main>
  );
}
