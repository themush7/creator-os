import styles from './ProgressBar.module.css';

interface Props {
  /** 0..1 */
  value: number;
  tone?: 'copper' | 'espresso' | 'hairline';
  label?: string;
}

export function ProgressBar({ value, tone = 'copper', label }: Props) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div
      className={styles.track}
      role={label ? 'progressbar' : undefined}
      aria-label={label}
      aria-valuenow={label ? pct : undefined}
      aria-valuemin={label ? 0 : undefined}
      aria-valuemax={label ? 100 : undefined}
      aria-hidden={label ? undefined : true}
    >
      <div className={`${styles.fill} ${styles[tone]}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
