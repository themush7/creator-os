import { useEffect, useRef, useState, type ReactNode } from 'react';
import styles from './Screen.module.css';

interface Props {
  title: string;
  /** Small line above the title, e.g. the date on Home. */
  eyebrow?: ReactNode;
  subtitle?: ReactNode;
  aside?: ReactNode;
  /** Shown top-right in the compact bar, e.g. a glass settings button. */
  trailing?: ReactNode;
  /** Title for the compact bar when it differs from the large title. */
  compactTitle?: string;
}

/**
 * iOS large title. When it scrolls under the status bar, a compact frosted bar with the
 * title fades in, with a soft edge instead of a hairline.
 */
export function ScreenHeader({ title, eyebrow, subtitle, aside, trailing, compactTitle }: Props) {
  const sentinel = useRef<HTMLHeadingElement>(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    document.title = `${compactTitle ?? title} · Creator OS`;
  }, [title, compactTitle]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      ([entry]) =>
        setCollapsed(!!entry && !entry.isIntersecting && entry.boundingClientRect.top < 0),
      { rootMargin: '-60px 0px 0px 0px', threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <>
      <div className={`${styles.bar} ${collapsed ? styles.collapsed : ''}`}>
        <div className={styles.barInner}>
          <span className={styles.barTitle} aria-hidden>
            {compactTitle ?? title}
          </span>
          {trailing && <span className={styles.barTrailing}>{trailing}</span>}
        </div>
      </div>
      <header className={styles.header}>
        {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
        <div className={styles.titleRow}>
          <h1 ref={sentinel} className="t-large-title">
            {title}
          </h1>
          {aside && <span className={styles.count}>{aside}</span>}
        </div>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </header>
    </>
  );
}

export { styles as screenStyles };
