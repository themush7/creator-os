import { useState } from 'react';
import { useAppData } from '@/app/data';
import type { SheetProps } from '@/app/sheets';
import { useToday } from '@/app/today';
import { useAction } from '@/app/useAction';
import { Button } from '@/components/Button';
import { Segmented } from '@/components/Chip';
import { TextField } from '@/components/Field';
import { Sheet } from '@/components/Sheet';
import { recordExtension } from '@/domain/actions';
import { extensionStartOn, rightsEndOn } from '@/domain/status';
import { addDays, formatShort } from '@/lib/dates';
import { parseRupees } from '@/lib/money';
import styles from './sheet.module.css';

export function ExtensionSheet({
  spec,
  open,
  onClose,
  returnFocus,
}: SheetProps<{ type: 'extend'; periodId: string }>) {
  const today = useToday();
  const run = useAction();
  const { index } = useAppData();
  const p = index.data.rights.find((r) => r.id === spec.periodId);
  const [days, setDays] = useState<30 | 60 | 90>(30);
  const [fee, setFee] = useState('');

  if (!p) return null;
  const c = index.collabById.get(p.collabId);
  const start = extensionStartOn(p, today);
  const amount = parseRupees(fee) ?? 0;

  async function save() {
    if (amount <= 0) return;
    const r = await run((ctx) => recordExtension(ctx, { periodId: p!.id, days, fee: amount }), {
      toast: (v) => `Extension recorded with ${v.invoice.number}.`,
      undoable: true,
    });
    if (r) onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      returnFocus={returnFocus}
      title="Record extension"
      subtitle={`${c?.brand ?? ''} · current period ends ${formatShort(rightsEndOn(p))}`}
    >
      <form
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <Segmented
          label="Extension term"
          value={days}
          onChange={setDays}
          options={([30, 60, 90] as const).map((d) => ({
            value: d,
            label: `${d} days`,
            meta: `to ${formatShort(addDays(start, d - 1))}`,
          }))}
        />
        <TextField
          label="Extension fee"
          money
          value={fee}
          data-autofocus
          onChange={(e) => setFee(e.target.value)}
        />
        <p className={styles.note}>
          New period {formatShort(start)} – {formatShort(addDays(start, days - 1))}. A linked
          invoice is created; the original period stays in history.
        </p>
        <Button type="submit" fullWidth large disabled={amount <= 0}>
          Record extension
        </Button>
      </form>
    </Sheet>
  );
}
