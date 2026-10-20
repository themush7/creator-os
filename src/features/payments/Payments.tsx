import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '@/app/data';
import { ScreenHeader, screenStyles } from '@/app/Screen';
import { useSheets } from '@/app/sheets';
import { useToday } from '@/app/today';
import { Card } from '@/components/Card';
import { Chip, ChipScroller } from '@/components/Chip';
import { EmptyState } from '@/components/EmptyState';
import { IconButton } from '@/components/IconButton';
import { InvoicePill, PaymentPill } from '@/components/Pill';
import { monthSummary, overdueTotal, outstanding, receivedIn } from '@/domain/analytics';
import {
  PAYMENT_FILTERS,
  groupPayments,
  lastPaidOn,
  paymentFilterCounts,
  type PaymentFilter,
  type PaymentRow,
} from '@/domain/lists';
import { invoiceCash, invoiceRemaining, invoiceSettled, invoiceTds } from '@/domain/status';
import { addMonths, formatShort, monthKey, monthLabel, monthShort } from '@/lib/dates';
import { inr } from '@/lib/money';
import { SectionHeader, Skeleton, sharedStyles } from '../shared/List';
import styles from './Payments.module.css';

export function Payments() {
  const today = useToday();
  const navigate = useNavigate();
  const { openSheet } = useSheets();
  const { ready, index } = useAppData();
  const [filter, setFilter] = useState<PaymentFilter>('All');
  const thisMonth = monthKey(today);
  const [month, setMonth] = useState(thisMonth);
  const data = index.data;

  const groups = useMemo(() => groupPayments(index, filter, today), [index, filter, today]);
  const counts = useMemo(() => paymentFilterCounts(index, today), [index, today]);
  const summary = useMemo(() => monthSummary(data, month), [data, month]);
  const overdue = overdueTotal(data, today);

  function openRow(row: PaymentRow) {
    if (row.kind === 'not-invoiced') return openSheet({ type: 'invoice', collabId: row.collab.id });
    if (row.status === 'Paid')
      return navigate(`/collabs/${row.invoice.collabId}`, { state: { from: 'Payments' } });
    openSheet({ type: 'payment', invoiceId: row.invoice.id });
  }

  return (
    <>
      <ScreenHeader title="Payments" />
      <div className={screenStyles.body} style={{ paddingTop: 16 }}>
        <Card variant="flush" className={styles.strip} aria-label="Summary">
          <div className={styles.cell}>
            <span className={styles.cellLabel}>Outstanding</span>
            <span className={styles.cellValue}>{inr(outstanding(data))}</span>
          </div>
          <div className={styles.cell}>
            <span className={styles.cellLabel}>Overdue</span>
            <span className={`${styles.cellValue} ${overdue > 0 ? styles.alert : ''}`}>
              {inr(overdue)}
            </span>
          </div>
          <div className={styles.cell}>
            <span className={styles.cellLabel}>Received in {monthShort(thisMonth)}</span>
            <span className={styles.cellValue}>{inr(receivedIn(data, thisMonth))}</span>
          </div>
        </Card>
      </div>

      <ChipScroller label="Filter invoices">
        {PAYMENT_FILTERS.map((f) => (
          <Chip
            key={f}
            label={f}
            meta={String(counts[f])}
            selected={filter === f}
            onSelect={() => setFilter(f)}
          />
        ))}
      </ChipScroller>

      <div className={screenStyles.body} style={{ paddingTop: 8 }}>
        {!ready ? (
          <Skeleton height={140} count={3} />
        ) : groups.length ? (
          groups.map((g) => (
            <section key={g.title} className={sharedStyles.stack} aria-label={g.title}>
              <SectionHeader title={g.title} aside={inr(g.total)} />
              <Card variant="flush">
                {g.rows.map((row, i) => (
                  <PaymentRowView
                    key={row.kind === 'invoice' ? row.invoice.id : row.collab.id}
                    row={row}
                    first={i === 0}
                    onOpen={() => openRow(row)}
                  />
                ))}
              </Card>
            </section>
          ))
        ) : (
          <EmptyState>
            {data.invoices.length ? 'No invoices here.' : 'Invoices appear once you record one.'}
          </EmptyState>
        )}

        <section aria-labelledby="analytics">
          <Card variant="flush" className={styles.analytics}>
            <div className={styles.monthSwitch}>
              <h2 id="analytics" className="t-headline">
                Monthly analytics
              </h2>
              <div className={styles.monthControls}>
                <IconButton
                  icon={ChevronLeft}
                  tone="plain"
                  label="Previous month"
                  onClick={() => setMonth(addMonths(month, -1))}
                />
                <span className={styles.monthName} aria-live="polite">
                  {monthLabel(month)}
                </span>
                <IconButton
                  icon={ChevronRight}
                  tone="plain"
                  label="Next month"
                  disabled={month >= thisMonth}
                  onClick={() => setMonth(addMonths(month, 1))}
                />
              </div>
            </div>
            {(
              [
                ['Booked', 'Agreed or extended this month', summary.booked],
                ['Received', 'Cash in this month', summary.received],
                ['TDS deducted', 'Tax withheld by brands this month', summary.tds],
                ['Outstanding', 'Unpaid balance as of today', summary.outstanding],
                ['Rights revenue', 'Extensions, included in booked', summary.rightsRevenue],
              ] as const
            ).map(([label, note, value]) => (
              <div key={label} className={styles.metric}>
                <span className={styles.metricText}>
                  <span className="t-subhead">{label}</span>
                  <span className={sharedStyles.footnote}>{note}</span>
                </span>
                <span className={`${sharedStyles.money} t-headline`}>{inr(value)}</span>
              </div>
            ))}
          </Card>
        </section>
      </div>
    </>
  );
}

