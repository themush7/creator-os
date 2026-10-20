import {
  ArrowDownLeft,
  CalendarCheck,
  ChevronRight,
  Clock,
  Handshake,
  CircleAlert,
  Hourglass,
  Plus,
  Settings,
  Store,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';
import { ScreenHeader, screenStyles } from '@/app/Screen';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Chip, ChipScroller, Segmented } from '@/components/Chip';
import { TextField } from '@/components/Field';
import { IconButton } from '@/components/IconButton';
import { OwnerPill, PaymentPill, RightsPill } from '@/components/Pill';
import { ProgressBar } from '@/components/ProgressBar';
import { SearchField } from '@/components/SearchField';
import { Sheet } from '@/components/Sheet';
import { StageSegments } from '@/components/StageSegments';
import { TILE_COLOR, type PillTone } from '@/components/statusMeta';
import { useToast } from '@/components/Toast';
import { useToday } from '@/app/today';
import { addDays, formatLong, formatShort } from '@/lib/dates';
import { inr } from '@/lib/money';
import styles from './Gallery.module.css';

const ATTENTION: { icon: LucideIcon; tone: PillTone; title: string; sub: string }[] = [
  {
    icon: CircleAlert,
    tone: 'red',
    title: 'Kohl Coffee · invoice overdue',
    sub: '₹45,000 · 8 days late · follow up',
  },
  {
    icon: Hourglass,
    tone: 'orange',
    title: 'Kohl Coffee · rights end in 3 days',
    sub: 'Ask about extension',
  },
  {
    icon: UserRound,
    tone: 'tint',
    title: 'Mitti Home · send rate card',
    sub: 'Waiting on you · tomorrow',
  },
  {
    icon: Store,
    tone: 'gray',
    title: 'Saffa Skincare · waiting on approval',
    sub: 'Brand reply due tomorrow',
  },
];

