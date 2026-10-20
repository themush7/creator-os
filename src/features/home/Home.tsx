import {
  ArrowDownLeft,
  CalendarCheck,
  CircleAlert,
  Clock,
  Handshake,
  HardDrive,
  Hourglass,
  IndianRupee,
  Plus,
  Settings,
  Store,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '@/app/data';
import { ScreenHeader, screenStyles } from '@/app/Screen';
import { useSheets } from '@/app/sheets';
import { useToday } from '@/app/today';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { IconButton } from '@/components/IconButton';
import { TILE_COLOR } from '@/components/statusMeta';
import { monthSummary, sixMonthTrend } from '@/domain/analytics';
import {
  ATTENTION_LIMIT,
  attentionSummary,
  buildAttention,
  type AttentionRule,
} from '@/domain/attention';
import { compareByNextDue } from '@/domain/lists';
import { BACKUP_STALE_DAYS, isActiveCollab } from '@/domain/status';
import { diffDays, formatLong, formatShort, monthKey, monthLong, monthShort } from '@/lib/dates';
import { inr, sum } from '@/lib/money';
import { CollabCard } from '../shared/CollabCard';
import { InsetList, ListRow, SectionHeader, Skeleton, sharedStyles } from '../shared/List';
import styles from './Home.module.css';

const RULE_TILE: Record<AttentionRule, { icon: LucideIcon; color: string }> = {
  overdue: { icon: CircleAlert, color: TILE_COLOR.red },
  rights: { icon: Hourglass, color: TILE_COLOR.orange },
  'follow-up': { icon: IndianRupee, color: TILE_COLOR.tint },
  you: { icon: UserRound, color: TILE_COLOR.tint },
  brand: { icon: Store, color: TILE_COLOR.gray },
};

function greeting(now = new Date()): string {
  const h = now.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function Home() {
  const today = useToday();
  const navigate = useNavigate();
  const { openSheet } = useSheets();
  const { ready, index, settings } = useAppData();
  const data = index.data;

  const attention = useMemo(
    () => buildAttention(index, today).slice(0, ATTENTION_LIMIT),
    [index, today],
  );
  const month = monthKey(today);
  const summary = useMemo(() => monthSummary(data, month), [data, month]);
  const trend = useMemo(() => sixMonthTrend(data, today), [data, today]);
  const active = useMemo(() => data.collabs.filter(isActiveCollab).sort(compareByNextDue), [data]);

  const name = settings.name.trim();
  const title = name ? `${greeting()}, ${name}` : greeting();
  const backupAge = settings.lastBackupOn ? diffDays(settings.lastBackupOn, today) : null;
  const backupStale = backupAge === null || backupAge > BACKUP_STALE_DAYS;
  const peak = Math.max(1, ...trend.flatMap((m) => [m.booked, m.received]));
  const open = (collabId: string) => navigate(`/collabs/${collabId}`, { state: { from: 'Home' } });

  return (
    <>
      <ScreenHeader
        eyebrow={formatLong(today)}
        title={title}
        compactTitle="Home"
        trailing={
          <IconButton
            icon={Settings}
            label="Backup and settings"
            onClick={() => navigate('/settings')}
          />
        }
      />

      <div className={screenStyles.body}>
        <section className={sharedStyles.stack} aria-labelledby="needs">
          <SectionHeader id="needs" title="Needs you" />
          <p className="t-subhead secondary" style={{ padding: '0 4px' }}>
            {ready ? attentionSummary(attention.length) : ' '}
          </p>
          {!ready ? (
            <Skeleton height={64 * 3} />
          ) : (
            attention.length > 0 && (
              <InsetList withTiles label="Needs you">
                {attention.map((a) => (
                  <ListRow
                    key={`${a.collabId}:${a.rule}`}
                    tile={RULE_TILE[a.rule]}
                    title={a.title}
                    subtitle={a.subtitle}
                    onClick={() => open(a.collabId)}
                  />
                ))}
              </InsetList>
            )
          )}
        </section>

        <section className={sharedStyles.stack} aria-labelledby="month">
          <SectionHeader id="month" title={`${monthLong(month)} so far`} />
          <div className={styles.grid}>
            {(
              [
                ['Booked', inr(summary.booked), 'var(--blue-text)', CalendarCheck],
                ['Received', inr(summary.received), 'var(--green-text)', ArrowDownLeft],
                ['Outstanding', inr(summary.outstanding), 'var(--orange-text)', Clock],
                ['Active collabs', String(active.length), 'var(--label-2)', Handshake],
              ] as const
            ).map(([label, value, color, Icon]) => (
              <Card key={label} className={styles.figure}>
                <span className={styles.figureLabel} style={{ color }}>
                  <Icon size={15} strokeWidth={2.4} aria-hidden />
                  {label}
                </span>
                <span className={styles.figureValue}>{ready ? value : '–'}</span>
              </Card>
            ))}
          </div>
        </section>

        <section className={sharedStyles.stack} aria-labelledby="active">
          <SectionHeader
            id="active"
            title="Active collaborations"
            aside={
              active.length > 0 && (
                <Button variant="plain" onClick={() => navigate('/collabs')}>
                  See all
                </Button>
              )
            }
          />
          {!ready ? (
            <Skeleton height={150} count={2} />
          ) : active.length ? (
            <div className={sharedStyles.cards}>
              {active.slice(0, 4).map((c) => (
                <CollabCard key={c.id} collab={c} index={index} today={today} from="Home" />
              ))}
            </div>
          ) : (
            <Card className={sharedStyles.emptyCard}>
              <span className="t-headline">
                {data.collabs.length ? 'Nothing active right now.' : 'No collaborations yet.'}
              </span>
              <span className="t-subhead secondary">
                Add the first brand and campaign. Everything else can come later.
              </span>
              <Button icon={Plus} onClick={() => openSheet({ type: 'add' })}>
                Add collaboration
              </Button>
            </Card>
          )}
        </section>

        <section aria-labelledby="revenue">
          <Card className={styles.revenue}>
            <div className={sharedStyles.sectionHead} style={{ padding: 0 }}>
              <h2 id="revenue" className="t-headline">
                Revenue
              </h2>
              <span className={sharedStyles.footnote}>Last 6 months</span>
            </div>
            <div className={styles.legend} aria-hidden>
              <span>
                <i className={styles.swatchBooked} />
                Booked
              </span>
              <span>
                <i className={styles.swatchReceived} />
                Received
              </span>
            </div>
            <ul className={styles.chart}>
              {trend.map((m, i) => (
                <li
                  key={m.month}
                  className={styles.month}
                  aria-label={`${monthLong(m.month)}: booked ${inr(m.booked)}, received ${inr(m.received)}`}
                >
                  <div className={styles.bars} aria-hidden>
                    <div
                      className={styles.barBooked}
                      style={{ height: `${(m.booked / peak) * 96}px` }}
                    />
                    <div
                      className={styles.barReceived}
                      style={{ height: `${(m.received / peak) * 96}px` }}
                    />
                  </div>
                  <span
                    className={`${styles.monthLabel} ${i === trend.length - 1 ? styles.monthCurrent : ''}`}
                    aria-hidden
                  >
                    {monthShort(m.month)}
                  </span>
                </li>
              ))}
            </ul>
            <div className={styles.revenueFoot}>
              <span className="secondary">Six-month received</span>
              <span className={sharedStyles.money}>{inr(sum(trend.map((m) => m.received)))}</span>
            </div>
          </Card>
        </section>

        <button
          type="button"
          className={`${styles.backup} ${backupStale ? styles.backupStale : ''}`}
          onClick={() => navigate('/settings')}
        >
          <HardDrive size={16} strokeWidth={2} aria-hidden />
          <span style={{ flex: 1 }}>
            Saved on this device ·{' '}
            {settings.lastBackupOn
              ? `last backup ${formatShort(settings.lastBackupOn)}${backupStale ? ` · ${backupAge} days ago` : ''}`
              : 'never backed up'}
          </span>
          <span className={styles.backupLink}>Back up</span>
        </button>
      </div>
    </>
  );
}
