import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import styles from './Chip.module.css';

interface ChipProps {
  label: string;
  meta?: string;
  selected: boolean;
  onSelect: () => void;
}

/** A filter toggle (aria-pressed). For a single choice from a set, use `Segmented`. */
export function Chip({ label, meta, selected, onSelect }: ChipProps) {
  return (
    <button
      type="button"
      className={[styles.chip, selected && styles.selected, 'pressable'].filter(Boolean).join(' ')}
      onClick={onSelect}
      aria-pressed={selected}
    >
      <span>{label}</span>
      {meta !== undefined && <span className={styles.meta}>{meta}</span>}
    </button>
  );
}

/** Horizontally scrolling filter chips, edge to edge. */
export function ChipScroller({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.scroller} role="group" aria-label={label}>
      {children}
    </div>
  );
}

export interface ChoiceOption<T> {
  value: T;
  label: string;
  meta?: string;
}

interface SegmentedProps<T> {
  label: string;
  options: ChoiceOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  hideLabel?: boolean;
}

/**
 * iOS segmented control with radio-group semantics. The thumb slides on a critically
 * damped spring; arrow keys move the selection.
 */
export function Segmented<T extends string | number>({
  label,
  options,
  value,
  onChange,
  hideLabel,
}: SegmentedProps<T>) {
  const ref = useRef<HTMLDivElement>(null);
  const current = options.findIndex((o) => o.value === value);

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const delta =
      e.key === 'ArrowRight' || e.key === 'ArrowDown'
        ? 1
        : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
          ? -1
          : 0;
    if (!delta || !options.length) return;
    e.preventDefault();
    const next = (Math.max(current, 0) + delta + options.length) % options.length;
    const opt = options[next];
    if (!opt) return;
    onChange(opt.value);
    ref.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[next]?.focus();
  }

  const labelId = `seg-${label.replace(/\W+/g, '-').toLowerCase()}`;
  const n = Math.max(options.length, 1);
  return (
    <div className="field-block">
      <span id={labelId} className={hideLabel ? 'visually-hidden' : 'field-label'}>
        {label}
      </span>
      <div
        ref={ref}
        role="radiogroup"
        aria-labelledby={labelId}
        className={styles.segmented}
        onKeyDown={onKeyDown}
      >
        {current >= 0 && (
          <span
            className={styles.thumb}
            aria-hidden
            style={{
              width: `calc((100% - 6px) / ${n})`,
              transform: `translateX(${current * 100}%)`,
            }}
          />
        )}
        {options.map((o, i) => {
          const on = i === current;
          return (
            <button
              key={String(o.value)}
              type="button"
              role="radio"
              aria-checked={on}
              tabIndex={i === (current < 0 ? 0 : current) ? 0 : -1}
              className={`${styles.segment} ${on ? styles.segmentOn : ''}`}
              onClick={() => onChange(o.value)}
            >
              <span>{o.label}</span>
              {o.meta && <span className={styles.segmentMeta}>{o.meta}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
