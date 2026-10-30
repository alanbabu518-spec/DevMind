import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Check, LoaderCircle, Sparkles, X } from "lucide-react";
import Modal from "./Modal";
import AvatarPicker from "./AvatarPicker";
import UserAvatar from "@/shared/components/UserAvatar";
import { useUser } from "@/features/auth/context/UserContext";
import { checkUsernameAvailable } from "@/features/auth/services/userApi";
import {
  avatarValue,
  randomSeeds,
  usernameFromEmail,
  validateUsername,
} from "@/shared/lib/identicon";
import "../profile.css";

type UsernameCheck = "idle" | "checking" | "ok" | "taken" | "invalid";

type Props = {
  open: boolean;
  onDone: () => void;
  onSkip: () => void;
};

export default function ProfileSetupDialog({ open, onDone, onSkip }: Props) {
  const { user, updateProfile } = useUser();

  const [username, setUsername] = useState(() =>
    usernameFromEmail(user?.email ?? ""),
  );
  const [seeds, setSeeds] = useState(() => randomSeeds(8));
  const [seed, setSeed] = useState(() => seeds[0]);
  const [check, setCheck] = useState<UsernameCheck>("idle");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // Until the person types, a taken default gets a number appended for them.
  const autoFix = useRef(true);

  useEffect(() => {
    if (!open) return;
    const problem = validateUsername(username);
    if (problem) {
      setCheck("invalid");
      setReason(problem);
      return;
    }
    setCheck("checking");
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const result = await checkUsernameAvailable(
          username,
          controller.signal,
        );
        if (result.available) {
          setCheck("ok");
          setReason("");
        } else if (autoFix.current) {
          setUsername(
            `${username.slice(0, 26)}${Math.floor(10 + Math.random() * 990)}`,
          );
        } else {
          setCheck("taken");
          setReason(result.reason ?? "That username is already taken.");
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setCheck("idle");
          setReason("");
        }
      }
    }, 350);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [username, open]);

  const canSave = useMemo(
    () => !saving && (check === "ok" || check === "idle"),
    [saving, check],
  );

  async function save() {
    if (!canSave) return;
    setSaving(true);
    setError("");
    try {
      await updateProfile({ username, avatar: avatarValue(seed) });
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save your profile.");
      setSaving(false);
    }
  }

  function shuffle() {
    const next = randomSeeds(8);
    setSeeds(next);
    setSeed(next[0]);
  }

  return (
    <Modal open={open} onClose={onSkip} labelledBy="pf-setup-title">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <div className="pf-row-between" style={{ alignItems: "flex-start" }}>
          <div>
            <h2 id="pf-setup-title">Complete your profile</h2>
            <p className="pf-lead">
              Pick a username and an avatar. You can change both later from your
              profile.
            </p>
          </div>
          <button
            type="button"
            className="pf-icon-btn pf-press"
            aria-label="Skip for now"
            onClick={onSkip}
            style={{ width: 38, height: 38 }}
          >
            <X size={17} />
          </button>
        </div>

        <div className="pf-stack">
          <div className="pf-preview">
            <UserAvatar
              avatar={avatarValue(seed)}
              fallbackSeed={seed}
              size={60}
            />
            <div style={{ minWidth: 0 }}>
              <strong className="pf-trunc">@{username || "username"}</strong>
              <small className="pf-trunc">{user?.email}</small>
            </div>
            <Sparkles
              size={18}
              style={{ marginLeft: "auto", color: "var(--g)" }}
            />
          </div>

          <div className="pf-field">
            <label className="pf-label" htmlFor="pf-setup-username">
              Username
            </label>
            <div
              className={`pf-input-wrap ${check === "taken" || check === "invalid" ? "bad" : ""}`}
            >
              <span className="pf-at">@</span>
              <input
                id="pf-setup-username"
                value={username}
                onChange={(e) => {
                  autoFix.current = false;
                  setUsername(
                    e.target.value.toLowerCase().replace(/\s+/g, "-"),
                  );
                }}
                inputMode="text"
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="off"
                spellCheck={false}
                maxLength={30}
                enterKeyHint="done"
                aria-invalid={check === "taken" || check === "invalid"}
                aria-describedby="pf-setup-username-status"
              />
            </div>
            <div
              id="pf-setup-username-status"
              className={`pf-status ${
                check === "ok"
                  ? "ok"
                  : check === "checking"
                    ? "wait"
                    : check === "idle"
                      ? ""
                      : "bad"
              }`}
              aria-live="polite"
            >
              {check === "checking" && (
                <>
                  <LoaderCircle size={14} className="pf-spin" /> Checking
                  availability…
                </>
              )}
              {check === "ok" && (
                <>
                  <Check size={14} /> @{username} is available
                </>
              )}
              {(check === "taken" || check === "invalid") && (
                <>
                  <AlertCircle size={14} /> {reason}
                </>
              )}
              {check === "idle" && (
                <span className="pf-hint">
                  3–30 characters: letters, numbers and single hyphens.
                </span>
              )}
            </div>
          </div>

          <div className="pf-field">
            <span className="pf-label">Avatar</span>
            <AvatarPicker
              seeds={seeds}
              value={seed}
              onChange={setSeed}
              onShuffle={shuffle}
            />
          </div>

          {error && (
            <div className="pf-err" role="alert">
              <AlertCircle size={16} /> <span>{error}</span>
            </div>
          )}
        </div>

        <div className="pf-modal-actions">
          <button
            type="button"
            className="pf-btn ghost pf-press"
            onClick={onSkip}
          >
            Maybe later
          </button>
          <button
            type="submit"
            className="pf-btn g pf-press"
            disabled={!canSave}
          >
            {saving ? (
              <LoaderCircle size={17} className="pf-spin" />
            ) : (
              <Check size={17} />
            )}
            Save and continue
          </button>
        </div>
      </form>
    </Modal>
  );
}
