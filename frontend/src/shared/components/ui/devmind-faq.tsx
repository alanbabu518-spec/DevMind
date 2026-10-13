import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronDown, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Reveal } from "./devmind-reveal";

const FAQS = [
  {
    q: "What is DevMind?",
    a: "DevMind is an AI developer platform. It helps you understand your codebase, build and test prompts, connect AI to your own code and docs, and monitor everything in production from one place.",
  },
  {
    q: "How does DevMind work under the hood?",
    a: "Your app talks to a TypeScript gateway that handles auth, validation and timeouts. The gateway forwards AI work to a separate FastAPI service, so reasoning and engineering stay cleanly apart.",
  },
  {
    q: "What are RAG and agents used for?",
    a: "RAG pulls the right context from your own code and docs before the AI answers, so responses are grounded in your project. Agents go further: they read files, search the codebase and return structured results.",
  },
  {
    q: "How is my project kept secure?",
    a: "Sign-in uses email OTP, Google or GitHub. Each project has its own API keys, and role-based access control decides what every team member can see and change.",
  },
  {
    q: "How do I get started?",
    a: "Sign in, create a project, then add your prompts and generate an API key. After that, call the DevMind API from your app and watch requests and errors in the dashboard.",
  },
];

/* Streams text one character at a time while reserving space for the full answer. */
function StreamingText({
  text,
  speed = 12,
  startDelay = 150,
}: {
  text: string;
  speed?: number;
  startDelay?: number;
}) {
  const reduceMotion = useReducedMotion();
  const [count, setCount] = useState(reduceMotion ? text.length : 0);

  useEffect(() => {
    if (reduceMotion) {
      setCount(text.length);
      return;
    }

    let i = 0;
    let timer: ReturnType<typeof setTimeout>;

    setCount(0);

    const tick = () => {
      i += 1;
      setCount(i);

      if (i >= text.length) return;

      const ch = text[i - 1];
      const delay = ".!?".includes(ch)
        ? speed * 12
        : ",;:".includes(ch)
          ? speed * 6
          : speed;

      timer = setTimeout(tick, delay);
    };

    timer = setTimeout(tick, startDelay);

    return () => clearTimeout(timer);
  }, [text, speed, startDelay, reduceMotion]);

  const done = count >= text.length;

  return (
    <p className="relative text-[15px] leading-relaxed text-white/60 sm:text-base">
      <span className="opacity-0">{text}</span>

      <span aria-hidden="true" className="absolute inset-0">
        {text.slice(0, count)}
        {!done && (
          <span className="ml-0.5 inline-block h-[1em] w-[2px] translate-y-[2px] animate-pulse bg-[#76B900]" />
        )}
      </span>
    </p>
  );
}

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section
      id="faq"
      className="w-full scroll-mt-20 bg-black px-5 py-12 text-white sm:px-8 sm:py-16 lg:px-10 lg:py-20"
    >
      {/* Heading */}
      <Reveal className="mx-auto flex max-w-[900px] flex-col items-center text-center">
        <span className="text-base font-medium text-[#76B900] sm:text-lg">
          FAQ
        </span>

        <h2 className="mt-4 text-4xl font-medium leading-[1.15] tracking-tight text-white [text-wrap:balance] sm:text-5xl lg:text-[56px]">
          Frequently Asked Questions
        </h2>

        <p className="mt-4 max-w-[700px] text-lg leading-relaxed text-white/50 [text-wrap:balance] sm:text-xl">
          Quick answers to the things developers ask us most.
        </p>
      </Reveal>

      {/* Accordion */}
      <Reveal delay={0.1} className="mx-auto mt-10 w-full max-w-3xl">
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-black">
          {FAQS.map((item, index) => {
            const open = openIndex === index;
            const buttonId = `faq-trigger-${index}`;
            const panelId = `faq-panel-${index}`;

            return (
              <div
                key={item.q}
                className="border-b border-white/10 last:border-b-0"
              >
                <h3>
                  <button
                    type="button"
                    id={buttonId}
                    aria-expanded={open}
                    aria-controls={panelId}
                    onClick={() => setOpenIndex(open ? null : index)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left text-base font-medium text-white transition-colors hover:bg-white/[0.03] sm:px-6 sm:text-lg"
                  >
                    <span className="flex items-center gap-3">
                      <Sparkles
                        aria-hidden="true"
                        className="size-4 shrink-0 text-[#76B900]"
                        strokeWidth={2}
                      />
                      {item.q}
                    </span>

                    <ChevronDown
                      aria-hidden="true"
                      className={`size-5 shrink-0 text-white/50 transition-transform duration-300 ${
                        open ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                </h3>

                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div
                      id={panelId}
                      role="region"
                      aria-labelledby={buttonId}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{
                        duration: 0.35,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                      className="overflow-hidden"
                    >
                      <div className="pb-6 pl-11 pr-5 sm:pl-[52px] sm:pr-6">
                        <StreamingText text={item.a} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        <p className="mt-6 text-center text-[15px] text-white/50">
          Still have questions?{" "}
          <Link
            to="/docs"
            className="font-medium text-[#76B900] transition-colors hover:text-[#91d51b]"
          >
            Read the docs
          </Link>
        </p>
      </Reveal>
    </section>
  );
}