/** Preview of the shell, tokens and base components. Replaced by the real Home in phase 3. */
export function Gallery() {
  const today = useToday();
  const toast = useToast();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [filter, setFilter] = useState('Active');
  const [term, setTerm] = useState<number>(30);
  const [platform, setPlatform] = useState('Instagram');
  const [q, setQ] = useState('');

  return (
    <>
      <ScreenHeader
        eyebrow={formatLong(today)}
        title="Good morning, Sarthak"
        compactTitle="Home"
        trailing={<IconButton icon={Settings} label="Backup and settings" />}
      />

      <div className={screenStyles.body}>
        <section className={screenStyles.stack} aria-labelledby="needs">
          <div className={screenStyles.sectionHead}>
            <h2 id="needs" className="t-title3">
              Needs you
            </h2>
            <span className="t-subhead secondary">4 things today</span>
          </div>
          <Card variant="flush" className={styles.list}>
            {ATTENTION.map((a) => (
              <button key={a.title} type="button" className={`${styles.row} row-press`}>
                <span className={styles.tile} style={{ background: TILE_COLOR[a.tone] }}>
                  <a.icon size={18} strokeWidth={2.2} aria-hidden />
                </span>
                <span className={styles.rowText}>
                  <span className={styles.rowTitle}>{a.title}</span>
                  <span className={styles.rowSub}>{a.sub}</span>
                </span>
                <ChevronRight size={18} strokeWidth={2.4} className={styles.chevron} aria-hidden />
              </button>
            ))}
          </Card>
        </section>

        <section className={screenStyles.stack} aria-labelledby="month">
          <div className={screenStyles.sectionHead}>
            <h2 id="month" className="t-title3">
              October so far
            </h2>
          </div>
          <div className={styles.grid}>
            {(
              [
                ['Booked', inr(150000), 'var(--blue-text)', CalendarCheck],
                ['Received', inr(50000), 'var(--green-text)', ArrowDownLeft],
                ['Outstanding', inr(150000), 'var(--orange-text)', Clock],
                ['Active collabs', '6', 'var(--label-2)', Handshake],
              ] as const
            ).map(([label, value, color, Icon]) => (
              <Card key={label} className={styles.figure}>
                <span className={styles.figureLabel} style={{ color }}>
                  <Icon size={15} strokeWidth={2.4} aria-hidden />
                  {label}
                </span>
                <span className={styles.figureValue}>{value}</span>
              </Card>
            ))}
          </div>
        </section>

        <section className={screenStyles.stack} aria-labelledby="active">
          <div className={screenStyles.sectionHead}>
            <h2 id="active" className="t-title3">
              Active collaborations
            </h2>
            <Button variant="plain">See all</Button>
          </div>
          <Card variant="flush">
            <button type="button" className={`${styles.card} row-press`}>
              <div className={styles.cardTop}>
                <div className={styles.cardNames}>
                  <span className="t-headline">Northline Audio</span>
                  <span className="t-subhead secondary ellipsis">Commute earbuds reel</span>
                </div>
                <span className={styles.fee}>{inr(85000)}</span>
              </div>
              <div>
                <div className={styles.stageLine}>
                  <span>Script review</span>
                  <span className="num">6 of 11</span>
                </div>
                <ProgressBar value={6 / 11} />
              </div>
              <div className={styles.nextLine}>
                <OwnerPill owner="Brand" />
                <span className="ellipsis" style={{ flex: 1 }}>
                  Waiting on script feedback
                </span>
                <span className={styles.due}>In 4 days</span>
              </div>
            </button>
          </Card>
          <Card variant="flush">
            <button type="button" className={`${styles.card} row-press`}>
              <div className={styles.cardTop}>
                <div className={styles.cardNames}>
                  <span className="t-headline">Kohl Coffee</span>
                  <span className="t-subhead secondary ellipsis">Morning ritual reel</span>
                </div>
                <span className={styles.fee}>{inr(45000)}</span>
              </div>
              <div>
                <div className={styles.stageLine}>
                  <span>Complete</span>
                  <span className="num">11 of 11</span>
                </div>
                <ProgressBar value={1} />
              </div>
              <div className={styles.nextLine}>
                <OwnerPill owner="You" />
                <span className="ellipsis" style={{ flex: 1 }}>
                  Follow up on invoice
                </span>
                <span className={`${styles.due} ${styles.dueUrgent}`}>Today</span>
              </div>
              <div className={styles.cardFoot}>
                <PaymentPill status="Overdue" />
                <RightsPill status="Expiring soon" />
              </div>
            </button>
          </Card>
        </section>

        <section className={screenStyles.stack}>
          <div className={screenStyles.sectionHead}>
            <h2 className="t-title3">Statuses</h2>
          </div>
          <Card className={styles.padded}>
            <div className={styles.wrap}>
              <OwnerPill owner="You" />
              <OwnerPill owner="Brand" />
              <OwnerPill owner="Scheduled" />
              <OwnerPill owner="Clear" />
            </div>
            <div className={styles.wrap}>
              <PaymentPill status="Not invoiced" />
              <PaymentPill status="Invoiced" />
              <PaymentPill status="Due soon" />
              <PaymentPill status="Overdue" />
              <PaymentPill status="Part-paid" />
              <PaymentPill status="Paid" />
            </div>
            <div className={styles.wrap}>
              <RightsPill status="Not live" />
              <RightsPill status="Active" />
              <RightsPill status="Expiring soon" />
              <RightsPill status="Expired" />
              <RightsPill status="Extension pending" />
              <RightsPill status="Extended" />
            </div>
            <StageSegments stage={5} />
            <ProgressBar value={50000 / 95000} tone="green" />
          </Card>
        </section>

        <SearchField value={q} onChange={setQ} placeholder="Search brands and campaigns" />
      </div>

      <ChipScroller label="Filter collaborations">
        {['Active', 'All', 'Leads', 'In progress', 'Delivered', 'Paid', 'Archived'].map((f, i) => (
          <Chip
            key={f}
            label={f}
            meta={String([6, 9, 2, 3, 3, 1, 1][i])}
            selected={filter === f}
            onSelect={() => setFilter(f)}
          />
        ))}
      </ChipScroller>

      <div className={screenStyles.body}>
        <Segmented
          label="Platform"
          value={platform}
          onChange={setPlatform}
          options={['Instagram', 'YouTube', 'Meta ads'].map((p) => ({ value: p, label: p }))}
        />
        <section className={screenStyles.stack}>
          <Button fullWidth large onClick={() => setSheetOpen(true)}>
            Mark live
          </Button>
          <Button variant="secondary" fullWidth large>
            Record payment
          </Button>
          <div className={styles.wrap}>
            <Button variant="compact" icon={Plus}>
              Invoice
            </Button>
            <Button variant="gray">Note</Button>
            <Button variant="destructive">Delete</Button>
            <Button disabled>Save</Button>
          </div>
          <Button
            variant="glass"
            onClick={() =>
              toast.show('Payment recorded. ₹45,000 remaining.', {
                undo: () => toast.show('Payment removed.'),
              })
            }
          >
            Show toast
          </Button>
        </section>
      </div>

      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Mark live"
        subtitle="Kohl Coffee · Morning ritual reel"
      >
        <div className={screenStyles.stack} style={{ gap: 20 }}>
          <Segmented
            label="Platform"
            value={platform}
            onChange={setPlatform}
            options={['Instagram', 'YouTube', 'Meta ads'].map((p) => ({ value: p, label: p }))}
          />
          <Segmented
            label="Rights term"
            value={term}
            onChange={setTerm}
            options={[30, 60, 90].map((d) => ({
              value: d,
              label: `${d} days`,
              meta: `to ${formatShort(addDays(today, d - 1))}`,
            }))}
          />
          <TextField label="Go-live date" type="date" defaultValue={today} />
          <Button fullWidth large onClick={() => setSheetOpen(false)}>
            Mark live
          </Button>
        </div>
      </Sheet>
    </>
  );
}
