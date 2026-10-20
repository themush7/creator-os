import { X } from 'lucide-react';
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
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
const SHEET_MS = 420;
const DISMISS_PX = 96;

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Bottom sheet: role=dialog + aria-modal, focus trapped, Esc / scrim / swipe-down to close,
 * focus returned to the trigger. The rest of the app is made inert while it is open.
 */
export function Sheet({ open, onClose, title, subtitle, full, children }: Props) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);
  const [drag, setDrag] = useState(0);
  const sheetRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const dragStart = useRef<{ y: number; t: number } | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const titleId = useId();
  const subId = useId();

  // Mount → animate in; animate out → unmount.
  useLayoutEffect(() => {
    if (open) {
      triggerRef.current = document.activeElement as HTMLElement | null;
      setMounted(true);
      const raf = requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
      return () => cancelAnimationFrame(raf);
    }
    setVisible(false);
    const t = window.setTimeout(() => setMounted(false), prefersReducedMotion() ? 0 : SHEET_MS);
    return () => window.clearTimeout(t);
  }, [open]);

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

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onCloseRef.current();
      return;
    }
    if (e.key !== 'Tab' || !sheetRef.current) return;
    const items = Array.from(sheetRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (el) => el.offsetParent !== null || el === document.activeElement,
    );
    if (!items.length) {
      e.preventDefault();
      return;
    }
    const firstEl = items[0]!;
    const lastEl = items[items.length - 1]!;
    if (
      e.shiftKey &&
      (document.activeElement === firstEl || document.activeElement === sheetRef.current)
    ) {
      e.preventDefault();
      lastEl.focus();
    } else if (!e.shiftKey && document.activeElement === lastEl) {
      e.preventDefault();
      firstEl.focus();
    }
  }

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest('button')) return;
    dragStart.current = { y: e.clientY, t: performance.now() };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!dragStart.current) return;
    setDrag(Math.max(0, e.clientY - dragStart.current.y));
  }
  function onPointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    const start = dragStart.current;
    dragStart.current = null;
    if (!start) return;
    const dy = Math.max(0, e.clientY - start.y);
    const velocity = dy / Math.max(1, performance.now() - start.t);
    setDrag(0);
    if (dy > DISMISS_PX || velocity > 0.6) onCloseRef.current();
  }

  if (!mounted) return null;
  const dragging = drag > 0;
  return createPortal(
    <>
      <div
        className={`${styles.scrim} ${visible ? styles.scrimVisible : ''}`}
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
        className={[
          styles.sheet,
          visible && styles.sheetVisible,
          dragging && styles.dragging,
          full && styles.full,
        ]
          .filter(Boolean)
          .join(' ')}
        style={dragging ? { transform: `translateY(${drag}px)` } : undefined}
        onKeyDown={onKeyDown}
      >
        <div
          className={styles.head}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div className={styles.handle} aria-hidden />
          <div className={styles.titleRow}>
            <div className={styles.titles}>
              <h2 id={titleId} className={styles.title}>
                {title}
              </h2>
              {subtitle && (
                <p id={subId} className={styles.subtitle}>
                  {subtitle}
                </p>
              )}
            </div>
            <IconButton
              icon={X}
              label="Close"
              tone="parchment"
              onClick={() => onCloseRef.current()}
            />
          </div>
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </>,
    document.body,
  );
}
