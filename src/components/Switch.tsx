import type { ReactNode } from 'react';
import styles from './Switch.module.css';

interface Props {
  label: string;
  hint?: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

/** A whole-row iOS switch (role=switch). */
export function Switch({ label, hint, checked, onChange, disabled }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      className={`${styles.row} ${checked ? styles.on : ''} row-press`}
      onClick={() => onChange(!checked)}
    >
      <span className={styles.text}>
        <span className={styles.label}>{label}</span>
        {hint && <span className={styles.hint}>{hint}</span>}
      </span>
      <span className={styles.track} aria-hidden>
        <span className={styles.thumb} />
      </span>
    </button>
  );
}
