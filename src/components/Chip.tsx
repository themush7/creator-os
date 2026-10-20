import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import styles from './Chip.module.css';

interface ChipProps {
  label: string;
  meta?: string;
  selected: boolean;
  onSelect: () => void;
  /** `filter` = toggle (aria-pressed); `radio` = one of a set (role=radio). */
  mode?: 'filter' | 'radio';
  /** Show the meta under the label instead of beside it. */
  stacked?: boolean;
  tabIndex?: number;
}

export function Chip({
  label,
  meta,
  selected,
  onSelect,
  mode = 'filter',
  stacked,
  tabIndex,
}: ChipProps) {
  const a11y =
    mode === 'radio'
      ? { role: 'radio' as const, 'aria-checked': selected }
      : { 'aria-pressed': selected };
  return (
    <button
      type="button"
      className={[styles.chip, selected && styles.selected, stacked && styles.stacked, 'pressable']
        .filter(Boolean)
        .join(' ')}
      onClick={onSelect}
      tabIndex={tabIndex}
      {...a11y}
    >
      <span>{label}</span>
      {meta !== undefined && <span className={styles.meta}>{meta}</span>}
    </button>
  );
}

export interface ChoiceOption<T> {
  value: T;
  label: string;
  meta?: string;
}

interface ChoiceGroupProps<T> {
  label: string;
  options: ChoiceOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  stacked?: boolean;
  hideLabel?: boolean;
}

/** Single-choice chips with radio-group semantics and arrow-key movement. */
export function ChoiceGroup<T extends string | number>({
  label,
  options,
  value,
  onChange,
  stacked,
  hideLabel,
}: ChoiceGroupProps<T>) {
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
    const buttons = ref.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]');
    buttons?.[next]?.focus();
  }

  const labelId = `cg-${label.replace(/\W+/g, '-').toLowerCase()}`;
  return (
    <div className="field-block">
      <span id={labelId} className={hideLabel ? 'visually-hidden' : 'field-label'}>
        {label}
      </span>
      <div
        ref={ref}
        role="radiogroup"
        aria-labelledby={labelId}
        className={styles.row}
        onKeyDown={onKeyDown}
      >
        {options.map((o, i) => (
          <Chip
            key={String(o.value)}
            mode="radio"
            label={o.label}
            meta={o.meta}
            stacked={stacked}
            selected={o.value === value}
            tabIndex={i === (current < 0 ? 0 : current) ? 0 : -1}
            onSelect={() => onChange(o.value)}
          />
        ))}
      </div>
    </div>
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
