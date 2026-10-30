import {
  createContext, useCallback, useContext, useEffect, useRef, useState,
} from "react";
import type { ReactNode } from "react";
import { AlertCircle, Check, GitBranch, Info, LockKeyhole, X } from "lucide-react";
import { FaGithub } from "react-icons/fa";
import "./devmind.css";
import {
  API_BASE_URL, asRecord, asString, decodeContent, encodeRepo, newChatId, request,
  uid, unwrapArray,
} from "./api";
import type {
  Chat, ChatMessage, GithubBranch, GithubEntry, GithubRepo, GithubStatus, Notice,
} from "./api";

/* ---------- tiny safe localStorage ---------- */
const read = <T,>(k: string, fallback: T): T => {
  try {
    const v = localStorage.getItem(k);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
};
const write = (k: string, v: unknown) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* storage full or blocked: ignore */
  }
};

function useDevMindState() {
  const [status, setStatus] = useState<GithubStatus>({ connected: false });
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [repos, setRepos] = useState<GithubRepo[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [repo, setRepo] = useState<GithubRepo | null>(null);
  const [branches, setBranches] = useState<GithubBranch[]>([]);
  const [branch, setBranch] = useState("main");
  const [entries, setEntries] = useState<GithubEntry[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [selectedFile, setSelectedFile] = useState<GithubEntry | null>(null);
  const [sourceCode, setSourceCode] = useState("");
  const [loadingFile, setLoadingFile] = useState(false);

  const [toast, setToast] = useState<Notice | null>(null);
  const [history, setHistory] = useState<Notice[]>([]);
  const [seen, setSeen] = useState(0);

  const [chats, setChats] = useState<Chat[]>(() => read<Chat[]>("dm:chats", []));
  const [sendingId, setSendingId] = useState<string | null>(null);

  const [consentOpen, setConsentOpen] = useState(false);
  const [consentKey, setConsentKey] = useState<string | null>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  const [kb, setKb] = useState(false);
  const drawer = useRef<{ open: () => void; close: () => void }>({
    open: () => {}, close: () => {},
  });
  const restored = useRef(false);

  /* ---------- platform: meta tags, keyboard-aware height ---------- */
  useEffect(() => {
    let vp = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
    if (!vp) {
      vp = document.createElement("meta");
      vp.name = "viewport";
      document.head.appendChild(vp);
    }
    vp.content =
      "width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content";
    let tc = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!tc) {
      tc = document.createElement("meta");
      tc.name = "theme-color";
      document.head.appendChild(tc);
    }
    tc.content = "#000000";
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

  /* ---------- notifications ---------- */
  const notify = useCallback(
    (text: string, type: Notice["type"] = "info") => {
      const n: Notice = { id: uid(), type, text, time: Date.now() };
      setToast(n);
      setHistory((h) => [n, ...h].slice(0, 20));
    },
    [],
  );
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), toast.type === "error" ? 7000 : 3800);
    return () => clearTimeout(t);
  }, [toast]);
  const unread = Math.max(0, history.length - seen);
  const markSeen = () => setSeen(history.length);
  const clearHistory = () => { setHistory([]); setSeen(0); };

  const copy = useCallback(
    (value: string, label: string) => {
      if (!navigator.clipboard) {
        notify("Copy isn't available on insecure (http) pages.", "info");
        return;
      }
      void navigator.clipboard
        .writeText(value)
        .then(() => notify(`${label} copied.`, "success"));
    },
    [notify],
  );

  /* ---------- GitHub: status, repos ---------- */
  const loadStatus = useCallback(async () => {
    setLoadingStatus(true);
    try {
      const p = asRecord(await request<unknown>("/api/github/status"));
      const n = asRecord(p.data);
      const connected = Boolean(p.connected ?? n.connected ?? p.isConnected ?? n.isConnected);
      setStatus({
        connected,
        username: asString(p.username, asString(p.login, asString(n.username, asString(n.login)))),
        login: asString(p.login, asString(n.login)),
        avatar_url: asString(
          p.avatar_url,
          asString(p.avatarUrl, asString(n.avatar_url, asString(n.avatarUrl))),
        ),
        avatarUrl: asString(p.avatarUrl, asString(n.avatarUrl)),
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
      const payload = await request<unknown>("/api/github/repos?page=1&sort=updated");
      const list = unwrapArray<GithubRepo>(payload, ["repos", "items", "data"]).map((item) => {
        const fullName =
          (typeof item.full_name === "string" && item.full_name.trim()) ||
          (typeof item.fullName === "string" && item.fullName.trim()) ||
          "";
        const name = item.name || fullName.split("/").filter(Boolean).pop() || "Repository";
        return {
          ...item,
          id: item.id ?? fullName ?? name,
          name,
          // The gateway returns fullName (camelCase); the UI uses full_name for API paths.
          full_name: fullName || name,
          default_branch: item.default_branch ?? item.defaultBranch ?? "main",
          updated_at: item.updated_at ?? item.updatedAt,
          html_url: item.html_url ?? item.url,
        };
      });
      setRepos(list);
      if (!list.length)
        notify("GitHub is connected, but no repositories were returned for this account.", "info");
    } catch (error) {
      notify(`Could not load repositories. ${error instanceof Error ? error.message : ""}`, "error");
    } finally {
      setLoadingRepos(false);
    }
  }, [notify]);

  useEffect(() => {
    if (status.connected) void loadRepos();
  }, [status.connected, loadRepos]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get("github");
    if (result === "success") notify("GitHub connected successfully.", "success");
    if (result === "error") notify(params.get("message") || "GitHub connection failed.", "error");
    if (result) window.history.replaceState({}, "", window.location.pathname); // don't re-toast on refresh
    void loadStatus();
  }, [loadStatus, notify]);

  const connectGithub = () => {
    window.location.assign(`${API_BASE_URL}/api/github/connect`);
  };

  /* ---------- files ---------- */
  const loadContents = useCallback(
    async (target: GithubRepo, ref: string, path = "") => {
      setLoadingFiles(true);
      try {
        const query = new URLSearchParams({ ref });
        if (path) query.set("path", path);
        const payload = await request<unknown>(
          `/api/github/repos/${encodeRepo(target.full_name)}/contents?${query.toString()}`,
        );
        const list = unwrapArray<GithubEntry>(payload, ["contents", "files", "items", "data"]);
        const normalized = list.map(
          (e) => ({ ...e, path: e.path || (path ? `${path}/${e.name}` : e.name) }) as GithubEntry,
        );
        setEntries((cur) => {
          if (!path) return normalized;
          const byPath = new Map(cur.map((e) => [e.path, e]));
          normalized.forEach((e) => byPath.set(e.path, e));
          return [...byPath.values()];
        });
        if (path) setExpanded((cur) => new Set(cur).add(path));
        else setExpanded(new Set());
      } catch (error) {
        setEntries([]);
        notify(`Could not load repository files. ${error instanceof Error ? error.message : ""}`, "error");
      } finally {
        setLoadingFiles(false);
      }
    },
    [notify],
  );

  const chooseRepo = useCallback(
    async (item: GithubRepo, preferred?: string) => {
      const fullName = item.full_name?.trim();
      if (!fullName || fullName.split("/").length !== 2) {
        notify(
          `Cannot open this repository because the API did not return its owner/repository name. Received: ${fullName || "empty"}`,
          "error",
        );
        return;
      }
      const selected = { ...item, full_name: fullName };
      const fallback = selected.default_branch || "main";
      const want = preferred || fallback;
      setRepo(selected);
      setSelectedFile(null);
      setSourceCode("");
      setEntries([]);
      setBranches([]);
      setExpanded(new Set());
      setConsentKey(null);
      setBranch(want);
      drawer.current.close();
      setLoadingFiles(true);
      try {
        const payload = await request<unknown>(`/api/github/repos/${encodeRepo(fullName)}/branches`);
        const list = unwrapArray<GithubBranch>(payload, ["branches", "items", "data"]).map((b) =>
          typeof b === "string" ? ({ name: b } as GithubBranch) : b,
        );
        setBranches(list);
        const chosen = list.some((b) => b.name === want)
          ? want
          : list.some((b) => b.name === fallback)
            ? fallback
            : list[0]?.name || fallback;
        setBranch(chosen);
        write("dm:lastRepo", { full_name: fullName, branch: chosen });
        await loadContents(selected, chosen);
      } catch (error) {
        notify(
          `Repository opened, but its branches could not be loaded. ${error instanceof Error ? error.message : ""}`,
          "error",
        );
        setLoadingFiles(false);
      }
    },
    [loadContents, notify],
  );

  /* restore the last repository quietly (but not when a /chat/:id link will pick its own) */
  useEffect(() => {
    if (restored.current || !repos.length || repo) return;
    restored.current = true;
    if (window.location.pathname.toLowerCase().startsWith("/chat/")) return;
    const saved = read<{ full_name: string; branch: string } | null>("dm:lastRepo", null);
    const hit = saved && repos.find((r) => r.full_name === saved.full_name);
    if (hit && saved) void chooseRepo(hit, saved.branch);
  }, [repos, repo, chooseRepo]);

  const changeBranch = (name: string) => {
    if (!repo) return;
    setConsentKey(null);
    setBranch(name);
    setSelectedFile(null);
    setSourceCode("");
    write("dm:lastRepo", { full_name: repo.full_name, branch: name });
    void loadContents(repo, name);
  };

  const selectFile = useCallback(
    async (entry: GithubEntry) => {
      if (!repo) return;
      setSelectedFile(entry);
      setLoadingFile(true);
      setSourceCode("");
      try {
        const query = new URLSearchParams({ ref: branch, path: entry.path });
        const payload = await request<unknown>(
          `/api/github/repos/${encodeRepo(repo.full_name)}/contents?${query.toString()}`,
        );
        const record = asRecord(payload);
        const nested = asRecord(record.data);
        const file = (record.content ? record : nested.content ? nested : entry) as GithubEntry;
        const content = decodeContent(file);
        if (!content && !file.content && !file.text && !file.decodedContent)
          throw new Error("The API did not return file contents for this path.");
        setSourceCode(content);
      } catch (error) {
        setSourceCode("");
        notify(`Could not read ${entry.path}. ${error instanceof Error ? error.message : ""}`, "error");
      } finally {
        setLoadingFile(false);
      }
    },
    [repo, branch, notify],
  );

  const toggleDirectory = (path: string) => {
    const isOpen = expanded.has(path);
    setExpanded((cur) => {
      const next = new Set(cur);
      if (isOpen) next.delete(path);
      else next.add(path);
      return next;
    });
    if (!isOpen && repo && !entries.some((e) => e.path.startsWith(`${path}/`)))
      void loadContents(repo, branch, path);
  };

  const refreshAll = () => {
    void loadRepos();
    if (repo) void loadContents(repo, branch);
    notify("Refreshing from GitHub…", "info");
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
      setChats([]);
      setConsentKey(null);
      restored.current = false;
      write("dm:lastRepo", null);
      drawer.current.close();
      notify("GitHub disconnected. Saved chats on this device were cleared.", "success");
    } catch (error) {
      notify(`Could not disconnect GitHub. ${error instanceof Error ? error.message : ""}`, "error");
    }
  };

  /* ---------- chats (saved on this device, addressed by UUID) ---------- */
  useEffect(() => write("dm:chats", chats), [chats]);

  const startChat = (message: string) => {
    const id = newChatId();
    const chat: Chat = {
      id,
      repo: repo?.full_name ?? "",
      branch,
      title: message.replace(/\s+/g, " ").slice(0, 60),
      messages: [{ id: uid(), role: "user", text: message }],
      updatedAt: Date.now(),
    };
    setChats((cs) => [chat, ...cs].slice(0, 50));
    return id;
  };
  const appendMessage = useCallback((id: string, m: ChatMessage) => {
    setChats((cs) =>
      cs.map((c) => (c.id === id ? { ...c, messages: [...c.messages, m], updatedAt: Date.now() } : c)),
    );
  }, []);
  const truncateChat = (id: string, keep: number) =>
    setChats((cs) => cs.map((c) => (c.id === id ? { ...c, messages: c.messages.slice(0, keep) } : c)));
  const removeChat = (id: string) => setChats((cs) => cs.filter((c) => c.id !== id));

  /* ---------- consent: resolves true/false, so callers just `await` it ---------- */
  const accessKey = repo ? `${repo.full_name}@${branch}` : "";
  const requireConsent = () =>
    new Promise<boolean>((resolve) => {
      if (!repo || consentKey === accessKey) return resolve(true);
      resolver.current = resolve;
      setConsentOpen(true);
    });
  const answerConsent = (ok: boolean) => {
    if (ok) setConsentKey(accessKey);
    setConsentOpen(false);
    resolver.current?.(ok);
    resolver.current = null;
    if (!ok) notify("Repository access denied. No AI request was sent.", "info");
  };

  return {
    status, loadingStatus, loadStatus, connectGithub, disconnectGithub,
    repos, loadingRepos, repo, branches, branch, entries, expanded, loadingFiles,
    selectedFile, sourceCode, loadingFile,
    chooseRepo, changeBranch, selectFile, toggleDirectory, refreshAll,
    notify, copy, toast, setToast, history, unread, markSeen, clearHistory,
    chats, startChat, appendMessage, truncateChat, removeChat, sendingId, setSendingId,
    requireConsent, consentOpen, answerConsent,
    kb, drawer,
  };
}

