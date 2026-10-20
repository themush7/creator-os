import { ChevronRight, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Card } from '@/components/Card';
import styles from './shared.module.css';

export function InsetList({
  children,
  withTiles,
  label,
}: {
  children: ReactNode;
  withTiles?: boolean;
  label?: string;
}) {
  return (
    <Card variant="flush" className={`${styles.list} ${withTiles ? styles.withTile : ''}`}>
      <div role="list" aria-label={label}>
        {children}
      </div>
    </Card>
  );
}

interface RowProps {
  title: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  tile?: { icon: LucideIcon; color: string };
  onClick?: () => void;
  /** Accessible name when the visible content is not enough. */
  label?: string;
  chevron?: boolean;
}

/** An iOS table cell. A button when it has `onClick`, otherwise static. */
export function ListRow({
  title,
  subtitle,
  trailing,
  tile,
  onClick,
  label,
  chevron = !!onClick,
}: RowProps) {
  const content = (
    <>
      {tile && (
        <span className={styles.tile} style={{ background: tile.color }}>
          <tile.icon size={18} strokeWidth={2.2} aria-hidden />
        </span>
      )}
      <span className={styles.rowText}>
        <span className={styles.rowTitle}>{title}</span>
        {subtitle && <span className={styles.rowSub}>{subtitle}</span>}
      </span>
      {trailing && <span className={styles.trailing}>{trailing}</span>}
      {chevron && (
        <ChevronRight size={18} strokeWidth={2.4} className={styles.chevron} aria-hidden />
      )}
    </>
  );
  return (
    <div role="listitem" className={styles.item}>
      {onClick ? (
        <button
          type="button"
          className={`${styles.row} row-press`}
          onClick={onClick}
          aria-label={label}
        >
          {content}
        </button>
      ) : (
        <div className={styles.rowStatic}>{content}</div>
      )}
    </div>
  );
}

export function SectionHeader({
  id,
  title,
  aside,
}: {
  id?: string;
  title: string;
  aside?: ReactNode;
}) {
  return (
    <div className={styles.sectionHead}>
      <h2 id={id} className="t-title3">
        {title}
      </h2>
      {aside && <span className={styles.sectionAside}>{aside}</span>}
    </div>
  );
}

export function Skeleton({ height, count = 1 }: { height: number; count?: number }) {
  return (
    <div className={styles.cards} aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={styles.skeleton} style={{ height }} />
      ))}
    </div>
  );
}

export { styles as sharedStyles };
