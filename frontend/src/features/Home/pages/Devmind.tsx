import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertCircle,
  ArrowDownToLine,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
  Code2,
  Copy,
  File,
  FileCode2,
  FileJson,
  FileText,
  Folder,
  FolderOpen,
  GitBranch,
  Info,
  LoaderCircle,
  Lock,
  LockKeyhole,
  Menu,
  MessageSquareText,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Unplug,
  X,
} from "lucide-react";
import { FaGithub } from "react-icons/fa";
import AiMascotInput from "../components/ui/ai-mascot-input";
import type {
  AIModel,
  ChatSubmitData,
} from "../components/ui/ai-mascot-input";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5001"
).replace(/\/$/, "");

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
type JsonRecord = Record<string, unknown>;
type GithubRepo = {
  id: number | string;
  name: string;
  full_name: string;
  fullName?: string;
  description?: string | null;
  language?: string | null;
  private?: boolean;
  default_branch?: string;
  defaultBranch?: string;
  updated_at?: string;
  updatedAt?: string;
  html_url?: string;
  url?: string;
};
type GithubBranch = { name: string; protected?: boolean };
type GithubEntry = {
  name: string;
  path: string;
  type: "file" | "dir" | string;
  size?: number;
  sha?: string;
  download_url?: string | null;
  content?: string;
  text?: string;
  decodedContent?: string;
  encoding?: string;
};
type TreeNode = GithubEntry & { children?: TreeNode[] };
type GithubStatus = {
  connected: boolean;
  username?: string;
  login?: string;
  avatar_url?: string;
  avatarUrl?: string;
};
type Notice = { type: "success" | "error" | "info"; text: string };
type ChatMessage = { id: string; role: "user" | "assistant"; text: string };
type RepairResult = JsonRecord;
type SheetKind = "code" | "repair" | "analysis" | "rule" | null;
type ConsentAction = "chat" | "repair" | "analyze";
type DragOpts = {
  els: HTMLElement[];
  axis: "x" | "y";
  get: () => number;
  set: (v: number) => void;
  min: number;
  max: number;
  start?: () => boolean;
  onTap?: (el: HTMLElement) => void;
  onEnd: (v: number) => void;
};

/* ------------------------------------------------------------------ */
/*  Helpers (API + data)                                               */
/* ------------------------------------------------------------------ */
const DevMindIcon = ({
  size = 16,
  className = "",
}: {
  size?: number;
  className?: string;
}) => <Sparkles size={size} className={className} />;
/* The backend exposes one assistant, so the model menu has one entry.
   "Answer depth" is real: it is added to the prompt as an instruction. */
const DEPTH_NOTE: Record<string, string> = {
  low: "Answer concisely in a few sentences.",
  medium: "Give a clear, balanced answer with the key details.",
  high: "Be thorough: reason step by step and cite specific file paths from the evidence.",
};
const FORMAT_NOTE =
  "Format the answer so it is easy to read: start with a one-sentence summary; use numbered lists for steps and ordered findings; use short bullet points for details; use **bold** for key terms and `backticks` for file names, functions and code; keep paragraphs to 2-3 sentences; put any code in fenced code blocks.";
const DEVMIND_MODELS: AIModel[] = [
  {
    id: "devmind",
    name: "DevMind AI",
    provider: "Codebase assistant",
    tag: "Code",
    icon: DevMindIcon,
    badgeColor: "text-lime-500",
    accentColor: "#76B900",
    reasoningTitle: "Answer depth",
    defaultLevel: "medium",
    levels: [
      {
        id: "low",
        label: "Quick",
        desc: "Short, direct answers",
        multiplier: 1.6,
      },
      {
        id: "medium",
        label: "Balanced",
        desc: "Clear answers with the key details",
        multiplier: 2.6,
      },
      {
        id: "high",
        label: "Thorough",
        desc: "Step-by-step answers that cite file paths",
        multiplier: 3.8,
      },
    ],
  },
];
const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" ? (value as JsonRecord) : {};
}
function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}
function unwrapArray<T>(payload: unknown, keys: string[]): T[] {
  if (Array.isArray(payload)) return payload as T[];
  const record = asRecord(payload);
  for (const key of keys) {
    if (Array.isArray(record[key])) return record[key] as T[];
  }
  if (Array.isArray(record.data)) return record.data as T[];
  const data = asRecord(record.data);
  for (const key of keys) {
    if (Array.isArray(data[key])) return data[key] as T[];
  }
  return [];
}
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    ...init,
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
  const raw = await response.text();
  let payload: unknown = null;
  if (raw) {
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = raw;
    }
  }
  if (!response.ok) {
    const record = asRecord(payload);
    const message = asString(
      record.message,
      asString(
        record.error,
        typeof payload === "string" ? payload : response.statusText,
      ),
    );
    throw new Error(
      `${response.status} ${response.statusText}${message ? ` — ${message}` : ""}`,
    );
  }
  return payload as T;
}
const isDirectory = (entry: GithubEntry) => entry.type === "dir";

/* Sort by depth first so a parent folder is always indexed before its children. */
function buildTree(entries: GithubEntry[]): TreeNode[] {
  const root: TreeNode[] = [];
  const index = new Map<string, TreeNode>();
  const depth = (p: string) => p.split("/").length;
  const sorted = [...entries].sort((a, b) => {
    const ad = isDirectory(a) ? 0 : 1,
      bd = isDirectory(b) ? 0 : 1;
    return (
      depth(a.path) - depth(b.path) || ad - bd || a.name.localeCompare(b.name)
    );
  });
  for (const entry of sorted) {
    const node: TreeNode = {
      ...entry,
      children: isDirectory(entry) ? [] : undefined,
    };
    index.set(entry.path, node);
    const parent = index.get(entry.path.split("/").slice(0, -1).join("/"));
    if (parent?.children) parent.children.push(node);
    else root.push(node);
  }
  return root;
}
function getFileIcon(name: string) {
  if (/\.json$/i.test(name)) return FileJson;
  if (/\.(tsx?|jsx?|py|go|rs|java|c|cpp|sql|sh|yml|yaml)$/i.test(name))
    return FileCode2;
  if (/\.md$/i.test(name)) return FileText;
  return File;
}
function decodeContent(entry: GithubEntry): string {
  const plain = entry.decodedContent ?? entry.text;
  if (typeof plain === "string") return plain;
  if (typeof entry.content === "string") {
    if (entry.encoding === "base64") {
      const bin = atob(entry.content.replace(/\n/g, ""));
      try {
        return new TextDecoder().decode(
          Uint8Array.from(bin, (c) => c.charCodeAt(0)),
        );
      } catch {
        return bin;
      }
    }
    return entry.content;
  }
  return "";
}

/* ------------------------------------------------------------------ */
/*  Motion: springs (response + damping ratio) and axis-locked drag     */
/* ------------------------------------------------------------------ */
const raf: Record<string, number> = {};
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

