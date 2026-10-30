import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type PanInfo,
} from "motion/react";
import {
  ChevronRight,
  Globe,
  LoaderCircle,
  LogOut,
  Palette,
  Settings,
  ShieldAlert,
  Sparkles,
  User,
  Users,
  X,
} from "lucide-react";
import { FaGithub } from "react-icons/fa";
import UserAvatar from "@/shared/components/UserAvatar";
import { useUser } from "@/features/auth/context/UserContext";
import "../profile.css";

type Props = {
  open: boolean;
  onClose: () => void;
  github?: { connected: boolean; username?: string };
};

/** Where a flick would come to rest (decel 0.99). */
const project = (velocity: number, decel = 0.99) =>
  (velocity / 1000) * (decel / (1 - decel));

type RowProps = {
  icon: ReactNode;
  title: string;
  hint?: string;
  trailing?: ReactNode;
  danger?: boolean;
  busy?: boolean;
  onClick: () => void;
};

function Row({ icon, title, hint, trailing, danger, busy, onClick }: RowProps) {
  return (
    <button
      type="button"
      className={`pf-item pf-press ${danger ? "danger" : ""}`}
      onClick={onClick}
      disabled={busy}
    >
      <span className="pf-item-ic">
        {busy ? <LoaderCircle size={17} className="pf-spin" /> : icon}
      </span>
      <span className="pf-item-tx">
        {title}
        {hint && <small>{hint}</small>}
      </span>
      {trailing ?? <ChevronRight size={16} className="chev" />}
    </button>
  );
}

export default function AccountDrawer({ open, onClose, github }: Props) {
  const { user, signOut } = useUser();
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const [busy, setBusy] = useState<"logout" | "switch" | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!user) return null;

  const handle = user.username ?? user.email.split("@")[0];

  const go = (to: string) => {
    onClose();
    navigate(to);
  };

  async function leave(kind: "logout" | "switch") {
    setBusy(kind);
    try {
      await signOut();
      onClose();
      navigate(kind === "switch" ? "/login?switch=1" : "/login", {
        replace: true,
      });
    } finally {
      setBusy(null);
    }
  }

  function onDragEnd(_: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) {
    const width = Math.min(window.innerWidth * 0.92, 400);
    if (info.offset.x + project(info.velocity.x) > width * 0.4) onClose();
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="pf-root pf-drawer-wrap">
          <motion.div
            className="pf-drawer-scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={onClose}
          />
          <motion.aside
            className="pf-drawer pf-glass"
            role="dialog"
            aria-modal="true"
            aria-label="Account"
            initial={reduce ? { opacity: 0 } : { x: "100%" }}
            animate={{ x: 0, opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { x: "100%" }}
            transition={{ type: "spring", duration: 0.42, bounce: 0 }}
            drag={reduce ? false : "x"}
            dragDirectionLock
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={{ left: 0.06, right: 0.9 }}
            dragMomentum={false}
            onDragEnd={onDragEnd}
          >
            <div className="pf-drawer-head">
              <h2>Account</h2>
              <button
                type="button"
                className="pf-icon-btn pf-press"
                aria-label="Close account panel"
                onClick={onClose}
                style={{ width: 38, height: 38 }}
              >
                <X size={17} />
              </button>
            </div>

            <div className="pf-drawer-scroll">
              <button
                type="button"
                className="pf-idcard pf-press"
                onClick={() => go("/profile")}
                aria-label="Open your profile"
              >
                <UserAvatar
                  avatar={user.avatar}
                  fallbackSeed={handle}
                  size={64}
                />
                <span className="pf-idcard-tx">
                  <strong className="pf-trunc">@{handle}</strong>
                  <span className="pf-trunc">{user.email}</span>
                  {user.selectedPlan && (
                    <span className="pf-chip">
                      <Sparkles size={12} /> {user.selectedPlan} plan
                    </span>
                  )}
                </span>
                <ChevronRight size={18} style={{ color: "var(--m2)" }} />
              </button>

              <div className="pf-group">
                <Row
                  icon={<User size={17} />}
                  title="Your profile"
                  hint="Username, display name"
                  onClick={() => go("/profile")}
                />
                <Row
                  icon={<Palette size={17} />}
                  title="Change avatar"
                  onClick={() => go("/profile#avatar")}
                />
                <Row
                  icon={<Settings size={17} />}
                  title="Plan & settings"
                  hint={
                    user.selectedPlan ? `${user.selectedPlan} plan` : undefined
                  }
                  onClick={() => go("/profile#plan")}
                />
                <Row
                  icon={<FaGithub size={16} />}
                  title="Connected accounts"
                  hint={
                    github?.connected
                      ? `GitHub · ${github.username || "connected"}`
                      : "GitHub not connected"
                  }
                  trailing={
                    <>
                      <span
                        className={`pf-dot ${github?.connected ? "on" : ""}`}
                      />
                      <ChevronRight size={16} className="chev" />
                    </>
                  }
                  onClick={() => go("/profile#connections")}
                />
              </div>

              <div className="pf-group">
                <Row
                  icon={<Users size={17} />}
                  title="Switch account"
                  hint="Sign in with a different email"
                  busy={busy === "switch"}
                  onClick={() => void leave("switch")}
                />
                <Row
                  icon={<Globe size={17} />}
                  title="DevMind website"
                  onClick={() => go("/")}
                />
                <Row
                  icon={<ShieldAlert size={17} />}
                  title="Danger zone"
                  hint="Delete your account"
                  onClick={() => go("/profile#danger")}
                />
              </div>

              <div className="pf-group">
                <Row
                  icon={<LogOut size={17} />}
                  title="Log out"
                  danger
                  busy={busy === "logout"}
                  trailing={<span />}
                  onClick={() => void leave("logout")}
                />
              </div>
            </div>

            <p className="pf-drawer-foot">Signed in as {user.email}</p>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
