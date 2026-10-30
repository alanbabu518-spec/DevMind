import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Copy, FileCode2, Folder, LockKeyhole, Plus, RefreshCw, Sparkles } from "lucide-react";
import AiMascotInput from "../components/ui/ai-mascot-input";
import type { AIModel, ChatSubmitData } from "../components/ui/ai-mascot-input";
import { Shell } from "../devmind/Shell";
import { FilesPanel } from "../devmind/FilesPanel";
import { CodeSheet } from "../devmind/CodeSheet";
import type { SheetKind } from "../devmind/CodeSheet";
import { useDevMind } from "../devmind/store";
import { Orb, Rich, Spin } from "../devmind/ui";
import { askAI, uid } from "../devmind/api";
import { reduced } from "../devmind/motion";

/* The backend exposes one assistant, so the model menu has one entry.
   "Answer depth" is real: it is added to the prompt as an instruction. */
const DevMindIcon = ({ size = 16, className = "" }: { size?: number; className?: string }) => (
  <Sparkles size={size} className={className} />
);
const MODELS: AIModel[] = [
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
      { id: "low", label: "Quick", desc: "Short, direct answers", multiplier: 1.6 },
      { id: "medium", label: "Balanced", desc: "Clear answers with the key details", multiplier: 2.6 },
      { id: "high", label: "Thorough", desc: "Step-by-step answers that cite file paths", multiplier: 3.8 },
    ],
  },
];

