import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Code2, Copy, FileCode2, MessageSquareText, ShieldCheck, Sparkles } from "lucide-react";
import { asRecord, asString, languageForFile, request } from "./api";
import type { JsonRecord } from "./api";
import { attachDrag, spring } from "./motion";
import { useDevMind } from "./store";
import { FilesPanel } from "./FilesPanel";
import { Finding, Spin } from "./ui";

export type SheetKind = "files" | "code" | "analysis" | "repair";

/* ------------------------------------------------------------------ */
/*  Bottom sheet: drag handle, momentum, spring. transform/opacity only */
/* ------------------------------------------------------------------ */
function BottomSheet({
  open, onClose, tall, children,
}: { open: boolean; onClose: () => void; tall: boolean; children: ReactNode }) {
  const sw = useRef<HTMLDivElement>(null);
  const sh = useRef<HTMLDivElement>(null);
  const sc = useRef<HTMLDivElement>(null);
  const gr = useRef<HTMLDivElement>(null);
  const ctl = useRef<{ to: (o: boolean, v?: number) => void; target: boolean }>({
    to: () => {}, target: false,
  });
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const wrap = sw.current!, sheet = sh.current!, scrim = sc.current!, grab = gr.current!;
    const H = () => sheet.offsetHeight || 480;
    const clamp = (n: number) => Math.max(0, Math.min(1, n));
    let sy = H();
    const setS = (v: number) => {
      sy = v;
      sheet.style.transform = `translate3d(0,${v}px,0)`;
      scrim.style.opacity = String(clamp(1 - v / H()));
    };
    const to = (o: boolean, v = 0) => {
      const was = ctl.current.target;
      ctl.current.target = o;
      wrap.style.pointerEvents = o ? "auto" : "none";
      if (o && !was) setS(H()); // always start from fully closed, whatever the content height
      spring("y", sy, o ? 0 : H(), v, setS);
    };
    ctl.current.to = to;
    setS(H());
    const off = attachDrag({
      els: [grab], axis: "y", get: () => sy, set: setS, min: 0, max: 1e4,
      onEnd: (v) => {
        const keep = !(sy + v * 0.499 > H() / 2);
        to(keep, v); // hand the release velocity to the spring
        if (!keep) closeRef.current();
      },
    });
    return off;
  }, []);

  useEffect(() => {
    if (ctl.current.target !== open) ctl.current.to(open);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    addEventListener("keydown", key);
    return () => removeEventListener("keydown", key);
  }, [open, onClose]);

  return (
    <div ref={sw} className="dm-sw" aria-hidden={!open}>
      <div ref={sc} className="dm-scrim" onClick={onClose} />
      <div ref={sh} className={`dm-sheet dm-solid ${tall ? "tall" : ""}`} role="dialog" aria-modal="true">
        <div ref={gr} className="dm-grab"><i /></div>
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sheet content                                                       */
/* ------------------------------------------------------------------ */
export function CodeSheet({
  open, kind, onKind, onClose, onAsk,
}: {
  open: boolean;
  kind: SheetKind;
  onKind: (k: SheetKind) => void;
  onClose: () => void;
  onAsk: () => void;
}) {
  const dm = useDevMind();
  const { selectedFile, sourceCode, loadingFile, notify } = dm;
  const [analyzing, setAnalyzing] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [analysis, setAnalysis] = useState<JsonRecord | null>(null);
  const [repair, setRepair] = useState<JsonRecord | null>(null);

  useEffect(() => {
    setAnalysis(null);
    setRepair(null);
  }, [selectedFile?.path, dm.branch, dm.repo?.full_name]);

  const isPython = Boolean(selectedFile?.name.toLowerCase().endsWith(".py"));
  const lineCount = sourceCode ? sourceCode.split("\n").length : 0;
  const lineNumbers = useMemo(
    () => Array.from({ length: lineCount }, (_, i) => i + 1).join("\n"),
    [lineCount],
  );

  const analyze = async () => {
    if (!selectedFile || !sourceCode.trim() || analyzing || loadingFile) {
      return notify("Choose a file with readable source code before analyzing.", "info");
    }
    if (sourceCode.length > 20000) {
      return notify("This analysis endpoint accepts source files up to 20,000 characters. Select a smaller file.", "info");
    }
    if (!(await dm.requireConsent())) return;
    setAnalyzing(true);
    setAnalysis(null);
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
      const result = asRecord(nested.summary || payload.summary ? (payload.data ?? payload) : payload);
      setAnalysis(result);
      const issues = Number(asRecord(result.summary).issues_found ?? 0);
      notify(`Analysis complete. ${issues} issue(s) reported.`, "success");
      onKind("analysis");
    } catch (error) {
      notify(`Code analysis failed. ${error instanceof Error ? error.message : "Please try again."}`, "error");
    } finally {
      setAnalyzing(false);
    }
  };

  const requestRepair = async () => {
    if (!selectedFile || !sourceCode.trim() || repairing) {
      return notify("Choose a file with readable source code before requesting a repair.", "info");
    }
    if (!isPython) {
      return notify("The current repair API supports Python files (.py) only. You can still ask the AI about other files.", "info");
    }
    if (!(await dm.requireConsent())) return;
    setRepairing(true);
    setRepair(null);
    try {
      const payload = asRecord(
        await request<unknown>("/api/ai/repair", {
          method: "POST",
          body: JSON.stringify({
            language: "python",
            source_code: sourceCode,
            filename: selectedFile.name,
            rule: "manual-review",
          }),
        }),
      );
      setRepair(
        asRecord(payload.data).repair
          ? (asRecord(payload.data).repair as JsonRecord)
          : asRecord(payload.repair ?? payload.data ?? payload),
      );
      onKind("repair");
    } catch (error) {
      notify(`Repair request failed. ${error instanceof Error ? error.message : ""}`, "error");
    } finally {
      setRepairing(false);
    }
  };

  const repairText = useMemo(() => {
    if (!repair) return "";
    for (const key of [
      "proposed_code", "proposedCode", "fixed_code", "fixedCode", "code",
      "content", "suggestion", "explanation", "message",
    ]) {
      if (typeof repair[key] === "string") return repair[key] as string;
    }
    return JSON.stringify(repair, null, 2);
  }, [repair]);

  const summary = asRecord(analysis?.summary);
  const findings: unknown[] = Array.isArray(analysis?.findings) ? (analysis!.findings as unknown[]) : [];
  const limitations: string[] = Array.isArray(analysis?.limitations)
    ? (analysis!.limitations as unknown[]).map(String)
    : [];

  const footer = (
    <div className="dm-two">
      <button className="dm-btn o dm-press" onClick={() => onKind("code")}>Back to code</button>
      <button className="dm-btn w dm-press" onClick={onClose}>Done</button>
    </div>
  );

  return (
    <BottomSheet open={open} onClose={onClose} tall={kind === "code" || kind === "files"}>
      {kind === "files" && (
        <div className="dm-sheet-code dm-sheet-files">
          <FilesPanel onOpen={() => onKind("code")} />
        </div>
      )}

      {kind === "code" && (
        <div className="dm-sheet-code">
          <div className="dm-ph dm-ph-code">
            <div className="dm-file-tx">
              <h2>{selectedFile?.name || "Source"}</h2>
              <p>{selectedFile?.path || "Select a file to read it here."}</p>
            </div>
            <button
              className="dm-ib sm dm-press"
              aria-label="Copy source"
              disabled={!sourceCode}
              onClick={() => dm.copy(sourceCode, "Source")}
            >
              <Copy size={16} />
            </button>
          </div>
          <div className="dm-actions">
            <button className="dm-pill dm-press" disabled={!selectedFile} onClick={onAsk} aria-label="Ask AI about this file">
              <MessageSquareText size={15} /> Ask AI
            </button>
            <button
              className="dm-pill dm-press"
              disabled={!sourceCode || analyzing || loadingFile || repairing}
              onClick={() => void analyze()}
              title="Run static analysis for the selected source file"
            >
              {analyzing ? <Spin size={15} /> : <ShieldCheck size={15} />} {analyzing ? "Analyzing" : "Analyze"}
            </button>
            <button
              className="dm-pill g dm-press"
              disabled={!sourceCode || repairing || loadingFile || analyzing || !isPython}
              onClick={() => void requestRepair()}
              title={
                selectedFile && !isPython
                  ? "Fix suggestions are currently available for Python files only"
                  : "Ask DevMind to suggest a fix for review; your repository will not be changed automatically"
              }
            >
              {repairing ? <Spin size={15} /> : <Sparkles size={15} />} {repairing ? "Reviewing" : "Repair"}
            </button>
            {analysis && <button className="dm-pill dm-press" onClick={() => onKind("analysis")}>Analysis</button>}
            {repair && <button className="dm-pill dm-press" onClick={() => onKind("repair")}>Proposal</button>}
          </div>
          <p className="dm-action-help">
            {!selectedFile
              ? "Choose a file first. Then ask a question or run a code check."
              : !sourceCode
                ? "The file is selected, but its source is not ready yet."
                : isPython
                  ? "Ask AI explains the code · Analyze looks for issues · Repair prepares a proposal to review."
                  : "Ask AI explains the code · Analyze looks for issues. Repair currently supports Python files only."}
          </p>
          <div className="dm-meta">
            <span>
              <span className={`dm-dot ${selectedFile ? "on" : ""}`} />{" "}
              {loadingFile ? "Reading file" : selectedFile ? "Read-only" : "No file selected"}
            </span>
            <span>{selectedFile ? `${lineCount} lines${isPython ? "" : " · Repair: Python only"}` : ""}</span>
          </div>
          <div className="dm-code-scroll">
            {loadingFile ? (
              <div className="dm-state"><Spin size={18} /> Fetching file contents…</div>
            ) : selectedFile ? (
              sourceCode ? (
                <div className="dm-source">
                  <pre className="dm-ln" aria-hidden="true">{lineNumbers}</pre>
                  <pre className="dm-src"><code>{sourceCode}</code></pre>
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
                <span className="dm-empty-ic"><Code2 size={24} /></span>
                <strong>Select a file to get started</strong>
                <span>Choose a source file in Files to read it, ask DevMind to explain it, check for issues, or request a fix suggestion.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {kind === "analysis" && analysis && (
        <div className="dm-sheet-body">
          <div className="dm-sec-head">
            <h2 className="dm-sheet-h"><ShieldCheck size={18} /> Static analysis</h2>
            <span className="dm-lang">{asString(analysis.language, "auto")}</span>
          </div>
          <p className="dm-sheet-note">
            {asString(analysis.analysis_level, "Analysis complete")}. Review findings before making
            changes; DevMind has not modified your repository.
          </p>
          <div className="dm-stats">
            {([
              ["Issues", summary.issues_found],
              ["Errors", summary.errors],
              ["Warnings", summary.warnings],
              ["Security", summary.security_issues],
            ] as const).map(([label, v]) => (
              <span key={label}><strong>{String(v ?? 0)}</strong><small>{label}</small></span>
            ))}
          </div>
          <div className="dm-sheet-scroll">
            {findings.length ? (
              findings.map((f, i) => <Finding key={i} f={f} />)
            ) : (
              <div className="dm-state dm-analysis-empty">
                <ShieldCheck size={22} />
                <strong>No findings reported</strong>
                <span>
                  The configured analyzers did not flag an issue in this scan. This does not guarantee
                  the file is bug-free or secure; consider tests and a manual review too.
                </span>
              </div>
            )}
            {limitations.length > 0 && <p className="dm-sheet-note">Limitations: {limitations.join("; ")}</p>}
          </div>
          {footer}
        </div>
      )}

      {kind === "repair" && (
        <div className="dm-sheet-body">
          <div className="dm-sec-head">
            <h2 className="dm-sheet-h"><Sparkles size={18} /> Repair proposal</h2>
            <button className="dm-ib sm dm-press" aria-label="Copy proposal" onClick={() => dm.copy(repairText, "Proposal")}>
              <Copy size={16} />
            </button>
          </div>
          <p className="dm-sheet-note">
            This is a suggested change, not an automatic edit. Review the proposal, compare it with
            the original file, and run tests before applying anything. DevMind has not modified your
            GitHub repository.
          </p>
          <div className="dm-proposal-context" role="status">
            <div className="dm-proposal-context-icon"><ShieldCheck size={16} /></div>
            <div>
              <strong>Review before applying</strong>
              <p>Check that the change solves the issue, preserves existing behavior, and has no unrelated edits.</p>
            </div>
          </div>
          <div className="dm-sheet-scroll"><pre className="dm-repair">{repairText}</pre></div>
          <details className="dm-original-code">
            <summary>View original code{selectedFile?.name ? ` · ${selectedFile.name}` : ""}</summary>
            {sourceCode.trim() ? (
              <pre className="dm-repair dm-original-pre">{sourceCode}</pre>
            ) : (
              <p className="dm-sheet-note">Original source is not available in this view.</p>
            )}
          </details>
          {footer}
        </div>
      )}
    </BottomSheet>
  );
}