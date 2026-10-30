import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowDownToLine, ArrowRight, FileCode2, Lock, MessageSquareText, ShieldCheck,
  SquarePen, Sparkles,
} from "lucide-react";
import { FaGithub } from "react-icons/fa";
import { Shell } from "../devmind/Shell";
import { useDevMind } from "../devmind/store";
import { Orb, SearchField, Spin, timeAgo } from "../devmind/ui";
import type { GithubRepo } from "../devmind/api";

const rise = (i: number) => ({ animationDelay: `${i * 80}ms` });

function Landing() {
  const dm = useDevMind();
  return (
    <div className="dm-scroll">
      <div className="dm-landing">
        <section className="dm-hero">
          <span className="dm-eyebrow dm-rise" style={rise(0)}>
            <Sparkles size={13} /> AI that reads your repo
          </span>
          <h1 className="dm-rise" style={rise(1)}>
            Understand <span className="dm-grad">your code.</span>
          </h1>
          <p className="dm-rise" style={rise(2)}>
            Connect GitHub, pick a repository, and ask questions in plain English. Check files for
            issues and review suggested fixes before anything changes.
          </p>

          {dm.loadingStatus ? (
            <div className="dm-state"><Spin /> Checking GitHub…</div>
          ) : (
            <>
              <div className="dm-cta dm-rise" style={rise(3)}>
                <button className="dm-btn g dm-press" onClick={dm.connectGithub}>
                  <FaGithub size={19} /> Connect GitHub <ArrowRight size={17} />
                </button>
                <button
                  className="dm-btn o dm-press"
                  onClick={() =>
                    dm.notify(
                      "ZIP import is not connected to a backend endpoint yet. Use GitHub for live repository browsing.",
                      "info",
                    )
                  }
                >
                  <ArrowDownToLine size={17} /> Import a project
                </button>
              </div>
              <div className="dm-trust dm-rise" style={rise(4)}>
                <ShieldCheck size={15} />
                <span>You choose what to inspect. Access is read-only, and repairs stay proposals until you review them.</span>
              </div>
            </>
          )}

          {/* decorative preview of the chat */}
          <div className="dm-preview dm-rise" style={rise(5)} aria-hidden="true">
            <div className="dm-pv-dots"><i /><i /><i /></div>
            <div className="dm-pv-q">How does login work in this project?</div>
            <div className="dm-pv-a">
              <Orb size={28} />
              <div>
                Login starts in <code className="dm-inline-code">src/auth/login.ts</code>, which
                validates the form and calls <code className="dm-inline-code">createSession()</code>.
                The token is stored in an HTTP-only cookie, so the client never reads it directly.
              </div>
            </div>
          </div>
        </section>

        <section className="dm-steps">
          {[
            [FaGithub, "Step 1", "Connect GitHub", "Sign in once. DevMind gets read-only access to the repositories you open."],
            [FileCode2, "Step 2", "Choose a repository", "Browse branches and files, or just start asking about the whole project."],
            [MessageSquareText, "Step 3", "Ask, check, review", "Get plain-English answers, run an analysis, and read a fix proposal before applying it."],
          ].map(([Icon, n, h, p], i) => {
            const I = Icon as typeof FaGithub;
            return (
              <div className="dm-step dm-rise" style={rise(6 + i)} key={String(h)}>
                <span className="dm-step-ic"><I size={20} /></span>
                <b>{String(n)}</b>
                <h3>{String(h)}</h3>
                <p>{String(p)}</p>
              </div>
            );
          })}
        </section>
      </div>
    </div>
  );
}

function Dashboard() {
  const dm = useDevMind();
  const nav = useNavigate();
  const [q, setQ] = useState("");

  const list = useMemo(
    () =>
      dm.repos.filter((r) =>
        `${r.full_name} ${r.description ?? ""} ${r.language ?? ""}`.toLowerCase().includes(q.toLowerCase()),
      ),
    [dm.repos, q],
  );
  const recent = useMemo(
    () => [...dm.chats].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 4),
    [dm.chats],
  );

  const open = (r: GithubRepo) => {
    if (dm.repo?.full_name !== r.full_name) void dm.chooseRepo(r);
    nav("/new");
  };

  return (
    <div className="dm-scroll">
      <div className="dm-dash">
        <div className="dm-dash-head dm-rise">
          <h1>Welcome back{dm.status.username ? `, ${dm.status.username}` : ""}.</h1>
          <p>Pick a repository and ask anything about your code. Your chats are saved on this device.</p>
          <div className="dm-dash-cta">
            <button className="dm-btn g dm-press" onClick={() => nav("/new")}>
              <SquarePen size={17} />
              {dm.repo ? `New chat in ${dm.repo.name}` : "Start a new chat"}
            </button>
          </div>
        </div>

        {recent.length > 0 && (
          <section className="dm-rise" style={rise(1)}>
            <h2>Recent chats</h2>
            <div className="dm-rlist">
              {recent.map((c) => (
                <Link key={c.id} to={`/chat/${c.id}`} className="dm-chat-row dm-press">
                  <strong className="dm-truncate">{c.title || "Untitled chat"}</strong>
                  <small>{c.repo} · {timeAgo(c.updatedAt)}</small>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="dm-rise" style={rise(2)}>
          <div className="dm-rcard-row">
            <h2>Repositories</h2>
            <SearchField value={q} onChange={setQ} placeholder="Find repository" />
          </div>
          {dm.loadingRepos ? (
            <div className="dm-state"><Spin /> Loading repositories…</div>
          ) : list.length === 0 ? (
            <div className="dm-state">
              {dm.repos.length ? "No repositories match your search." : "No repositories found."}
            </div>
          ) : (
            <div className="dm-grid">
              {list.map((r) => {
                const on = dm.repo?.full_name === r.full_name;
                return (
                  <button key={String(r.id)} className={`dm-rcard dm-press ${on ? "on" : ""}`} onClick={() => open(r)}>
                    <div className="dm-rcard-top">
                      <span className="dm-repo-ic"><FaGithub size={18} /></span>
                      <div>
                        <strong className="dm-truncate">{r.name}</strong>
                        <small className="dm-truncate">{r.private && <Lock size={11} />}{r.full_name}</small>
                      </div>
                    </div>
                    {r.description && <p>{r.description}</p>}
                    <div className="dm-rcard-foot">
                      <span>
                        {r.language && <span className="dm-lang-chip">{r.language}</span>}{" "}
                        {timeAgo(r.updated_at)}
                      </span>
                      <span className="dm-go">{on ? "Continue" : "Open"} <ArrowRight size={14} /></span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default function Home() {
  const dm = useDevMind();
  return (
    <Shell title={dm.status.connected ? "Home" : "DevMind"}>
      {dm.status.connected ? <Dashboard /> : <Landing />}
    </Shell>
  );
}