function spring(
  key: string,
  from: number,
  to: number,
  v0: number,
  set: (v: number) => void,
  r = 0.36,
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

/* 10px hysteresis, 1:1 tracking, rubber-band at the edges, velocity on release */
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
  type S = {
    x0: number;
    y0: number;
    base: number;
    on: boolean;
    el: HTMLElement;
  };
  let g: S | null = null;
  let h: [number, number][] = [];
  const X = axis === "x";
  const down = (ev: Event) => {
    const e = ev as PointerEvent;
    if (start && !start()) return;
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

/* ------------------------------------------------------------------ */
/*  Small components                                                   */
/* ------------------------------------------------------------------ */
function Spin({ size = 16 }: { size?: number }) {
  return <LoaderCircle size={size} className="dm-spin" />;
}
function Orb({ size = 30 }: { size?: number }) {
  return (
    <span className="dm-orb" style={{ width: size, height: size }}>
      <Sparkles size={Math.round(size * 0.52)} strokeWidth={2.2} />
    </span>
  );
}
/* Renders AI replies: headings, numbered lists, bullet points, **bold**, `code` and fenced code blocks */
type ListItem = { text: string; sub: string[] };
type Block =
  | { t: "h"; text: string }
  | { t: "p"; text: string }
  | { t: "ol"; start: number; items: ListItem[] }
  | { t: "ul"; items: ListItem[] };

function parseBlocks(src: string): Block[] {
  const blocks: Block[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) {
      blocks.push({ t: "p", text: para.join(" ") });
      para = [];
    }
  };
  for (const raw of src.split("\n")) {
    const line = raw.replace(/\s+$/, "");
    if (!line.trim()) {
      flush();
      continue;
    }
    const h = /^\s{0,3}#{1,4}\s+(.*)$/.exec(line);
    if (h) {
      flush();
      blocks.push({ t: "h", text: h[1] });
      continue;
    }
    const ol = /^(\s*)(\d+)[.)]\s+(.*)$/.exec(line);
    const ul = /^(\s*)[-*•]\s+(.*)$/.exec(line);
    const last = blocks[blocks.length - 1];
    if (ol || ul) {
      flush();
      const indent = (ol ? ol[1] : ul![1]).length;
      const text = ol ? ol[3] : ul![2];
      if (
        indent >= 2 &&
        last &&
        (last.t === "ol" || last.t === "ul") &&
        last.items.length
      ) {
        last.items[last.items.length - 1].sub.push(text);
      } else if (ol) {
        if (last && last.t === "ol") last.items.push({ text, sub: [] });
        else
          blocks.push({
            t: "ol",
            start: Number(ol[2]),
            items: [{ text, sub: [] }],
          });
      } else if (last && last.t === "ul") last.items.push({ text, sub: [] });
      else blocks.push({ t: "ul", items: [{ text, sub: [] }] });
      continue;
    }
    // a wrapped, indented line continues the previous list item
    if (
      !para.length &&
      /^\s{2,}\S/.test(line) &&
      last &&
      (last.t === "ol" || last.t === "ul") &&
      last.items.length
    ) {
      last.items[last.items.length - 1].text += " " + line.trim();
      continue;
    }
    para.push(line.trim());
  }
  flush();
  return blocks;
}
function Inline({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) =>
        part.length > 4 && part.startsWith("**") && part.endsWith("**") ? (
          <strong key={i}>{part.slice(2, -2)}</strong>
        ) : part.length > 2 && part.startsWith("`") && part.endsWith("`") ? (
          <code key={i} className="dm-ic-code">
            {part.slice(1, -1)}
          </code>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}
function Rich({ text }: { text: string }): ReactNode {
  const bits = text.split(/```[\w-]*\n?([\s\S]*?)```/g);
  return (
    <>
      {bits.map((b, i) =>
        i % 2 ? (
          <pre key={i} className="dm-codeblock">
            <code>{b.replace(/\n$/, "")}</code>
          </pre>
        ) : (
          parseBlocks(b).map((blk, j) => {
            const k = `${i}-${j}`;
            if (blk.t === "h")
              return (
                <h3 key={k} className="dm-md-h">
                  <Inline text={blk.text} />
                </h3>
              );
            if (blk.t === "p")
              return (
                <p key={k}>
                  <Inline text={blk.text} />
                </p>
              );
            const List = blk.t === "ol" ? "ol" : "ul";
            return (
              <List
                key={k}
                className={blk.t === "ol" ? "dm-ol" : "dm-ul"}
                style={
                  blk.t === "ol"
                    ? { counterReset: `dm-n ${blk.start - 1}` }
                    : undefined
                }
              >
                {blk.items.map((it, n) => (
                  <li key={n}>
                    <div className="dm-li-body">
                      <Inline text={it.text} />
                      {it.sub.length > 0 && (
                        <ul className="dm-ul sub">
                          {it.sub.map((sx, m) => (
                            <li key={m}>
                              <div className="dm-li-body">
                                <Inline text={sx} />
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </li>
                ))}
              </List>
            );
          })
        ),
      )}
    </>
  );
}
function Finding({ f, n }: { f: unknown; n?: number }) {
  const r = asRecord(f);
  const sev = asString(r.severity, asString(r.level, asString(r.type)));
  const msg = asString(r.message, asString(r.description, asString(r.title)));
  const rule = asString(r.rule, asString(r.rule_id, asString(r.id)));
  const src = asString(r.source);
  const evidence = typeof r.evidence === "string" ? r.evidence : "";
  if (!msg && !rule)
    return <pre className="dm-repair">{JSON.stringify(f, null, 2)}</pre>;
  return (
    <div className="dm-finding">
      <div className="dm-find-top">
        {n != null && <span className="dm-num">{n}</span>}
        {sev && <span className={`dm-sev ${sev.toLowerCase()}`}>{sev}</span>}
        {r.line != null && <span>Line {String(r.line)}</span>}
        {src && <span>{src}</span>}
        {rule && <span className="dm-find-rule">{rule}</span>}
      </div>
      {msg && <p>{msg}</p>}
      {evidence && <pre className="dm-evidence">{evidence}</pre>}
    </div>
  );
}
function TreeItems({
  nodes,
  depth,
  selected,
  expanded,
  onToggle,
  onSelect,
}: {
  nodes: TreeNode[];
  depth: number;
  selected: string;
  expanded: Set<string>;
  onToggle: (path: string) => void;
  onSelect: (entry: TreeNode) => void;
}) {
  return (
    <>
      {nodes.map((node) => {
        const directory = isDirectory(node),
          open = expanded.has(node.path),
          active = selected === node.path;
        const Icon = directory
          ? open
            ? FolderOpen
            : Folder
          : getFileIcon(node.name);
        return (
          <div key={node.path}>
            <button
              type="button"
              title={node.path}
              className={`dm-tree-item dm-press ${active ? "is-selected" : ""}`}
              style={{ paddingLeft: 12 + depth * 16 }}
              onClick={() => (directory ? onToggle(node.path) : onSelect(node))}
            >
              {directory ? (
                <ChevronRight
                  size={14}
                  className={`dm-chev ${open ? "open" : ""}`}
                />
              ) : (
                <span className="dm-chev-gap" />
              )}
              <Icon
                size={17}
                className={directory ? "dm-ic-dir" : "dm-ic-file"}
              />
              <span className="dm-truncate">{node.name}</span>
            </button>
            {directory && open && node.children && node.children.length > 0 && (
              <TreeItems
                nodes={node.children}
                depth={depth + 1}
                selected={selected}
                expanded={expanded}
                onToggle={onToggle}
                onSelect={onSelect}
              />
            )}
          </div>
        );
      })}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function DevMind() {
  const [status, setStatus] = useState<GithubStatus>({ connected: false });
  const [repos, setRepos] = useState<GithubRepo[]>([]);
  const [repo, setRepo] = useState<GithubRepo | null>(null);
  const [branches, setBranches] = useState<GithubBranch[]>([]);
  const [branch, setBranch] = useState("main");
  const [entries, setEntries] = useState<GithubEntry[]>([]);
  const [selectedFile, setSelectedFile] = useState<GithubEntry | null>(null);
  const [sourceCode, setSourceCode] = useState("");
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [prompt, setPrompt] = useState("");
  const [repoSearch, setRepoSearch] = useState("");
  const [fileSearch, setFileSearch] = useState("");
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [loadingFile, setLoadingFile] = useState(false);
  const [sending, setSending] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [repairResult, setRepairResult] = useState<RepairResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<JsonRecord | null>(null);
  const [consentOpen, setConsentOpen] = useState(false);
  const [consentKey, setConsentKey] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<ConsentAction | null>(
    null,
  );
  const [notice, setNotice] = useState<Notice | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [filesOpen, setFilesOpen] = useState(true);
  const [kb, setKb] = useState(false);

  const dR = useRef<HTMLElement>(null),
    dscR = useRef<HTMLDivElement>(null);
  const shR = useRef<HTMLDivElement>(null),
    swR = useRef<HTMLDivElement>(null);
  const sscR = useRef<HTMLDivElement>(null),
    grR = useRef<HTMLDivElement>(null);
  const threadR = useRef<HTMLDivElement>(null);
  const effortRef = useRef("medium");
  const autoOpened = useRef(false);
  const pendingMessage = useRef("");
  const api = useRef<{
    drawer: (o: boolean, v?: number) => void;
    sheet: (o: boolean, v?: number) => void;
    show: () => void;
  }>({
    drawer: () => {},
    sheet: () => {},
    show: () => {},
  });

  const notify = useCallback(
    (text: string, type: Notice["type"] = "info") => setNotice({ text, type }),
    [],
  );
  const openSheet = (kind: Exclude<SheetKind, null>) => {
    setSheet(kind);
    api.current.show();
  };
  const closeSheet = () => api.current.sheet(false);

  /* ---------- platform: drawer + sheet physics, keyboard-aware height ---------- */
  useEffect(() => {
    const d = dR.current!,
      dsc = dscR.current!,
      sh = shR.current!,
      sw = swR.current!,
      ssc = sscR.current!,
      gr = grR.current!;
    const W = () => Math.min(innerWidth * 0.86, 340);
    const H = () => sh.offsetHeight || 480;
    const clamp = (n: number) => Math.max(0, Math.min(1, n));
    let dx = -W(),
      dOpen = false,
      sy = 9999;

    const setD = (v: number) => {
      dx = v;
      d.style.transform = `translate3d(${v}px,0,0)`;
      const p = clamp(1 + v / W());
      dsc.style.opacity = String(p);
      dsc.style.pointerEvents = p > 0.01 ? "auto" : "none";
    };
    const setS = (v: number) => {
      sy = v;
      sh.style.transform = `translate3d(0,${v}px,0)`;
      ssc.style.opacity = String(clamp(1 - v / H()));
    };
    const drawer = (o: boolean, v = 0) => {
      dOpen = o;
      spring("x", dx, o ? 0 : -W(), v, setD, 0.34);
    };
    const sheetTo = (o: boolean, v = 0) => {
      sw.style.pointerEvents = o ? "auto" : "none";
      spring("y", sy, o ? 0 : H(), v, setS);
    };
    setD(-W());
    api.current = {
      drawer,
      sheet: sheetTo,
      show: () =>
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            setS(H());
            sheetTo(true);
          }),
        ),
    };

    const c1 = attachDrag({
      els: [d, dsc],
      axis: "x",
      get: () => dx,
      set: setD,
      min: -W(),
      max: 0,
      start: () => dOpen,
      onTap: (el) => {
        if (el === dsc) drawer(false);
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
      onEnd: (v) => sheetTo(!(sy + v * 0.499 > H() / 2), v),
    });
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        sheetTo(false);
        drawer(false);
      }
    };
    addEventListener("keydown", key);
    return () => {
      c1();
      c2();
      removeEventListener("keydown", key);
    };
  }, []);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const fit = () => {
      document.documentElement.style.setProperty("--dm-vh", `${vv.height}px`);
      setKb(vv.height < window.innerHeight * 0.75);
      if (vv.offsetTop) window.scrollTo(0, 0);
    };
    fit();
    vv.addEventListener("resize", fit);
    vv.addEventListener("scroll", fit);
    return () => {
      vv.removeEventListener("resize", fit);
      vv.removeEventListener("scroll", fit);
    };
  }, []);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(
      () => setNotice(null),
      notice.type === "error" ? 7000 : 3800,
    );
    return () => clearTimeout(t);
  }, [notice]);

  useEffect(() => {
    const t = threadR.current;
    if (t)
      t.scrollTo({
        top: t.scrollHeight,
        behavior: reduced() ? "auto" : "smooth",
      });
  }, [chat, sending]);

  /* ---------- data: GitHub status, repos, branches, files ---------- */
  const loadStatus = useCallback(async () => {
    setLoadingStatus(true);
    try {
      const payload = asRecord(await request<unknown>("/api/github/status"));
      const nested = asRecord(payload.data);
      const connected = Boolean(
        payload.connected ??
        nested.connected ??
        payload.isConnected ??
        nested.isConnected,
      );
      setStatus({
        connected,
        username: asString(
          payload.username,
          asString(
            payload.login,
            asString(nested.username, asString(nested.login)),
          ),
        ),
        login: asString(payload.login, asString(nested.login)),
        avatar_url: asString(
          payload.avatar_url,
          asString(
            payload.avatarUrl,
            asString(nested.avatar_url, asString(nested.avatarUrl)),
          ),
        ),
        avatarUrl: asString(payload.avatarUrl, asString(nested.avatarUrl)),
      });
    } catch (error) {
      setStatus({ connected: false });
      notify(
        `GitHub status could not be loaded. Check the gateway route and API URL. ${error instanceof Error ? error.message : ""}`.trim(),
        "error",
      );
    } finally {
      setLoadingStatus(false);
    }
  }, [notify]);

  const loadRepos = useCallback(async () => {
    setLoadingRepos(true);
    try {
      const payload = await request<unknown>(
        "/api/github/repos?page=1&sort=updated",
      );
      const list = unwrapArray<GithubRepo>(payload, [
        "repos",
        "items",
        "data",
      ]).map((item) => {
        const fullName =
          (typeof item.full_name === "string" && item.full_name.trim()) ||
          (typeof item.fullName === "string" && item.fullName.trim()) ||
          "";
        const fallbackName =
          item.name ||
          fullName.split("/").filter(Boolean).pop() ||
          "Repository";
        return {
          ...item,
          id: item.id ?? fullName ?? fallbackName,
          name: fallbackName,
          // The gateway returns fullName (camelCase); the UI uses full_name for API paths.
          full_name: fullName || fallbackName,
          default_branch: item.default_branch ?? item.defaultBranch ?? "main",
          updated_at: item.updated_at ?? item.updatedAt,
          html_url: item.html_url ?? item.url,
        };
      });
      setRepos(list);
      if (!list.length)
        notify(
          "GitHub is connected, but no repositories were returned for this account.",
          "info",
        );
    } catch (error) {
      notify(
        `Could not load repositories. ${error instanceof Error ? error.message : ""}`,
        "error",
      );
    } finally {
      setLoadingRepos(false);
    }
  }, [notify]);

  useEffect(() => {
    if (status.connected) void loadRepos();
  }, [status.connected, loadRepos]);

  /* first time after connecting with nothing imported yet: show the repository drawer */
  useEffect(() => {
    if (status.connected && repos.length && !repo && !autoOpened.current) {
      autoOpened.current = true;
      api.current.drawer(true);
    }
  }, [status.connected, repos, repo]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const githubResult = params.get("github");
    if (githubResult === "success")
      notify("GitHub connected successfully.", "success");
    if (githubResult === "error")
      notify(params.get("message") || "GitHub connection failed.", "error");
    if (githubResult)
      window.history.replaceState({}, "", window.location.pathname); // don't re-toast on refresh
    void loadStatus();
  }, [loadStatus, notify]);

  const connectGithub = () => {
    window.location.assign(`${API_BASE_URL}/api/github/connect`);
  };

  const disconnectGithub = async () => {
    try {
      await request<unknown>("/api/github/connect", { method: "DELETE" });
      setStatus({ connected: false });
      setRepos([]);
      setRepo(null);
      setBranches([]);
      setEntries([]);
      setSelectedFile(null);
      setSourceCode("");
      setChat([]);
      setRepairResult(null);
      setAnalysisResult(null);
      setConsentKey(null);
      setConsentOpen(false);
      setPendingAction(null);
      autoOpened.current = false;
      closeSheet();
      api.current.drawer(false);
      notify("GitHub disconnected.", "success");
    } catch (error) {
      notify(
        `Could not disconnect GitHub. ${error instanceof Error ? error.message : ""}`,
        "error",
      );
    }
  };

  const loadContents = useCallback(
    async (target: GithubRepo, targetBranch: string, path = "") => {
      setLoadingFiles(true);
      try {
        const encoded = target.full_name
          .split("/")
          .map(encodeURIComponent)
          .join("/");
        const query = new URLSearchParams({ ref: targetBranch });
        if (path) query.set("path", path);
        const payload = await request<unknown>(
          `/api/github/repos/${encoded}/contents?${query.toString()}`,
        );
        const list = unwrapArray<GithubEntry>(payload, [
          "contents",
          "files",
          "items",
          "data",
        ]);
        const normalized = list.map(
          (entry) =>
            ({
              ...entry,
              path: entry.path || (path ? `${path}/${entry.name}` : entry.name),
            }) as GithubEntry,
        );
        setEntries((current) => {
          if (!path) return normalized;
          const byPath = new Map(current.map((e) => [e.path, e]));
          normalized.forEach((e) => byPath.set(e.path, e));
          return [...byPath.values()];
        });
        if (path) setExpanded((current) => new Set(current).add(path));
        else setExpanded(new Set());
      } catch (error) {
        setEntries([]);
        notify(
          `Could not load repository files. ${error instanceof Error ? error.message : ""}`,
          "error",
        );
      } finally {
        setLoadingFiles(false);
      }
    },
    [notify],
  );

  const chooseRepo = async (item: GithubRepo) => {
    const fullName = item.full_name?.trim();
    if (!fullName || fullName.split("/").length !== 2) {
      notify(
        `Cannot open this repository because the API did not return its owner/repository name. Received: ${fullName || "empty"}`,
        "error",
      );
      return;
    }
    const selectedRepo = { ...item, full_name: fullName };
    setRepo(selectedRepo);
    setSelectedFile(null);
    setSourceCode("");
    setRepairResult(null);
    setChat([]);
    setAnalysisResult(null);
    setConsentKey(null);
    setConsentOpen(false);
    setPendingAction(null);
    setEntries([]);
    setExpanded(new Set());
    setFileSearch("");
    setFilesOpen(true);
    setBranch(selectedRepo.default_branch || "main");
    closeSheet();
    api.current.drawer(false);
    setLoadingFiles(true);
    try {
      const encoded = selectedRepo.full_name
        .split("/")
        .map(encodeURIComponent)
        .join("/");
      const payload = await request<unknown>(
        `/api/github/repos/${encoded}/branches`,
      );
      const list = unwrapArray<GithubBranch>(payload, [
        "branches",
        "items",
        "data",
      ]).map((b) =>
        typeof b === "string" ? ({ name: b } as GithubBranch) : b,
      );
      setBranches(list);
      const defaultBranch = selectedRepo.default_branch || "main";
      const chosen = list.some((b) => b.name === defaultBranch)
        ? defaultBranch
        : list[0]?.name || defaultBranch;
      setBranch(chosen);
      await loadContents(selectedRepo, chosen);
    } catch (error) {
      notify(
        `Repository opened, but its branches could not be loaded. ${error instanceof Error ? error.message : ""}`,
        "error",
      );
      setLoadingFiles(false);
    }
  };

  const selectFile = async (entry: GithubEntry) => {
    if (!repo) return;
    setSelectedFile(entry);
    setLoadingFile(true);
    setRepairResult(null);
    setAnalysisResult(null);
    openSheet("code"); // keeps the two-panel layout exactly as sketched
    try {
      const encoded = repo.full_name
        .split("/")
        .map(encodeURIComponent)
        .join("/");
      const query = new URLSearchParams({ ref: branch, path: entry.path });
      const payload = await request<unknown>(
        `/api/github/repos/${encoded}/contents?${query.toString()}`,
      );
      const record = asRecord(payload);
      const nested = asRecord(record.data);
      const file = (
        record.content ? record : nested.content ? nested : entry
      ) as GithubEntry;
      const content = decodeContent(file);
      if (!content && !file.content && !file.text && !file.decodedContent)
        throw new Error("The API did not return file contents for this path.");
      setSourceCode(content);
    } catch (error) {
      setSourceCode("");
      notify(
        `Could not read ${entry.path}. ${error instanceof Error ? error.message : ""}`,
        "error",
      );
    } finally {
      setLoadingFile(false);
    }
  };

  const toggleDirectory = (path: string) => {
    const isOpen = expanded.has(path);
    setExpanded((current) => {
      const next = new Set(current);
      if (isOpen) next.delete(path);
      else next.add(path);
      return next;
    });
    if (!isOpen && repo && !entries.some((e) => e.path.startsWith(`${path}/`)))
      void loadContents(repo, branch, path);
  };

  const visibleRepos = useMemo(
    () =>
      repos.filter((r) =>
        `${r.full_name} ${r.description ?? ""} ${r.language ?? ""}`
          .toLowerCase()
          .includes(repoSearch.toLowerCase()),
      ),
    [repos, repoSearch],
  );
  const visibleEntries = useMemo(
    () =>
      entries.filter((e) =>
        `${e.path} ${e.name}`.toLowerCase().includes(fileSearch.toLowerCase()),
      ),
    [entries, fileSearch],
  );
  const tree = useMemo(() => buildTree(visibleEntries), [visibleEntries]);
  const lineCount = sourceCode ? sourceCode.split("\n").length : 0;
  const lineNumbers = useMemo(
    () => Array.from({ length: lineCount }, (_, i) => i + 1).join("\n"),
    [lineCount],
  );
  const isPython = Boolean(selectedFile?.name.toLowerCase().endsWith(".py"));

  /* ---------- AI: chat, analysis and repair (read access is approved per repository + branch) ---------- */
  const accessKey = repo ? `${repo.full_name}@${branch}` : "";
  const needConsent = (action: ConsentAction) => {
    if (!repo || consentKey === accessKey) return false;
    setPendingAction(action);
    setConsentOpen(true);
    return true;
  };
  const allowAccess = () => {
    const action = pendingAction;
    setConsentKey(accessKey);
    setConsentOpen(false);
    setPendingAction(null);
    if (action === "chat") void sendPrompt(pendingMessage.current, true);
    if (action === "repair") void requestRepair(true);
    if (action === "analyze") void analyzeSelectedFile(true);
  };
  const denyAccess = () => {
    setConsentOpen(false);
    setPendingAction(null);
    notify("Repository access denied. No AI request was sent.", "info");
  };

  const fetchRepositoryContext = async (
    targetRepo: GithubRepo,
    targetBranch: string,
  ) => {
    const encoded = targetRepo.full_name
      .split("/")
      .map(encodeURIComponent)
      .join("/");
    const ignored =
      /(^|\/)(node_modules|vendor|dist|build|coverage|\.git|\.next|venv|\.venv)(\/|$)|(^|\/)(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|poetry\.lock|Cargo\.lock|composer\.lock|\.env(?:\..*)?)$/i;
    const queue = [""];
    const visited = new Set<string>();
    const snippets: string[] = [];
    let totalChars = 0;
    const maxFiles = 15,
    maxChars = 15000;

    while (
      queue.length &&
      snippets.length < maxFiles &&
      totalChars < maxChars
    ) {
      const path = queue.shift()!;
      if (visited.has(path)) continue;
      visited.add(path);
      const query = new URLSearchParams({ ref: targetBranch });
      if (path) query.set("path", path);
      const payload = await request<unknown>(
        `/api/github/repos/${encoded}/contents?${query.toString()}`,
      );
      const listing = unwrapArray<GithubEntry>(payload, [
        "contents",
        "files",
        "items",
        "data",
      ]);
      for (const rawEntry of listing) {
        const entry = {
          ...rawEntry,
          path:
            rawEntry.path ||
            (path ? `${path}/${rawEntry.name}` : rawEntry.name),
        } as GithubEntry;
        if (!entry.path || ignored.test(entry.path)) continue;
        if (entry.type === "dir") {
          if (queue.length + visited.size < 120) queue.push(entry.path);
          continue;
        }
        if (
          entry.type !== "file" ||
          snippets.length >= maxFiles ||
          totalChars >= maxChars
        )
          continue;
        const ext = entry.name.toLowerCase().split(".").pop() || "";
        if (
          !/^(py|js|jsx|mjs|cjs|ts|tsx|json|md|yml|yaml|toml|sql|go|java|rs|html|css|sh|dockerfile)$/.test(
            ext,
          ) &&
          !/^dockerfile$/i.test(entry.name)
        )
          continue;
        try {
          const fileQuery = new URLSearchParams({
            ref: targetBranch,
            path: entry.path,
          });
          const filePayload = asRecord(
            await request<unknown>(
              `/api/github/repos/${encoded}/contents?${fileQuery.toString()}`,
            ),
          );
          const nested = asRecord(filePayload.data);
          const file = (
            typeof filePayload.content === "string"
              ? filePayload
              : typeof nested.content === "string"
                ? nested
                : entry
          ) as GithubEntry;
          const content = decodeContent(file);
          if (!content.trim()) continue;
          const clipped = content.slice(
            0,
            Math.min(2000, maxChars - totalChars),
          );
          snippets.push(`\n--- FILE: ${entry.path} ---\n${clipped}`);
          totalChars += clipped.length;
        } catch {
          // Keep scanning other files if one file cannot be fetched.
        }
      }
    }
    return snippets.length
      ? snippets.join("\n")
      : "No readable source files could be fetched within the repository context limits.";
  };

  const sendPrompt = async (override?: string, consentApproved = false) => {
    const message = (override ?? prompt).trim();
    if (!message || sending) return;
    if (!repo) {
      notify("Import a repository first.", "info");
      api.current.drawer(true);
      return;
    }
    if (!consentApproved && needConsent("chat")) {
      pendingMessage.current = message;
      return;
    }
    setChat((c) => [...c, { id: uid(), role: "user", text: message }]);
    setPrompt("");
    setSending(true);
    try {
      const repositoryContext = await fetchRepositoryContext(repo, branch);
      const context = `You are reviewing the selected GitHub repository. Use only the evidence below and clearly state when evidence is insufficient. Do not claim files were inspected unless included below.\nRepository: ${repo.full_name}\nBranch: ${branch}\nRepository source excerpts (bounded scan; not guaranteed to include every file):\n${repositoryContext}${selectedFile ? `\nCurrently selected file: ${selectedFile.path}\nSelected file source:\n${sourceCode.slice(0, 10000)}` : ""}\n\n${DEPTH_NOTE[effortRef.current] ?? DEPTH_NOTE.medium}\n${FORMAT_NOTE}\n\nUser question: ${message}`;
      const payload = asRecord(
        await request<unknown>("/api/ai/chat", {
          method: "POST",
          body: JSON.stringify({ message: context }),
        }),
      );
      const nested = asRecord(payload.data);
      const responseText = [
        payload.response,
        payload.reply,
        payload.message,
        nested.response,
        nested.reply,
        nested.message,
      ].find((v) => typeof v === "string" && v.trim().length > 0);
      setChat((c) => [
        ...c,
        {
          id: uid(),
          role: "assistant",
          text:
            typeof responseText === "string"
              ? responseText
              : "The AI service returned an empty response. Please try asking again.",
        },
      ]);
    } catch (error) {
      setChat((c) => [
        ...c,
        {
          id: uid(),
          role: "assistant",
          text: `I couldn't reach the AI chat service. ${error instanceof Error ? error.message : "Please try again."}`,
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const languageForFile = (filename: string): string => {
    const extension = filename.toLowerCase().split(".").pop() || "";
    const languages: Record<string, string> = {
      py: "python",
      js: "javascript",
      jsx: "javascript",
      mjs: "javascript",
      cjs: "javascript",
      ts: "typescript",
      tsx: "typescript",
      mts: "typescript",
      cts: "typescript",
      go: "go",
      rb: "ruby",
      c: "c",
      h: "c",
      cc: "cpp",
      cpp: "cpp",
      cxx: "cpp",
      hpp: "cpp",
      hxx: "cpp",
    };
    return languages[extension] || "auto";
  };

  const analyzeSelectedFile = async (consentApproved = false) => {
    if (!selectedFile || !sourceCode.trim() || analyzing || loadingFile) {
      notify(
        "Choose a file with readable source code before analyzing.",
        "info",
      );
      return;
    }
    if (sourceCode.length > 20000) {
      notify(
        "This analysis endpoint accepts source files up to 20,000 characters. Select a smaller file.",
        "info",
      );
      return;
    }
    if (!consentApproved && needConsent("analyze")) return;
    setAnalyzing(true);
    setAnalysisResult(null);
    try {
      const payload = asRecord(
        await request<unknown>("/api/ai/analyze", {
          method: "POST",
          body: JSON.stringify({
            language: languageForFile(selectedFile.name),
            filename: selectedFile.name,
            source_code: sourceCode,
          }),
        }),
      );
      const nested = asRecord(payload.data);
      const result = asRecord(
        nested.summary || payload.summary ? (payload.data ?? payload) : payload,
      );
      setAnalysisResult(result);
      const issues = Number(asRecord(result.summary).issues_found ?? 0);
      notify(`Analysis complete. ${issues} issue(s) reported.`, "success");
      openSheet("analysis");
    } catch (error) {
      notify(
        `Code analysis failed. ${error instanceof Error ? error.message : "Please try again."}`,
        "error",
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const requestRepair = async (
    consentApproved = false,
    chosenRule?: string,
  ) => {
    if (!selectedFile || !sourceCode.trim() || repairing) {
      notify(
        "Choose a file with readable source code before requesting a repair.",
        "info",
      );
      return;
    }
    if (!isPython) {
      notify(
        "The current repair API supports Python files (.py) only. You can still ask the AI about other files.",
        "info",
      );
      return;
    }
    if (!consentApproved && needConsent("repair")) return;
    const analysisFindings = Array.isArray(analysisResult?.findings)
      ? analysisResult.findings.map((item) => asRecord(item))
      : [];
    if (!analysisFindings.length) {
      notify(
        "Run Analyze first so the repair can target a real scanner finding.",
        "info",
      );
      return;
    }
    const availableRules = Array.from(
      new Set(
        analysisFindings.map((f) => asString(f.rule).trim()).filter(Boolean),
      ),
    );
    if (!availableRules.length) {
      notify(
        "The analysis result does not contain a scanner rule that can be repaired.",
        "info",
      );
      return;
    }
    const rule =
      chosenRule ??
      (availableRules.length === 1 ? availableRules[0] : undefined);
    if (!rule) {
      openSheet("rule");
      return;
    } // let the person pick the exact rule
    if (!availableRules.includes(rule)) {
      notify("Choose an exact rule ID from the analysis findings.", "error");
      return;
    }
    setRepairing(true);
    setRepairResult(null);
    try {
      const payload = asRecord(
        await request<unknown>("/api/ai/repair", {
          method: "POST",
          body: JSON.stringify({
            language: "python",
            source_code: sourceCode,
            filename: selectedFile.name,
            rule,
          }),
        }),
      );
      setRepairResult(
        asRecord(payload.data).repair
          ? (asRecord(payload.data).repair as RepairResult)
          : asRecord(payload.repair ?? payload.data ?? payload),
      );
      openSheet("repair");
      notify(
        "Repair response received. Review it before applying any changes.",
        "success",
      );
    } catch (error) {
      notify(
        `Repair request failed. ${error instanceof Error ? error.message : ""}`,
        "error",
      );
    } finally {
      setRepairing(false);
    }
  };

  const repair = useMemo(() => {
    if (!repairResult) return { text: "", isCode: true };
    for (const key of [
      "proposed_code",
      "proposedCode",
      "fixed_code",
      "fixedCode",
      "code",
      "content",
    ]) {
      if (typeof repairResult[key] === "string")
        return { text: repairResult[key] as string, isCode: true };
    }
    for (const key of ["suggestion", "explanation", "message"]) {
      if (typeof repairResult[key] === "string")
        return { text: repairResult[key] as string, isCode: false };
    }
    return { text: JSON.stringify(repairResult, null, 2), isCode: true };
  }, [repairResult]);
  const repairText = repair.text;

  const analysisSummary = asRecord(analysisResult?.summary);
  const rawFindings = analysisResult?.findings;
  const findings: unknown[] = Array.isArray(rawFindings) ? rawFindings : [];
  const rawLimits = analysisResult?.limitations;
  const limitations: string[] = Array.isArray(rawLimits)
    ? rawLimits.map(String)
    : [];
  const explanationRecord = asRecord(analysisResult?.ai_explanations);
  const explanations: JsonRecord[] = Array.isArray(
    explanationRecord.explanations,
  )
    ? explanationRecord.explanations.map((item) => asRecord(item))
    : Array.isArray(analysisResult?.explanations)
      ? analysisResult.explanations.map((item) => asRecord(item))
      : [];
  const repairRules = Object.entries(
    findings.reduce<Record<string, number>>((acc, f) => {
      const rule = asString(asRecord(f).rule).trim();
      if (rule) acc[rule] = (acc[rule] ?? 0) + 1;
      return acc;
    }, {}),
  ).map(([rule, count]) => ({ rule, count }));

  const copy = (value: string, label: string) => {
    if (!navigator.clipboard) {
      notify("Copy isn't available on insecure (http) pages.", "info");
      return;
    }
    void navigator.clipboard
      .writeText(value)
      .then(() => notify(`${label} copied.`, "success"));
  };
  const downloadAnalysisReport = (format: "markdown" | "json") => {
    if (!analysisResult) return;
    const summary = asRecord(analysisResult.summary);
    const rawList = Array.isArray(analysisResult.findings)
      ? analysisResult.findings.map((item) => asRecord(item))
      : [];
    const report = {
      generated_at: new Date().toISOString(),
      repository: repo?.full_name ?? null,
      branch: branch || null,
      filename: selectedFile?.path ?? selectedFile?.name ?? null,
      language: asString(analysisResult.language, "unknown"),
      analysis_level: asString(analysisResult.analysis_level, "unknown"),
      status: asString(analysisResult.status, "unknown"),
      analyzers: Array.isArray(analysisResult.analyzers)
        ? analysisResult.analyzers
        : [],
      summary,
      findings: rawList,
      ai_explanations: explanations,
      limitations: Array.isArray(analysisResult.limitations)
        ? analysisResult.limitations
        : [],
      note: "Generated from read-only analysis. No repository files were changed.",
    };
    const markdown = [
      "# DevMind Code Analysis Report",
      "",
      `- Generated: ${report.generated_at}`,
      `- Repository: ${report.repository ?? "Not connected"}`,
      `- Branch: ${report.branch ?? "Unknown"}`,
      `- File: ${report.filename ?? "Unknown"}`,
      `- Language: ${report.language}`,
      `- Analysis level: ${report.analysis_level}`,
      `- Status: ${report.status}`,
      `- Analyzers: ${report.analyzers.map(String).join(", ") || "Not reported"}`,
      "",
      "## Summary",
      ...Object.entries(summary).map(
        ([key, value]) => `- ${key.replace(/_/g, " ")}: ${String(value)}`,
      ),
      "",
      "## Findings",
      ...(rawList.length
        ? rawList.flatMap((finding, index) => [
            `### ${index + 1}. ${asString(finding.rule, "Unclassified finding")}`,
            `- Severity: ${asString(finding.severity, "unknown")}`,
            `- Line: ${String(finding.line ?? "Not reported")}`,
            `- Message: ${asString(finding.message, "No message provided")}`,
            `- Source: ${asString(finding.source, "Not reported")}`,
            `- Evidence: ${asString(finding.evidence, "Not provided")}`,
            "",
          ])
        : ["No findings were reported.", ""]),
      "## AI Explanations",
      ...(explanations.length
        ? explanations.flatMap((item, index) => [
            `### ${index + 1}. ${asString(item.rule, "Finding explanation")}`,
            `- Root cause: ${asString(item.root_cause, "Not provided")}`,
            `- Impact: ${asString(item.impact, "Not provided")}`,
            `- Suggested fix: ${asString(item.suggested_fix, "Not provided")}`,
            `- Confidence: ${String(item.confidence ?? "Not reported")}`,
            "",
          ])
        : ["No AI explanations were returned.", ""]),
      "## Limitations",
      ...(report.limitations.length
        ? report.limitations.map((item) => `- ${String(item)}`)
        : ["- No limitations were reported."]),
      "",
      `> ${report.note}`,
      "",
    ].join("\n");
    const content =
      format === "json" ? JSON.stringify(report, null, 2) : markdown;
    const mime =
      format === "json"
        ? "application/json;charset=utf-8"
        : "text/markdown;charset=utf-8";
    const blobUrl = URL.createObjectURL(new Blob([content], { type: mime }));
    const anchor = document.createElement("a");
    const safeName = (selectedFile?.name || "analysis")
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .replace(/\.[^.]+$/, "");
    anchor.href = blobUrl;
    anchor.download = `devmind-${safeName}-report.${format === "json" ? "json" : "md"}`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  };
  const refreshAll = () => {
    void loadRepos();
    if (repo) void loadContents(repo, branch);
    notify("Refreshing from GitHub…", "info");
  };
  const askAbout = () => {
    closeSheet();
    setTimeout(
      () =>
        document
          .querySelector<HTMLTextAreaElement>(".dm-mascot textarea")
          ?.focus(),
      350,
    );
  };

  /* ---------- shared fragments ---------- */
  const voiceOk =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);
  const chatEmpty = chat.length === 0 && !sending;
  const avatar = status.avatar_url || status.avatarUrl;
  const initial = (status.username || "D").slice(0, 1).toUpperCase();

  const search = (
    value: string,
    set: (v: string) => void,
    placeholder: string,
    disabled = false,
  ) => (
    <label className={`dm-search ${disabled ? "off" : ""}`}>
      <Search size={16} />
      <input
        value={value}
        disabled={disabled}
        onChange={(e) => set(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        enterKeyHint="search"
        autoCapitalize="none"
        autoCorrect="off"
      />
    </label>
  );

  const repoRows = loadingRepos ? (
    <div className="dm-state">
      <Spin /> Loading repositories…
    </div>
  ) : !status.connected ? (
    <div className="dm-state">Connect GitHub to see your repositories.</div>
  ) : visibleRepos.length === 0 ? (
    <div className="dm-state">
      {repos.length
        ? "No repositories match your search."
        : "No repositories found."}
    </div>
  ) : (
    <div className="dm-repos">
      {visibleRepos.map((item) => {
        const on = repo?.full_name === item.full_name;
        const act = () =>
          on ? api.current.drawer(false) : void chooseRepo(item);
        return (
          <div key={String(item.id)} className={`dm-repo ${on ? "on" : ""}`}>
            <button className="dm-repo-main dm-press" onClick={act}>
              <span className="dm-repo-ic">
                <FaGithub size={18} />
              </span>
              <span className="dm-repo-tx">
                <strong>{item.name}</strong>
                <small>
                  {item.private && <Lock size={11} />}
                  {item.full_name}
                </small>
              </span>
            </button>
            <button
              className={`dm-import dm-press ${on ? "done" : ""}`}
              onClick={act}
            >
              {on ? (
                <>
                  <Check size={14} strokeWidth={2.6} /> Imported
                </>
              ) : (
                "Import"
              )}
            </button>
          </div>
        );
      })}
    </div>
  );

  const connection = (
    <div className="dm-conn">
      <div className="dm-conn-row">
        <span className={`dm-dot ${status.connected ? "on" : ""}`} />
        <div>
          <strong>
            {status.connected
              ? `GitHub${status.username ? ` · ${status.username}` : " connected"}`
              : "GitHub not connected"}
          </strong>
          <small>
            {status.connected
              ? "Repository access is active"
              : "Connect to start analyzing code"}
          </small>
        </div>
      </div>
      {status.connected ? (
        <button
          className="dm-btn o dm-press"
          onClick={() => void disconnectGithub()}
        >
          <Unplug size={17} /> Disconnect
        </button>
      ) : (
        <button className="dm-btn g dm-press" onClick={connectGithub}>
          <FaGithub size={18} /> Connect GitHub
        </button>
      )}
    </div>
  );

  /* code viewer: opens in a sheet so the two-panel layout stays as sketched */
  const codeView = (
    <>
      <div className="dm-ph dm-ph-code">
        <div className="dm-file-tx">
          <h2>{selectedFile?.name || "Source"}</h2>
          <p>{selectedFile?.path || "Select a file to read it here."}</p>
        </div>
        <button
          className="dm-ib sm dm-press"
          aria-label="Copy source"
          disabled={!sourceCode}
          onClick={() => copy(sourceCode, "Source")}
        >
          <Copy size={16} />
        </button>
      </div>
      <div className="dm-actions">
        <button
          className="dm-pill dm-press"
          disabled={!selectedFile}
          onClick={askAbout}
        >
          <MessageSquareText size={15} /> Ask
        </button>
        <button
          className="dm-pill dm-press"
          disabled={!sourceCode || analyzing || loadingFile || repairing}
          onClick={() => void analyzeSelectedFile()}
          title="Run static analysis for the selected source file"
        >
          {analyzing ? <Spin size={15} /> : <ShieldCheck size={15} />}{" "}
          {analyzing ? "Analyzing" : "Analyze"}
        </button>
        <button
          className="dm-pill g dm-press"
          disabled={
            !sourceCode || repairing || loadingFile || analyzing || !isPython
          }
          onClick={() => void requestRepair()}
          title={
            selectedFile && !isPython
              ? "Repair API currently supports Python files only"
              : "Request an AI repair proposal"
          }
        >
          {repairing ? <Spin size={15} /> : <Sparkles size={15} />}{" "}
          {repairing ? "Reviewing" : "Repair"}
        </button>
        {analysisResult && (
          <button
            className="dm-pill dm-press"
            onClick={() => openSheet("analysis")}
          >
            Analysis
          </button>
        )}
        {repairResult && (
          <button
            className="dm-pill dm-press"
            onClick={() => openSheet("repair")}
          >
            Proposal
          </button>
        )}
      </div>
      <div className="dm-meta">
        <span>
          <span className={`dm-dot ${selectedFile ? "on" : ""}`} />{" "}
          {loadingFile
            ? "Reading file"
            : selectedFile
              ? "Read-only"
              : "No file selected"}
        </span>
        <span>
          {selectedFile
            ? `${lineCount} lines${isPython ? "" : " · Repair: Python only"}`
            : ""}
        </span>
      </div>
      <div className="dm-code-scroll">
        {loadingFile ? (
          <div className="dm-state">
            <Spin size={18} /> Fetching file contents…
          </div>
        ) : selectedFile ? (
          sourceCode ? (
            <div className="dm-source">
              <pre className="dm-ln" aria-hidden="true">
                {lineNumbers}
              </pre>
              <pre className="dm-src">
                <code>{sourceCode}</code>
              </pre>
            </div>
          ) : (
            <div className="dm-empty">
              <FileCode2 size={26} />
              <strong>File contents unavailable</strong>
              <span>The API returned no readable source for this path.</span>
            </div>
          )
        ) : (
          <div className="dm-empty">
            <span className="dm-empty-ic">
              <Code2 size={24} />
            </span>
            <strong>Your code, in context.</strong>
            <span>
              Pick a file from Files to read it here, then ask DevMind, analyze
              it or request a repair review.
            </span>
          </div>
        )}
      </div>
    </>
  );

  /* ---------- render ---------- */
  return (
    <div className={`dm-app ${kb ? "kb" : ""}`}>
      <style>{styles}</style>

      {/* repository drawer (persistent sidebar on desktop) */}
      <aside ref={dR} className="dm-drawer dm-glass" aria-label="Repositories">
        <div className="dm-brand">
          <Orb size={34} />
          DevMind
        </div>
        {search(
          repoSearch,
          setRepoSearch,
          "Find repository",
          !status.connected,
        )}
        <div className="dm-side-scroll">{repoRows}</div>
        {connection}
      </aside>
      <div ref={dscR} className="dm-dscrim" />

      <div className="dm-shell">
        <header className="dm-top dm-glass">
          <button
            className="dm-ib dm-press dm-menu"
            aria-label="Repositories"
            onClick={() => api.current.drawer(true)}
          >
            <Menu size={20} />
          </button>
          {status.connected ? (
            <div className="dm-title two">
              <strong className="dm-truncate">
                {repo ? repo.full_name : "Choose a repository"}
              </strong>
              <span className="dm-truncate">
                {repo
                  ? `${branch} · ${repo.private ? "Private" : "Public"}`
                  : "Open the menu to import one"}
              </span>
            </div>
          ) : (
            <div className="dm-title">DevMind</div>
          )}
          <button
            className="dm-ib dm-press"
            aria-label={
              status.connected ? "Refresh from GitHub" : "Refresh GitHub status"
            }
            onClick={() =>
              status.connected ? refreshAll() : void loadStatus()
            }
            disabled={loadingStatus || loadingRepos}
          >
            <RefreshCw
              size={18}
              className={loadingStatus || loadingRepos ? "dm-spin" : ""}
            />
          </button>
          <div className="dm-avatar" aria-hidden="true">
            {avatar ? <img src={avatar} alt="" /> : initial}
          </div>
        </header>

        <main className="dm-content">
          {!status.connected ? (
            /* ---------- before connecting (unchanged) ---------- */
            <div className="dm-scroll">
              <section className="dm-home">
                <Orb size={56} />
                <h1>Understand your code.</h1>
                <p>
                  Connect a repository to explore it, ask questions with
                  context, and review AI-proposed repairs.
                </p>
                {loadingStatus ? (
                  <div className="dm-state">
                    <Spin /> Checking GitHub…
                  </div>
                ) : (
                  <>
                    <div className="dm-cta">
                      <button
                        className="dm-btn g dm-press"
                        onClick={connectGithub}
                      >
                        <FaGithub size={19} /> Connect GitHub{" "}
                        <ArrowRight size={17} />
                      </button>
                      <button
                        className="dm-btn o dm-press"
                        onClick={() =>
                          notify(
                            "ZIP import is not connected to a backend endpoint yet. Use GitHub for live repository browsing.",
                            "info",
                          )
                        }
                      >
                        <ArrowDownToLine size={17} /> Import a project
                      </button>
                    </div>
                    <div className="dm-trust">
                      <ShieldCheck size={15} /> You choose what to inspect.
                      Repairs stay proposals until you review them.
                    </div>
                  </>
                )}
              </section>
            </div>
          ) : (
            /* ---------- after connecting: Files | DevMind AI, as sketched ---------- */
            <div className="dm-stack">
              <section
                className={`dm-card dm-files ${filesOpen ? "open" : ""}`}
              >
                <div className="dm-ph dm-ph-files">
                  <button
                    className="dm-collapse dm-press"
                    onClick={() => setFilesOpen((o) => !o)}
                    aria-expanded={filesOpen}
                  >
                    <h2>Files</h2>
                    <ChevronDown
                      size={18}
                      className={`dm-chev2 ${filesOpen ? "open" : ""}`}
                    />
                  </button>
                  <label className={`dm-branch ${repo ? "" : "off"}`}>
                    <GitBranch size={14} />
                    <select
                      value={branch}
                      disabled={!repo}
                      aria-label="Select branch"
                      onChange={(e) => {
                        if (!repo) return;
                        setConsentKey(null);
                        setAnalysisResult(null);
                        setRepairResult(null);
                        setBranch(e.target.value);
                        void loadContents(repo, e.target.value);
                        setSelectedFile(null);
                        setSourceCode("");
                      }}
                    >
                      {branches.length ? (
                        branches.map((b) => (
                          <option key={b.name} value={b.name}>
                            {b.name}
                          </option>
                        ))
                      ) : (
                        <option value={branch}>{branch}</option>
                      )}
                    </select>
                    <ChevronDown size={13} />
                  </label>
                </div>
                <div className="dm-files-body">
                  <div className="dm-pad">
                    {search(fileSearch, setFileSearch, "Search files", !repo)}
                  </div>
                  <div className="dm-pscroll">
                    {!repo ? (
                      <div className="dm-empty">
                        <span className="dm-empty-ic">
                          <Folder size={24} />
                        </span>
                        <strong>No repository imported</strong>
                        <span>Import one to browse its folders and files.</span>
                        <button
                          className="dm-btn g dm-press dm-inline-btn"
                          onClick={() => api.current.drawer(true)}
                        >
                          <Plus size={17} /> Import a repository
                        </button>
                      </div>
                    ) : loadingFiles ? (
                      <div className="dm-state">
                        <Spin size={18} /> Loading repository tree…
                      </div>
                    ) : tree.length ? (
                      <TreeItems
                        nodes={tree}
                        depth={0}
                        selected={selectedFile?.path || ""}
                        expanded={expanded}
                        onToggle={toggleDirectory}
                        onSelect={(e) => void selectFile(e)}
                      />
                    ) : (
                      <div className="dm-empty">
                        <Folder size={26} />
                        <strong>No files to display</strong>
                        <span>Check the branch or clear your search.</span>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              <section className="dm-card dm-aicard">
                <div className="dm-ph dm-ph-ai">
                  <div className="dm-ai-title">
                    <div>
                      <h2>DevMind AI</h2>
                      <p>Codebase assistant</p>
                    </div>
                  </div>
                  {chat.length > 0 && (
                    <button
                      className="dm-ib sm dm-press"
                      aria-label="New chat"
                      onClick={() => setChat([])}
                    >
                      <Plus size={18} />
                    </button>
                  )}
                </div>
                <div
                  className={`dm-thread ${chatEmpty ? "empty" : ""}`}
                  ref={threadR}
                  aria-live="polite"
                >
                  <div className="dm-thread-in">
                    {chat.map((m) =>
                      m.role === "user" ? (
                        <div key={m.id} className="dm-msg user">
                          <div className="dm-bubble">{m.text}</div>
                        </div>
                      ) : (
                        <div key={m.id} className="dm-msg ai">
                          <Orb size={28} />
                          <div className="dm-ai-text">
                            <Rich text={m.text} />
                          </div>
                        </div>
                      ),
                    )}
                    {sending && (
                      <div className="dm-msg ai">
                        <Orb size={28} />
                        <div className="dm-ai-text dm-thinking">
                          <Spin /> Thinking…
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className={`dm-mascot-wrap ${chatEmpty ? "center" : ""}`}>
                  <div className="dm-mascot-in">
                    {selectedFile && (
                      <div className="dm-ctx-row">
                        <span className="dm-ctx">
                          <FileCode2 size={13} />
                          <span className="dm-truncate">
                            {selectedFile.path}
                          </span>
                        </span>
                      </div>
                    )}
                    <div className="dark dm-mascot">
                      <AiMascotInput
                        value={prompt}
                        onChange={setPrompt}
                        isProcessing={sending}
                        showWelcome={chatEmpty}
                        title={
                          repo
                            ? `Ask about ${repo.name}`
                            : "Import a repository to begin"
                        }
                        subtitle={
                          repo
                            ? "DevMind reads the code you choose and answers with context"
                            : "Open the menu and tap Import on a repository"
                        }
                        placeholder={
                          repo
                            ? "Ask about your code…"
                            : "Import a repository first…"
                        }
                        models={DEVMIND_MODELS}
                        defaultModelId="devmind"
                        enableAttachments={false}
                        enableWebSearch={false}
                        enableVoice={voiceOk}
                        onSubmit={async (d: ChatSubmitData) => {
                          effortRef.current = d.effort;
                          await sendPrompt(d.prompt);
                        }}
                      />
                    </div>
                    {chatEmpty && repo && (
                      <div className="dm-chips">
                        {[
                          [
                            "Explain the architecture",
                            "Explain the architecture of this repository.",
                          ],
                          [
                            "Review security risks",
                            "Review this file for security risks.",
                          ],
                          [
                            "Suggest tests",
                            "What tests should I add for this code?",
                          ],
                        ].map(([label, q]) => (
                          <button
                            key={label}
                            className="dm-chip dm-press"
                            onClick={() => void sendPrompt(q)}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="dm-disc">
                      <LockKeyhole size={11} /> AI can make mistakes. Verify
                      changes.
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}
        </main>
      </div>

      {/* bottom sheet: code viewer (phones) and repair proposal */}
      <div ref={swR} className="dm-sw">
        <div ref={sscR} className="dm-scrim" onClick={closeSheet} />
        <div
          ref={shR}
          className={`dm-sheet dm-glass ${sheet === "code" ? "tall" : ""}`}
        >
          <div ref={grR} className="dm-grab">
            <i />
          </div>
          {sheet === "code" && <div className="dm-sheet-code">{codeView}</div>}
          {sheet === "analysis" && analysisResult && (
            <div className="dm-sheet-body">
              <div className="dm-sec-head">
                <h2 className="dm-sheet-h">
                  <ShieldCheck size={18} /> Static analysis
                </h2>
                <span className="dm-lang">
                  {asString(analysisResult.language, "auto")}
                </span>
              </div>
              <p className="dm-sheet-note">
                {asString(analysisResult.analysis_level, "Analysis complete")}.
                Review findings before making changes; DevMind has not modified
                your repository.
              </p>
              <div className="dm-stats">
                {(
                  [
                    ["Issues", analysisSummary.issues_found],
                    ["Errors", analysisSummary.errors],
                    ["Warnings", analysisSummary.warnings],
                    ["Security", analysisSummary.security_issues],
                    ["Quality", analysisSummary.code_quality_issues],
                    ["Potential secrets", analysisSummary.potential_secrets],
                  ] as const
                ).map(([label, v]) => (
                  <span key={label}>
                    <strong>{String(v ?? 0)}</strong>
                    <small>{label}</small>
                  </span>
                ))}
              </div>
              <div className="dm-export">
                <button
                  className="dm-pill dm-press"
                  onClick={() => downloadAnalysisReport("markdown")}
                >
                  <FileText size={15} /> Export Markdown
                </button>
                <button
                  className="dm-pill dm-press"
                  onClick={() => downloadAnalysisReport("json")}
                >
                  <FileJson size={15} /> Export JSON
                </button>
              </div>
              <div className="dm-sheet-scroll">
                <h3 className="dm-sub-h">Findings</h3>
                {findings.length ? (
                  findings.map((f, i) => <Finding key={i} f={f} n={i + 1} />)
                ) : (
                  <div className="dm-state">
                    No findings were reported by the configured analyzers.
                  </div>
                )}
                <h3 className="dm-sub-h">
                  AI explanations and suggested fixes
                </h3>
                {explanations.length ? (
                  explanations.map((x, i) => (
                    <div key={i} className="dm-finding">
                      <div className="dm-find-top">
                        <span className="dm-num">{i + 1}</span>
                        <strong className="dm-find-title">
                          {asString(x.rule, "Finding explanation")}
                        </strong>
                      </div>
                      <ul className="dm-points">
                        <li>
                          <b>Root cause:</b>{" "}
                          {asString(x.root_cause, "Not provided")}
                        </li>
                        <li>
                          <b>Impact:</b> {asString(x.impact, "Not provided")}
                        </li>
                        <li>
                          <b>Suggested fix:</b>{" "}
                          {asString(x.suggested_fix, "Not provided")}
                        </li>
                      </ul>
                      <small className="dm-dim">
                        Confidence: {String(x.confidence ?? "not reported")}
                      </small>
                    </div>
                  ))
                ) : (
                  <p className="dm-sheet-note">
                    No AI explanations were returned for this analysis.
                  </p>
                )}
                {limitations.length > 0 && (
                  <>
                    <h3 className="dm-sub-h">Limitations</h3>
                    <ul className="dm-limits">
                      {limitations.map((l, i) => (
                        <li key={i}>{l}</li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
              <div className="dm-two">
                <button
                  className="dm-btn o dm-press"
                  onClick={() => openSheet("code")}
                >
                  Back to code
                </button>
                <button className="dm-btn w dm-press" onClick={closeSheet}>
                  Done
                </button>
              </div>
            </div>
          )}
          {sheet === "rule" && (
            <div className="dm-sheet-body">
              <h2 className="dm-sheet-h">
                <Sparkles size={18} /> Choose a finding
              </h2>
              <p className="dm-sheet-note">
                Pick the exact scanner rule DevMind should propose a repair for.
              </p>
              <div className="dm-sheet-scroll">
                {repairRules.map(({ rule, count }) => (
                  <button
                    key={rule}
                    className="dm-rule dm-press"
                    disabled={repairing}
                    onClick={() => void requestRepair(true, rule)}
                  >
                    <span className="dm-rule-tx">
                      <strong>{rule}</strong>
                      <small>
                        {count} finding{count === 1 ? "" : "s"}
                      </small>
                    </span>
                    {repairing ? (
                      <Spin />
                    ) : (
                      <ChevronRight size={16} className="dm-dim-ic" />
                    )}
                  </button>
                ))}
              </div>
              <div className="dm-two">
                <button
                  className="dm-btn o dm-press"
                  onClick={() => openSheet("code")}
                >
                  Back to code
                </button>
              </div>
            </div>
          )}
          {sheet === "repair" && (
            <div className="dm-sheet-body">
              <div className="dm-sec-head">
                <h2 className="dm-sheet-h">
                  <Sparkles size={18} /> Repair proposal
                </h2>
                <button
                  className="dm-ib sm dm-press"
                  aria-label="Copy proposal"
                  onClick={() => copy(repairText, "Proposal")}
                >
                  <Copy size={16} />
                </button>
              </div>
              <p className="dm-sheet-note">
                Review carefully. DevMind has not modified your GitHub
                repository.
              </p>
              <div className="dm-sheet-scroll">
                {repair.isCode ? (
                  <pre className="dm-repair">{repairText}</pre>
                ) : (
                  <div className="dm-ai-text dm-repair-text">
                    <Rich text={repairText} />
                  </div>
                )}
              </div>
              <div className="dm-two">
                <button
                  className="dm-btn o dm-press"
                  onClick={() => openSheet("code")}
                >
                  Back to code
                </button>
                <button className="dm-btn w dm-press" onClick={closeSheet}>
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {consentOpen && repo && (
        <div className="dm-consent" role="presentation">
          <section
            className="dm-dialog dm-glass"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dm-consent-title"
          >
            <span className="dm-dialog-ic">
              <LockKeyhole size={22} />
            </span>
            <h2 id="dm-consent-title">
              Allow DevMind to access this repository?
            </h2>
            <p>
              DevMind will use the selected repository and branch to answer your
              request. Repository source code may be sent to the configured AI
              service for analysis. Access is read-only; DevMind will not change
              your GitHub files.
            </p>
            <div className="dm-dialog-repo">
              <FaGithub size={16} />
              <span className="dm-truncate">{repo.full_name}</span>
              <span className="dm-dialog-branch">
                <GitBranch size={12} /> {branch}
              </span>
            </div>
            <div className="dm-two">
              <button className="dm-btn o dm-press" onClick={denyAccess}>
                Deny
              </button>
              <button className="dm-btn g dm-press" onClick={allowAccess}>
                <Check size={17} /> Allow access
              </button>
            </div>
            <small>
              This approval applies only to this repository and branch in this
              session. Switching repositories or disconnecting GitHub revokes
              it.
            </small>
          </section>
        </div>
      )}

      {notice && (
        <button
          className={`dm-toast dm-glass ${notice.type}`}
          role="status"
          onClick={() => setNotice(null)}
        >
          {notice.type === "error" ? (
            <AlertCircle size={18} />
          ) : notice.type === "success" ? (
            <Check size={18} />
          ) : (
            <Info size={18} />
          )}
          <span>{notice.text}</span>
          <X size={15} className="dm-dim-ic" />
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles: black + white, NVIDIA green accent, mobile first            */
/* ------------------------------------------------------------------ */
const styles = `
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap");
html{-webkit-tap-highlight-color:transparent;-webkit-text-size-adjust:100%;overscroll-behavior:none}
body{margin:0;background:#000}
.dm-app{--g:#76B900;--gd:rgba(118,185,0,.14);--t:#f5f5f7;--m:#8e8e93;--l:rgba(255,255,255,.1);--s:rgba(255,255,255,.06);--s2:rgba(255,255,255,.1);--ease:cubic-bezier(.2,.9,.2,1);
display:flex;width:100%;height:var(--dm-vh,100dvh);background:#000;color:var(--t);overflow:hidden;
--mono:"JetBrains Mono",var(--mono);
font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Inter","Segoe UI",system-ui,sans-serif;font-size:15px;line-height:1.5;-webkit-font-smoothing:antialiased;font-optical-sizing:auto}
:where(.dm-app) *{box-sizing:border-box;margin:0}
:where(.dm-app) :where(button,[role=button]){font:inherit;color:inherit;background:none;border:0;padding:0;cursor:pointer;text-align:left;touch-action:manipulation;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none}
:where(.dm-app) button:disabled{opacity:.4;cursor:not-allowed}
:where(.dm-app) :where(input,textarea,select){font:inherit;font-size:16px;color:inherit}
:where(.dm-app) :focus-visible{outline:2px solid var(--g);outline-offset:2px}
.dm-glass{background:rgba(18,18,20,.72);backdrop-filter:blur(26px) saturate(180%);-webkit-backdrop-filter:blur(26px) saturate(180%)}
.dm-press{transition:transform .14s var(--ease),background-color .14s,opacity .14s}
.dm-press:active:not(:disabled){transform:scale(.96)}
.dm-truncate{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dm-spin{animation:dmSpin .9s linear infinite;flex:none}@keyframes dmSpin{to{rotate:360deg}}
.dm-orb{display:grid;place-items:center;flex:none;border-radius:50%;background:var(--g);color:#000}
.dm-dot{width:8px;height:8px;border-radius:50%;background:#55555a;flex:none;display:inline-block}.dm-dot.on{background:var(--g);box-shadow:0 0 0 3px rgba(118,185,0,.18)}
.dm-state{display:flex;align-items:center;justify-content:center;gap:9px;padding:28px 16px;color:var(--m);font-size:14px;text-align:center}
.dm-empty{flex:1;min-height:190px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:24px;text-align:center;color:var(--m);font-size:14px}
.dm-empty strong{color:var(--t);font-size:16px;letter-spacing:-.02em}.dm-empty>span:not(.dm-empty-ic){max-width:260px;line-height:1.55}
.dm-empty-ic{width:52px;height:52px;display:grid;place-items:center;border-radius:16px;background:var(--gd);color:var(--g);margin-bottom:6px}
/* buttons */
.dm-btn{min-height:50px;display:flex;align-items:center;justify-content:center;gap:9px;padding:0 20px;border-radius:16px;font-weight:600;letter-spacing:-.01em;width:100%}
.dm-btn.g{background:var(--g);color:#000}.dm-btn.w{background:#fff;color:#000}.dm-btn.o{background:var(--s);border:1px solid var(--l)}
.dm-inline-btn{width:auto;margin-top:8px}
.dm-ib{width:44px;height:44px;flex:none;display:grid;place-items:center;border-radius:50%;background:var(--s);border:1px solid var(--l)}.dm-ib.sm{width:40px;height:40px}
.dm-pill{height:40px;display:inline-flex;align-items:center;gap:6px;padding:0 14px;border-radius:99px;background:var(--s);border:1px solid var(--l);font-size:14px;font-weight:600;flex:none}
.dm-pill.g{background:var(--g);border-color:var(--g);color:#000}
/* repository drawer */
.dm-drawer{position:fixed;top:0;bottom:0;left:0;z-index:40;width:min(86vw,340px);display:flex;flex-direction:column;gap:6px;padding:calc(18px + env(safe-area-inset-top,0px)) 14px calc(14px + env(safe-area-inset-bottom,0px));border-right:1px solid var(--l);box-shadow:24px 0 60px rgba(0,0,0,.5);transform:translate3d(-100%,0,0);will-change:transform;touch-action:pan-y;background:rgba(14,14,16,.88)}
.dm-dscrim{position:fixed;inset:0;z-index:30;background:rgba(0,0,0,.6);opacity:0;pointer-events:none;touch-action:none}
.dm-brand{display:flex;align-items:center;gap:10px;padding:0 4px 8px;font-size:21px;font-weight:700;letter-spacing:-.04em}
.dm-side-scroll{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}
.dm-search{display:flex;align-items:center;gap:9px;height:44px;padding:0 14px;border-radius:14px;background:var(--s);border:1px solid var(--l);color:var(--m);margin:2px 0}
.dm-search.off{opacity:.5}
.dm-search:focus-within{border-color:rgba(118,185,0,.6);box-shadow:0 0 0 4px rgba(118,185,0,.14)}
.dm-search input{flex:1;min-width:0;background:none;border:0;outline:0}.dm-search input::placeholder{color:var(--m)}
.dm-repos{display:flex;flex-direction:column;gap:8px;margin-top:8px}
.dm-repo{display:flex;align-items:center;gap:8px;min-height:64px;padding:8px 10px 8px 6px;border-radius:18px;background:var(--s);border:1px solid var(--l)}
.dm-repo.on{border-color:rgba(118,185,0,.55);background:var(--gd)}
.dm-repo-main{flex:1;min-width:0;min-height:48px;display:flex;align-items:center;gap:11px;padding:0 4px;border-radius:14px}
.dm-repo-ic{width:38px;height:38px;display:grid;place-items:center;border-radius:12px;background:#fff;color:#000;flex:none}
.dm-repo-tx{flex:1;min-width:0;display:flex;flex-direction:column}
.dm-repo-tx strong{font-size:15px;font-weight:600;letter-spacing:-.01em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dm-repo-tx small{display:flex;align-items:center;gap:4px;font-size:12px;color:var(--m);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dm-import{flex:none;height:38px;display:inline-flex;align-items:center;gap:5px;padding:0 15px;border-radius:99px;background:var(--g);color:#000;font-size:14px;font-weight:700}
.dm-import.done{background:transparent;color:var(--g);border:1px solid rgba(118,185,0,.5);padding:0 11px}
.dm-conn{display:flex;flex-direction:column;gap:10px;margin-top:10px;padding:14px;border-radius:18px;background:var(--s);border:1px solid var(--l)}
.dm-conn-row{display:flex;gap:10px;align-items:flex-start}.dm-conn-row .dm-dot{margin-top:6px}.dm-conn-row>div{display:flex;flex-direction:column;min-width:0}
.dm-conn-row strong{font-size:14px;font-weight:600;overflow-wrap:anywhere}.dm-conn-row small{font-size:12px;color:var(--m)}
/* shell */
.dm-shell{flex:1;min-width:0;height:100%;display:flex;flex-direction:column}
.dm-top{flex:none;display:flex;align-items:center;gap:10px;padding:calc(8px + env(safe-area-inset-top,0px)) 14px 8px;border-bottom:1px solid var(--l);z-index:5}
.dm-title{flex:1;min-width:0;text-align:center;font-weight:650;letter-spacing:-.02em;font-size:17px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dm-title.two{display:flex;flex-direction:column;text-align:left;line-height:1.25}.dm-title.two strong{font-size:16px;font-weight:650;letter-spacing:-.02em}.dm-title.two span{font-size:12px;color:var(--m);font-weight:500}
.dm-avatar{width:40px;height:40px;border-radius:50%;background:#fff;color:#000;display:grid;place-items:center;font-weight:700;font-size:15px;overflow:hidden;flex:none}.dm-avatar img{width:100%;height:100%;object-fit:cover}
.dm-content{flex:1;min-height:0;position:relative}
.dm-scroll{height:100%;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain}
/* before connecting */
.dm-home{max-width:560px;margin:0 auto;min-height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:36px 20px 40px}
.dm-home h1{margin-top:20px;font-size:clamp(2.1rem,9vw,2.9rem);line-height:1.04;letter-spacing:-.04em;font-weight:700}
.dm-home>p{margin:12px 0 28px;max-width:34ch;color:var(--m);font-size:16px;line-height:1.5}
.dm-cta{display:flex;flex-direction:column;gap:10px;width:100%;max-width:380px}
.dm-trust{display:flex;align-items:flex-start;gap:8px;margin-top:20px;max-width:34ch;color:var(--m);font-size:13px;text-align:left}.dm-trust svg{color:var(--g);flex:none;margin-top:2px}
/* after connecting: stacked cards */
.dm-stack{height:100%;display:flex;flex-direction:column;gap:10px;padding:10px 12px 12px}
.dm-card{display:flex;flex-direction:column;min-height:0;border-radius:26px;border:1px solid var(--l);background:rgba(255,255,255,.035);overflow:hidden}
.dm-files{flex:0 0 auto}.dm-files.open{flex:0 0 40%}
.dm-files-body{display:flex;flex-direction:column;flex:1;min-height:0}
.dm-aicard{flex:1;min-width:0}
.dm-ph-ai{border-bottom:1px solid var(--l);min-height:62px}
@media (max-width:699px){.dm-files:not(.open) .dm-files-body{display:none}.dm-app.kb .dm-files{display:none}}
.dm-ph{flex:none;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 12px 8px 18px;min-height:58px}
.dm-ph h2{font-size:20px;letter-spacing:-.03em;font-weight:700}.dm-ph p{font-size:12px;color:var(--m)}
.dm-collapse{display:flex;align-items:center;gap:8px;min-height:44px}
.dm-chev2{color:var(--m);transition:rotate .25s var(--ease);rotate:-90deg}.dm-chev2.open{rotate:0deg}
.dm-tools{display:flex;align-items:center;gap:8px;flex:none}
.dm-branch{display:flex;align-items:center;gap:6px;height:40px;padding:0 12px;border-radius:99px;background:var(--s);border:1px solid var(--l);color:var(--m);max-width:160px}.dm-branch.off{opacity:.5}
.dm-branch select{appearance:none;-webkit-appearance:none;background:none;border:0;outline:0;min-width:0;max-width:90px;color:var(--t);font-weight:600;text-overflow:ellipsis}.dm-branch option{background:#111}
.dm-pad{padding:0 12px 4px}
.dm-pscroll{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;padding:4px 8px 10px;-webkit-overflow-scrolling:touch;display:flex;flex-direction:column}
.dm-tree-item{width:100%;min-height:46px;display:flex;align-items:center;gap:9px;padding-right:10px;border-radius:12px;font-size:16px;color:#d1d1d6}
.dm-tree-item.is-selected{background:var(--gd);color:#fff}
.dm-chev{color:#636366;flex:none;transition:rotate .2s var(--ease)}.dm-chev.open{rotate:90deg}.dm-chev-gap{width:14px;flex:none}
.dm-ic-dir{color:var(--g);flex:none}.dm-ic-file{color:var(--m);flex:none}
/* code */
.dm-ph-code{padding-left:16px}.dm-ph-code h2{font-size:17px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dm-ph-code p{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dm-file-tx{min-width:0;flex:1}
.dm-meta{flex:none;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 16px;font-size:12px;color:var(--m);border-top:1px solid var(--l);border-bottom:1px solid var(--l);background:rgba(255,255,255,.03)}
.dm-meta>span:first-child{display:flex;align-items:center;gap:7px}
.dm-code-scroll{flex:1;min-height:0;overflow:auto;overscroll-behavior:contain;background:#050505;-webkit-overflow-scrolling:touch;display:flex;flex-direction:column}
.dm-source{display:flex;min-width:max-content;padding:12px 0 28px;font:12.5px/1.75 var(--mono)}
.dm-source pre{margin:0;font:inherit}.dm-ln{position:sticky;left:0;min-width:46px;padding:0 10px;text-align:right;color:#4a4a4f;background:#050505;border-right:1px solid var(--l);user-select:none;-webkit-user-select:none}
.dm-src{padding:0 16px;color:#e5e5ea;white-space:pre;tab-size:2;user-select:text;-webkit-user-select:text}
/* chat */
.dm-ai-title{display:flex;align-items:center;gap:10px;min-width:0}.dm-ai-title h2{font-size:18px}
.dm-thread{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;padding:4px 16px 10px;-webkit-overflow-scrolling:touch}
.dm-thread-in{max-width:720px;min-height:100%;margin:0 auto;display:flex;flex-direction:column;gap:18px}
.dm-welcome{display:flex;flex-direction:column;align-items:center;text-align:center;gap:12px;margin:auto;padding:24px 8px;color:var(--m);max-width:34ch}
.dm-welcome .dm-chips{flex-wrap:wrap;justify-content:center;overflow:visible;padding:4px 0 0}
.dm-msg{display:flex;gap:10px;animation:dmIn .4s var(--ease) both}.dm-msg.user{justify-content:flex-end}
@keyframes dmIn{from{opacity:0;transform:translateY(8px)}}
.dm-bubble{max-width:85%;font-size:16px;line-height:1.55;padding:10px 16px;border-radius:22px 22px 6px 22px;background:var(--g);color:#000;font-weight:500;white-space:pre-wrap;overflow-wrap:anywhere;user-select:text;-webkit-user-select:text}
.dm-ai-text{min-width:0;flex:1;padding-top:2px;color:#ececf0;font-size:16px;line-height:1.7;letter-spacing:-.005em;overflow-wrap:anywhere;user-select:text;-webkit-user-select:text}.dm-ai-text p{margin:0 0 12px}.dm-ai-text>*:last-child{margin-bottom:0}
.dm-ai-text strong,.dm-ai-text b{color:#fff;font-weight:650}.dm-warn{font-size:13px;color:var(--m)}
.dm-md-h{margin:18px 0 8px;font-size:18px;font-weight:700;letter-spacing:-.02em;line-height:1.3;color:#fff}.dm-ai-text>.dm-md-h:first-child{margin-top:0}
.dm-ol,.dm-ul{list-style:none;padding:0;margin:0 0 14px;display:flex;flex-direction:column;gap:10px}
.dm-ol>li,.dm-ul>li{display:flex;gap:12px;align-items:flex-start}
.dm-ol>li{counter-increment:dm-n}
.dm-ol>li::before{content:counter(dm-n);flex:none;width:26px;height:26px;margin-top:1px;border-radius:50%;display:grid;place-items:center;background:var(--gd);color:var(--g);font-size:13px;font-weight:700;line-height:1}
.dm-ul>li::before{content:"";flex:none;width:7px;height:7px;margin-top:.7em;border-radius:50%;background:var(--g)}
.dm-ul.sub{margin:8px 0 2px;gap:6px}.dm-ul.sub>li::before{width:5px;height:5px;margin-top:.75em;background:#8e8e93}
.dm-li-body{min-width:0;flex:1}
.dm-ic-code{font-family:var(--mono);font-size:.86em;padding:2px 7px;border-radius:7px;background:rgba(255,255,255,.1);color:#d9f99d;overflow-wrap:anywhere}
.dm-repair-text{padding:2px 2px 8px}
.dm-num{width:24px;height:24px;flex:none;border-radius:50%;display:inline-grid;place-items:center;background:var(--gd);color:var(--g);font-size:12px;font-weight:700}
.dm-points{list-style:none;padding:0;margin:10px 0 8px;display:flex;flex-direction:column;gap:8px}
.dm-points li{position:relative;padding-left:16px;font-size:15px;line-height:1.55;overflow-wrap:anywhere;user-select:text;-webkit-user-select:text}
.dm-points li::before{content:"";position:absolute;left:0;top:.62em;width:6px;height:6px;border-radius:50%;background:var(--g)}
.dm-points b{color:#fff}
.dm-thinking{display:flex;align-items:center;gap:9px;color:var(--m)}
.dm-codeblock{margin:8px 0;padding:12px 14px;border-radius:14px;background:#050505;border:1px solid var(--l);overflow-x:auto;font:12.5px/1.6 var(--mono);color:#e5e5ea}
.dm-chips{flex:none;display:flex;gap:8px;overflow-x:auto;padding:2px 14px 8px;touch-action:pan-x pan-y;scrollbar-width:none}.dm-chips::-webkit-scrollbar{display:none}
.dm-chip{flex:none;height:40px;padding:0 15px;border-radius:99px;background:var(--s);border:1px solid var(--l);font-size:14px;font-weight:600}
.dm-thread.empty{display:none}
.dm-mascot-wrap{flex:none;display:flex;flex-direction:column;padding:0 10px 10px;min-width:0}
.dm-mascot-wrap.center{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;padding:8px 12px 12px}
.dm-mascot-in{width:100%;max-width:720px;margin:0 auto}
.dm-mascot-wrap.center .dm-mascot-in{margin-top:auto;margin-bottom:auto}
.dm-ctx-row{margin:0 4px 8px}
.dm-mascot-in .dm-chips{flex-wrap:wrap;justify-content:center;overflow:visible;padding:12px 0 0}
.dm-composer-wrap{flex:none;padding:0 10px 10px}
.dm-composer{margin:0 auto;max-width:720px;padding:12px 12px 10px 18px;border-radius:26px;background:rgba(28,28,30,.85);border:1px solid var(--l);transition:border-color .2s,box-shadow .2s}
.dm-composer:focus-within{border-color:rgba(118,185,0,.6);box-shadow:0 0 0 4px rgba(118,185,0,.14)}
.dm-ctx{display:inline-flex;align-items:center;gap:6px;min-width:0;margin:0;padding:4px 10px;border-radius:99px;background:var(--gd);color:var(--g);font-size:12px;font-weight:600}.dm-ctx svg{flex:none}
.dm-comp-row{display:flex;align-items:flex-start;gap:10px}
.dm-composer textarea{flex:1;min-width:0;resize:none;background:none;border:0;outline:0;line-height:1.45;padding:2px 0;max-height:120px}.dm-composer textarea::placeholder{color:var(--m)}
.dm-send{width:42px;height:42px;flex:none;display:grid;place-items:center;border-radius:50%;background:var(--g);color:#000}.dm-send:disabled{background:var(--s2);color:#636366}
.dm-comp-foot{display:flex;align-items:center;gap:8px;margin-top:6px;min-width:0}
.dm-model{display:inline-flex;align-items:center;gap:7px;flex:none;font-size:13px;font-weight:600;color:var(--m)}
.dm-disc{display:flex;align-items:center;justify-content:center;gap:5px;margin-top:8px;font-size:12px;color:#6e6e73}
/* sheet */
.dm-sw{position:fixed;inset:0;z-index:50;pointer-events:none}
.dm-scrim{position:absolute;inset:0;background:rgba(0,0,0,.6);opacity:0}
.dm-sheet{position:absolute;left:0;right:0;bottom:-1px;margin:0 auto;max-width:640px;max-height:92dvh;display:flex;flex-direction:column;transform:translate3d(0,100%,0);will-change:transform;border:1px solid var(--l);border-bottom:0;border-radius:28px 28px 0 0;box-shadow:0 -24px 60px rgba(0,0,0,.5);padding:0 0 env(safe-area-inset-bottom,0px);background:rgba(22,22,24,.9);overflow:hidden}
.dm-sheet.tall{height:92dvh;max-width:920px}
.dm-grab{flex:none;touch-action:none;padding:10px 0 12px;cursor:grab}.dm-grab i{display:block;width:40px;height:5px;border-radius:9px;background:rgba(255,255,255,.3);margin:0 auto}
.dm-sheet-code{flex:1;min-height:0;display:flex;flex-direction:column}
.dm-sheet-body{display:flex;flex-direction:column;flex:1 1 auto;min-height:0;padding:0 16px 16px}
.dm-sec-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px}
.dm-sheet-h{display:flex;align-items:center;gap:8px;font-size:24px;letter-spacing:-.035em;font-weight:700}.dm-sheet-h svg{color:var(--g)}
.dm-sheet-note{color:var(--m);font-size:14px;line-height:1.55;margin-bottom:12px}
.dm-sheet-scroll{overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;margin-bottom:10px;flex:1 1 auto;min-height:0}
.dm-repair{margin:0;padding:14px;border-radius:16px;background:#050505;border:1px solid var(--l);white-space:pre-wrap;overflow-wrap:anywhere;font:12.5px/1.65 var(--mono);color:#e5e5ea;margin-bottom:12px;user-select:text;-webkit-user-select:text}
.dm-two{display:flex;gap:10px}
.dm-actions{flex:none;display:flex;gap:8px;overflow-x:auto;padding:0 16px 10px;touch-action:pan-x pan-y;scrollbar-width:none}.dm-actions::-webkit-scrollbar{display:none}
.dm-lang{padding:3px 10px;border-radius:99px;background:var(--s2);font-size:12px;font-weight:600;color:var(--m)}
.dm-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:2px 0 10px}
.dm-export{display:flex;gap:8px;overflow-x:auto;margin:0 0 10px;scrollbar-width:none;touch-action:pan-x pan-y}.dm-export::-webkit-scrollbar{display:none}
.dm-sub-h{margin:14px 2px 8px;font-size:16px;font-weight:700;letter-spacing:-.02em}.dm-sub-h:first-child{margin-top:2px}
.dm-find-title{display:block;font-size:15px;letter-spacing:-.01em}.dm-dim{color:var(--m)}
.dm-evidence{margin:8px 0 0;padding:10px 12px;border-radius:12px;background:#050505;border:1px solid var(--l);white-space:pre-wrap;overflow-wrap:anywhere;font:12px/1.55 var(--mono);color:#d1d1d6;user-select:text;-webkit-user-select:text}
.dm-limits{padding-left:20px;color:var(--m);font-size:13px;line-height:1.6}
.dm-rule{display:flex;align-items:center;gap:12px;width:100%;min-height:60px;padding:10px 14px;margin-bottom:8px;border-radius:16px;background:var(--s);border:1px solid var(--l)}
.dm-rule-tx{flex:1;min-width:0;display:flex;flex-direction:column}.dm-rule-tx strong{font-size:15px;font-weight:600;overflow-wrap:anywhere}.dm-rule-tx small{font-size:12px;color:var(--m)}
.dm-stats span{display:flex;flex-direction:column;padding:10px 12px;border-radius:16px;background:var(--s);border:1px solid var(--l)}.dm-stats strong{font-size:22px;letter-spacing:-.03em;line-height:1.1}.dm-stats small{font-size:12px;color:var(--m)}
.dm-finding{padding:12px 14px;border-radius:16px;background:var(--s);border:1px solid var(--l);margin-bottom:8px}.dm-finding p{margin-top:8px;font-size:15px;line-height:1.55;overflow-wrap:anywhere;user-select:text;-webkit-user-select:text}
.dm-find-top{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:13px;color:var(--m)}.dm-find-rule{margin-left:auto;font-family:ui-monospace,monospace}
.dm-sev{padding:2px 9px;border-radius:99px;font-weight:700;background:var(--s2);color:var(--t);text-transform:capitalize}
.dm-sev.error,.dm-sev.high,.dm-sev.critical{background:#fff;color:#000}.dm-sev.warning,.dm-sev.medium{background:var(--gd);color:var(--g)}
.dm-consent{position:fixed;inset:0;z-index:70;display:grid;place-items:center;padding:20px;background:rgba(0,0,0,.72);animation:dmIn .3s var(--ease)}
.dm-dialog{width:min(460px,100%);padding:24px;border-radius:28px;border:1px solid var(--l);box-shadow:0 24px 90px rgba(0,0,0,.6);background:rgba(22,22,24,.92);display:flex;flex-direction:column;gap:12px}
.dm-dialog-ic{width:46px;height:46px;display:grid;place-items:center;border-radius:14px;background:var(--gd);color:var(--g)}
.dm-dialog h2{font-size:22px;line-height:1.2;letter-spacing:-.035em;font-weight:700}.dm-dialog p{font-size:14px;line-height:1.6;color:#aeaeb2}
.dm-dialog-repo{display:flex;align-items:center;gap:8px;padding:12px;border-radius:14px;background:var(--s);border:1px solid var(--l);font-size:14px;font-weight:600}.dm-dialog-branch{display:flex;align-items:center;gap:4px;margin-left:auto;flex:none;font-size:12px;color:var(--m)}
.dm-dialog small{font-size:12px;color:var(--m);line-height:1.5}
/* toast */
.dm-toast{position:fixed;z-index:60;left:50%;translate:-50% 0;top:calc(env(safe-area-inset-top,0px) + 66px);width:max-content;max-width:min(92vw,460px);display:flex;align-items:flex-start;gap:10px;padding:12px 14px;border-radius:18px;border:1px solid var(--l);box-shadow:0 12px 40px rgba(0,0,0,.5);font-size:14px;animation:dmToast .4s var(--ease) both}
.dm-toast>span{flex:1;min-width:0;overflow-wrap:anywhere}.dm-toast>svg:first-child{flex:none;margin-top:1px}
.dm-toast.success>svg:first-child{color:var(--g)}.dm-toast.error>svg:first-child{color:#ff6b61}.dm-toast.info>svg:first-child{color:#fff}
.dm-dim-ic{color:#636366;flex:none}
@keyframes dmToast{from{opacity:0;transform:translateY(-12px) scale(.97)}}
/* hover only where hover exists */
@media (hover:hover) and (pointer:fine){
  .dm-ib:hover:not(:disabled),.dm-pill:hover:not(:disabled),.dm-repo:hover,.dm-tree-item:hover,.dm-chip:hover,.dm-btn.o:hover{background:var(--s2)}
  .dm-btn.g:hover,.dm-import:not(.done):hover,.dm-pill.g:hover:not(:disabled){background:#8ad400}.dm-btn.w:hover{background:#e5e5ea}
  :where(.dm-app) :where(input,textarea,select){font-size:14px}
}
/* tablets, landscape phones and desktop: Files on the left, DevMind AI on the right, as sketched */
@media (min-width:560px){.dm-stats{grid-template-columns:repeat(6,minmax(0,1fr))}}
@media (min-width:700px){
  .dm-stack{flex-direction:row;gap:12px;padding:12px 16px 16px}
  .dm-files,.dm-files.open{flex:0 0 clamp(260px,34%,360px)}
  .dm-collapse{pointer-events:none}.dm-collapse .dm-chev2{display:none}
  .dm-ph h2{font-size:19px}
  .dm-tree-item{min-height:38px;font-size:14px;border-radius:10px}
}
@media (prefers-reduced-motion:reduce){.dm-app *{animation-duration:.01ms!important;transition-duration:.01ms!important}}
@media (prefers-reduced-transparency:reduce){.dm-glass{backdrop-filter:none!important;-webkit-backdrop-filter:none!important;background:#111!important}}
`;
