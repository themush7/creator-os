import { useState } from 'react';
import { useAppData } from '@/app/data';
import type { SheetProps } from '@/app/sheets';
import { useToday } from '@/app/today';
import { useAction } from '@/app/useAction';
import { Button } from '@/components/Button';
import { Segmented } from '@/components/Chip';
import { SelectField, TextField } from '@/components/Field';
import { Sheet } from '@/components/Sheet';
import { defaultInvoiceAmount, recordInvoice } from '@/domain/actions';
import { invoicesOf } from '@/domain/dataIndex';
import { nextInvoiceNumber } from '@/domain/invoiceNumber';
import { INVOICE_KINDS, type InvoiceKind } from '@/domain/types';
import { addDays, formatShort } from '@/lib/dates';
import { parseRupees } from '@/lib/money';
import styles from './sheet.module.css';

const TERMS = [15, 30, 45] as const;

export function InvoiceSheet({
  spec,
  open,
  onClose,
  returnFocus,
}: SheetProps<{ type: 'invoice'; collabId: string }>) {
  const today = useToday();
  const run = useAction();
  const { index, settings } = useAppData();
  const c = index.collabById.get(spec.collabId);
  const suggested = nextInvoiceNumber(settings, index.data.invoices, today).number;
  const initialTerm = (TERMS as readonly number[]).includes(settings.defaultPaymentDays)
    ? settings.defaultPaymentDays
    : 30;
  const existing = c ? invoicesOf(index, c.id) : [];
  const [form, setForm] = useState(() => {
    const amount = c ? defaultInvoiceAmount(c, existing) : 0;
    return {
      amount: amount > 0 ? String(amount) : '',
      kind: (existing.length ? 'Balance' : 'Content fee') as InvoiceKind,
      term: initialTerm,
      number: suggested,
    };
  });

  if (!c) return null;
  const amount = parseRupees(form.amount);
  const due = addDays(today, form.term);

  async function save() {
    if (!amount) return;
    const inv = await run(
      (ctx) =>
        recordInvoice(ctx, {
          collabId: c!.id,
          amount,
          kind: form.kind,
          termDays: form.term,
          number: form.number,
        }),
      { toast: (i) => `Invoice ${i.number} recorded.`, undoable: true },
    );
    if (inv) onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      returnFocus={returnFocus}
      title="Record invoice"
      subtitle={`${c.brand} · ${c.campaign}`}
    >
      <form
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <div className={styles.row2}>
          <TextField
            label="Amount"
            money
            value={form.amount}
            data-autofocus
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
          />
          <SelectField
            label="Kind"
            value={form.kind}
            onChange={(e) => setForm({ ...form, kind: e.target.value as InvoiceKind })}
          >
            {INVOICE_KINDS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </SelectField>
        </div>
        <Segmented
          label="Payment terms"
          value={form.term}
          onChange={(term) => setForm({ ...form, term })}
          options={TERMS.map((d) => ({
            value: d,
            label: `${d} days`,
            meta: formatShort(addDays(today, d)),
          }))}
        />
        <TextField
          label="Invoice number"
          value={form.number}
          autoCapitalize="characters"
          autoCorrect="off"
          onChange={(e) => setForm({ ...form, number: e.target.value })}
        />
        <p className={styles.note}>
          {form.number.trim() === suggested ? `Next number ${suggested}. ` : ''}Due{' '}
          {formatShort(due)}; the first follow-up is set for the same day.
        </p>
        <Button type="submit" fullWidth large disabled={!amount || !form.number.trim()}>
          Record invoice
        </Button>
      </form>
    </Sheet>
  );
}
