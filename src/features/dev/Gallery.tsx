import {
  ChevronRight,
  CircleAlert,
  Download,
  Hourglass,
  Plus,
  Settings2,
  Store,
  UserRound,
} from 'lucide-react';
import { useState } from 'react';
import { screenStyles } from '@/app/Screen';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Chip, ChipScroller, ChoiceGroup } from '@/components/Chip';
import { TextField } from '@/components/Field';
import { IconButton } from '@/components/IconButton';
import { OwnerPill, PaymentPill, RightsPill } from '@/components/Pill';
import { ProgressBar } from '@/components/ProgressBar';
import { SearchField } from '@/components/SearchField';
import { Sheet } from '@/components/Sheet';
import { StageSegments } from '@/components/StageSegments';
import { useToast } from '@/components/Toast';
import { useToday } from '@/app/today';
import { formatLong } from '@/lib/dates';
import { inr } from '@/lib/money';
import styles from './Gallery.module.css';

const ATTENTION = [
  {
    icon: CircleAlert,
    alert: true,
    title: 'Kohl Coffee · invoice overdue',
    sub: '₹45,000 · 8 days late · follow up',
  },
  {
    icon: Hourglass,
    alert: false,
    title: 'Kohl Coffee · rights end in 3 days',
    sub: 'Ask about extension',
  },
  {
    icon: UserRound,
    alert: false,
    title: 'Mitti Home · send rate card',
    sub: 'Waiting on you · tomorrow',
  },
  {
    icon: Store,
    alert: false,
    title: 'Saffa Skincare · waiting on approval',
    sub: 'Brand reply due tomorrow',
  },
];

/** Phase 1 preview: the shell, tokens and base components. Replaced by the real Home in phase 3. */
export function Gallery() {
  const today = useToday();
  const toast = useToast();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [filter, setFilter] = useState('Active');
  const [term, setTerm] = useState<number>(30);
  const [q, setQ] = useState('');

  return (
    <>
      <section className={styles.hero} aria-labelledby="greeting">
        <div className={styles.heroTop}>
          <span className={styles.date}>{formatLong(today)}</span>
          <IconButton icon={Settings2} label="Backup and settings" tone="translucent" />
        </div>
        <h1 id="greeting" className="t-screen">
          Good morning, Sarthak
        </h1>
        <p className={styles.summary}>4 things need you today.</p>
        <div className={styles.attention}>
          {ATTENTION.map((a) => (
            <button key={a.title} type="button" className={`${styles.item} pressable`}>
              <span className={`${styles.disc} ${a.alert ? styles.discAlert : ''}`}>
                <a.icon size={18} strokeWidth={1.75} aria-hidden />
              </span>
              <span className={styles.itemText}>
                <span className={styles.itemTitle}>{a.title}</span>
                <span className={styles.itemSub}>{a.sub}</span>
              </span>
              <ChevronRight size={18} strokeWidth={1.75} color="var(--on-dark-muted)" aria-hidden />
            </button>
          ))}
        </div>
      </section>

      <div className={screenStyles.body}>
        <section className={styles.stack}>
          <h2 className="t-section">October so far</h2>
          <div className={styles.grid}>
            {[
              ['Booked', inr(150000)],
              ['Received', inr(50000)],
              ['Outstanding', inr(150000)],
              ['Active collabs', '6'],
            ].map(([label, value]) => (
              <Card key={label} className={styles.figure}>
                <span className={styles.figureLabel}>{label}</span>
                <span className={styles.figureValue}>{value}</span>
              </Card>
            ))}
          </div>
        </section>

        <section className={styles.stack}>
          <h2 className="t-section">Pills</h2>
          <div className={styles.row}>
            <OwnerPill owner="You" />
            <OwnerPill owner="Brand" />
            <OwnerPill owner="Scheduled" />
            <OwnerPill owner="Clear" />
          </div>
          <div className={styles.row}>
            <PaymentPill status="Not invoiced" />
            <PaymentPill status="Invoiced" />
            <PaymentPill status="Due soon" />
            <PaymentPill status="Overdue" />
            <PaymentPill status="Part-paid" />
            <PaymentPill status="Paid" />
          </div>
          <div className={styles.row}>
            <RightsPill status="Not live" />
            <RightsPill status="Active" />
            <RightsPill status="Expiring soon" />
            <RightsPill status="Expired" />
            <RightsPill status="Extension pending" />
            <RightsPill status="Extended" />
          </div>
        </section>

        <section className={styles.stack}>
          <h2 className="t-section">Progress</h2>
          <Card className={styles.stack}>
            <StageSegments stage={5} />
            <ProgressBar value={6 / 11} />
            <ProgressBar value={50000 / 95000} tone="espresso" />
          </Card>
        </section>

        <section className={styles.stack}>
          <h2 className="t-section">Inputs</h2>
          <SearchField value={q} onChange={setQ} placeholder="Search brands and campaigns" />
        </section>
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
        <section className={styles.stack}>
          <h2 className="t-section">Buttons</h2>
          <Button fullWidth large>
            Move to Ready to shoot
          </Button>
          <Button variant="secondary" fullWidth>
            Record payment
          </Button>
          <div className={styles.row}>
            <Button variant="pearl" icon={Plus}>
              Invoice
            </Button>
            <Button variant="link">See all</Button>
            <Button disabled>Save collaboration</Button>
          </div>
          <div className={styles.row}>
            <Button variant="secondary" onClick={() => setSheetOpen(true)}>
              Open a sheet
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                toast.show('Payment recorded. ₹45,000 remaining.', {
                  undo: () => toast.show('Undone.'),
                })
              }
            >
              Show toast
            </Button>
          </div>
        </section>
      </div>

      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Mark live"
        subtitle="Kohl Coffee · Morning ritual reel"
      >
        <div className={styles.stack}>
          <ChoiceGroup
            label="Rights term"
            stacked
            value={term}
            onChange={setTerm}
            options={[30, 60, 90].map((d) => ({ value: d, label: `${d} days`, meta: 'to 31 Oct' }))}
          />
          <TextField label="Go-live date" type="date" defaultValue={today} />
          <Button fullWidth large icon={Download} onClick={() => setSheetOpen(false)}>
            Mark live
          </Button>
        </div>
      </Sheet>
    </>
  );
}