type DevMind = ReturnType<typeof useDevMindState>;
const Ctx = createContext<DevMind | null>(null);

export function useDevMind() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useDevMind must be used inside <DevMindProvider>");
  return v;
}

export function DevMindProvider({ children }: { children: ReactNode }) {
  const dm = useDevMindState();
  const { repo, branch, toast } = dm;
  return (
    <Ctx.Provider value={dm}>
      <div className={`dm-root ${dm.kb ? "kb" : ""}`}>
        {children}

        {dm.consentOpen && repo && (
          <div className="dm-consent" role="presentation">
            <section className="dm-dialog dm-glass" role="dialog" aria-modal="true" aria-labelledby="dm-consent-title">
              <span className="dm-dialog-ic"><LockKeyhole size={22} /></span>
              <h2 id="dm-consent-title">Allow DevMind to access this repository?</h2>
              <p>
                DevMind will use the selected repository and branch to answer your request.
                Repository source code may be sent to the configured AI service for analysis.
                Access is read-only; DevMind will not change your GitHub files.
              </p>
              <div className="dm-dialog-repo">
                <FaGithub size={16} />
                <span className="dm-truncate">{repo.full_name}</span>
                <span className="dm-dialog-branch"><GitBranch size={12} /> {branch}</span>
              </div>
              <div className="dm-two">
                <button className="dm-btn o dm-press" onClick={() => dm.answerConsent(false)}>Deny</button>
                <button className="dm-btn g dm-press" onClick={() => dm.answerConsent(true)}>
                  <Check size={17} /> Allow access
                </button>
              </div>
              <small>
                This approval applies only to this repository and branch in this session.
                Switching repositories or disconnecting GitHub revokes it.
              </small>
            </section>
          </div>
        )}

        {toast && (
          <button className={`dm-toast dm-glass ${toast.type}`} role="status" onClick={() => dm.setToast(null)}>
            {toast.type === "error" ? <AlertCircle size={18} /> : toast.type === "success" ? <Check size={18} /> : <Info size={18} />}
            <span>{toast.text}</span>
            <X size={15} className="dm-dim-ic" />
          </button>
        )}
      </div>
    </Ctx.Provider>
  );
}