import type { ReactNode } from "react";
import { LoaderCircle, Search, Sparkles } from "lucide-react";
import { asRecord, asString } from "./api";

export function Spin({ size = 16 }: { size?: number }) {
  return <LoaderCircle size={size} className="dm-spin" />;
}
export function Orb({ size = 30 }: { size?: number }) {
  return (
    <span className="dm-orb" style={{ width: size, height: size }}>
      <Sparkles size={Math.round(size * 0.52)} strokeWidth={2.2} />
    </span>
  );
}
export function SearchField({
  value, onChange, placeholder, disabled = false, autoFocus = false,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  disabled?: boolean;
  autoFocus?: boolean;
}) {
  return (
    <label className={`dm-search ${disabled ? "off" : ""}`}>
      <Search size={16} />
      <input
        value={value}
        disabled={disabled}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        enterKeyHint="search"
        autoCapitalize="none"
        autoCorrect="off"
      />
    </label>
  );
}
export function timeAgo(input?: string | number) {
  if (!input) return "";
  const t = typeof input === "number" ? input : Date.parse(input);
  if (!t) return "";
  let n = Math.max(1, (Date.now() - t) / 1000);
  const steps: [number, string][] = [[60, "s"], [60, "m"], [24, "h"], [30, "d"], [12, "mo"]];
  for (const [d, l] of steps) {
    if (n < d) return `${Math.floor(n)}${l} ago`;
    n /= d;
  }
  return `${Math.floor(n)}y ago`;
}

/* ------------------------------------------------------------------ */
/*  Markdown for AI answers. Output is React nodes, never raw HTML.    */
/* ------------------------------------------------------------------ */
function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g);
  return parts.map((part, index) => {
    const key = `${keyPrefix}-${index}`;
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4)
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2)
      return <code className="dm-inline-code" key={key}>{part.slice(1, -1)}</code>;
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2)
      return <em key={key}>{part.slice(1, -1)}</em>;
    return part;
  });
}

export function Rich({ text }: { text: string }): ReactNode {
  const lines = text.replace(/\r\n/g, "\n").trim().split("\n");
  if (!lines[0] && lines.length === 1) return null;
  const blocks: ReactNode[] = [];
  let i = 0;
  const bullet = /^\s*[-*+]\s+/, ordered = /^\s*\d+[.)]\s+/;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }

    const fence = line.match(/^\s*```\s*([\w.+-]*)\s*$/);
    if (fence) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !/^\s*```\s*$/.test(lines[i])) code.push(lines[i++]);
      if (i < lines.length) i++;
      blocks.push(
        <div className="dm-code-wrap" key={`b${blocks.length}`}>
          {fence[1] && <div className="dm-code-language">{fence[1]}</div>}
          <pre className="dm-codeblock"><code>{code.join("\n")}</code></pre>
        </div>,
      );
      continue;
    }
    const heading = line.match(/^\s*(#{1,3})\s+(.+)$/);
    if (heading) {
      const Tag = heading[1].length === 1 ? "h3" : heading[1].length === 2 ? "h4" : "h5";
      blocks.push(
        <Tag className="dm-response-heading" key={`b${blocks.length}`}>
          {renderInline(heading[2], `h-${i}`)}
        </Tag>,
      );
      i++;
      continue;
    }
    if (/^\s*>\s?/.test(line)) {
      const q: string[] = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) q.push(lines[i++].replace(/^\s*>\s?/, ""));
      blocks.push(
        <blockquote className="dm-response-quote" key={`b${blocks.length}`}>
          {q.map((t, n) => <p key={n}>{renderInline(t, `q-${i}-${n}`)}</p>)}
        </blockquote>,
      );
      continue;
    }
    if (bullet.test(line) || ordered.test(line)) {
      const isOl = ordered.test(line);
      const re = isOl ? ordered : bullet;
      const items: string[] = [];
      while (i < lines.length && re.test(lines[i])) items.push(lines[i++].replace(re, ""));
      const List = isOl ? "ol" : "ul";
      blocks.push(
        <List className="dm-response-list" key={`b${blocks.length}`}>
          {items.map((t, n) => <li key={n}>{renderInline(t, `l-${i}-${n}`)}</li>)}
        </List>,
      );
      continue;
    }
    const para: string[] = [line.trim()];
    i++;
    while (
      i < lines.length && lines[i].trim() && !/^\s*```/.test(lines[i]) &&
      !/^\s*#{1,3}\s+/.test(lines[i]) && !/^\s*>/.test(lines[i]) &&
      !bullet.test(lines[i]) && !ordered.test(lines[i])
    ) para.push(lines[i++].trim());
    blocks.push(
      <p className="dm-response-paragraph" key={`b${blocks.length}`}>
        {para.map((part, n) => (
          <span key={n}>{n > 0 ? " " : ""}{renderInline(part, `p-${i}-${n}`)}</span>
        ))}
      </p>,
    );
  }
  return <div className="dm-response-content">{blocks}</div>;
}

export function Finding({ f }: { f: unknown }) {
  const r = asRecord(f);
  const sev = asString(r.severity, asString(r.level, asString(r.type)));
  const sevClass = sev.toLowerCase().replace(/[^a-z0-9_-]/g, "");
  const msg = asString(r.message, asString(r.description, asString(r.title)));
  const line = r.line != null ? `Line ${String(r.line)}` : "";
  const location = asString(r.file, asString(r.path, asString(r.filename)));
  const rule = asString(r.rule, asString(r.rule_id, asString(r.id)));
  const impact = asString(r.impact, asString(r.why_it_matters, asString(r.explanation)));
  const fix = asString(
    r.recommendation,
    asString(r.suggested_fix, asString(r.remediation, asString(r.fix))),
  );
  if (!msg) return <pre className="dm-repair">{JSON.stringify(f, null, 2)}</pre>;
  return (
    <article className="dm-finding">
      <div className="dm-find-top">
        {sev && <span className={`dm-sev ${sevClass}`}>{sev}</span>}
        {location && <span className="dm-find-location">{location}</span>}
        {line && <span>{line}</span>}
        {rule && <span className="dm-find-rule">{rule}</span>}
      </div>
      <p className="dm-finding-title">{msg}</p>
      {impact && (
        <div className="dm-finding-detail"><strong>Why it matters</strong><p>{impact}</p></div>
      )}
      {fix && (
        <div className="dm-finding-detail"><strong>Suggested next step</strong><p>{fix}</p></div>
      )}
      <p className="dm-finding-hint">
        Review the cited code before changing it. A finding is a signal to
        investigate, not proof that the code is exploitable or incorrect.
      </p>
    </article>
  );
}