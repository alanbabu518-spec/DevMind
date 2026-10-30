import { useEffect, useState, type CSSProperties } from "react";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  ChevronRight,
  Code2,
  Crown,
  ExternalLink,
  FileText,
  Folder,
  Info,
  Lightbulb,
  LoaderCircle,
  MessageSquareText,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  Upload,
} from "lucide-react";
import { FaGithub } from "react-icons/fa";
import DashIllustration from "./DashIllustration";

export type DashRepo = {
  id: number | string;
  name: string;
  full_name: string;
  description?: string | null;
  language?: string | null;
  private?: boolean;
  updated_at?: string;
  html_url?: string;
};

type Props<T extends DashRepo> = {
  displayName: string;
  planLabel: string;
  isFree: boolean;
  connected: boolean;
  loading: boolean;
  repos: T[];
  onNewChat: () => void;
  onConnect: () => void;
  onImport: () => void;
  onAnalyze: () => void;
  onExplore: () => void;
  onOpenRepo: (repo: T) => void;
  onAddRepo: () => void;
  onUpgrade: () => void;
  onDocs: () => void;
  onSettings: () => void;
};

/* ------------------------------------------------------------------ */
/*  PREVIEW DATA: replace with a real usage endpoint when you have one  */
/* ------------------------------------------------------------------ */
const USAGE = {
  usedPercent: 68,
  remaining: 32_000,
  total: 100_000,
  resetsInDays: 18,
  rows: [
    {
      label: "Chat Messages",
      used: 18_000,
      limit: 50_000,
      color: "#7ee02c",
      Icon: MessageSquareText,
    },
    {
      label: "Code Analysis",
      used: 8_000,
      limit: 25_000,
      color: "#2f7bff",
      Icon: Code2,
    },
    {
      label: "File Searches",
      used: 4_000,
      limit: 15_000,
      color: "#8b5cf6",
      Icon: Search,
    },
  ],
};
const DONUT_R = 62;
const DONUT_C = 2 * Math.PI * DONUT_R;

const LANG_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Python: "#3fb950",
  Java: "#e76f00",
  Go: "#00add8",
  Rust: "#dea584",
  "C++": "#f34b7d",
  C: "#9aa0a6",
  "C#": "#9b4f96",
  Ruby: "#cc342d",
  PHP: "#777bb4",
  HTML: "#e34c26",
  CSS: "#a371f7",
  Shell: "#89e051",
  Kotlin: "#a97bff",
  Swift: "#f05138",
  Dart: "#00b4ab",
};

function timeAgo(iso?: string): string {
  if (!iso) return "";
  const diff = Math.max(0, Date.now() - new Date(iso).getTime()) / 1000;
  const units: [number, string][] = [
    [31536000, "year"],
    [2592000, "month"],
    [604800, "week"],
    [86400, "day"],
    [3600, "hour"],
    [60, "minute"],
  ];
  for (const [secs, name] of units) {
    const n = Math.floor(diff / secs);
    if (n >= 1) return `Updated ${n} ${name}${n === 1 ? "" : "s"} ago`;
  }
  return "Updated just now";
}

const reducedMotion = () =>
  typeof matchMedia === "function" &&
  matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Counts up once on mount; jumps straight to the value for reduced motion. */
