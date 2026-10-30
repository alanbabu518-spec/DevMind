/* Springs (response + damping ratio) and axis-locked drag with momentum.
   All motion writes straight to element.style.transform (no React state per frame)
   so it never re-renders, and only touches transform/opacity. */

export type DragOpts = {
  els: HTMLElement[];
  axis: "x" | "y";
  get: () => number;
  set: (v: number) => void;
  min: number;
  max: number;
  start?: () => boolean;
  onTap?: (el: HTMLElement) => void;
  onEnd: (v: number) => void;
};

const raf: Record<string, number> = {};
export const reduced = () =>
  matchMedia("(prefers-reduced-motion: reduce)").matches;

export function spring(
  key: string,
  from: number,
  to: number,
  v0: number,
  set: (v: number) => void,
  r = 0.36,
  z = 1,
) {
  cancelAnimationFrame(raf[key]);
  if (reduced()) return set(to);
  let x = from,
    v = v0,
    t0 = performance.now();
  const w = (2 * Math.PI) / r,
    k = w * w,
    c = 2 * z * w;
  const step = (t: number) => {
    const dt = Math.min((t - t0) / 1000, 0.032);
    t0 = t;
    const n = Math.max(1, Math.ceil(dt / 0.004)),
      h = dt / n;
    for (let i = 0; i < n; i++) {
      v += (-k * (x - to) - c * v) * h;
      x += v * h;
    }
    if (Math.abs(x - to) < 0.2 && Math.abs(v) < 2) return set(to);
    set(x);
    raf[key] = requestAnimationFrame(step);
  };
  raf[key] = requestAnimationFrame(step);
}

/* 10px hysteresis, 1:1 tracking, rubber-band at the edges, velocity on release */
export function attachDrag({
  els, axis, get, set, min, max, start, onTap, onEnd,
}: DragOpts) {
  type S = { x0: number; y0: number; base: number; on: boolean; el: HTMLElement };
  let g: S | null = null;
  let h: [number, number][] = [];
  const X = axis === "x";
  const down = (ev: Event) => {
    const e = ev as PointerEvent;
    if (start && !start()) return;
    cancelAnimationFrame(raf[axis]);
    g = { x0: e.clientX, y0: e.clientY, base: get(), on: false, el: e.currentTarget as HTMLElement };
    h = [[X ? e.clientX : e.clientY, e.timeStamp]];
  };
  const move = (e: PointerEvent) => {
    if (!g) return;
    const dx = e.clientX - g.x0,
      dy = e.clientY - g.y0,
      d = X ? dx : dy,
      o = X ? dy : dx;
    if (!g.on) {
      if (Math.abs(d) > 10 && Math.abs(d) > Math.abs(o)) {
        g.on = true;
        try { g.el.setPointerCapture(e.pointerId); } catch { /* ignore */ }
      } else if (Math.abs(o) > 10) {
        g = null;
        return;
      } else return;
    }
    h.push([X ? e.clientX : e.clientY, e.timeStamp]);
    if (h.length > 6) h.shift();
    let n = g.base + d;
    if (n < min) n = min - (min - n) * 0.15;
    if (n > max) n = max + (n - max) * 0.15;
    set(n);
  };
  const up = () => {
    if (!g) return;
    const { on, el } = g;
    g = null;
    if (!on) { onTap?.(el); return; }
    const a = h[0], b = h[h.length - 1];
    onEnd(b[1] > a[1] ? ((b[0] - a[0]) / (b[1] - a[1])) * 1000 : 0);
  };
  const cancel = () => { g = null; };
  els.forEach((el) => el.addEventListener("pointerdown", down));
  addEventListener("pointermove", move);
  addEventListener("pointerup", up);
  addEventListener("pointercancel", cancel);
  return () => {
    els.forEach((el) => el.removeEventListener("pointerdown", down));
    removeEventListener("pointermove", move);
    removeEventListener("pointerup", up);
    removeEventListener("pointercancel", cancel);
  };
}