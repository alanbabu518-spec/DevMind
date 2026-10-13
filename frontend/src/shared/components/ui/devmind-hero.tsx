import { motion, useInView } from "motion/react";
import { ArrowRight } from "lucide-react";
import { useRef } from "react";
import { Link } from "react-router-dom";

interface WordsPullUpProps {
  text: string;
  className?: string;
  showAsterisk?: boolean;
}

export function WordsPullUp({
  text,
  className = "",
  showAsterisk = false,
}: WordsPullUpProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });
  const words = text.split(" ");

  return (
    <div
      ref={ref}
      aria-label={text}
      className={`inline-flex flex-wrap ${className}`}
    >
      {words.map((word, index) => (
        <motion.span
          key={`${word}-${index}`}
          aria-hidden="true"
          initial={{ y: 30, opacity: 0 }}
          animate={isInView ? { y: 0, opacity: 1 } : {}}
          transition={{
            duration: 0.65,
            delay: index * 0.09,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="relative inline-block"
          style={{ marginRight: index === words.length - 1 ? 0 : "0.23em" }}
        >
          {word}
          {showAsterisk && index === words.length - 1 && (
            <span className="absolute -right-[0.28em] top-[0.08em] text-[0.25em] text-[#76B900]">
              *
            </span>
          )}
        </motion.span>
      ))}
    </div>
  );
}

export default function DevMindHero() {
  return (
    <section
      id="top"
      className="relative flex min-h-[min(100svh,900px)] w-full items-center overflow-hidden bg-[#090b08]"
    >
      {/* Background video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover"
        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260405_170732_8a9ccda6-5cff-4628-b164-059c500a2b41.mp4"
      />

      {/* Dark overlay: strongest on the left so the text stays readable */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(5,8,4,0.92)_0%,rgba(5,8,4,0.65)_45%,rgba(5,8,4,0.2)_100%)]"
      />

      {/* Soft green glow on the right */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 top-1/4 h-[420px] w-[420px] rounded-full bg-[#76B900]/15 blur-[120px] sm:h-[600px] sm:w-[600px]"
      />

      {/* Fades the video into the next section */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#090b08] to-transparent"
      />

      {/* Content: simple, left aligned */}
      <div className="relative z-10 w-full px-5 pb-16 pt-32 sm:px-8 md:px-10 lg:px-14">
        <div className="max-w-2xl">
          <h1 className="text-5xl font-medium leading-[1.02] tracking-[-0.045em] text-[#f4f5ed] sm:text-6xl xl:text-7xl 2xl:text-8xl">
            <WordsPullUp text="Understand your code before it breaks." />
          </h1>

          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="mt-7 max-w-lg text-base leading-relaxed text-white/70 sm:text-lg"
          >
            DevMind reads your codebase, flags security and quality issues, and
            helps you ship AI features with confidence.
          </motion.p>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="mt-9 flex flex-wrap items-center gap-4"
          >
            <Link
              to="/devmind/login"
              className="group inline-flex items-center gap-3 rounded-full bg-[#76B900] py-1.5 pl-6 pr-1.5 text-sm font-semibold text-[#101509] transition-colors duration-200 hover:bg-[#91d51b] sm:text-base"
            >
              Get started
              <span className="grid h-10 w-10 place-items-center rounded-full bg-[#101509] text-[#e8f4d7] transition-transform duration-200 group-hover:-rotate-45">
                <ArrowRight size={19} />
              </span>
            </Link>

            <a
              href="#how-it-works"
              onClick={(e) => {
                e.preventDefault();
                document
                  .querySelector("#how-it-works")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
              className="rounded-full border border-white/20 px-6 py-3 text-sm font-medium text-white/85 transition-colors hover:bg-white/10 sm:text-base"
            >
              See how it works
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
