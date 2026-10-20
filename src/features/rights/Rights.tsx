import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '@/app/data';
import { ScreenHeader, screenStyles } from '@/app/Screen';
import { useToday } from '@/app/today';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { RightsPill } from '@/components/Pill';
import { ProgressBar } from '@/components/ProgressBar';
import { groupRights } from '@/domain/lists';
import {
  rightsDaysLeft,
  rightsElapsed,
  rightsEndOn,
  rightsEnded,
  rightsStarted,
} from '@/domain/status';
import { formatShort } from '@/lib/dates';
import { SectionHeader, sharedStyles } from '../shared/List';
import styles from '../payments/Payments.module.css';

const BAR_TONE = {
  'Expiring soon': 'orange',
  'Extension pending': 'tint',
  Active: 'green',
  Expired: 'gray',
} as const;

export function Rights() {
  const today = useToday();
  const navigate = useNavigate();
  const { ready, index } = useAppData();
  const groups = useMemo(() => groupRights(index, today), [index, today]);

  return (
    <>
      <ScreenHeader title="Rights" subtitle="Ad usage windows run from the go-live date." />
      <div className={screenStyles.body}>
        {!ready ? null : groups.length ? (
          groups.map((g) => (
            <section key={g.title} className={sharedStyles.stack} aria-label={g.title}>
              <SectionHeader
                title={g.title}
                aside={`${g.rows.length} ${g.rows.length === 1 ? 'window' : 'windows'}`}
              />
              <Card variant="flush">
                {g.rows.map(({ period: p, collab }, i) => {
                  const left = rightsDaysLeft(p, today);
                  const expired = rightsEnded(p, today);
                  const started = rightsStarted(p, today);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      className={`${styles.row} row-press`}
                      style={i ? { borderTop: '0.5px solid var(--separator)' } : undefined}
                      onClick={() =>
                        navigate(`/collabs/${p.collabId}`, { state: { from: 'Rights' } })
                      }
                    >
                      <span className={styles.rowTop}>
                        <span className={sharedStyles.stack} style={{ gap: 1, minWidth: 0 }}>
                          <span className="t-headline">{collab?.brand ?? 'Unknown brand'}</span>
                          <span className="t-footnote secondary ellipsis">
                            {collab?.campaign ? `${collab.campaign} · ` : ''}
                            {p.platform}
                          </span>
                        </span>
                        <span className={styles.amount}>
                          <span
                            className="t-headline num"
                            style={{
                              color: g.title === 'Expiring soon' ? 'var(--orange-text)' : undefined,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {expired
                              ? 'Ended'
                              : started
                                ? `${left} ${left === 1 ? 'day' : 'days'}`
                                : 'Not started'}
                          </span>
                          <span className="t-caption secondary">
                            {expired
                              ? formatShort(rightsEndOn(p))
                              : started
                                ? 'left'
                                : `starts ${formatShort(p.startOn)}`}
                          </span>
                        </span>
                      </span>
                      <ProgressBar value={rightsElapsed(p, today)} tone={BAR_TONE[g.title]} />
                      <span className={styles.rowLine}>
                        <RightsPill status={g.title} />
                        <span className="ellipsis">
                          {formatShort(p.startOn)} – {formatShort(rightsEndOn(p))} · {p.days} days
                          {p.isExtension ? ' · extension' : ''}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </Card>
            </section>
          ))
        ) : (
          <EmptyState>Rights appear once a collaboration goes live.</EmptyState>
        )}
      </div>
    </>
  );
}
