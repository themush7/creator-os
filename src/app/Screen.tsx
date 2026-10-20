import { useEffect, type ReactNode } from 'react';
import styles from './Screen.module.css';

interface Props {
  title: string;
  subtitle?: ReactNode;
  aside?: ReactNode;
}

export function ScreenHeader({ title, subtitle, aside }: Props) {
  useEffect(() => {
    document.title = `${title} · Creator OS`;
  }, [title]);
  return (
    <header className={styles.header}>
      <div className={styles.titleRow}>
        <h1 className="t-screen">{title}</h1>
        {aside && <span className={styles.count}>{aside}</span>}
      </div>
      {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
    </header>
  );
}

export { styles as screenStyles };