export default function Chat() {
  const { id } = useParams();
  const nav = useNavigate();
  const dm = useDevMind();
  const { repo, branch, selectedFile, sourceCode, notify } = dm;

  const chat = id ? dm.chats.find((c) => c.id === id) : undefined;
  const messages = chat?.messages ?? [];
  const sending = dm.sendingId !== null && dm.sendingId === id;
  const chatEmpty = messages.length === 0 && !sending;

  const [prompt, setPrompt] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetKind, setSheetKind] = useState<SheetKind>("code");
  const threadR = useRef<HTMLDivElement>(null);
  const effort = useRef("medium");
  const syncedFor = useRef<string | null>(null);

  const show = (k: SheetKind) => { setSheetKind(k); setSheetOpen(true); };
  const closeSheet = () => setSheetOpen(false);

  /* guards */
  useEffect(() => {
    if (!dm.loadingStatus && !dm.status.connected) nav("/home", { replace: true });
  }, [dm.loadingStatus, dm.status.connected, nav]);
  useEffect(() => {
    if (id && !chat) nav("/new", { replace: true });
  }, [id, chat, nav]);

  /* opening /chat/:id directly: switch to that chat's repository + branch */
  useEffect(() => {
    if (!chat || !dm.repos.length || syncedFor.current === chat.id) return;
    syncedFor.current = chat.id;
    if (dm.repo?.full_name === chat.repo && dm.branch === chat.branch) return;
    const hit = dm.repos.find((r) => r.full_name === chat.repo);
    if (hit) void dm.chooseRepo(hit, chat.branch);
    else notify(`The repository for this chat (${chat.repo}) is no longer available.`, "info");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat?.id, dm.repos]);

  useEffect(() => {
    const t = threadR.current;
    if (t) t.scrollTo({ top: t.scrollHeight, behavior: reduced() ? "auto" : "smooth" });
  }, [messages.length, sending, id]);

  /* ---------- sending ---------- */
  const gate = async () => {
    if (!repo) {
      notify("Choose a repository first.", "info");
      dm.drawer.current.open();
      return false;
    }
    return dm.requireConsent();
  };

  const run = async (cid: string, message: string, history: typeof messages) => {
    dm.setSendingId(cid);
    try {
      const text = await askAI({
        repo: repo!, branch, message, history, file: selectedFile, source: sourceCode,
        effort: effort.current,
      });
      dm.appendMessage(cid, { id: uid(), role: "assistant", text });
    } catch (error) {
      dm.appendMessage(cid, {
        id: uid(),
        role: "assistant",
        text: `I couldn't reach the AI chat service. ${error instanceof Error ? error.message : "Please try again."}`,
      });
    } finally {
      dm.setSendingId(null);
    }
  };

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || sending) return;
    if (!(await gate())) return;
    let cid = id;
    if (!cid) {
      cid = dm.startChat(message);
      nav(`/chat/${cid}`); // /new -> /chat/<uuid>
    } else {
      dm.appendMessage(cid, { id: uid(), role: "user", text: message });
    }
    setPrompt("");
    await run(cid, message, messages);
  };

  const regenerate = async (index: number) => {
    if (!id || sending) return;
    const prev = messages[index - 1];
    if (!prev || prev.role !== "user") return;
    if (!(await gate())) return;
    dm.truncateChat(id, index); // drop the old answer, keep the question
    await run(id, prev.text, messages.slice(0, index - 1));
  };

  const askAbout = () => {
    closeSheet();
    setTimeout(() => document.querySelector<HTMLTextAreaElement>(".dm-mascot textarea")?.focus(), 350);
  };

  const starters: [string, string][] = selectedFile
    ? [
        ["Explain this file", `Explain ${selectedFile.path} in simple terms. Describe its purpose, important functions, and how it fits into the project. Cite line numbers when possible.`],
        ["Find potential bugs", `Review ${selectedFile.path} for likely bugs and edge cases. Explain each finding in beginner-friendly language and cite relevant lines when possible. Do not claim a bug exists unless the code supports it.`],
        ["Suggest tests", `Suggest useful tests for ${selectedFile.path}. Explain what each test should verify and include examples where helpful.`],
      ]
    : [
        ["Explain the project", "Explain this repository's architecture in simple terms. Start with the main folders and explain how the important parts connect."],
        ["Check security", "Review this repository for security risks. Explain each concern in beginner-friendly language and cite file paths when available."],
        ["Suggest tests", "Suggest useful tests for this repository. Explain what each test should verify and give examples where possible."],
      ];

  const voiceOk =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  return (
    <Shell
      title={repo ? repo.full_name : "New chat"}
      subtitle={repo ? `${branch} · ${repo.private ? "Private" : "Public"}` : "Choose a repository from the menu"}
      share={Boolean(id)}
    >
      <div className="dm-work">
        <section className="dm-card dm-files-col" aria-label="Files">
          <FilesPanel onOpen={() => show("code")} />
        </section>

        <section className="dm-card dm-aicard">
          <div className="dm-ph dm-ph-ai">
            <div>
              <h2>DevMind AI</h2>
              <p>{repo ? "Ask about your project" : "Choose a repository to get started"}</p>
            </div>
            <div className="dm-tools">
              <button className="dm-pill dm-press dm-filesbtn" onClick={() => show("files")} disabled={!repo}>
                <Folder size={15} /> Files
              </button>
              <span className="dm-tipwrap">
                <button className="dm-ib sm dm-press" aria-label="New chat" onClick={() => nav("/new")}>
                  <Plus size={18} />
                </button>
                <span className="dm-tip" role="tooltip">New chat</span>
              </span>
            </div>
          </div>

          <div className={`dm-thread ${chatEmpty ? "empty" : ""}`} ref={threadR} aria-live="polite">
            <div className="dm-thread-in">
              {messages.map((m, i) =>
                m.role === "user" ? (
                  <div key={m.id} className="dm-msg user"><div className="dm-bubble">{m.text}</div></div>
                ) : (
                  <div key={m.id} className="dm-msg ai">
                    <Orb size={28} />
                    <div className="dm-ai-column">
                      <div className="dm-ai-text"><Rich text={m.text} /></div>
                      <div className="dm-response-actions">
                        <button type="button" className="dm-response-action dm-press" onClick={() => dm.copy(m.text, "Answer")}>
                          <Copy size={13} /> Copy
                        </button>
                        {i > 0 && (
                          <button type="button" className="dm-response-action dm-press" disabled={sending} onClick={() => void regenerate(i)}>
                            <RefreshCw size={13} /> Regenerate
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ),
              )}
              {sending && (
                <div className="dm-msg ai">
                  <Orb size={28} />
                  <div className="dm-ai-text dm-thinking"><Spin /> Thinking…</div>
                </div>
              )}
            </div>
          </div>

          <div className={`dm-mascot-wrap ${chatEmpty ? "center" : ""}`}>
            <div className="dm-mascot-in">
              {selectedFile && (
                <div className="dm-ctx-row">
                  <span className="dm-ctx"><FileCode2 size={13} /><span className="dm-truncate">{selectedFile.path}</span></span>
                </div>
              )}
              <div className="dark dm-mascot">
                <AiMascotInput
                  value={prompt}
                  onChange={setPrompt}
                  isProcessing={sending}
                  showWelcome={chatEmpty}
                  title={repo ? `Ask about ${repo.name}` : "Choose a repository to begin"}
                  subtitle={
                    repo
                      ? selectedFile
                        ? `Ask about ${selectedFile.name}, or ask a question about ${repo.name}`
                        : `Ask questions about ${repo.name}, or select a file for a more focused answer`
                      : "Open the menu and choose a GitHub repository to begin"
                  }
                  placeholder={repo ? "Ask about your code…" : "Choose a repository first…"}
                  models={MODELS}
                  defaultModelId="devmind"
                  enableAttachments={false}
                  enableWebSearch={false}
                  enableVoice={voiceOk}
                  onSubmit={async (d: ChatSubmitData) => {
                    effort.current = d.effort;
                    await send(d.prompt);
                  }}
                />
              </div>
              {chatEmpty && repo && (
                <div className="dm-starter-wrap">
                  <p className="dm-starter-label">
                    {selectedFile ? `Try asking about ${selectedFile.name}` : "Not sure what to ask? Try one of these"}
                  </p>
                  <div className="dm-chips">
                    {starters.map(([label, q]) => (
                      <button key={label} className="dm-chip dm-press" onClick={() => void send(q)}>{label}</button>
                    ))}
                  </div>
                </div>
              )}
              <div className="dm-disc"><LockKeyhole size={11} /> AI can make mistakes. Verify changes.</div>
            </div>
          </div>
        </section>
      </div>

      <CodeSheet open={sheetOpen} kind={sheetKind} onKind={setSheetKind} onClose={closeSheet} onAsk={askAbout} />
    </Shell>
  );
}