function useCountUp(target: number, ms = 1100) {
  const [value, setValue] = useState(() => (reducedMotion() ? target : 0));
  useEffect(() => {
    if (reducedMotion()) {
      setValue(target);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min((t - t0) / ms, 1);
      setValue(Math.round(target * (1 - Math.pow(1 - p, 4))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return value;
}

const fmt = (n: number) => n.toLocaleString("en-US");
const idx = (i: number) => ({ "--i": i }) as CSSProperties;

export default function HomeDashboard<T extends DashRepo>({
  displayName,
  planLabel,
  isFree,
  connected,
  loading,
  repos,
  onNewChat,
  onConnect,
  onImport,
  onAnalyze,
  onExplore,
  onOpenRepo,
  onAddRepo,
  onUpgrade,
  onDocs,
  onSettings,
}: Props<T>) {
  const [menu, setMenu] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const pct = useCountUp(USAGE.usedPercent);
  const remaining = useCountUp(USAGE.remaining);

  // Close the row menu on outside press / Escape.
  useEffect(() => {
    if (!menu) return;
    const close = (e: PointerEvent) => {
      if (!(e.target as HTMLElement).closest(".dm-more")) setMenu(null);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenu(null);
    };
    addEventListener("pointerdown", close);
    addEventListener("keydown", key);
    return () => {
      removeEventListener("pointerdown", close);
      removeEventListener("keydown", key);
    };
  }, [menu]);

  const words = displayName.trim().split(/\s+/);
  const first = words.length > 1 ? words[0] : "";
  const rest = words.length > 1 ? words.slice(1).join(" ") : words[0];
  const shown = repos.slice(0, 4);

  const features = [
    {
      Icon: MessageSquareText,
      title: "Chat with your code",
      text: "Get clear answers from your entire repository.",
      act: onNewChat,
    },
    {
      Icon: FileText,
      title: "Analyze & find issues",
      text: "Detect bugs, security issues, and improvements.",
      act: onAnalyze,
    },
    {
      Icon: Folder,
      title: "Explore repositories",
      text: "Browse and understand your projects faster.",
      act: onExplore,
    },
  ];

  const quick = [
    { Icon: Upload, label: "Import a project", act: onImport },
    {
      Icon: FaGithub,
      label: connected ? "Manage GitHub" : "Connect GitHub",
      act: connected ? onSettings : onConnect,
    },
    { Icon: BookOpen, label: "Read documentation", act: onDocs },
    { Icon: Settings, label: "Manage settings", act: onSettings },
  ];

  return (
    <div className="dm-scroll">
      <div className="dm-home">
        {/* ------------------------- main column ------------------------- */}
        <div className="dm-home-main">
          <section className="dm-hero2 dm-rise" style={idx(0)}>
            <div className="dm-hero2-copy">
              <p className="dm-welcome">Welcome back,</p>
              <h1 className="dm-name">
                {first && <>{first} </>}
                <span className="g">{rest}</span>
              </h1>
              <p className="sub">
                Your AI-powered coding companion. Connect your repositories, ask
                questions, and get intelligent suggestions — all in one place.
              </p>
              <div className="dm-hero-cta">
                <button className="dm-cta-g dm-press" onClick={onNewChat}>
                  <MessageSquareText size={20} /> Start a New Chat{" "}
                  <ArrowRight size={20} />
                </button>
                {connected ? (
                  <button className="dm-cta-o dm-press" onClick={onExplore}>
                    <Check size={19} /> GitHub connected
                  </button>
                ) : (
                  <button className="dm-cta-o dm-press" onClick={onConnect}>
                    <FaGithub size={21} /> Connect GitHub
                  </button>
                )}
              </div>
            </div>
            <div className="dm-illus" aria-hidden={false}>
              <DashIllustration />
            </div>
          </section>

          <section
            className="dm-features dm-rise"
            style={idx(1)}
            aria-label="What you can do"
          >
            {features.map(({ Icon, title, text, act }) => (
              <button key={title} className="dm-fcard dm-press" onClick={act}>
                <Icon size={32} strokeWidth={1.6} className="ic" />
                <ChevronRight size={20} className="chev" />
                <h3>{title}</h3>
                <p>{text}</p>
              </button>
            ))}
          </section>

          <section
            className="dm-rcard dm-rise"
            style={idx(2)}
            aria-labelledby="dm-repos-h"
          >
            <div className="dm-rcard-head">
              <h2 id="dm-repos-h">Your Repositories</h2>
              <div className="dm-rcard-actions">
                <button className="dm-link dm-press" onClick={onAddRepo}>
                  View all <ArrowRight size={16} />
                </button>
                <button className="dm-add dm-press" onClick={onAddRepo}>
                  <Plus size={18} /> Add Repository
                </button>
              </div>
            </div>

            {loading ? (
              <div className="dm-state">
                <LoaderCircle size={18} className="dm-spin" /> Loading
                repositories…
              </div>
            ) : !connected ? (
              <div className="dm-empty-row">
                <FaGithub size={30} />
                <strong>Connect GitHub to see your repositories</strong>
                <span>
                  DevMind gets read-only access to the repos you choose.
                </span>
                <button className="dm-add dm-press" onClick={onConnect}>
                  <FaGithub size={17} /> Connect GitHub
                </button>
              </div>
            ) : shown.length === 0 ? (
              <div className="dm-empty-row">
                <Folder size={30} />
                <strong>No repositories found</strong>
                <span>Nothing was returned for this GitHub account.</span>
              </div>
            ) : (
              shown.map((r, i) => (
                <div className="dm-rrow" key={String(r.id)} style={idx(i)}>
                  <span className="dm-rrow-ic">
                    <FaGithub size={28} />
                  </span>
                  <button
                    className="dm-rrow-main"
                    onClick={() => onOpenRepo(r)}
                  >
                    <strong className="dm-truncate">{r.name}</strong>
                    <small className="dm-truncate">
                      {r.description || r.full_name}
                    </small>
                    <span className="dm-rmeta">
                      <i
                        style={{
                          background:
                            LANG_COLORS[r.language ?? ""] ?? "#8e8e93",
                        }}
                      />
                      {r.language ?? "Unknown"} ·{" "}
                      {timeAgo(r.updated_at).replace("Updated ", "")}
                    </span>
                  </button>
                  <span className="dm-rlang">
                    <i
                      style={{
                        background: LANG_COLORS[r.language ?? ""] ?? "#8e8e93",
                      }}
                    />
                    {r.language ?? "—"}
                  </span>
                  <span className="dm-rupd">{timeAgo(r.updated_at)}</span>
                  <div className="dm-more">
                    <button
                      className="dm-more-btn dm-press"
                      aria-label={`More actions for ${r.name}`}
                      aria-haspopup="menu"
                      aria-expanded={menu === String(r.id)}
                      onClick={() =>
                        setMenu(menu === String(r.id) ? null : String(r.id))
                      }
                    >
                      <MoreHorizontal size={20} />
                    </button>
                    {menu === String(r.id) && (
                      <div className="dm-pop" role="menu">
                        <button
                          role="menuitem"
                          onClick={() => {
                            setMenu(null);
                            onOpenRepo(r);
                          }}
                        >
                          <Folder size={16} /> Open workspace
                        </button>
                        {r.html_url && (
                          <a
                            role="menuitem"
                            href={r.html_url}
                            target="_blank"
                            rel="noreferrer"
                            onClick={() => setMenu(null)}
                          >
                            <ExternalLink size={16} /> View on GitHub
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    className="dm-open dm-press"
                    onClick={() => onOpenRepo(r)}
                  >
                    Open
                  </button>
                </div>
              ))
            )}
          </section>
        </div>

        {/* ------------------------- side column ------------------------- */}
        <aside className="dm-home-side" aria-label="Usage and shortcuts">
          <section
            className="dm-panel dm-rise"
            style={idx(1)}
            aria-labelledby="dm-usage-h"
          >
            <div className="dm-panel-head">
              <h2 id="dm-usage-h">
                AI Usage &amp; Tokens
                <button
                  className="dm-info-btn"
                  aria-label="About these figures"
                  aria-expanded={showInfo}
                  title="Preview figures. Usage tracking isn't connected yet."
                  onClick={() => setShowInfo((v) => !v)}
                >
                  <Info size={15} />
                </button>
              </h2>
              <span className="dm-plan-pill">{planLabel}</span>
            </div>
            {showInfo && (
              <p className="dm-info-note">
                Preview figures. Usage tracking isn&apos;t connected yet.
              </p>
            )}

            <div className="dm-usage-top">
              <div
                className="dm-donut"
                role="img"
                aria-label={`${USAGE.usedPercent}% of tokens used`}
              >
                <svg viewBox="0 0 150 150" aria-hidden="true">
                  <circle
                    cx="75"
                    cy="75"
                    r={DONUT_R}
                    fill="none"
                    stroke="rgba(255,255,255,.08)"
                    strokeWidth="12"
                  />
                  <circle
                    className="dm-donut-fg"
                    cx="75"
                    cy="75"
                    r={DONUT_R}
                    fill="none"
                    stroke="#7ee02c"
                    strokeWidth="12"
                    strokeLinecap="round"
                    style={
                      {
                        "--off": DONUT_C * (1 - USAGE.usedPercent / 100),
                      } as CSSProperties
                    }
                  />
                </svg>
                <div className="dm-donut-c">
                  <strong>{pct}%</strong>
                  <span>Tokens Used</span>
                </div>
              </div>

              <div className="dm-tok">
                <small>Token remaining</small>
                <strong>{fmt(remaining)}</strong>
                <span className="of">/ {fmt(USAGE.total)}</span>
                <div className="dm-reset">
                  <CalendarDays size={15} /> Resets in {USAGE.resetsInDays} days
                </div>
                <button className="dm-upgrade dm-press" onClick={onUpgrade}>
                  {isFree ? "Upgrade to Pro" : "Manage plan"}{" "}
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>

            <div className="dm-bars">
              {USAGE.rows.map(({ label, used, limit, color, Icon }, i) => (
                <div className="dm-bar-row" key={label}>
                  <span className="dm-bar-ic">
                    <Icon size={19} />
                  </span>
                  <div>
                    <div className="dm-bar-top">
                      <b>{label}</b>
                      <span>
                        {fmt(used)} / {fmt(limit)}
                      </span>
                    </div>
                    <div className="dm-track">
                      <div
                        className="dm-fill"
                        style={
                          {
                            background: color,
                            "--p": used / limit,
                            "--i": i,
                          } as CSSProperties
                        }
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section
            className="dm-panel dm-rise"
            style={idx(2)}
            aria-labelledby="dm-quick-h"
          >
            <div className="dm-panel-head">
              <h2 id="dm-quick-h">Quick Actions</h2>
            </div>
            <div className="dm-qa">
              {quick.map(({ Icon, label, act }) => (
                <button key={label} className="dm-qa-i dm-press" onClick={act}>
                  <Icon size={20} />
                  <span>{label}</span>
                  <ArrowRight size={17} className="ar" />
                </button>
              ))}
            </div>
          </section>

          {isFree && (
            <section className="dm-panel dm-more-tokens dm-rise" style={idx(3)}>
              <div className="dm-mt-top">
                <span className="dm-mt-ic">
                  <Lightbulb size={22} />
                </span>
                <div>
                  <strong>Need more tokens?</strong>
                  <p>
                    Upgrade to Pro for higher limits, priority support, and more
                    features.
                  </p>
                </div>
              </div>
              <button className="dm-outline-g dm-press" onClick={onUpgrade}>
                <Crown size={17} /> Upgrade to Pro <ArrowRight size={16} />
              </button>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