function PaymentRowView({
  row,
  first,
  onOpen,
}: {
  row: PaymentRow;
  first: boolean;
  onOpen: () => void;
}) {
  const divider = first ? undefined : { borderTop: '0.5px solid var(--separator)' };

  if (row.kind === 'not-invoiced') {
    const c = row.collab;
    return (
      <button
        type="button"
        className={`${styles.row} row-press`}
        style={divider}
        onClick={onOpen}
        aria-label={`${c.brand}, not invoiced, record invoice`}
      >
        <span className={styles.rowTop}>
          <span className={sharedStyles.stack} style={{ gap: 1, minWidth: 0 }}>
            <span className="t-headline">{c.brand}</span>
            <span className="t-footnote secondary ellipsis">{c.campaign}</span>
          </span>
          <span className={styles.amount}>
            <span className={`${sharedStyles.money} t-headline`}>
              {c.fee !== null ? inr(c.fee) : '—'}
            </span>
            <span className="t-caption secondary">agreed</span>
          </span>
        </span>
        <span className={styles.rowLine}>
          <PaymentPill status="Not invoiced" />
          <span className="ellipsis">
            {c.deliveredOn ? `Delivered ${formatShort(c.deliveredOn)} · ` : ''}record invoice
          </span>
        </span>
      </button>
    );
  }

  const { invoice: inv, collab, status } = row;
  const paid = status === 'Paid';
  const partial = !paid && invoiceSettled(inv) > 0;
  const tds = invoiceTds(inv);
  return (
    <button type="button" className={`${styles.row} row-press`} style={divider} onClick={onOpen}>
      <span className={styles.rowTop}>
        <span className={sharedStyles.stack} style={{ gap: 1, minWidth: 0 }}>
          <span className="t-headline">{collab?.brand ?? 'Unknown brand'}</span>
          <span className="t-footnote secondary ellipsis">
            {inv.number} · {inv.kind === 'Content fee' ? (collab?.campaign ?? inv.kind) : inv.kind}
          </span>
        </span>
        <span className={styles.amount}>
          <span className={`${sharedStyles.money} t-headline`}>
            {paid ? `${inr(invoiceCash(inv))} paid` : inr(invoiceRemaining(inv))}
          </span>
          {(partial || (paid && tds > 0)) && (
            <span className="t-caption secondary num">
              of {inr(inv.amount)}
              {tds ? ` · TDS ${inr(tds)}` : ''}
            </span>
          )}
        </span>
      </span>
      <span className={styles.rowLine}>
        <InvoicePill status={status} />
        <span className="ellipsis">
          {paid
            ? `Paid ${formatShort(lastPaidOn(inv))}`
            : `Due ${formatShort(inv.dueOn)}${inv.followUpOn ? ` · follow up ${formatShort(inv.followUpOn)}` : ''}`}
        </span>
      </span>
    </button>
  );
}
