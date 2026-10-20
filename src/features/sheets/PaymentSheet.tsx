import { useState } from 'react';
import { useAppData } from '@/app/data';
import type { SheetProps } from '@/app/sheets';
import { useToday } from '@/app/today';
import { useAction } from '@/app/useAction';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { TextField } from '@/components/Field';
import { Sheet } from '@/components/Sheet';
import { FOLLOW_UP_DAYS, logFollowUp, recordPayment } from '@/domain/actions';
import { invoiceCash, invoiceRemaining, invoiceTds } from '@/domain/status';
import { addDays, formatShort } from '@/lib/dates';
import { inr, parseRupees } from '@/lib/money';
import styles from './sheet.module.css';

export const TDS_RATE = 0.1;

export function PaymentSheet({
  spec,
  open,
  onClose,
  returnFocus,
}: SheetProps<{ type: 'payment'; invoiceId: string }>) {
  const today = useToday();
  const run = useAction();
  const { index } = useAppData();
  const inv = index.data.invoices.find((i) => i.id === spec.invoiceId);
  const remaining = inv ? invoiceRemaining(inv) : 0;
  const [amount, setAmount] = useState(remaining > 0 ? String(remaining) : '');
  const [tds, setTds] = useState('');

  if (!inv) return null;
  const c = index.collabById.get(inv.collabId);
  const cash = parseRupees(amount) ?? 0;
  const tdsValue = Math.min(parseRupees(tds) ?? 0, remaining);
  const half = Math.round(remaining / 2);
  const tenPercent = Math.min(Math.round(inv.amount * TDS_RATE), remaining);
  const settles = cash + tdsValue >= remaining;
  const after = Math.max(0, remaining - cash - tdsValue);

  function applyTds() {
    setTds(String(tenPercent));
    // If the full balance was entered, the brand pays the balance less TDS.
    if (cash >= remaining) setAmount(String(remaining - tenPercent));
  }

  async function save() {
    if (cash + tdsValue <= 0) return;
    const outcome = await run(
      (ctx) => recordPayment(ctx, { invoiceId: inv!.id, amount: cash, tds: tdsValue }),
      {
        toast: (o) =>
          o.remaining > 0 ? `Payment recorded. ${inr(o.remaining)} remaining.` : 'Paid in full.',
        undoable: true,
        undoneToast: 'Payment removed.',
      },
    );
    if (outcome) onClose();
  }

  async function followUp() {
    const next = await run((ctx) => logFollowUp(ctx, inv!.id), {
      toast: (d) => `Follow-up logged. Next on ${formatShort(d)}.`,
      undoable: true,
    });
    if (next) onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      returnFocus={returnFocus}
      title="Record payment"
      subtitle={`${inv.number} · ${c?.brand ?? ''}`}
    >
      <form
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <div className={styles.stats}>
          {(
            [
              ['Invoiced', inv.amount],
              [invoiceTds(inv) ? 'Received + TDS' : 'Received', invoiceCash(inv) + invoiceTds(inv)],
              ['Remaining', remaining],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className={styles.stat}>
              <span className={styles.statLabel}>{label}</span>
              <span className={styles.statValue}>{inr(value)}</span>
            </div>
          ))}
        </div>

        <div className={styles.group}>
          <TextField
            label="Amount received"
            money
            value={amount}
            data-autofocus
            onChange={(e) => setAmount(e.target.value)}
          />
          <div className={styles.quickFill} role="group" aria-label="Quick amounts">
            <Chip
              label="Full balance"
              meta={inr(remaining - tdsValue)}
              selected={cash === remaining - tdsValue}
              onSelect={() => setAmount(String(remaining - tdsValue))}
            />
            <Chip
              label="Half"
              meta={inr(half)}
              selected={cash === half}
              onSelect={() => setAmount(String(half))}
            />
          </div>
        </div>

        <div className={styles.group}>
          <TextField
            label="TDS deducted"
            optional
            money
            value={tds}
            hint="Tax the brand withheld. It counts toward settling the invoice, not as cash received."
            onChange={(e) => setTds(e.target.value)}
          />
          <div className={styles.quickFill}>
            <Chip
              label="10% TDS"
              meta={inr(tenPercent)}
              selected={tdsValue === tenPercent && tenPercent > 0}
              onSelect={applyTds}
            />
          </div>
        </div>

        <p className={styles.live} aria-live="polite">
          {cash + tdsValue <= 0
            ? 'Enter the amount received.'
            : settles
              ? 'This settles the invoice.'
              : `Remaining after this: ${inr(after)}.`}
        </p>
        <Button type="submit" fullWidth large disabled={cash + tdsValue <= 0}>
          Record payment
        </Button>

        <div className={styles.divider} />
        <p className={styles.live}>
          {inv.followUpOn
            ? `Follow-up was set for ${formatShort(inv.followUpOn)}. `
            : 'No follow-up set. '}
          Logging one sets the next for {formatShort(addDays(today, FOLLOW_UP_DAYS))}.
        </p>
        <Button variant="secondary" fullWidth large onClick={followUp}>
          Log follow-up
        </Button>
      </form>
    </Sheet>
  );
}
