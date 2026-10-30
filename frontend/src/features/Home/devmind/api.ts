/* API helpers, shared types and the AI request builder. No React in here. */

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5002"
).replace(/\/$/, "");

export type JsonRecord = Record<string, unknown>;
export type GithubRepo = {
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
export type GithubBranch = { name: string; protected?: boolean };
export type GithubEntry = {
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
export type TreeNode = GithubEntry & { children?: TreeNode[] };
export type GithubStatus = {
  connected: boolean;
  username?: string;
  login?: string;
  avatar_url?: string;
  avatarUrl?: string;
};
export type Notice = {
  id: string;
  type: "success" | "error" | "info";
  text: string;
  time: number;
};
export type ChatMessage = { id: string; role: "user" | "assistant"; text: string };
export type Chat = {
  id: string;
  repo: string; // owner/name
  branch: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: number;
};

export const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
/* UUID for chat URLs: /chat/2b2aa84b-f742-4732-bc7f-9dc52bfc9cf8 */
export const newChatId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
      });

export function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" ? (value as JsonRecord) : {};
}
export function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}
export function unwrapArray<T>(payload: unknown, keys: string[]): T[] {
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

export async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
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

export const encodeRepo = (fullName: string) =>
  fullName.split("/").map(encodeURIComponent).join("/");
export const isDirectory = (entry: GithubEntry) => entry.type === "dir";

/* Sort by depth first so a parent folder is always indexed before its children. */
export function buildTree(entries: GithubEntry[]): TreeNode[] {
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

export function decodeContent(entry: GithubEntry): string {
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

export function languageForFile(filename: string): string {
  const ext = filename.toLowerCase().split(".").pop() || "";
  const map: Record<string, string> = {
    py: "python", js: "javascript", jsx: "javascript", mjs: "javascript",
    cjs: "javascript", ts: "typescript", tsx: "typescript", mts: "typescript",
    cts: "typescript", go: "go", rb: "ruby", c: "c", h: "c", cc: "cpp",
    cpp: "cpp", cxx: "cpp", hpp: "cpp", hxx: "cpp",
  };
  return map[ext] || "auto";
}

/* ------------------------------------------------------------------ */
/*  AI                                                                 */
/* ------------------------------------------------------------------ */
export const DEPTH_NOTE: Record<string, string> = {
  low: "Answer concisely in a few sentences.",
  medium: "Give a clear, balanced answer with the key details.",
  high: "Be thorough: reason step by step and cite specific file paths from the evidence.",
};

const ignored =
  /(^|\/)(node_modules|vendor|dist|build|coverage|\.git|\.next|venv|\.venv)(\/|$)|(^|\/)(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|poetry\.lock|Cargo\.lock|composer\.lock|\.env(?:\..*)?)$/i;
const readable =
  /^(py|js|jsx|mjs|cjs|ts|tsx|json|md|yml|yaml|toml|sql|go|java|rs|html|css|sh|dockerfile)$/;

/* The bounded repo scan is slow (up to 30 sequential requests), so reuse it for 5 minutes. */
const ctxCache = new Map<string, { t: number; v: string }>();

async function fetchRepositoryContext(fullName: string, ref: string) {
  const key = `${fullName}@${ref}`;
  const hit = ctxCache.get(key);
  if (hit && Date.now() - hit.t < 300_000) return hit.v;

  const encoded = encodeRepo(fullName);
  const queue = [""];
  const visited = new Set<string>();
  const snippets: string[] = [];
  let totalChars = 0;
  const maxFiles = 30,
    maxChars = 45000;

  while (queue.length && snippets.length < maxFiles && totalChars < maxChars) {
    const path = queue.shift()!;
    if (visited.has(path)) continue;
    visited.add(path);
    const query = new URLSearchParams({ ref });
    if (path) query.set("path", path);
    const payload = await request<unknown>(
      `/api/github/repos/${encoded}/contents?${query.toString()}`,
    );
    const listing = unwrapArray<GithubEntry>(payload, [
      "contents", "files", "items", "data",
    ]);
    for (const raw of listing) {
      const entry = {
        ...raw,
        path: raw.path || (path ? `${path}/${raw.name}` : raw.name),
      } as GithubEntry;
      if (!entry.path || ignored.test(entry.path)) continue;
      if (entry.type === "dir") {
        if (queue.length + visited.size < 120) queue.push(entry.path);
        continue;
      }
      if (entry.type !== "file" || snippets.length >= maxFiles || totalChars >= maxChars)
        continue;
      const ext = entry.name.toLowerCase().split(".").pop() || "";
      if (!readable.test(ext) && !/^dockerfile$/i.test(entry.name)) continue;
      try {
        const fq = new URLSearchParams({ ref, path: entry.path });
        const fp = asRecord(
          await request<unknown>(
            `/api/github/repos/${encoded}/contents?${fq.toString()}`,
          ),
        );
        const nested = asRecord(fp.data);
        const file = (
          typeof fp.content === "string"
            ? fp
            : typeof nested.content === "string"
              ? nested
              : entry
        ) as GithubEntry;
        const content = decodeContent(file);
        if (!content.trim()) continue;
        const clipped = content.slice(0, Math.min(3500, maxChars - totalChars));
        snippets.push(`\n--- FILE: ${entry.path} ---\n${clipped}`);
        totalChars += clipped.length;
      } catch {
        /* keep scanning other files */
      }
    }
  }
  const value = snippets.length
    ? snippets.join("\n")
    : "No readable source files could be fetched within the repository context limits.";
  ctxCache.set(key, { t: Date.now(), v: value });
  return value;
}

export async function askAI(o: {
  repo: GithubRepo;
  branch: string;
  message: string;
  history: ChatMessage[];
  file: GithubEntry | null;
  source: string;
  effort: string;
}): Promise<string> {
  const repositoryContext = await fetchRepositoryContext(o.repo.full_name, o.branch);
  const history = o.history
    .slice(-6)
    .map((m) => `${m.role === "user" ? "User" : "DevMind"}: ${m.text.slice(0, 1200)}`)
    .join("\n");
  const context = `You are reviewing the selected GitHub repository. Use only the evidence below and clearly state when evidence is insufficient. Do not claim files were inspected unless included below.\nRepository: ${o.repo.full_name}\nBranch: ${o.branch}\nRepository source excerpts (bounded scan; not guaranteed to include every file):\n${repositoryContext}${o.file ? `\nCurrently selected file: ${o.file.path}\nSelected file source:\n${o.source.slice(0, 10000)}` : ""}${history ? `\n\nConversation so far:\n${history}` : ""}\n\n${DEPTH_NOTE[o.effort] ?? DEPTH_NOTE.medium}\n\nUser question: ${o.message}`;

  const payload = asRecord(
    await request<unknown>("/api/ai/chat", {
      method: "POST",
      body: JSON.stringify({ message: context }),
    }),
  );
  const nested = asRecord(payload.data);
  const text = [
    payload.response, payload.reply, payload.message,
    nested.response, nested.reply, nested.message,
  ].find((v) => typeof v === "string" && v.trim().length > 0);
  return typeof text === "string"
    ? text
    : "The AI service returned an empty response. Please try asking again.";
}