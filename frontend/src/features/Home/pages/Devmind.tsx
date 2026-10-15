import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import {
  GitBranch as Github,
  FileArchive,
  Bell,
  Menu,
  ArrowUp,
  ScanSearch,
  ShieldAlert,
  Network,
  Check,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  Folder,
  FolderOpen,
  FileCode,
  FileText,
  Plus,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const G = "#76B900";
const G14 = "rgba(118,185,0,.14)";

type ActKey = "all" | "vuln" | "tree" | "readiness";
type Lv = "high" | "med" | "low" | "info";
type Act = {
  title: string;
  sub: string;
  Icon: LucideIcon;
  steps: string[];
  head: string;
  rows: [Lv, string][];
};
type TNode = { name: string; kids?: TNode[] };
type Project = { kind: "gh" | "zip"; name: string; meta: string; root: string };
type Msg =
  | { id: number; t: "u"; text: string }
  | { id: number; t: "a"; text: string | null; done: boolean }
  | { id: number; t: "run"; k: ActKey; step: number; done: boolean; result?: Record<string, unknown>; error?: string };
type SheetView = "auth" | "wait" | "repos" | "files" | null;
type DragOpts = {
  els: HTMLElement[];
  axis: "x" | "y";
  get: () => number;
  set: (v: number) => void;
  min: number;
  max: number;
  start?: (e: PointerEvent) => boolean;
  onTap?: (el: HTMLElement) => void;
  onEnd: (v: number) => void;
};

const ACTS: Record<ActKey, Act> = {
  all: {
    title: "Analyze complete",
    sub: "A full pass across every file",
    Icon: ScanSearch,
    steps: [
      "Indexing files",
      "Mapping modules and entry points",
      "Checking dependencies and code health",
    ],
    head: "Scan complete. Three things are worth a look.",
    rows: [
      ["med", "2 outdated dependencies to update"],
      ["low", "1 file over 800 lines, a candidate to split"],
      ["info", "Core modules have no test coverage yet"],
    ],
  },
  vuln: {
    title: "Find vulnerabilities",
    sub: "Security issues and risky dependencies",
    Icon: ShieldAlert,
    steps: [
      "Scanning for exposed secrets",
      "Auditing dependency versions",
      "Reviewing input handling",
    ],
    head: "Security review found 6 issues.",
    rows: [
      ["high", "Possible hard-coded credential in a config file"],
      ["med", "Dependency with a known advisory"],
      ["med", "Request body used without validation"],
      ["low", "3 minor hardening suggestions"],
    ],
  },
  tree: {
    title: "Analyze structure",
    sub: "Architecture, modules and data flow",
    Icon: Network,
    steps: [
      "Reading folder layout",
      "Tracing imports between modules",
      "Drawing the architecture",
    ],
    head: "Structure analysis is not connected yet.",
    rows: [
      ["info", "Connect a real repository scanner before using this feature."],
    ],
  },
  readiness: {
    title: "Production readiness",
    sub: "Score security and show categories without evidence",
    Icon: CheckCircle2,
    steps: [
      "Running available code scanners",
      "Checking readiness evidence",
      "Calculating the provisional score",
    ],
    head: "Production readiness assessment",
    rows: [],
  },
};


const REPOS: [string, string][] = [
  ["devmind-api", "Demo repository picker (not connected to GitHub API)"],
  ["devmind-web", "Demo repository picker (not connected to GitHub API)"],
  ["infra-config", "Demo repository picker (not connected to GitHub API)"],
];

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ??
  "http://localhost:5001";

/* sample file tree shown for any project (replace with your real listing) */
const mkTree = (root: string): TNode => ({
  name: root,
  kids: [
    {
      name: "src",
      kids: [
        { name: "app.ts" },
        { name: "server.ts" },
        { name: "routes", kids: [{ name: "auth.ts" }, { name: "users.ts" }] },
        {
          name: "services",
          kids: [{ name: "user.service.ts" }, { name: "billing.service.ts" }],
        },
        { name: "models", kids: [{ name: "user.ts" }] },
      ],
    },
    { name: "tests", kids: [{ name: "auth.test.ts" }] },
    { name: "Dockerfile" },
    { name: "package.json" },
    { name: "README.md" },
  ],
});

/* ---------- motion: springs described by response + damping ratio ---------- */
const raf: Record<string, number> = {};
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

function spring(
  key: string,
  from: number,
  to: number,
  v0: number,
  set: (v: number) => void,
  r = 0.34,
  z = 1,
) {
  cancelAnimationFrame(raf[key]);
  if (reduced()) return set(to);
  let x = from,
    v = v0,
    t0 = performance.now();
  const w = (2 * Math.PI) / r,
    k = w * w,
    c = 2 * z * w;
  const step = (t: number) => {
    const dt = Math.min((t - t0) / 1000, 0.032);
    t0 = t;
    const n = Math.max(1, Math.ceil(dt / 0.004)),
      h = dt / n;
    for (let i = 0; i < n; i++) {
      v += (-k * (x - to) - c * v) * h;
      x += v * h;
    }
    if (Math.abs(x - to) < 0.2 && Math.abs(v) < 2) return set(to);
    set(x);
    raf[key] = requestAnimationFrame(step);
  };
  raf[key] = requestAnimationFrame(step);
}

/* 1-axis drag: 10px hysteresis, 1:1 tracking, rubber-band, velocity on release */
function attachDrag({
  els,
  axis,
  get,
  set,
  min,
  max,
  start,
  onTap,
  onEnd,
}: DragOpts) {
  type G = {
    x0: number;
    y0: number;
    base: number;
    on: boolean;
    el: HTMLElement;
  };
  let g: G | null = null;
  let h: [number, number][] = [];
  const X = axis === "x";
  const down = (ev: Event) => {
    const e = ev as PointerEvent;
    if (start && !start(e)) return;
    cancelAnimationFrame(raf[axis]);
    g = {
      x0: e.clientX,
      y0: e.clientY,
      base: get(),
      on: false,
      el: e.currentTarget as HTMLElement,
    };
    h = [[X ? e.clientX : e.clientY, e.timeStamp]];
  };
  const move = (e: PointerEvent) => {
    if (!g) return;
    const dx = e.clientX - g.x0,
      dy = e.clientY - g.y0,
      d = X ? dx : dy,
      o = X ? dy : dx;
    if (!g.on) {
      if (Math.abs(d) > 10 && Math.abs(d) > Math.abs(o)) {
        g.on = true;
        try {
          g.el.setPointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
      } else if (Math.abs(o) > 10) {
        g = null;
        return;
      } else return;
    }
    h.push([X ? e.clientX : e.clientY, e.timeStamp]);
    if (h.length > 6) h.shift();
    let n = g.base + d;
    if (n < min) n = min - (min - n) * 0.15;
    if (n > max) n = max + (n - max) * 0.15;
    set(n);
  };
  const up = () => {
    if (!g) return;
    const { on, el } = g;
    g = null;
    if (!on) {
      onTap?.(el);
      return;
    }
    const a = h[0],
      b = h[h.length - 1];
    onEnd(b[1] > a[1] ? ((b[0] - a[0]) / (b[1] - a[1])) * 1000 : 0);
  };
  const cancel = () => {
    g = null;
  };
  els.forEach((el) => el.addEventListener("pointerdown", down));
  addEventListener("pointermove", move);
  addEventListener("pointerup", up);
  addEventListener("pointercancel", cancel);
  return () => {
    els.forEach((el) => el.removeEventListener("pointerdown", down));
    removeEventListener("pointermove", move);
    removeEventListener("pointerup", up);
    removeEventListener("pointercancel", cancel);
  };
}

/* ------------------------------ file tree ------------------------------ */
function Tree({
  nodes,
  base,
  depth,
  open,
  toggle,
  pick,
  sel,
}: {
  nodes: TNode[];
  base: string;
  depth: number;
  open: Record<string, boolean>;
  toggle: (p: string) => void;
  pick: (p: string) => void;
  sel: string | null;
}) {
  return (
    <>
      {nodes.map((n) => {
        const p = base + "/" + n.name,
          isOpen = !!open[p],
          on = sel === p;
        const FileIcon = /\.(ts|tsx|js|jsx|py|go|rs)$/.test(n.name)
          ? FileCode
          : FileText;
        return (
          <div key={p}>
            <button
              onClick={() => (n.kids ? toggle(p) : pick(p))}
              className={`dm-press dm-hv flex w-full items-center gap-2 rounded-lg py-1.5 pr-2 text-sm ${on ? "bg-white/10" : ""}`}
              style={{ paddingLeft: 8 + depth * 14, color: on ? G : undefined }}
            >
              {n.kids ? (
                <ChevronRight
                  size={14}
                  className={`flex-none text-zinc-500 transition-transform ${isOpen ? "rotate-90" : ""}`}
                />
              ) : (
                <span className="w-3.5 flex-none" />
              )}
              {n.kids ? (
                isOpen ? (
                  <FolderOpen
                    size={16}
                    style={{ color: G }}
                    className="flex-none"
                  />
                ) : (
                  <Folder
                    size={16}
                    style={{ color: G }}
                    className="flex-none"
                  />
                )
              ) : (
                <FileIcon size={16} className="flex-none text-zinc-400" />
              )}
              <span className="truncate">{n.name}</span>
            </button>
            {n.kids && isOpen && (
              <Tree
                nodes={n.kids}
                base={p}
                depth={depth + 1}
                open={open}
                toggle={toggle}
                pick={pick}
                sel={sel}
              />
            )}
          </div>
        );
      })}
    </>
  );
}

function Spin({ size = 16 }: { size?: number }) {
  return (
    <div
      className="animate-spin flex-none rounded-full border-2 border-white/15"
      style={{ width: size, height: size, borderTopColor: G }}
    />
  );
}

function Orb({ size = 28 }: { size?: number }) {
  return (
    <div
      className="grid flex-none place-items-center rounded-full text-black"
      style={{ width: size, height: size, background: G }}
    >
      <Sparkles size={Math.round(size * 0.55)} strokeWidth={2.2} />
    </div>
  );
}

/* ------------------------------ component ------------------------------ */
export default function DevMind() {
  const [project, setProject] = useState<Project | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState("");
  const [sourceCode, setSourceCode] = useState(
    'def add(a, b):\\n    return a + b\\n',
  );
  const [toast, setToast] = useState("");
  const [bell, setBell] = useState(true);
  const [sheetView, setSheetView] = useState<SheetView>(null);
  const [nudge, setNudge] = useState(0);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [focus, setFocus] = useState<string | null>(null);

  const dR = useRef<HTMLElement>(null),
    scR = useRef<HTMLDivElement>(null),
    eR = useRef<HTMLDivElement>(null);
  const shR = useRef<HTMLDivElement>(null),
    swR = useRef<HTMLDivElement>(null),
    sc2R = useRef<HTMLDivElement>(null);
  const grR = useRef<HTMLDivElement>(null),
    scrollR = useRef<HTMLDivElement>(null);
  const fileR = useRef<HTMLInputElement>(null),
    taR = useRef<HTMLTextAreaElement>(null);
  const api = useRef<{
    drawer: (o: boolean, v?: number) => void;
    sheet: (o: boolean, v?: number) => void;
    showSheet: () => void;
  }>({
    drawer: () => {},
    sheet: () => {},
    showSheet: () => {},
  });
  const tt = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const prevLen = useRef(0);

  /* drawer + sheet physics (refs, so dragging never re-renders React) */
  useEffect(() => {
    const d = dR.current!,
      sc = scR.current!,
      e = eR.current!,
      sh = shR.current!,
      sw = swR.current!,
      sc2 = sc2R.current!,
      gr = grR.current!;
    const wide = () => matchMedia("(min-width: 1024px)").matches;
    const W = () => Math.min(innerWidth * 0.86, 320);
    const H = () => sh.offsetHeight || 420;
    let dx = -W(),
      dOpen = false,
      sy = H();

    const setD = (v: number) => {
      dx = v;
      if (wide()) {
        d.style.transform = "";
        return;
      }
      d.style.transform = `translate3d(${v}px,0,0)`;
      const p = Math.max(0, Math.min(1, 1 + v / W()));
      sc.style.opacity = String(p);
      sc.style.pointerEvents = p > 0.01 ? "auto" : "none";
    };
    const setS = (v: number) => {
      sy = v;
      sh.style.transform = `translate3d(0,${v}px,0)`;
      sc2.style.opacity = String(Math.max(0, Math.min(1, 1 - v / H())));
    };
    const drawer = (o: boolean, v = 0) => {
      dOpen = o;
      spring("x", dx, o ? 0 : -W(), v, setD);
    };
    const sheet = (o: boolean, v = 0) => {
      sw.style.pointerEvents = o ? "auto" : "none";
      spring("y", sy, o ? 0 : H(), v, setS, 0.36, 1);
    };
    setD(-W());
    setS(H());
    api.current = {
      drawer,
      sheet,
      showSheet: () =>
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            setS(H());
            sheet(true);
          }),
        ),
    };

    const c1 = attachDrag({
      els: [e, d, sc],
      axis: "x",
      get: () => dx,
      set: setD,
      min: -W(),
      max: 0,
      start: (ev) => !wide() && (dOpen || ev.currentTarget === e),
      onTap: (el) => {
        if (el === sc) drawer(false);
      },
      onEnd: (v) => drawer(dx + v * 0.499 > -W() / 2, v), // project momentum, then snap
    });
    const c2 = attachDrag({
      els: [gr],
      axis: "y",
      get: () => sy,
      set: setS,
      min: 0,
      max: 1e4,
      onEnd: (v) => sheet(!(sy + v * 0.499 > H() / 2), v),
    });
    const rs = () => {
      if (wide()) {
        d.style.transform = "";
        sc.style.opacity = "0";
        sc.style.pointerEvents = "none";
      } else setD(dOpen ? 0 : -W());
    };
    addEventListener("resize", rs);
    return () => {
      c1();
      c2();
      removeEventListener("resize", rs);
    };
  }, []);

  useEffect(() => {
    const t = taR.current;
    if (!t) return;
    t.style.height = "auto";
    t.style.height = Math.min(t.scrollHeight, 120) + "px";
  }, [text]);

  useEffect(() => {
    const s = scrollR.current;
    if (s && msgs.length)
      s.scrollTo({
        top: s.scrollHeight,
        behavior:
          reduced() || msgs.length === prevLen.current ? "auto" : "smooth",
      });
    prevLen.current = msgs.length;
  }, [msgs]);

  const say = (m: string) => {
    setToast(m);
    clearTimeout(tt.current);
    tt.current = setTimeout(() => setToast(""), 2200);
  };

  const load = (kind: "gh" | "zip", name: string, meta: string) => {
    const root =
      kind === "gh" ? name.split("/")[1] : name.replace(/\.zip$/i, "");
    setProject({ kind, name, meta, root });
    setOpen({ ["/" + root]: true, ["/" + root + "/src"]: true });
    setMsgs([]);
    setBusy(false);
    setFocus(null);
    scrollR.current?.scrollTo({ top: 0 });
    api.current.drawer(false);
  };

  /* onboarding */
  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const mb = f.size / 1048576;
    load(
      "zip",
      f.name,
      (mb < 0.1 ? (f.size / 1024).toFixed(0) + " KB" : mb.toFixed(1) + " MB") +
        ", zip archive",
    );
    say("File uploaded");
    e.target.value = "";
  };
  const connect = () => {
    setSheetView("auth");
    api.current.showSheet();
  };
  const authorize = () => {
    setSheetView("wait");
    setTimeout(() => setSheetView("repos"), 1000);
  };
  const pickRepo = ([n, m]: [string, string]) => {
    api.current.sheet(false);
    setTimeout(() => {
      load("gh", "alanbabu/" + n, m);
      say("Repository connected");
    }, 180);
  };
  const showFiles = () => {
    setSheetView("files");
    api.current.showSheet();
  };
  const toggle = (p: string) => setOpen((o) => ({ ...o, [p]: !o[p] }));
  const pickFile = (p: string) => {
    setFocus(p.slice(1));
    say("Added to chat");
    api.current.sheet(false);
    api.current.drawer(false);
    setTimeout(() => taR.current?.focus(), 250);
  };

  /* chat + analysis */
  const used = msgs
    .filter((m): m is Extract<Msg, { t: "run" }> => m.t === "run")
    .map((m) => m.k);
  const left = (Object.keys(ACTS) as ActKey[]).filter((k) => !used.includes(k));

  const run = async (k: ActKey) => {
    if (busy) return;

    if (k === "tree") {
      say("Structure analysis is not connected yet");
      return;
    }

    const code = sourceCode.trim();
    if (!code) {
      say("Paste Python source code before running an analysis");
      return;
    }
    if (code.length > 20000) {
      say("Source code must be 20000 characters or fewer");
      return;
    }

    setBusy(true);
    const id = Date.now();
    const messageId = id + 1;
    const endpoint =
      k === "readiness" ? "/api/ai/readiness" : "/api/ai/analyze";

    setMsgs((m) => [
      ...m,
      { id, t: "u", text: ACTS[k].title },
      { id: messageId, t: "run", k, step: 0, done: false },
    ]);

    try {
      setMsgs((m) =>
        m.map((x) =>
          x.t === "run" && x.id === messageId
            ? { ...x, step: 1 }
            : x,
        ),
      );

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: "python",
          filename: "submitted.py",
          source_code: code,
        }),
      });

      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const detail =
          payload && typeof payload === "object"
            ? String(
                (payload as Record<string, unknown>).detail ??
                  (payload as Record<string, unknown>).error ??
                  `Request failed (${response.status})`,
              )
            : `Request failed (${response.status})`;
        throw new Error(detail);
      }

      const result =
        payload && typeof payload === "object"
          ? (payload as Record<string, unknown>)
          : { response: payload };

      setMsgs((m) =>
        m.map((x) =>
          x.t === "run" && x.id === messageId
            ? { ...x, step: ACTS[k].steps.length, done: true, result }
            : x,
        ),
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to reach the DevMind API Gateway";
      setMsgs((m) =>
        m.map((x) =>
          x.t === "run" && x.id === messageId
            ? { ...x, done: true, error: message }
            : x,
        ),
      );
      say("Analysis request failed");
    } finally {
      setBusy(false);
    }
  };

  const answer = (t: string, f: string | null) => {
    const where = f ? `In ${f}, ` : "Across the project, ";
    if (/vuln|secur|secret|auth|token/i.test(t))
      return (
        where +
        "the first things I would check are credentials, token handling and unvalidated input. Run Find vulnerabilities for a full pass."
      );
    if (/struct|arch|folder|layout|module/i.test(t))
      return (
        where +
        "I would start at the entry layer and follow the imports down into services and models. Run Analyze structure for the full map."
      );
    return (
      where +
      "I can walk through what the code does, how it connects to the rest of the project and what I would improve. Ask about a specific function, or run one of the analyses below."
    );
  };

  const send = () => {
    const t = text.trim();
    if (!t || busy) return;
    if (!project) {
      say("Connect GitHub or upload a zip first");
      setNudge((n) => n + 1);
      return;
    }
    setText("");
    setBusy(true);
    const id = Date.now(),
      words = answer(t, focus).split(" ");
    setMsgs((m) => [
      ...m,
      { id, t: "u", text: t },
      { id: id + 1, t: "a", text: null, done: false },
    ]);
    setTimeout(() => {
      let i = 0;
      const iv = setInterval(
        () => {
          i++;
          setMsgs((m) =>
            m.map((x) =>
              x.t === "a" && x.id === id + 1
                ? {
                    ...x,
                    text: words.slice(0, i).join(" "),
                    done: i >= words.length,
                  }
                : x,
            ),
          );
          if (i >= words.length) {
            clearInterval(iv);
            setBusy(false);
          }
        },
        reduced() ? 5 : 45,
      );
    }, 700);
  };

  const newChat = () => {
    setMsgs([]);
    setBusy(false);
    setFocus(null);
    setText("");
    api.current.drawer(false);
  };

  const glass =
    "dm-glass backdrop-blur-2xl backdrop-saturate-150 bg-white/10 border border-white/10";
  const SrcIcon = project?.kind === "gh" ? Github : FileArchive;
  const tree = project ? [mkTree(project.root)] : [];

  const composer = (
    <div
      className={`dm-focus mx-auto w-full max-w-2xl rounded-3xl py-3 pl-5 pr-3 transition-shadow ${glass}`}
    >
      {focus && (
        <div className="mb-2 flex">
          <span
            className="flex items-center gap-1.5 rounded-full py-1 pl-2.5 pr-1.5 text-xs font-medium"
            style={{ background: G14, color: G, maxWidth: "100%" }}
          >
            <FileCode size={13} className="flex-none" />
            <span className="truncate">{focus}</span>
            <button
              aria-label="Remove file"
              onClick={() => setFocus(null)}
              className="dm-press grid h-5 w-5 flex-none place-items-center rounded-full"
            >
              <X size={12} />
            </button>
          </span>
        </div>
      )}
      <textarea
        ref={taR}
        rows={1}
        value={text}
        onChange={(e) => setText(e.target.value)}
        enterKeyHint="send"
        onKeyDown={(e) => {
          if (
            e.key === "Enter" &&
            !e.shiftKey &&
            !matchMedia("(pointer: coarse)").matches
          ) {
            e.preventDefault();
            send();
          }
        }}
        placeholder={
          project ? "Ask DevMind about this project…" : "Type something…"
        }
        className="block w-full resize-none bg-transparent py-1 leading-snug text-white placeholder-zinc-500 outline-none"
      />
      <div className="mt-1.5 flex items-center justify-between">
        <div className="flex items-center gap-2 rounded-full bg-white/10 py-1.5 pl-2.5 pr-3 text-sm font-medium text-zinc-300">
          <span className="h-2 w-2 rounded-full" style={{ background: G }} />
          DevMind AI
        </div>
        <button
          aria-label="Send"
          onClick={send}
          disabled={!text.trim()}
          className="dm-press grid h-10 w-10 place-items-center rounded-full transition-colors"
          style={
            text.trim()
              ? { background: G, color: "#000" }
              : { background: "rgba(255,255,255,.1)", color: "#52525b" }
          }
        >
          <ArrowUp size={20} strokeWidth={2.4} />
        </button>
      </div>
    </div>
  );

  return (
    <div
      className="dm relative flex w-full overflow-hidden bg-black text-white"
      style={{ height: "100dvh" }}
    >
      <style>{CSS}</style>

      {/* ---- sidebar: projects + files (persistent on large screens) ---- */}
      <aside
        ref={dR}
        className="dm-drawer dm-glass fixed lg:static z-30 top-0 bottom-0 left-0 flex flex-col gap-4 bg-black/70 backdrop-blur-2xl backdrop-saturate-150 border-r border-white/10 px-3"
        style={{
          touchAction: "pan-y",
          willChange: "transform",
          paddingTop: "calc(20px + env(safe-area-inset-top, 0px))",
          paddingBottom: "calc(16px + env(safe-area-inset-bottom, 0px))",
        }}
      >
        <div className="flex items-center gap-2.5 px-2 text-xl font-semibold tracking-tight">
          <Orb size={32} />
          DevMind
        </div>
        <button
          onClick={newChat}
          className="dm-press dm-hv flex w-full items-center gap-2.5 rounded-xl border border-white/10 p-2.5 text-sm font-medium"
        >
          <Plus size={18} style={{ color: G }} />
          New chat
        </button>
        <div>
          <div className="flex items-center gap-1 px-2 pb-1 text-sm font-medium text-zinc-400">
            Projects <ChevronRight size={15} />
          </div>
          <button
            onClick={() => api.current.drawer(false)}
            className={`dm-press dm-hv relative flex w-full items-center gap-3 rounded-xl p-2.5 ${!project ? "bg-white/10" : ""}`}
          >
            <Folder size={19} className="flex-none text-zinc-300" />
            <div className="min-w-0">
              <div className="text-sm font-medium">DevMind</div>
              <div className="text-xs text-zinc-400">Workspace</div>
            </div>
          </button>
          {project && (
            <button
              onClick={() => api.current.drawer(false)}
              className="dm-press dm-hv relative mt-1 flex w-full items-center gap-3 rounded-xl bg-white/10 p-2.5"
            >
              <span
                className="absolute left-0 top-3 bottom-3 w-0.5 rounded-full"
                style={{ background: G }}
              />
              <SrcIcon size={19} className="flex-none text-zinc-300" />
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">
                  {project.name}
                </div>
                <div className="truncate text-xs text-zinc-400">
                  {project.meta}
                </div>
              </div>
            </button>
          )}
        </div>
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="px-2 pb-1 text-sm font-medium text-zinc-400">
            Files
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {project ? (
              <Tree
                nodes={tree}
                base=""
                depth={0}
                open={open}
                toggle={toggle}
                pick={pickFile}
                sel={focus ? "/" + focus : null}
              />
            ) : (
              <div className="px-2 text-sm text-zinc-500">
                Connect a project to browse its folders.
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl bg-white/10 p-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-white text-sm font-semibold text-black">
            AB
          </div>
          <div className="leading-tight">
            <div className="text-sm font-medium">Alan Babu</div>
            <div className="text-xs text-zinc-400">Developer</div>
          </div>
        </div>
      </aside>
      <div
        ref={scR}
        className="fixed inset-0 z-20 bg-black/60 lg:hidden"
        style={{ opacity: 0, pointerEvents: "none", touchAction: "none" }}
      />
      <div
        ref={eR}
        className="fixed bottom-0 left-0 z-10 w-5 lg:hidden"
        style={{ top: 80, touchAction: "none" }}
      />

      {/* ---- main ---- */}
      <main className="relative h-full min-w-0 flex-1">
        <header
          className="absolute inset-x-0 top-0 z-10 flex items-center gap-2 px-3.5 pb-4"
          style={{
            paddingTop: "calc(10px + env(safe-area-inset-top, 0px))",
            background: "linear-gradient(#000 45%, transparent)",
          }}
        >
          <button
            aria-label="Projects"
            onClick={() => api.current.drawer(true)}
            className={`dm-press dm-hv grid h-11 w-11 place-items-center rounded-full lg:hidden ${glass}`}
          >
            <Menu size={20} strokeWidth={1.75} />
          </button>
          <div className="hidden w-11 lg:block" />
          <div className="min-w-0 flex-1 truncate text-center font-semibold tracking-tight">
            {project ? project.name : "DevMind"}
          </div>
          <button
            aria-label="Notifications"
            onClick={() => {
              setBell(false);
              say("You're all caught up");
            }}
            className={`dm-press dm-hv relative grid h-11 w-11 place-items-center rounded-full ${glass}`}
          >
            <Bell size={20} strokeWidth={1.75} />
            {bell && (
              <span
                className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full ring-2 ring-black"
                style={{ background: G }}
              />
            )}
          </button>
          <div
            className={`flex items-center gap-2 rounded-full py-1 pl-1 pr-3 ${glass}`}
          >
            <div className="grid h-8 w-8 place-items-center rounded-full bg-white text-xs font-semibold text-black">
              AB
            </div>
            <div className="text-sm font-semibold leading-tight">
              Alan Babu
              <div className="text-xs font-normal text-zinc-400">Developer</div>
            </div>
          </div>
        </header>

        <div
          ref={scrollR}
          className="absolute inset-0 overflow-y-auto px-5"
          style={{
            paddingTop: "calc(80px + env(safe-area-inset-top, 0px))",
            paddingBottom: project ? 230 : 40,
            WebkitOverflowScrolling: "touch",
          }}
        >
          {!project ? (
            /* ---------- centered home: greeting, sources, composer ---------- */
            <section className="dm-in mx-auto flex min-h-full w-full max-w-2xl flex-col items-center justify-center py-6 text-center">
              <Orb size={52} />
              <h1
                className="mt-5 text-4xl font-bold tracking-tighter sm:text-5xl"
                style={{ lineHeight: 1.05 }}
              >
                Hello, Alan.
              </h1>
              <p className="mb-8 mt-3 text-zinc-400">
                Bring in your code. DevMind reads it, maps it and audits it.
              </p>
              <div className="mb-3 grid w-full gap-3 sm:grid-cols-2">
                <button
                  key={"a" + nudge}
                  onClick={connect}
                  className={`dm-press dm-hvw flex w-full items-center gap-4 rounded-3xl bg-white p-4 text-black ${nudge ? "dm-nudge" : ""}`}
                >
                  <div className="grid h-12 w-12 flex-none place-items-center rounded-2xl bg-black text-white">
                    <Github size={23} strokeWidth={1.75} />
                  </div>
                  <div>
                    <div className="font-semibold tracking-tight">
                      Connect to GitHub
                    </div>
                    <div className="text-sm text-zinc-600">
                      Pull in a repository
                    </div>
                  </div>
                </button>
                <button
                  key={"b" + nudge}
                  onClick={() => fileR.current?.click()}
                  className={`dm-press dm-hv flex w-full items-center gap-4 rounded-3xl p-4 ${glass} ${nudge ? "dm-nudge" : ""}`}
                >
                  <div
                    className="grid h-12 w-12 flex-none place-items-center rounded-2xl"
                    style={{ background: G14, color: G }}
                  >
                    <FileArchive size={23} strokeWidth={1.75} />
                  </div>
                  <div>
                    <div className="font-semibold tracking-tight">
                      Upload zip file
                    </div>
                    <div className="text-sm text-zinc-400">
                      Drop in a project archive
                    </div>
                  </div>
                </button>
              </div>
              <input
                ref={fileR}
                type="file"
                accept=".zip,application/zip,application/x-zip-compressed"
                className="hidden"
                onChange={onFile}
              />
              {composer}
            </section>
          ) : (
            /* ---------- centered chat thread ---------- */
            <section className="mx-auto w-full max-w-2xl">
              <div
                className={`dm-in mt-3 flex items-center gap-4 rounded-3xl p-4 ${glass}`}
              >
                <div className="grid h-12 w-12 flex-none place-items-center rounded-2xl bg-white text-black">
                  <SrcIcon size={22} strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-zinc-400">
                    {project.kind === "gh"
                      ? "Connected repository"
                      : "Uploaded file"}
                  </div>
                  <div className="wrap-break-word font-semibold leading-snug tracking-tight">
                    {project.name}
                  </div>
                  <div className="text-xs text-zinc-400">{project.meta}</div>
                </div>
                <div className="ml-auto flex flex-none flex-col items-end gap-2">
                  <div
                    className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
                    style={{ color: G, background: G14 }}
                  >
                    <Check size={14} strokeWidth={2.6} />
                    Ready
                  </div>
                  <button
                    onClick={showFiles}
                    className="dm-press dm-hv flex items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-1 text-xs font-medium"
                  >
                    <Folder size={13} style={{ color: G }} />
                    Files
                  </button>
                </div>
              </div>

              <div className={`mt-5 rounded-3xl p-4 ${glass}`}>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold tracking-tight">
                      Python source code
                    </div>
                    <div className="text-xs text-zinc-400">
                      Paste code here. The demo repository picker does not read repository files.
                    </div>
                  </div>
                  <span className="flex-none text-xs text-zinc-500">
                    {sourceCode.length}/20000
                  </span>
                </div>
                <textarea
                  value={sourceCode}
                  onChange={(e) => setSourceCode(e.target.value.slice(0, 20000))}
                  maxLength={20000}
                  spellCheck={false}
                  aria-label="Python source code to analyze"
                  className="min-h-40 w-full resize-y rounded-2xl border border-white/10 bg-black/60 p-3 font-mono text-sm leading-relaxed text-zinc-100 outline-none focus:border-[#76B900]"
                  placeholder="Paste Python source code here..."
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => run("all")}
                    disabled={busy || !sourceCode.trim()}
                    className="dm-press rounded-full px-4 py-2.5 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-50"
                    style={{ background: G }}
                  >
                    {busy ? "Working…" : "Analyze code"}
                  </button>
                  <button
                    onClick={() => run("readiness")}
                    disabled={busy || !sourceCode.trim()}
                    className="dm-press flex items-center gap-2 rounded-full border border-white/15 px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <CheckCircle2 size={16} style={{ color: G }} />
                    Check readiness
                  </button>
                </div>
              </div>

              {msgs.length === 0 && (
                <div className="text-center">
                  <h2 className="mb-4 mt-10 text-2xl font-bold tracking-tight sm:text-3xl">
                    What would you like to do?
                  </h2>
                  <div className="grid gap-3 text-left">
                    {(Object.keys(ACTS) as ActKey[]).map((k, i) => {
                      const a = ACTS[k];
                      return (
                        <button
                          key={k}
                          onClick={() => run(k)}
                          style={{ animationDelay: `${0.08 * (i + 1)}s` }}
                          className={`dm-in dm-press dm-hv flex w-full items-center gap-4 rounded-3xl p-4 ${glass}`}
                        >
                          <div
                            className="grid h-12 w-12 flex-none place-items-center rounded-2xl"
                            style={{ background: G14, color: G }}
                          >
                            <a.Icon size={22} strokeWidth={1.75} />
                          </div>
                          <div>
                            <div className="font-semibold tracking-tight">
                              {a.title}
                            </div>
                            <div className="text-sm text-zinc-400">{a.sub}</div>
                          </div>
                          <ChevronRight
                            size={18}
                            className="ml-auto text-zinc-500"
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="mt-8 flex flex-col gap-6">
                {msgs.map((m) =>
                  m.t === "u" ? (
                    <div
                      key={m.id}
                      className="dm-in select-text self-end rounded-3xl rounded-br-md px-4 py-2.5 font-medium text-black"
                      style={{ background: G, maxWidth: "85%" }}
                    >
                      {m.text}
                    </div>
                  ) : (
                    <div key={m.id} className="dm-in flex gap-3">
                      <Orb size={30} />
                      <div className="min-w-0 flex-1 pt-0.5">
                        {m.t === "a" ? (
                          m.text === null ? (
                            <div className="flex items-center gap-2.5 pt-1 text-sm text-zinc-400">
                              <Spin />
                              Thinking
                            </div>
                          ) : (
                            <div className="select-text leading-relaxed text-zinc-100">
                              {m.text}
                              {!m.done && <span className="dm-caret" />}
                              {m.done && (
                                <div className="mt-2 text-xs text-zinc-500">
                                  Preview response
                                </div>
                              )}
                            </div>
                          )
                        ) : m.done ? (
                          <div className={`select-text rounded-3xl p-4 ${glass}`}>
                            <div className="mb-2 font-semibold tracking-tight">
                              {m.error
                                ? "Request failed"
                                : m.k === "readiness"
                                  ? "Production readiness result"
                                  : "Code analysis result"}
                            </div>
                            {m.error ? (
                              <div className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">
                                {m.error}
                                <div className="mt-2 text-xs text-zinc-400">
                                  Confirm the API Gateway is running on port 5001 and the AI service is healthy.
                                </div>
                              </div>
                            ) : (
                              <>
                                {m.k === "readiness" && m.result && (
                                  <div className="mb-3 rounded-2xl border border-white/10 bg-black/30 p-3">
                                    <div className="flex flex-wrap items-end justify-between gap-3">
                                      <div>
                                        <div className="text-xs text-zinc-400">
                                          Provisional score
                                        </div>
                                        <div className="text-3xl font-bold" style={{ color: G }}>
                                          {String(m.result.score ?? "—")}
                                          {typeof m.result.score === "number" ? "%" : ""}
                                        </div>
                                      </div>
                                      <div className="text-right text-sm">
                                        <div>
                                          Production ready:{" "}
                                          <span className={m.result.production_ready === true ? "text-lime-400" : "text-amber-300"}>
                                            {m.result.production_ready === true ? "Yes" : "No"}
                                          </span>
                                        </div>
                                        <div className="mt-1 text-xs text-zinc-400">
                                          {String(m.result.score_type ?? "unknown score type")}
                                        </div>
                                      </div>
                                    </div>
                                    {Array.isArray(m.result.unknown_categories) && (
                                      <div className="mt-3 text-sm text-zinc-300">
                                        <div className="mb-1 text-xs text-zinc-400">Categories without evidence</div>
                                        <div className="flex flex-wrap gap-1.5">
                                          {(m.result.unknown_categories as unknown[]).map((category) => (
                                            <span key={String(category)} className="rounded-full bg-white/10 px-2.5 py-1 text-xs">
                                              {String(category)}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {typeof m.result.note === "string" && (
                                      <p className="mt-3 text-xs leading-relaxed text-zinc-400">
                                        {m.result.note}
                                      </p>
                                    )}
                                  </div>
                                )}
                                <details className="rounded-xl border border-white/10 bg-black/30 p-3">
                                  <summary className="cursor-pointer text-sm font-medium">
                                    View complete API response
                                  </summary>
                                  <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap wrap-break-word text-xs leading-relaxed text-zinc-300">
                                    {JSON.stringify(m.result ?? {}, null, 2)}
                                  </pre>
                                </details>
                              </>
                            )}
                            <div className="mt-3 text-xs text-zinc-500">
                              Real response from the DevMind API Gateway
                            </div>
                          </div>
                        ) : (
                          ACTS[m.k].steps.map((s, i) => (
                            <div
                              key={i}
                              className={`flex items-center gap-2.5 py-1 text-sm ${i < m.step ? "text-white" : i === m.step ? "text-zinc-300" : "text-zinc-600"}`}
                            >
                              {i < m.step ? (
                                <Check
                                  size={16}
                                  strokeWidth={2.6}
                                  style={{ color: G }}
                                />
                              ) : i === m.step ? (
                                <Spin />
                              ) : (
                                <span className="h-4 w-4" />
                              )}
                              {s}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ),
                )}
                {msgs.length > 0 && !busy && left.length > 0 && (
                  <div
                    className="dm-in -mx-5 flex gap-2 overflow-x-auto px-5 pb-1 sm:justify-center"
                    style={{
                      touchAction: "pan-x pan-y",
                      scrollbarWidth: "none",
                    }}
                  >
                    {left.map((k) => (
                      <button
                        key={k}
                        onClick={() => run(k)}
                        className={`dm-press dm-hv flex flex-none items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium ${glass}`}
                      >
                        {(() => {
                          const I = ACTS[k].Icon;
                          return <I size={16} style={{ color: G }} />;
                        })()}
                        {ACTS[k].title}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}
        </div>

        {/* ---- docked composer (chat mode) ---- */}
        {project && (
          <div
            className="absolute inset-x-0 bottom-0 z-10 px-3.5 pt-8"
            style={{
              paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
              background: "linear-gradient(transparent, #000 45%)",
            }}
          >
            {composer}
          </div>
        )}
      </main>

      {/* ---- bottom sheet ---- */}
      <div
        ref={swR}
        className="fixed inset-0 z-50"
        style={{ pointerEvents: "none" }}
      >
        <div
          ref={sc2R}
          onClick={() => api.current.sheet(false)}
          className="absolute inset-0 bg-black/60"
          style={{ opacity: 0 }}
        />
        <div
          ref={shR}
          className="dm-sheet dm-glass absolute inset-x-0 bottom-0 mx-auto rounded-t-3xl border border-b-0 border-white/10 bg-zinc-900/80 px-5 backdrop-blur-3xl backdrop-saturate-150"
          style={{
            maxHeight: "88dvh",
            transform: "translate3d(0,100%,0)",
            willChange: "transform",
            paddingBottom: "calc(20px + env(safe-area-inset-bottom, 0px))",
          }}
        >
          <div
            ref={grR}
            className="cursor-grab py-3"
            style={{ touchAction: "none" }}
          >
            <div className="mx-auto h-1.5 w-10 rounded-full bg-white/30" />
          </div>
          {sheetView === "auth" && (
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                Connect GitHub
              </h2>
              <p className="mb-5 mt-1 text-zinc-400">
                Choose how DevMind reaches your repositories.
              </p>
              <button
                onClick={authorize}
                className="dm-press dm-hvw flex w-full items-center justify-center gap-2.5 rounded-2xl bg-white p-4 font-semibold text-black"
              >
                <Github size={22} />
                Continue with GitHub
              </button>
            </div>
          )}
          {sheetView === "wait" && (
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Connecting</h2>
              <p className="mt-1 text-zinc-400">
                Waiting for GitHub to confirm.
              </p>
              <div className="grid place-items-center py-8">
                <Spin size={28} />
              </div>
            </div>
          )}
          {sheetView === "repos" && (
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                Pick a repository
              </h2>
              <p className="mb-3 mt-1 text-zinc-400">
                Signed in as{" "}
                <b className="font-semibold text-white">alanbabu</b>
              </p>
              {REPOS.map((r, i) => (
                <button
                  key={r[0]}
                  onClick={() => pickRepo(r)}
                  style={{ animationDelay: `${i * 0.06}s` }}
                  className="dm-in dm-press dm-hv flex w-full items-center gap-3 rounded-2xl p-3"
                >
                  <div
                    className="grid h-10 w-10 place-items-center rounded-xl"
                    style={{ background: G14, color: G }}
                  >
                    <Github size={20} />
                  </div>
                  <div>
                    <div className="font-semibold">{r[0]}</div>
                    <div className="text-sm text-zinc-400">{r[1]}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
          {sheetView === "files" && project && (
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                Project files
              </h2>
              <p className="mb-3 mt-1 text-zinc-400">
                Tap a file to ask about it in chat.
              </p>
              <div className="overflow-y-auto" style={{ maxHeight: "52dvh" }}>
                <Tree
                  nodes={tree}
                  base=""
                  depth={0}
                  open={open}
                  toggle={toggle}
                  pick={pickFile}
                  sel={focus ? "/" + focus : null}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div
        className={`dm-glass pointer-events-none fixed left-1/2 z-60 -translate-x-1/2 rounded-full border border-white/10 bg-zinc-900/80 px-4 py-2.5 text-sm font-medium backdrop-blur-xl transition-all duration-300 ${toast ? "opacity-100" : "-translate-y-2 opacity-0"}`}
        style={{ top: "calc(72px + env(safe-area-inset-top, 0px))" }}
      >
        {toast || "\u00A0"}
      </div>
    </div>
  );
}

/* Custom rules that Tailwind utilities can't express. Move into your global CSS if you prefer. */
const CSS = `
html{-webkit-tap-highlight-color:transparent;-webkit-text-size-adjust:100%;overscroll-behavior:none}
.dm{font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","SF Pro Text",Inter,"Segoe UI",system-ui,sans-serif;-webkit-font-smoothing:antialiased;font-optical-sizing:auto}
.dm button{touch-action:manipulation;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;text-align:left}
.dm textarea{font-size:16px}
.dm-drawer{width:min(86vw,320px)}
@media (min-width:1024px){.dm-drawer{width:290px;flex:none;transform:none!important;background:#000}}
.dm-sheet{max-width:560px}
.dm-press{transition:transform .12s ease-out,background-color .12s}
.dm-press:active{transform:scale(.97)}
.dm-focus:focus-within{border-color:rgba(118,185,0,.6);box-shadow:0 0 0 4px rgba(118,185,0,.14)}
.dm-caret{display:inline-block;width:7px;height:1em;margin-left:3px;vertical-align:-2px;border-radius:2px;background:#76B900;animation:dmBlink 1s steps(2) infinite}
@keyframes dmBlink{50%{opacity:0}}
@keyframes dmIn{from{opacity:0;transform:translateY(12px) scale(.98);filter:blur(6px)}}
.dm-in{animation:dmIn .45s cubic-bezier(.2,.9,.2,1) both}
@keyframes dmNudge{40%{transform:scale(1.03)}}
.dm-nudge{animation:dmNudge .5s cubic-bezier(.2,.9,.2,1)}
@media (hover:hover) and (pointer:fine){.dm-hv:hover{background-color:rgba(255,255,255,.16)}.dm-hvw:hover{background-color:#e4e4e7}}
@media (prefers-reduced-motion:reduce){.dm-in,.dm-nudge{animation:none}.dm-caret{animation:none}}
@media (prefers-reduced-transparency:reduce){.dm-glass{backdrop-filter:none!important;-webkit-backdrop-filter:none!important;background:#0a0a0a!important}}
`;
