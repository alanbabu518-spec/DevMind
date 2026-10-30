import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import "../profile.css";

type Props = {
  open: boolean;
  onClose?: () => void;
  labelledBy: string;
  children: ReactNode;
};

/** Bottom sheet on phones, centred dialog on larger screens. */
export default function Modal({ open, onClose, labelledBy, children }: Props) {
  const reduce = useReducedMotion();
  const cardRef = useRef<HTMLDivElement>(null);
  const isDesktop =
    typeof window !== "undefined" &&
    window.matchMedia("(min-width: 640px)").matches;

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && onClose) onClose();
    };
    addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    cardRef.current?.focus({ preventScroll: true });
    return () => {
      removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.({ preventScroll: true });
    };
  }, [open, onClose]);

  const spring = { type: "spring", duration: 0.45, bounce: 0 } as const;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="pf-root pf-modal">
          <motion.div
            className="pf-modal-scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            ref={cardRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelledBy}
            className="pf-modal-card pf-glass"
            initial={
              reduce
                ? { opacity: 0 }
                : isDesktop
                  ? { opacity: 0, scale: 0.96, y: 12 }
                  : { y: "100%" }
            }
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={
              reduce
                ? { opacity: 0 }
                : isDesktop
                  ? { opacity: 0, scale: 0.97, y: 8 }
                  : { y: "100%" }
            }
            transition={spring}
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
