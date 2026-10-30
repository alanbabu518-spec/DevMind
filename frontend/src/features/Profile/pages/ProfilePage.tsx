import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  Check,
  Link2,
  LoaderCircle,
  LogOut,
  Palette,
  Pencil,
  Sparkles,
  TriangleAlert,
  Unplug,
  UserRound,
  CalendarDays,
  CreditCard,
} from "lucide-react";
import { FaGithub } from "react-icons/fa";
import UserAvatar from "@/shared/components/UserAvatar";
import AvatarPicker from "../components/AvatarPicker";
import AccountDrawer from "../components/AccountDrawer";
import DeleteAccountDialog from "../components/DeleteAccountDialog";
import { useUser } from "@/features/auth/context/UserContext";
import { checkUsernameAvailable } from "@/features/auth/services/userApi";
import {
  avatarValue,
  randomSeeds,
  seedFromAvatar,
  validateUsername,
} from "@/shared/lib/identicon";
import "../profile.css";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5002"
).replace(/\/$/, "");

const PLAN_FEATURES: Record<string, { price: string; features: string[] }> = {
  Free: {
    price: "$0",
    features: [
      "Basic code analysis",
      "Limited AI assistance",
      "Essential code quality insights",
    ],
  },
  Pro: {
    price: "$29",
    features: [
      "Advanced AI code analysis",
      "Security and code quality insights",
      "Detailed recommendations",
      "Higher usage limits",
    ],
  },
  Team: {
    price: "$50",
    features: [
      "Everything in Pro",
      "Team-oriented workflows",
      "Project-level insights",
      "Higher team usage limits",
    ],
  },
};

const SECTIONS = [
  { id: "profile", label: "Profile", icon: UserRound },
  { id: "avatar", label: "Avatar", icon: Palette },
  { id: "plan", label: "Plan", icon: CreditCard },
  { id: "connections", label: "Connections", icon: Link2 },
  { id: "danger", label: "Danger zone", icon: TriangleAlert, danger: true },
] as const;

type Github = { connected: boolean; username?: string };
type Availability = "idle" | "checking" | "ok" | "taken" | "invalid";

function parseGithub(payload: unknown): Github {
  const root = (
    payload && typeof payload === "object" ? payload : {}
  ) as Record<string, unknown>;
  const nested = (
    root.data && typeof root.data === "object" ? root.data : {}
  ) as Record<string, unknown>;
  const pick = (k: string) =>
    typeof root[k] === "string"
      ? (root[k] as string)
      : typeof nested[k] === "string"
        ? (nested[k] as string)
        : undefined;
  return {
    connected: Boolean(
      root.connected ??
      nested.connected ??
      root.isConnected ??
      nested.isConnected,
    ),
    username: pick("username") ?? pick("login"),
  };
}

