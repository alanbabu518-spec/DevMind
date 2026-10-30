import { useEffect, useRef, useState, type FormEvent } from "react";

import { useReducedMotion, motion } from "motion/react";
import { Link } from "react-router-dom";

const VIDEO_SRC = "/video/login.mp4";
const POSTER_SRC = "/video/login-poster.jpg";

type AuthStep = "options" | "sent";

type ConnectionNavigator = Navigator & {
  connection?: { saveData?: boolean };
};

// Shared press feedback: only the properties that change are listed (never
// `transition-all`), and scale is a composite-only property.
const PRESS =
  "touch-manipulation select-none transition-[transform,background-color,border-color,color] duration-150 ease-out active:scale-[0.97]";

// Form buttons: same rules as PRESS plus the native-feel fixes — no gray tap
// flash, no long-press callout. Feedback fires on press via :active, and
// `hover:` only applies on hover-capable pointers (Tailwind v4), so nothing
// sticks after a tap.
const BTN =
  "touch-manipulation select-none [-webkit-tap-highlight-color:transparent] [-webkit-touch-callout:none] transition-[transform,background-color,border-color,color] duration-150 ease-out active:scale-[0.98] flex min-h-12 w-full items-center justify-center gap-2.5 rounded-[14px] lg:min-h-14 px-4 text-[15px] tracking-[-0.01em] focus-visible:outline-none focus-visible:ring-2";

const BTN_SOCIAL = `${BTN} bg-white/[0.09] font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:bg-white/[0.14] focus-visible:ring-white/60`;

const BTN_PRIMARY = `${BTN} bg-[#f2f2f2] font-semibold text-[#0b0d0b] hover:bg-white focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0d0b] disabled:cursor-not-allowed disabled:opacity-60`;

