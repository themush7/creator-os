/**
 * Apple-style spring, parameterised by damping ratio and response (seconds) instead of
 * mass/stiffness/damping. Starts from the current value and the current velocity, so a
 * gesture hands off into the animation without a seam, and can be retargeted mid-flight.
 */
export interface SpringOptions {
  from: number;
  to: number;
  /** Units per second, e.g. the finger's release velocity in px/s. */
  velocity?: number;
  /** 1 = critically damped (no overshoot). Use ~0.8 only after a flick. */
  damping?: number;
  /** Seconds to (roughly) reach the target. Not a fixed duration. */
  response?: number;
  onUpdate: (value: number, velocity: number) => void;
  onComplete?: () => void;
}

export interface SpringHandle {
  stop: () => void;
}

const REST_DELTA = 0.5;
const REST_SPEED = 2;
const MAX_STEP = 1 / 30;

export function animateSpring({
  from,
  to,
  velocity = 0,
  damping = 1,
  response = 0.4,
  onUpdate,
  onComplete,
}: SpringOptions): SpringHandle {
  const stiffness = ((2 * Math.PI) / response) ** 2;
  const friction = (4 * Math.PI * damping) / response;
  let x = from;
  let v = velocity;
  let last = performance.now();
  let raf = 0;
  let stopped = false;

  if (prefersReducedMotion()) {
    onUpdate(to, 0);
    onComplete?.();
    return { stop: () => {} };
  }

  const step = (now: number) => {
    if (stopped) return;
    let dt = Math.min((now - last) / 1000, MAX_STEP * 4);
    last = now;
    // Fixed sub-steps keep the integration stable on slow frames.
    while (dt > 0) {
      const h = Math.min(dt, 1 / 240);
      const a = -stiffness * (x - to) - friction * v;
      v += a * h;
      x += v * h;
      dt -= h;
    }
    if (Math.abs(x - to) < REST_DELTA && Math.abs(v) < REST_SPEED) {
      onUpdate(to, 0);
      onComplete?.();
      return;
    }
    onUpdate(x, v);
    raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);

  return {
    stop: () => {
      stopped = true;
      cancelAnimationFrame(raf);
    },
  };
}

/** Where a flick would come to rest (Apple's projection, deceleration ≈ scroll). */
export function project(velocity: number, decelerationRate = 0.998): number {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

/** Resistance past a boundary: the further you pull, the less it follows. */
export function rubberband(overshoot: number, dimension: number, constant = 0.55): number {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );
}
