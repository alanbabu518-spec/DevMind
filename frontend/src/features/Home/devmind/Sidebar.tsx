import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, Lock, Search, SquarePen, Trash2, Unplug, X } from "lucide-react";
import { FaGithub } from "react-icons/fa";
import { useDevMind } from "./store";
import { Orb, SearchField, Spin } from "./ui";

export function Sidebar() {
  const dm = useDevMind();
  const nav = useNavigate();
  const { pathname } = useLocation();
  const [q, setQ] = useState("");
  const [searching, setSearching] = useState(false);
  const [menu, setMenu] = useState(false);
  const needle = q.trim().toLowerCase();

  const recents = useMemo(
    () =>
      [...dm.chats]
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .filter((c) => !needle || `${c.title} ${c.repo}`.toLowerCase().includes(needle))
        .slice(0, 30),
    [dm.chats, needle],
  );
  const repoOptions = useMemo(
    () => dm.repos.filter((r) => !needle || r.full_name.toLowerCase().includes(needle)),
    [dm.repos, needle],
  );

  const go = (to: string) => {
    nav(to);
    dm.drawer.current.close();
  };
  const pick = (r: (typeof dm.repos)[number]) => {
    setMenu(false);
    if (dm.repo?.full_name === r.full_name) return go("/new");
    void dm.chooseRepo(r);
    go("/new");
  };
  const toggleSearch = () => {
    setSearching((s) => !s);
    setQ("");
  };

  return (
    <>
      <div className="dm-brand-row">
        <button className="dm-brand dm-press" onClick={() => go("/home")} aria-label="DevMind home">
          <Orb size={30} /> DevMind
        </button>
        <button
          className="dm-ib sm dm-press"
          aria-label={searching ? "Close search" : "Search"}
          onClick={toggleSearch}
        >
          {searching ? <X size={17} /> : <Search size={17} />}
        </button>
      </div>

      {searching && (
        <SearchField value={q} onChange={setQ} placeholder="Search chats and repositories" autoFocus />
      )}

      {dm.status.connected && (
        <div className="dm-repo-sel">
          <button
            className="dm-repo-trigger dm-press"
            aria-expanded={menu}
            onClick={() => setMenu((m) => !m)}
          >
            <FaGithub size={16} />
            <span className="dm-truncate">{dm.repo ? dm.repo.full_name : "Repository"}</span>
            <ChevronDown size={16} className={`dm-chev2 ${menu ? "open" : ""}`} />
          </button>
          {menu && (
            <div className="dm-repo-menu" role="listbox">
              {dm.loadingRepos ? (
                <div className="dm-state"><Spin /> Loading…</div>
              ) : repoOptions.length === 0 ? (
                <div className="dm-state">No repositories found.</div>
              ) : (
                repoOptions.map((r) => {
                  const on = dm.repo?.full_name === r.full_name;
                  return (
                    <button
                      key={String(r.id)}
                      role="option"
                      aria-selected={on}
                      className={`dm-repo-opt dm-press ${on ? "on" : ""}`}
                      onClick={() => pick(r)}
                    >
                      <span className="dm-truncate">{r.name}</span>
                      {r.private && <Lock size={12} />}
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}

      <button className="dm-nav-btn dm-press" onClick={() => go("/new")}>
        <SquarePen size={17} /> New chat
      </button>

      <div className="dm-side-scroll">
        <p className="dm-sec-label">Recents</p>
        {recents.length === 0 ? (
          <p className="dm-side-empty">
            {needle ? "Nothing matches your search." : "Your chats will show up here."}
          </p>
        ) : (
          <div className="dm-recents">
            {recents.map((c) => {
              const active = pathname.toLowerCase() === `/chat/${c.id}`;
              return (
                <div key={c.id} className={`dm-recent ${active ? "on" : ""}`}>
                  <button className="dm-recent-main dm-press" onClick={() => go(`/chat/${c.id}`)}>
                    <strong className="dm-truncate">{c.title || "Untitled chat"}</strong>
                    <small className="dm-truncate">{c.repo.split("/").pop() || c.repo}</small>
                  </button>
                  <button
                    className="dm-recent-del dm-press"
                    aria-label={`Delete chat ${c.title}`}
                    onClick={() => {
                      dm.removeChat(c.id);
                      if (active) go("/new");
                    }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="dm-conn">
        <div className="dm-conn-row">
          <span className={`dm-dot ${dm.status.connected ? "on" : ""}`} />
          <div>
            <strong>
              {dm.status.connected
                ? `GitHub${dm.status.username ? ` · ${dm.status.username}` : " connected"}`
                : "GitHub not connected"}
            </strong>
            <small>
              {dm.status.connected ? "Repository access is active" : "Connect to start analyzing code"}
            </small>
          </div>
        </div>
        {dm.status.connected ? (
          <button className="dm-btn o dm-press" onClick={() => void dm.disconnectGithub()}>
            <Unplug size={17} /> Disconnect
          </button>
        ) : (
          <button className="dm-btn g dm-press" onClick={dm.connectGithub}>
            <FaGithub size={18} /> Connect GitHub
          </button>
        )}
      </div>
    </>
  );
}