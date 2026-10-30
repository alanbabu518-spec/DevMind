import { useState } from "react";
import { AlertCircle, LoaderCircle, Trash2, X } from "lucide-react";
import Modal from "./Modal";
import { deleteAccountRequest } from "@/features/auth/services/userApi";
import "../profile.css";

type Props = {
  open: boolean;
  expected: string;
  onClose: () => void;
  onDeleted: () => void;
};

const LOSSES = [
  "Your profile, username and avatar",
  "Your GitHub connection and its stored access token",
  "Your projects and saved conversations",
  "Your sign-in sessions — you will be signed out everywhere",
];

export default function DeleteAccountDialog({
  open,
  expected,
  onClose,
  onDeleted,
}: Props) {
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const matches = typed.trim().toLowerCase() === expected.toLowerCase();

  function close() {
    if (busy) return;
    setTyped("");
    setError("");
    onClose();
  }

  async function confirm() {
    if (!matches || busy) return;
    setBusy(true);
    setError("");
    try {
      await deleteAccountRequest(typed.trim());
      onDeleted();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to delete your account.",
      );
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={close} labelledBy="pf-delete-title">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void confirm();
        }}
      >
        <div className="pf-row-between" style={{ alignItems: "flex-start" }}>
          <div>
            <h2 id="pf-delete-title" style={{ color: "var(--red)" }}>
              Delete your account?
            </h2>
            <p className="pf-lead">
              This is permanent. There is no undo and we cannot recover it for
              you.
            </p>
          </div>
          <button
            type="button"
            className="pf-icon-btn pf-press"
            aria-label="Cancel"
            onClick={close}
            style={{ width: 38, height: 38 }}
          >
            <X size={17} />
          </button>
        </div>

        <ul className="pf-lose">
          {LOSSES.map((item) => (
            <li key={item}>
              <Trash2 size={15} /> {item}
            </li>
          ))}
        </ul>

        <div className="pf-stack">
          <div className="pf-field">
            <label className="pf-label" htmlFor="pf-delete-confirm">
              Type <b style={{ color: "var(--t)" }}>{expected}</b> to confirm
            </label>
            <div className="pf-input-wrap">
              <input
                id="pf-delete-confirm"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="off"
                spellCheck={false}
                enterKeyHint="done"
                placeholder={expected}
              />
            </div>
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
            className="pf-btn pf-press"
            onClick={close}
            disabled={busy}
          >
            Keep my account
          </button>
          <button
            type="submit"
            className="pf-btn red pf-press"
            disabled={!matches || busy}
          >
            {busy ? (
              <LoaderCircle size={17} className="pf-spin" />
            ) : (
              <Trash2 size={17} />
            )}
            Delete forever
          </button>
        </div>
      </form>
    </Modal>
  );
}
