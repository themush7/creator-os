import { X } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { animateSpring, project, rubberband, type SpringHandle } from '@/lib/spring';
import { IconButton } from './IconButton';
import styles from './Sheet.module.css';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: ReactNode;
  /** Full-height sheet, for long text such as concept notes. */
  full?: boolean;
  children: ReactNode;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
/** Release faster than this (px/s, downward) always dismisses. */
const FLICK_VELOCITY = 700;
const HISTORY_MS = 80;

/**
 * Bottom sheet. role=dialog + aria-modal, focus trapped, Esc / scrim / drag to close,
 * focus returned to the trigger, background made inert.
 * Motion is a spring on the sheet's offset: it tracks the finger 1:1, inherits the release
 * velocity, projects flicks, rubber-bands upward, and can be grabbed mid-animation.
 */
export function Sheet({ open, onClose, title, subtitle, full, children }: Props) {
  const [mounted, setMounted] = useState(open);
  const sheetRef = useRef<HTMLDivElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const y = useRef(0);
  const spring = useRef<SpringHandle | null>(null);
  const drag = useRef<{ startY: number; base: number; samples: { y: number; t: number }[] } | null>(
    null,
  );
  /** Release velocity to carry into the close animation after a flick. */
  const closeVelocity = useRef(0);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const titleId = useId();
  const subId = useId();

  const hiddenOffset = useCallback(() => (sheetRef.current?.offsetHeight ?? 0) + 40, []);

  const paint = useCallback(
    (value: number) => {
      y.current = value;
      const sheet = sheetRef.current;
      if (sheet) sheet.style.transform = `translateY(${value}px)`;
      const scrim = scrimRef.current;
      if (scrim) {
        const h = Math.max(1, hiddenOffset());
        scrim.style.opacity = String(Math.min(1, Math.max(0, 1 - value / h)));
      }
    },
    [hiddenOffset],
  );

  const springTo = useCallback(
    (to: number, velocity = 0, done?: () => void) => {
      spring.current?.stop();
      spring.current = animateSpring({
        from: y.current,
        to,
        velocity,
        damping: velocity > FLICK_VELOCITY && to === 0 ? 0.85 : 1,
        response: 0.38,
        onUpdate: paint,
        onComplete: done,
      });
    },
    [paint],
  );

  // Open: mount, then spring up from below. Close: spring down from wherever it is, then unmount.
  useLayoutEffect(() => {
    if (open) {
      triggerRef.current = document.activeElement as HTMLElement | null;
      setMounted(true);
      return;
    }
    if (!mounted) return;
    const velocity = closeVelocity.current;
    closeVelocity.current = 0;
    springTo(hiddenOffset(), velocity, () => setMounted(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useLayoutEffect(() => {
    if (!mounted || !open) return;
    paint(hiddenOffset());
    springTo(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  useEffect(() => () => spring.current?.stop(), []);

  // Focus in, inert background, restore focus on close.
  useEffect(() => {
    if (!mounted || !open) return;
    const root = document.getElementById('root');
    root?.setAttribute('inert', '');
    root?.setAttribute('aria-hidden', 'true');
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const node = sheetRef.current;
    const first = node?.querySelector<HTMLElement>('[data-autofocus]') ?? node;
    first?.focus({ preventScroll: true });
    return () => {
      root?.removeAttribute('inert');
      root?.removeAttribute('aria-hidden');
      document.body.style.overflow = prevOverflow;
      const trigger = triggerRef.current;
      if (trigger && document.contains(trigger)) trigger.focus({ preventScroll: true });
    };
  }, [mounted, open]);

  function onKeyDown(e: ReactKeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onCloseRef.current();
      return;
    }
    if (e.key !== 'Tab' || !sheetRef.current) return;
    const items = Array.from(sheetRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (!items.length) {
      e.preventDefault();
      return;
    }
    const firstEl = items[0]!;
    const lastEl = items[items.length - 1]!;
    const active = document.activeElement;
    if (e.shiftKey && (active === firstEl || active === sheetRef.current)) {
      e.preventDefault();
      lastEl.focus();
    } else if (!e.shiftKey && active === lastEl) {
      e.preventDefault();
      firstEl.focus();
    }
  }

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (drag.current || (e.target as HTMLElement).closest('button')) return; // ignore extra fingers
    spring.current?.stop(); // grab mid-flight: continue from where it is on screen
    drag.current = {
      startY: e.clientY,
      base: y.current,
      samples: [{ y: e.clientY, t: e.timeStamp }],
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d) return;
    const raw = d.base + (e.clientY - d.startY);
    const h = hiddenOffset();
    paint(raw >= 0 ? raw : rubberband(raw, h));
    d.samples.push({ y: e.clientY, t: e.timeStamp });
    while (d.samples.length > 2 && e.timeStamp - d.samples[0]!.t > HISTORY_MS) d.samples.shift();
  }

  function onPointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    const first = d.samples[0]!;
    const dt = Math.max(1, e.timeStamp - first.t);
    const velocity = ((e.clientY - first.y) / dt) * 1000; // px/s
    const h = hiddenOffset();
    const projected = y.current + project(velocity);
    if (velocity > FLICK_VELOCITY || projected > h * 0.5) {
      // The close effect springs from here, carrying the finger's velocity.
      closeVelocity.current = Math.max(0, velocity);
      onCloseRef.current();
    } else {
      springTo(0, velocity);
    }
  }

  if (!mounted) return null;
  return createPortal(
    <>
      <div
        ref={scrimRef}
        className={styles.scrim}
        onClick={() => onCloseRef.current()}
        aria-hidden
      />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={subtitle ? subId : undefined}
        tabIndex={-1}
        className={`${styles.sheet} ${full ? styles.full : ''}`}
        onKeyDown={onKeyDown}
      >
        <div
          className={styles.head}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div className={styles.grabber} aria-hidden />
          <div className={styles.titleRow}>
            <IconButton
              icon={X}
              label="Close"
              tone="fill"
              iconSize={18}
              onClick={() => onCloseRef.current()}
            />
            <div className={styles.titles}>
              <h2 id={titleId} className={styles.title}>
                {title}
              </h2>
              {subtitle && (
                <p id={subId} className={`${styles.subtitle} ellipsis`}>
                  {subtitle}
                </p>
              )}
            </div>
            <span aria-hidden />
          </div>
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </>,
    document.body,
  );
}
