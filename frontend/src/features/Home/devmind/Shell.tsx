import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { AlertCircle, Bell, Check, Info, Menu, Share2 } from "lucide-react";
import { useDevMind } from "./store";
import { Sidebar } from "./Sidebar";
import { attachDrag, spring } from "./motion";
import { timeAgo } from "./ui";

function BellButton() {
  const dm = useDevMind();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    addEventListener("pointerdown", h);
    return () => removeEventListener("pointerdown", h);
  }, [open]);

  const toggle = () => {
    if (!open) dm.markSeen();
    setOpen(!open);
  };

  return (
    <div className="dm-bell" ref={ref}>
      <button className="dm-ib dm-press" aria-label="Notifications" aria-expanded={open} onClick={toggle}>
        <Bell size={18} />
        {dm.unread > 0 && <i className="dm-badge" />}
      </button>
      {open && (
        <div className="dm-pop dm-glass" role="dialog" aria-label="Notifications">
          <div className="dm-pop-head">
            <strong>Notifications</strong>
            {dm.history.length > 0 && (
              <button className="dm-link dm-press" onClick={dm.clearHistory}>Clear</button>
            )}
          </div>
          {dm.history.length === 0 ? (
            <p className="dm-side-empty">You're all caught up.</p>
          ) : (
            <ul className="dm-pop-list">
              {dm.history.map((n) => (
                <li key={n.id}>
                  {n.type === "error" ? <AlertCircle size={16} className="err" /> : n.type === "success" ? <Check size={16} className="ok" /> : <Info size={16} />}
                  <span>{n.text}</span>
                  <small>{timeAgo(n.time)}</small>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export function Shell({
  title, subtitle, share = false, children,
}: {
  title: string;
  subtitle?: string;
  share?: boolean;
  children: ReactNode;
}) {
  const dm = useDevMind();
  const { pathname } = useLocation();
  const dR = useRef<HTMLElement>(null);
  const scrimR = useRef<HTMLDivElement>(null);
  const edgeR = useRef<HTMLDivElement>(null);

  /* drawer: 1:1 drag, momentum projection, spring snap. Writes transform/opacity directly. */
  useEffect(() => {
    const d = dR.current!, scrim = scrimR.current!, edge = edgeR.current!;
    const W = () => Math.min(innerWidth * 0.86, 320);
    const clamp = (n: number) => Math.max(0, Math.min(1, n));
    let dx = -W(), isOpen = false;

    const setD = (v: number) => {
      dx = v;
      d.style.transform = `translate3d(${v}px,0,0)`;
      const p = clamp(1 + v / W());
      scrim.style.opacity = String(p);
      scrim.style.pointerEvents = p > 0.01 ? "auto" : "none";
    };
    const drawer = (o: boolean, v = 0) => {
      isOpen = o;
      spring("x", dx, o ? 0 : -W(), v, setD, 0.34);
    };
    setD(-W());
    dm.drawer.current = { open: () => drawer(true), close: () => drawer(false) };

    const settle = (v: number) => drawer(dx + v * 0.499 > -W() / 2, v); // project momentum, then snap
    const c1 = attachDrag({
      els: [d, scrim], axis: "x", get: () => dx, set: setD, min: -W(), max: 0,
      start: () => isOpen,
      onTap: (el) => { if (el === scrim) drawer(false); },
      onEnd: settle,
    });
    const c2 = attachDrag({
      els: [edge], axis: "x", get: () => dx, set: setD, min: -W(), max: 0,
      start: () => !isOpen, onEnd: settle,
    });
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") drawer(false); };
    const resize = () => setD(isOpen ? 0 : -W());
    addEventListener("keydown", key);
    addEventListener("resize", resize);
    return () => {
      c1(); c2();
      removeEventListener("keydown", key);
      removeEventListener("resize", resize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { dm.drawer.current.close(); }, [pathname, dm.drawer]);

  const onShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: "DevMind chat", url });
        return;
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
      }
    }
    dm.copy(url, "Chat link");
  };

  const avatar = dm.status.avatar_url || dm.status.avatarUrl;
  const initial = (dm.status.username || "D").slice(0, 1).toUpperCase();

  return (
    <>
      <aside ref={dR} className="dm-drawer" aria-label="Menu">
        <Sidebar />
      </aside>
      <div ref={scrimR} className="dm-dscrim" />
      <div ref={edgeR} className="dm-edge" aria-hidden="true" />

      <div className="dm-shell">
        <header className="dm-top dm-glass">
          <button className="dm-ib dm-press dm-menu" aria-label="Open menu" onClick={() => dm.drawer.current.open()}>
            <Menu size={20} />
          </button>
          <div className="dm-title">
            <strong className="dm-truncate">{title}</strong>
            {subtitle && <span className="dm-truncate">{subtitle}</span>}
          </div>
          {share && (
            <button className="dm-pill dm-press dm-share" onClick={() => void onShare()} aria-label="Share chat link">
              <Share2 size={15} /> <span>Share</span>
            </button>
          )}
          <BellButton />
          <div className="dm-avatar" aria-hidden="true">
            {avatar ? <img src={avatar} alt="" /> : initial}
          </div>
        </header>
        <main className="dm-content">{children}</main>
      </div>
    </>
  );
}