export default function AuthenticationPage() {
  const reducedMotion = useReducedMotion();

  const [step, setStep] = useState<AuthStep>("options");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  // Respect reduced motion and Save-Data: show the poster only, and let the
  // user opt in with the play button.
  const saveData =
    typeof navigator !== "undefined" &&
    (navigator as ConnectionNavigator).connection?.saveData === true;
  const canAutoplay = !reducedMotion && !saveData;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // React doesn't reliably reflect the `muted` prop to the DOM attribute,
    // and iOS/Chrome block autoplay unless the element is truly muted.
    video.muted = true;

    if (canAutoplay) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [canAutoplay]);

  function toggleVideo() {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }

  useEffect(() => {
    if (resendCooldown <= 0) return;

    const timer = window.setTimeout(() => {
      setResendCooldown((value) => Math.max(0, value - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  function continueWith(provider: "google" | "github") {
    window.location.assign(`/api/auth/oauth/${provider}`);
  }

  async function sendMagicLink(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();

    if (loading) return;

    if (step === "sent" && resendCooldown > 0) return;

    setError("");
    setMessage("");

    const normalizedEmail = email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError("Please enter a valid email address.");
      setStep("options");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email: normalizedEmail }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.message ||
            result.error ||
            "Unable to send the sign-in link. Please try again.",
        );
      }

      setEmail(normalizedEmail);
      setMessage(
        result.message ||
          "If this email can sign in, you will receive a secure link shortly.",
      );
      setStep("sent");
      setResendCooldown(30);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  function returnToOptions() {
    setError("");
    setMessage("");
    setStep("options");
  }

  return (
    <main className="flex min-h-dvh flex-col bg-[#050605] text-white lg:grid lg:h-dvh lg:grid-cols-[minmax(0,44fr)_minmax(0,56fr)] lg:gap-3 lg:p-3">
      {/* ───────────── Form ───────────── */}
      <section className="relative z-10 -mt-7 flex flex-1 flex-col rounded-t-3xl border-t border-[#76B900]/20 bg-[#0b0d0b] px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] pt-8 lg:mt-0 lg:rounded-none lg:border-0 lg:bg-transparent lg:px-12 lg:py-8">
        <a
          href="/"
          aria-label="DevMind home"
          className="hidden w-fit lg:inline-flex"
        >
          <Logo />
        </a>

        <div className="mx-auto flex w-full max-w-95 flex-1 flex-col justify-center py-6 lg:max-w-[30rem]">
          <motion.div
            key={step}
            initial={
              reducedMotion
                ? false
                : { opacity: 0, transform: "translateY(8px)" }
            }
            animate={{ opacity: 1, transform: "translateY(0px)" }}
            transition={{ type: "spring", duration: 0.4, bounce: 0 }}
          >
            <div className="mb-6 text-center lg:mb-8">
              <h1 className="text-[28px] font-semibold leading-[1.1] tracking-[-0.04em] text-white lg:text-[32px]">
                {step === "sent" ? "Check your inbox" : "Welcome back"}
              </h1>

              <p className="mx-auto mt-2 max-w-[22rem] text-sm leading-6 text-[#8d9388]">
                {step === "sent"
                  ? "Your secure sign-in link is on its way. Check your email to continue."
                  : "Sign in to your workspace for code analysis and security insights."}
              </p>
            </div>

            {/* Card: outer radius = inner radius (14) + padding (20 / 28) so
                the corners stay concentric. Flat surface, no backdrop blur. */}
            <div className="rounded-[34px] border border-white/[0.07] bg-white/[0.02] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] lg:rounded-[42px] lg:p-7">
              {error && (
                <div
                  role="alert"
                  className="mb-3 flex gap-3 rounded-[14px] border border-red-500/20 bg-red-500/[0.07] px-4 py-2.5 text-sm leading-5 text-red-300"
                >
                  <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {message && step === "sent" && (
                <div
                  role="status"
                  className="mb-3 rounded-[14px] border border-[#76B900]/20 bg-[#76B900]/[0.07] px-4 py-2.5 text-sm leading-6 text-[#d1e7b4]"
                >
                  {message}
                </div>
              )}

              {step === "options" && (
                <div>
                  <div className="space-y-2.5 lg:space-y-3">
                    <button
                      type="button"
                      onClick={() => continueWith("google")}
                      className={BTN_SOCIAL}
                    >
                      <GoogleIcon />
                      Continue with Google
                    </button>

                    <button
                      type="button"
                      onClick={() => continueWith("github")}
                      className={BTN_SOCIAL}
                    >
                      <GitHubIcon />
                      Continue with GitHub
                    </button>
                  </div>

                  <p className="py-4 text-center text-xs lg:py-5 font-medium uppercase tracking-[0.08em] text-[#7e8578]">
                    Or
                  </p>

                  <form
                    onSubmit={sendMagicLink}
                    noValidate
                    className="space-y-2.5 lg:space-y-3"
                  >
                    <label htmlFor="email" className="sr-only">
                      Email address
                    </label>

                    {/* 16px font: iOS Safari zooms the page on focus below 16px */}
                    <input
                      id="email"
                      name="email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      enterKeyHint="send"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(event) => {
                        setEmail(event.target.value);
                        if (error) setError("");
                      }}
                      aria-invalid={Boolean(error)}
                      className="min-h-12 w-full rounded-[14px] lg:min-h-14 border border-white/[0.07] bg-black/30 px-4 text-[16px] text-white outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-[#6b7068] hover:border-white/15 focus:border-white/30 focus:ring-4 focus:ring-white/[0.06] aria-invalid:border-red-500/50 aria-invalid:focus:ring-red-500/10"
                    />

                    <button
                      type="submit"
                      disabled={loading}
                      className={BTN_PRIMARY}
                    >
                      {loading ? <SpinnerIcon /> : "Continue with email"}
                    </button>
                  </form>
                </div>
              )}

              {step === "sent" && (
                <div className="space-y-2.5">
                  <div className="rounded-[14px] border border-white/[0.07] bg-black/30 px-4 py-3">
                    <p className="text-xs text-[#7e8578]">Link sent to</p>
                    <p className="mt-0.5 break-all text-sm font-medium text-white">
                      {email}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => sendMagicLink()}
                    disabled={loading || resendCooldown > 0}
                    className={`${BTN_PRIMARY} disabled:opacity-50`}
                  >
                    {loading
                      ? "Sending…"
                      : resendCooldown > 0
                        ? `Resend available in ${resendCooldown}s`
                        : "Resend sign-in link"}
                  </button>

                  <button
                    type="button"
                    onClick={returnToOptions}
                    className={`${BTN} text-[#969b92] hover:text-white focus-visible:ring-white/40`}
                  >
                    Use a different email
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        <p className="mx-auto w-full max-w-95 text-center text-xs leading-6 text-[#666d61] lg:max-w-[30rem]">
          By continuing, you agree to our{" "}
          <Link
            to="/terms"
            className="text-[#a6ada0] underline decoration-white/15 underline-offset-4 hover:text-[#76B900]"
          >
            Terms
          </Link>{" "}
          and{" "}
          <Link
            to="/privacy"
            className="text-[#a6ada0] underline decoration-white/15 underline-offset-4 hover:text-[#76B900]"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </section>

      {/* ───────────── Video ───────────── */}
      {/* DOM-after the form so keyboard focus hits the form first, but
          `order-first` puts it on top on phones. */}
      <aside className="relative order-first h-[clamp(180px,36dvh,340px)] shrink-0 overflow-hidden bg-[#0d1a1f] lg:order-last lg:h-auto lg:rounded-2xl">
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover"
          src={VIDEO_SRC}
          poster={POSTER_SRC}
          muted
          loop
          playsInline
          preload={canAutoplay ? "metadata" : "none"}
          aria-hidden="true"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
        />

        {/* Static scrim for text legibility (never animated) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/70 via-black/5 to-black/35"
        />

        <a
          href="/"
          aria-label="DevMind home"
          className="absolute left-5 top-[calc(env(safe-area-inset-top,0px)+1rem)] lg:hidden"
        >
          <Logo />
        </a>

        <button
          type="button"
          onClick={toggleVideo}
          aria-label={
            playing ? "Pause background video" : "Play background video"
          }
          className={`${PRESS} absolute right-4 top-[calc(env(safe-area-inset-top,0px)+0.75rem)] grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-black/55 text-white hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#76B900] lg:bottom-5 lg:right-5 lg:top-auto lg:h-9 lg:w-9`}
        >
          {playing ? (
            <PauseIcon className="h-4 w-4" />
          ) : (
            <PlayIcon className="h-4 w-4" />
          )}
        </button>

        <div className="pointer-events-none absolute bottom-8 left-8 right-24 hidden lg:block">
          <p className="max-w-sm text-[28px] font-semibold leading-[1.1] tracking-[-0.04em] text-white">
            From keystroke to the bigger picture.
          </p>
          <p className="mt-2 max-w-xs text-sm leading-6 text-white/70">
            Code analysis that sees the whole system.
          </p>
        </div>
      </aside>
    </main>
  );
}

function Logo() {
  return (
    <span className="group inline-flex items-center gap-2.5">
      <span className="grid h-9 w-9 place-items-center rounded-lg border border-[#76B900]/25 bg-black/55 lg:bg-[#76B900]/10">
        <BrainIcon className="h-5 w-5 text-[#76B900]" />
      </span>

      <span className="text-xl font-extrabold tracking-tighter text-white">
        DevMind<span className="text-[#76B900]">.</span>
      </span>
    </span>
  );
}

function BrainIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
      <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" />
      <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4" />
      <path d="M17.599 6.5a3 3 0 0 0 .399-1.375" />
      <path d="M6.003 5.125A3 3 0 0 0 6.401 6.5" />
      <path d="M3.477 10.896a4 4 0 0 1 .585-.396" />
      <path d="M19.938 10.5a4 4 0 0 1 .585.396" />
      <path d="M6 18a4 4 0 0 1-1.967-.516" />
      <path d="M19.967 17.484A4 4 0 0 1 18 18" />
    </svg>
  );
}

function PlayIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" />
    </svg>
  );
}

function PauseIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5 shrink-0" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2l6.5 5.1c3.8-3.5 6.2-8.7 6.2-15Z"
      />
      <path
        fill="#34A853"
        d="M24 44c5.5 0 10.1-1.8 13.5-4.8L31 34.1c-1.8 1.2-4.1 2-7 2-5.3 0-9.8-3.6-11.4-8.4L6 32.8A20 20 0 0 0 24 44Z"
      />
      <path
        fill="#FBBC05"
        d="M12.6 27.7a12 12 0 0 1 0-7.4L6 15.2a20 20 0 0 0 0 17.6l6.6-5.1Z"
      />
      <path
        fill="#EA4335"
        d="M24 12c3 0 5.7 1 7.8 3.1l5.8-5.8C34.1 6 29.5 4 24 4A20 20 0 0 0 6 15.2l6.6 5.1C14.2 15.6 18.7 12 24 12Z"
      />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-5 w-5 shrink-0"
      aria-hidden="true"
    >
      <path d="M12 .9a11.1 11.1 0 0 0-3.51 21.63c.56.1.76-.24.76-.54v-2.1c-3.1.67-3.76-1.32-3.76-1.32-.5-1.28-1.23-1.62-1.23-1.62-1.01-.69.08-.68.08-.68 1.12.08 1.7 1.15 1.7 1.15.99 1.7 2.6 1.21 3.23.92.1-.72.39-1.21.71-1.49-2.47-.28-5.07-1.24-5.07-5.51 0-1.22.44-2.21 1.15-2.99-.12-.28-.5-1.42.11-2.95 0 0 .94-.3 3.05 1.14a10.6 10.6 0 0 1 5.55 0c2.11-1.44 3.05-1.14 3.05-1.14.61 1.53.23 2.67.11 2.95.72.78 1.15 1.77 1.15 2.99 0 4.28-2.6 5.23-5.08 5.5.4.35.76 1.03.76 2.08v3.08c0 .3.2.65.77.54A11.1 11.1 0 0 0 12 .9Z" />
    </svg>
  );
}

function AlertIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4M12 16h.01" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-4 w-4 animate-spin"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeOpacity=".25"
        strokeWidth="3"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