export default function ProfilePage() {
  const { user, status, updateProfile, clear, refresh, signOut } = useUser();
  const navigate = useNavigate();
  const { hash } = useLocation();
  const reduce = useReducedMotion();

  const original = useMemo(
    () => ({
      name: user?.name ?? "",
      username: user?.username ?? "",
      seed: seedFromAvatar(
        user?.avatar,
        user?.username ?? user?.email ?? "devmind",
      ),
    }),
    [user],
  );

  const [name, setName] = useState(original.name);
  const [username, setUsername] = useState(original.username);
  const [seed, setSeed] = useState(original.seed);
  const [seeds, setSeeds] = useState<string[]>(() => [
    original.seed,
    ...randomSeeds(11),
  ]);
  const [avail, setAvail] = useState<Availability>("idle");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [drawer, setDrawer] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [github, setGithub] = useState<Github | null>(null);
  const [ghBusy, setGhBusy] = useState(false);
  const [active, setActive] = useState<string>("profile");
  const synced = useRef(false);

  // Fill the form once the user has loaded.
  useEffect(() => {
    if (!user) return;
    if (synced.current) return;
    synced.current = true;
    setName(original.name);
    setUsername(original.username);
    setSeed(original.seed);
    setSeeds([original.seed, ...randomSeeds(11)]);
  }, [user, original]);

  const loadGithub = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/github/status`, {
        credentials: "include",
      });
      setGithub(
        res.ok
          ? parseGithub(await res.json().catch(() => null))
          : { connected: false },
      );
    } catch {
      setGithub({ connected: false });
    }
  }, []);
  useEffect(() => {
    if (status === "authed") void loadGithub();
  }, [status, loadGithub]);

  // Live username check, only when it differs from the saved one.
  useEffect(() => {
    if (!user) return;
    if (username === original.username) {
      setAvail("idle");
      return;
    }
    const problem = validateUsername(username);
    if (problem) {
      setAvail("invalid");
      setReason(problem);
      return;
    }
    setAvail("checking");
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const r = await checkUsernameAvailable(username, controller.signal);
        setAvail(r.available ? "ok" : "taken");
        setReason(r.reason ?? "");
      } catch (e) {
        if ((e as Error).name !== "AbortError") setAvail("idle");
      }
    }, 350);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [username, original.username, user]);

  // Section highlighting for the nav.
  useEffect(() => {
    if (!user) return;
    const els = SECTIONS.map((s) => document.getElementById(s.id)).filter(
      (el): el is HTMLElement => Boolean(el),
    );
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.find((e) => e.isIntersecting);
        if (hit) setActive(hit.target.id);
      },
      { rootMargin: "-25% 0px -65% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [user]);

  // Deep links such as /profile#avatar (from the account drawer).
  useEffect(() => {
    if (!user || !hash) return;
    const el = document.getElementById(hash.slice(1));
    if (el)
      el.scrollIntoView({
        behavior: reduce ? "auto" : "smooth",
        block: "start",
      });
  }, [hash, user, reduce]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(t);
  }, [toast]);

  if (status === "loading") {
    return (
      <div className="pf-root pf-loading">
        <LoaderCircle className="pf-spin" />
      </div>
    );
  }
  if (status === "anonymous") return <Navigate to="/login" replace />;
  if (status === "error" || !user) {
    return (
      <div
        className="pf-root pf-loading"
        style={{ gap: 12, alignContent: "center" }}
      >
        <p>We couldn’t load your account.</p>
        <button className="pf-btn pf-press" onClick={() => void refresh()}>
          Try again
        </button>
      </div>
    );
  }

  const handle = user.username ?? user.email.split("@")[0];
  const usernameChanged = username !== original.username;
  const nameChanged = name.trim() !== original.name;
  const avatarChanged = seed !== original.seed;
  const dirty = usernameChanged || nameChanged || avatarChanged;
  const usernameBlocked = usernameChanged && avail !== "ok" && avail !== "idle";
  const plan = user.selectedPlan ? PLAN_FEATURES[user.selectedPlan] : undefined;
  const memberSince = new Date(user.createdAt).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  async function save() {
    if (!dirty || usernameBlocked || saving) return;
    setSaving(true);
    setError("");
    try {
      await updateProfile({
        ...(usernameChanged && { username }),
        ...(avatarChanged && { avatar: avatarValue(seed) }),
        ...(nameChanged && { name: name.trim() }),
      });
      setToast("Profile saved");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save your profile.");
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    setName(original.name);
    setUsername(original.username);
    setSeed(original.seed);
    setError("");
  }

  async function disconnectGithub() {
    setGhBusy(true);
    try {
      await fetch(`${API_BASE_URL}/api/github/connect`, {
        method: "DELETE",
        credentials: "include",
      });
      await loadGithub();
      setToast("GitHub disconnected");
    } finally {
      setGhBusy(false);
    }
  }

  const bar = { type: "spring", duration: 0.4, bounce: 0 } as const;
  const sectionMotion = (i: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 14 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, margin: "0px 0px -8% 0px" },
          transition: { ...bar, delay: Math.min(i * 0.04, 0.16) },
        };

  return (
    <div className="pf-root pf-page">
      <header className="pf-top pf-glass">
        <Link
          to="/Home"
          className="pf-icon-btn pf-press"
          aria-label="Back to workspace"
        >
          <ArrowLeft size={18} />
        </Link>
        <div className="pf-brand">
          <span className="pf-orb">
            <Sparkles size={15} strokeWidth={2.3} />
          </span>
          Profile
        </div>
        <button
          type="button"
          className="pf-avatar-btn pf-press"
          aria-label="Open account menu"
          onClick={() => setDrawer(true)}
        >
          <UserAvatar avatar={user.avatar} fallbackSeed={handle} size={34} />
        </button>
      </header>

      <main className="pf-wrap">
        <section className="pf-hero">
          <div className="pf-hero-av">
            <UserAvatar
              avatar={avatarChanged ? avatarValue(seed) : user.avatar}
              fallbackSeed={handle}
              size={116}
            />
            <a
              href="#avatar"
              className="edit pf-press"
              aria-label="Change avatar"
            >
              <Pencil size={16} />
            </a>
          </div>
          <div style={{ minWidth: 0 }}>
            <h1 className="pf-trunc">{user.name || `@${handle}`}</h1>
            <p className="sub pf-trunc">
              {user.name ? `@${handle} · ` : ""}
              {user.email}
            </p>
            <div className="pf-meta">
              {user.selectedPlan && (
                <span className="pf-chip g">
                  <Sparkles size={12} /> {user.selectedPlan} plan
                </span>
              )}
              {user.emailVerified && (
                <span className="pf-chip">
                  <BadgeCheck size={13} /> Email verified
                </span>
              )}
              <span className="pf-chip">
                <CalendarDays size={13} /> Member since {memberSince}
              </span>
            </div>
          </div>
        </section>

        <div className="pf-layout">
          <nav className="pf-nav" aria-label="Profile sections">
            {SECTIONS.map(({ id, label, icon: Icon, ...rest }) => (
              <a
                key={id}
                href={`#${id}`}
                aria-current={active === id}
                className={"danger" in rest ? "danger pf-press" : "pf-press"}
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById(id)?.scrollIntoView({
                    behavior: reduce ? "auto" : "smooth",
                    block: "start",
                  });
                  history.replaceState(null, "", `#${id}`);
                }}
              >
                <Icon size={16} /> {label}
              </a>
            ))}
          </nav>

          <div className="pf-cards">
            <motion.section
              id="profile"
              className="pf-card"
              {...sectionMotion(0)}
            >
              <h2>
                <UserRound size={20} /> Profile
              </h2>
              <p className="pf-lead">How you appear inside DevMind.</p>
              <div className="pf-grid2">
                <div className="pf-field">
                  <label className="pf-label" htmlFor="pf-name">
                    Display name
                  </label>
                  <div className="pf-input-wrap">
                    <input
                      id="pf-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      maxLength={60}
                      placeholder="Ada Lovelace"
                      autoComplete="name"
                      enterKeyHint="next"
                    />
                  </div>
                  <span className="pf-hint">
                    Optional. Shown on your profile.
                  </span>
                </div>
                <div className="pf-field">
                  <label className="pf-label" htmlFor="pf-username">
                    Username
                  </label>
                  <div
                    className={`pf-input-wrap ${avail === "taken" || avail === "invalid" ? "bad" : ""}`}
                  >
                    <span className="pf-at">@</span>
                    <input
                      id="pf-username"
                      value={username}
                      onChange={(e) =>
                        setUsername(
                          e.target.value.toLowerCase().replace(/\s+/g, "-"),
                        )
                      }
                      maxLength={30}
                      autoCapitalize="none"
                      autoCorrect="off"
                      autoComplete="off"
                      spellCheck={false}
                      enterKeyHint="done"
                      aria-invalid={avail === "taken" || avail === "invalid"}
                    />
                  </div>
                  <div
                    className={`pf-status ${avail === "ok" ? "ok" : avail === "checking" ? "wait" : avail === "idle" ? "" : "bad"}`}
                    aria-live="polite"
                  >
                    {avail === "checking" && (
                      <>
                        <LoaderCircle size={14} className="pf-spin" /> Checking…
                      </>
                    )}
                    {avail === "ok" && (
                      <>
                        <Check size={14} /> Available
                      </>
                    )}
                    {(avail === "taken" || avail === "invalid") && (
                      <>
                        <AlertCircle size={14} /> {reason}
                      </>
                    )}
                    {avail === "idle" && (
                      <span className="pf-hint">
                        Letters, numbers and single hyphens.
                      </span>
                    )}
                  </div>
                </div>
                <div className="pf-field" style={{ gridColumn: "1 / -1" }}>
                  <span className="pf-label">Email</span>
                  <div className="pf-input-wrap ro">
                    <input
                      value={user.email}
                      readOnly
                      aria-readonly="true"
                      tabIndex={-1}
                    />
                    {user.emailVerified && (
                      <BadgeCheck size={17} style={{ color: "var(--g)" }} />
                    )}
                  </div>
                  <span className="pf-hint">
                    Your sign-in email. It can’t be changed here.
                  </span>
                </div>
              </div>
            </motion.section>

            <motion.section
              id="avatar"
              className="pf-card"
              {...sectionMotion(1)}
            >
              <h2>
                <Palette size={20} /> Avatar
              </h2>
              <p className="pf-lead">
                Pick a generated avatar, GitHub-style. Shuffle until one feels
                like you.
              </p>
              <AvatarPicker
                wide
                seeds={seeds}
                value={seed}
                onChange={setSeed}
                onShuffle={() => setSeeds([seed, ...randomSeeds(11)])}
              />
            </motion.section>

            <motion.section id="plan" className="pf-card" {...sectionMotion(2)}>
              <h2>
                <CreditCard size={20} /> Plan
              </h2>
              <p className="pf-lead">The plan you chose during onboarding.</p>
              {plan && user.selectedPlan ? (
                <div className="pf-plan">
                  <div className="pf-plan-top">
                    <strong>{user.selectedPlan}</strong>
                    <span className="pf-hint">{plan.price} / month</span>
                  </div>
                  <ul>
                    {plan.features.map((f) => (
                      <li key={f}>
                        <Check size={15} /> {f}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="pf-hint">No plan selected yet.</p>
              )}
            </motion.section>

            <motion.section
              id="connections"
              className="pf-card"
              {...sectionMotion(3)}
            >
              <h2>
                <Link2 size={20} /> Connected accounts
              </h2>
              <p className="pf-lead">
                DevMind reads repositories you choose. Access is read-only.
              </p>
              <div className="pf-conn">
                <span className="pf-conn-ic">
                  <FaGithub size={22} />
                </span>
                <span className="pf-conn-tx">
                  <strong>GitHub</strong>
                  <small>
                    {github === null
                      ? "Checking…"
                      : github.connected
                        ? `Connected${github.username ? ` as ${github.username}` : ""}`
                        : "Not connected"}
                  </small>
                </span>
                {github?.connected ? (
                  <button
                    className="pf-btn sm pf-press"
                    disabled={ghBusy}
                    onClick={() => void disconnectGithub()}
                  >
                    {ghBusy ? (
                      <LoaderCircle size={15} className="pf-spin" />
                    ) : (
                      <Unplug size={15} />
                    )}{" "}
                    Disconnect
                  </button>
                ) : (
                  <button
                    className="pf-btn sm g pf-press"
                    disabled={github === null}
                    onClick={() =>
                      window.location.assign(
                        `${API_BASE_URL}/api/github/connect`,
                      )
                    }
                  >
                    Connect
                  </button>
                )}
              </div>
              <div className="pf-conn" style={{ marginTop: 10 }}>
                <span
                  className="pf-conn-ic"
                  style={{ background: "var(--s2)", color: "var(--t)" }}
                >
                  <LogOut size={20} />
                </span>
                <span className="pf-conn-tx">
                  <strong>This device</strong>
                  <small>Sign out of DevMind here</small>
                </span>
                <button
                  className="pf-btn sm pf-press"
                  onClick={async () => {
                    await signOut();
                    navigate("/login", { replace: true });
                  }}
                >
                  Log out
                </button>
              </div>
            </motion.section>

            <motion.section
              id="danger"
              className="pf-card pf-danger"
              {...sectionMotion(4)}
            >
              <h2>
                <TriangleAlert size={20} /> Danger zone
              </h2>
              <p className="pf-lead">Actions here can’t be undone.</p>
              <div className="pf-danger-row">
                <div>
                  <strong>Delete this account</strong>
                  <p>
                    Permanently removes your profile, GitHub connection,
                    projects and conversations. You will be asked to confirm.
                  </p>
                </div>
                <button
                  className="pf-btn dangerline pf-press"
                  onClick={() => setDeleting(true)}
                >
                  Delete account
                </button>
              </div>
            </motion.section>
          </div>
        </div>
      </main>

      {/* unsaved changes bar */}
      <div className="pf-savebar" aria-live="polite">
        <AnimatePresence>
          {dirty && (
            <motion.div
              className="pf-savebar-in pf-glass"
              initial={reduce ? { opacity: 0 } : { y: 90, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={reduce ? { opacity: 0 } : { y: 90, opacity: 0 }}
              transition={bar}
            >
              <span className="pf-trunc">
                {error ? error : "You have unsaved changes"}
              </span>
              <button
                className="pf-btn sm ghost pf-press"
                onClick={reset}
                disabled={saving}
              >
                Reset
              </button>
              <button
                className="pf-btn sm g pf-press"
                onClick={() => void save()}
                disabled={saving || usernameBlocked}
              >
                {saving ? (
                  <LoaderCircle size={15} className="pf-spin" />
                ) : (
                  <Check size={15} />
                )}{" "}
                Save
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div
            className="pf-toast pf-glass"
            role="status"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={bar}
          >
            <Check size={17} /> {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <AccountDrawer
        open={drawer}
        onClose={() => setDrawer(false)}
        github={github ?? undefined}
      />

      <DeleteAccountDialog
        open={deleting}
        expected={user.username ?? user.email}
        onClose={() => setDeleting(false)}
        onDeleted={() => {
          setDeleting(false);
          clear();
          navigate("/", { replace: true });
        }}
      />
    </div>
  );
}
