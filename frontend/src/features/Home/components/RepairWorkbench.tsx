import { useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, LoaderCircle, Wrench } from "lucide-react";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:5001";

type Verification = {
  syntax_valid?: boolean;
  scanner_rechecked?: boolean;
  target_finding_resolved?: boolean;
  tests_run?: boolean;
  tests_passed?: boolean;
  sandbox_status?: string;
  sandbox_message?: string;
  applied?: boolean;
  verified?: boolean;
  approval_required?: boolean;
};
type RepairResult = {
  status?: string;
  filename?: string;
  rule?: string;
  patch?: string;
  proposed_code?: string;
  model?: string;
  message?: string;
  verification?: Verification;
  error?: string;
  detail?: string;
};
type Props = { sourceCode: string; filename?: string };
const RULES = [
  { value: "B307", label: "B307 · Risky eval() usage" },
  { value: "B105", label: "B105 · Possible hard-coded password" },
  { value: "B106", label: "B106 · Hard-coded password argument" },
];
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
function Evidence({ label, value }: { label: string; value?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] py-3 last:border-b-0">
      <span className="text-sm text-zinc-300">{label}</span>
      <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${value === true ? "text-[#a9d56a]" : value === false ? "text-amber-300" : "text-zinc-500"}`}>
        {value === true ? <CheckCircle2 size={14} /> : value === false ? <AlertTriangle size={14} /> : null}
        {value === true ? "Passed" : value === false ? "Not passed" : "Not reported"}
      </span>
    </div>
  );
}
export default function RepairWorkbench({ sourceCode, filename = "submitted.py" }: Props) {
  const [rule, setRule] = useState("B307");
  const [result, setResult] = useState<RepairResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const [showResponse, setShowResponse] = useState(false);

  const requestRepair = async () => {
    if (!sourceCode.trim()) { setError("Choose a text file or enter source code before requesting a repair."); return; }
    if (sourceCode.length > 20000) { setError("Source code must not exceed 20,000 characters."); return; }
    setBusy(true); setError(""); setResult(null); setShowDiff(false); setShowResponse(false);
    try {
      const response = await fetch(`${API_BASE_URL}/api/ai/repair`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: "python", source_code: sourceCode, filename, rule }),
      });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const body = isRecord(payload) ? payload : {};
        throw new Error(String(body.detail ?? body.error ?? body.message ?? `Repair request failed (${response.status})`));
      }
      if (!isRecord(payload)) throw new Error("The repair service returned an invalid response.");
      setResult(payload as RepairResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to reach the DevMind repair service.");
    } finally {
      setBusy(false);
    }
  };

  const verification = result?.verification;
  return (
    <section className="dm-repair mt-5 border-t border-white/10 pt-5">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center border border-[#76B900]/30 bg-[#76B900]/10 text-[#a9d56a]"><Wrench size={18} /></div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold">AI Repair Workbench</h3>
            <span className="border border-[#76B900]/25 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#a9d56a]">Review first</span>
          </div>
          <p className="mt-1 text-xs leading-5 text-zinc-500">Request a proposed security fix, then inspect the patch and verification evidence. Nothing is applied automatically.</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <label className="block min-w-0">
          <span className="mb-2 block text-xs font-medium text-zinc-400">Scanner rule</span>
          <select value={rule} onChange={(event) => setRule(event.target.value)} disabled={busy} className="dm-form-control w-full">
            {RULES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <div className="flex items-end">
          <button type="button" onClick={() => void requestRepair()} disabled={busy || !sourceCode.trim()} className="dm-primary-button w-full justify-center sm:w-auto">
            {busy ? <LoaderCircle size={16} className="animate-spin" /> : <Wrench size={16} />}
            {busy ? "Checking repair…" : "Propose repair"}
          </button>
        </div>
      </div>

      {error && <div role="alert" className="mt-4 flex items-start gap-2 border border-red-400/25 bg-red-400/[0.06] p-3 text-sm leading-5 text-red-200"><AlertTriangle size={16} className="mt-0.5 shrink-0" />{error}</div>}

      {result && (
        <div className="mt-5 space-y-4">
          <div className="border border-white/10 bg-white/[0.025] p-4">
            <div className="flex items-start gap-2">
              {verification?.verified === true ? <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-[#a9d56a]" /> : <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-300" />}
              <div className="min-w-0">
                <h4 className="text-sm font-semibold">{result.status || "Repair response received"}</h4>
                <p className="mt-1 text-sm leading-6 text-zinc-400">{result.message || verification?.sandbox_message || "Review the proposed repair and verification details below."}</p>
                {result.model && <p className="mt-2 text-xs text-zinc-600">Model: {result.model}</p>}
              </div>
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between"><h4 className="text-sm font-semibold">Verification evidence</h4><span className="text-[10px] uppercase tracking-wider text-zinc-600">From API response</span></div>
            <div className="grid grid-cols-1 gap-x-5 sm:grid-cols-2">
              <Evidence label="Syntax valid" value={verification?.syntax_valid} />
              <Evidence label="Scanner rerun" value={verification?.scanner_rechecked} />
              <Evidence label="Target finding resolved" value={verification?.target_finding_resolved} />
              <Evidence label="Tests executed" value={verification?.tests_run} />
              <Evidence label="Tests passed" value={verification?.tests_passed} />
              <Evidence label="Repair verified" value={verification?.verified} />
            </div>
            {verification?.sandbox_status && <p className="mt-2 text-xs text-zinc-500">Sandbox status: {verification.sandbox_status}</p>}
          </div>

          {result.proposed_code && (
            <div>
              <div className="mb-2 flex items-center justify-between"><h4 className="text-sm font-semibold">Proposed code</h4><span className="text-xs text-zinc-600">{result.proposed_code.split("\n").length} lines</span></div>
              <pre className="dm-code-output max-h-96 overflow-auto"><code>{result.proposed_code}</code></pre>
            </div>
          )}
          {result.patch && (
            <div className="border border-white/10">
              <button className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left text-sm font-medium hover:bg-white/[0.03]" onClick={() => setShowDiff((value) => !value)} aria-expanded={showDiff}>
                <span>Unified diff</span>{showDiff ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              </button>
              {showDiff && <pre className="dm-code-output max-h-96 overflow-auto border-t border-white/10"><code>{result.patch}</code></pre>}
            </div>
          )}

          <div className="flex items-start gap-2 border border-amber-300/20 bg-amber-300/[0.045] p-3">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-300" />
            <div><h4 className="text-sm font-semibold text-amber-200">Human review required</h4><p className="mt-1 text-xs leading-5 text-amber-100/70">DevMind has not applied this patch or pushed changes to GitHub. Review the diff and test results before using the proposed fix.</p></div>
          </div>

          <div className="border border-white/10">
            <button className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left text-xs font-medium text-zinc-400 hover:bg-white/[0.03]" onClick={() => setShowResponse((value) => !value)} aria-expanded={showResponse}>
              <span>Complete API response</span>{showResponse ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {showResponse && <pre className="dm-code-output max-h-96 overflow-auto border-t border-white/10"><code>{JSON.stringify(result, null, 2)}</code></pre>}
          </div>
        </div>
      )}
    </section>
  );
}
