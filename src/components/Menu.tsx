import type { LucideIcon } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import styles from './Menu.module.css';

export interface MenuItem {
  label: string;
  icon: LucideIcon;
  onSelect: () => void;
  destructive?: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  /** The button that opened the menu; the menu grows out of its corner. */
  anchor: HTMLElement | null;
  items: MenuItem[];
  label: string;
}

/** iOS pull-down menu: glass, anchored to its trigger, arrow keys, Esc, focus returned. */
export function Menu({ open, onClose, anchor, items, label }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);

  useLayoutEffect(() => {
    if (!open || !anchor) return;
    const r = anchor.getBoundingClientRect();
    setPos({ top: r.bottom + 8, right: Math.max(8, window.innerWidth - r.right) });
  }, [open, anchor]);

  useEffect(() => {
    if (!open) return;
    ref.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
    return () => anchor?.focus();
  }, [open, anchor]);

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const buttons = Array.from(
      ref.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [],
    );
    const i = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === 'Escape' || e.key === 'Tab') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      buttons[(i + 1) % buttons.length]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      buttons[(i - 1 + buttons.length) % buttons.length]?.focus();
    }
  }

  if (!open || !pos) return null;
  return createPortal(
    <>
      <div className={styles.backdrop} onClick={onClose} aria-hidden />
      <div
        ref={ref}
        role="menu"
        aria-label={label}
        className={styles.menu}
        style={{ top: pos.top, right: pos.right }}
        onKeyDown={onKeyDown}
      >
        {items.map((item, i) => (
          <div key={item.label}>
            {item.destructive && i > 0 && <div className={styles.divider} aria-hidden />}
            <button
              type="button"
              role="menuitem"
              className={`${styles.item} ${item.destructive ? styles.destructive : ''}`}
              onClick={() => {
                onClose();
                item.onSelect();
              }}
            >
              {item.label}
              <item.icon size={20} strokeWidth={2} aria-hidden />
            </button>
          </div>
        ))}
      </div>
    </>,
    document.body,
  );
}
