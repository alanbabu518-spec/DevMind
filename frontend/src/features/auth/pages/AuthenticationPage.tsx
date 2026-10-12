import { useEffect, useState, type FormEvent } from "react";
import { useReducedMotion, motion } from "motion/react";
import GravityStars from "../../../shared/components/ui/gravity-stars";

const GREEN = "#76B900";

type AuthStep = "options" | "sent";

export default function AuthenticationPage() {
  const reducedMotion = useReducedMotion();

  const [step, setStep] = useState<AuthStep>("options");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

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
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-[#050605] px-4 pb-8 pt-24 text-white sm:px-6">
      {/* Existing GravityStars background. Settings remain unchanged. */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <GravityStars
          className="h-full min-h-screen w-full bg-[#050605]"
          color={GREEN}
          count={260}
          connect
          connectDistance={120}
          glow={5.5}
          gravity={0.9}
          speed={0.6}
          starSize={1.6}
          tint={0.15}
          twinkle={0.45}
        />
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-130 w-130 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#76B900]/5.5 blur-[130px]"
      />

      <header className="absolute inset-x-0 top-0 z-10 border-b border-white/6 bg-[#050605]/50 backdrop-blur-md">
        <nav className="flex h-16 items-center px-4 sm:px-8">
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
        </nav>
      </header>

      <motion.div
        initial={reducedMotion ? false : { opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-125"
      >
        <section className="overflow-hidden rounded-2xl border border-white/11 bg-[#0d0f0d]/95 shadow-[0_30px_100px_rgba(0,0,0,0.65)] backdrop-blur-2xl">
          <div className="h-px w-full bg-linear-to-r from-transparent via-[#76B900]/80 to-transparent" />

          <motion.div
            key={step}
            initial={reducedMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="px-6 py-7 sm:px-10 sm:py-8"
          >

            <div className="mb-6 text-center">
              <h1 className="text-[26px] font-bold tracking-[-0.04em] text-white sm:text-[28px]">
                {step === "sent" ? "Check your inbox" : "Welcome to DevMind"}
              </h1>

              <p className="mx-auto mt-2 max-w-90 text-sm leading-6 text-[#92978e]">
                {step === "sent"
                  ? "Your secure sign-in link is on its way. Check your email to continue."
                  : "Sign in to your intelligent workspace for code analysis and security insights."}
              </p>
            </div>

            {error && (
              <div
                role="alert"
                className="mb-4 flex gap-3 rounded-xl border border-red-500/20 bg-red-500/[0.07] px-4 py-2.5 text-sm leading-5 text-red-300"
              >
                <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Success feedback */}
            {message && step === "sent" && (
              <div
                role="status"
                className="mb-4 rounded-xl border border-[#76B900]/20 bg-[#76B900]/[0.07] px-4 py-2.5 text-sm leading-6 text-[#d1e7b4]"
              >
                {message}
              </div>
            )}

            {/* OAuth + inline email */}
            {step === "options" && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => continueWith("google")}
                    className="flex min-h-11.5 w-full items-center justify-center gap-2.5 rounded-xl border border-white/13 bg-white/[0.035] px-4 py-2.5 text-sm font-semibold text-white transition duration-200 hover:border-white/25 hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#76B900]"
                  >
                    <GoogleIcon />
                    Google
                  </button>

                  <button
                    type="button"
                    onClick={() => continueWith("github")}
                    className="flex min-h-11.5 w-full items-center justify-center gap-2.5 rounded-xl border border-white/13 bg-white/[0.035] px-4 py-2.5 text-sm font-semibold text-white transition duration-200 hover:border-white/25 hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#76B900]"
                  >
                    <GitHubIcon />
                    GitHub
                  </button>
                </div>

                <div className="flex items-center gap-4 py-1.5">
                  <div className="h-px flex-1 bg-white/9" />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#686e65]">
                    Or
                  </span>
                  <div className="h-px flex-1 bg-white/9" />
                </div>

                <form onSubmit={sendMagicLink} noValidate>
                  <label htmlFor="email" className="sr-only">
                    Email address
                  </label>

                  <div className="relative">
                    <MailIcon className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-[#6f776a]" />

                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(event) => {
                        setEmail(event.target.value);
                        if (error) setError("");
                      }}
                      aria-invalid={Boolean(error)}
                      className="min-h-12.5 w-full rounded-xl border border-white/13 bg-black/25 pl-11 pr-14 text-sm text-white outline-none transition placeholder:text-[#6a7166] focus:border-[#76B900]/70 focus:ring-4 focus:ring-[#76B900]/08"
                    />

                    <button
                      type="submit"
                      disabled={loading}
                      aria-label="Send secure sign-in link"
                      className="absolute right-1.5 top-1/2 grid h-9.5 w-9.5 -translate-y-1/2 place-items-center rounded-lg bg-[#76B900] text-black transition hover:bg-[#8bd600] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loading ? (
                        <SpinnerIcon />
                      ) : (
                        <ArrowRightIcon className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {step === "sent" && (
              <div className="space-y-3">
                <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                  <p className="text-xs text-[#7e8578]">Link sent to</p>
                  <p className="mt-0.5 break-all text-sm font-semibold text-white">
                    {email}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => sendMagicLink()}
                  disabled={loading || resendCooldown > 0}
                  className="flex min-h-11.5 w-full items-center justify-center rounded-xl bg-[#76B900] px-4 py-2.5 text-sm font-bold text-black transition hover:bg-[#8bd600] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading
                    ? "Sending..."
                    : resendCooldown > 0
                      ? `Resend available in ${resendCooldown}s`
                      : "Resend sign-in link"}
                </button>

                <button
                  type="button"
                  onClick={returnToOptions}
                  className="w-full py-1.5 text-sm text-[#969b92] transition hover:text-white"
                >
                  Use a different email
                </button>
              </div>
            )}

            <div className="mt-5 flex items-center justify-center gap-2 border-t border-white/8 pt-4">
              <ShieldIcon className="h-4 w-4 shrink-0 text-[#76B900]" />
              <p className="text-center text-xs leading-5 text-[#777e72]">
                Secure sign-in protected by the DevMind authentication service.
              </p>
            </div>
          </motion.div>
        </section>

        <footer className="mt-5 text-center">
          <p className="text-xs leading-6 text-[#666d61]">
            By continuing, you agree to our{" "}
            <a
              href="/terms"
              className="text-[#a6ada0] underline decoration-white/15 underline-offset-4 transition hover:text-[#76B900]"
            >
              Terms
            </a>{" "}
            and{" "}
            <a
              href="/privacy"
              className="text-[#a6ada0] underline decoration-white/15 underline-offset-4 transition hover:text-[#76B900]"
            >
              Privacy Policy
            </a>
            .
          </p>
        </footer>
      </motion.div>
    </main>
  );
}

/* Reusable inline icons: no additional icon package required. */

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

function MailIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      className={className}
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  );
}

function ArrowRightIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function ShieldIcon({ className = "" }: { className?: string }) {
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
      <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" />
      <path d="m9 12 2 2 4-4" />
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
