import { useState } from 'react';
import { useAppData } from '@/app/data';
import type { SheetProps } from '@/app/sheets';
import { useToday } from '@/app/today';
import { useAction } from '@/app/useAction';
import { Button } from '@/components/Button';
import { Segmented } from '@/components/Chip';
import { TextField } from '@/components/Field';
import { Sheet } from '@/components/Sheet';
import { markLive } from '@/domain/actions';
import { rightsEndOn } from '@/domain/status';
import { PLATFORMS } from '@/domain/types';
import { addDays, formatShort, isDateStr } from '@/lib/dates';
import { parseRupees } from '@/lib/money';
import styles from './sheet.module.css';

type Term = 30 | 60 | 90 | 'custom';

export function MarkLiveSheet({
  spec,
  open,
  onClose,
  returnFocus,
}: SheetProps<{ type: 'live'; collabId: string }>) {
  const today = useToday();
  const run = useAction();
  const { index, settings } = useAppData();
  const c = index.collabById.get(spec.collabId);
  const preset = ([30, 60, 90] as const).find((d) => d === settings.defaultRightsDays) ?? 30;
  const [platform, setPlatform] = useState<string>('Instagram');
  const [term, setTerm] = useState<Term>(preset);
  const [custom, setCustom] = useState('');
  const [goLive, setGoLive] = useState(today);

  if (!c) return null;
  const start = isDateStr(goLive) ? goLive : today;
  const days = term === 'custom' ? (parseRupees(custom) ?? 0) : term;
  const end = days > 0 ? addDays(start, days - 1) : null;

  async function save() {
    if (days <= 0) return;
    const p = await run(
      (ctx) => markLive(ctx, { collabId: c!.id, platform, days, goLiveOn: start }),
      {
        toast: (r) => `Live. Rights end ${formatShort(rightsEndOn(r))}.`,
        undoable: true,
      },
    );
    if (p) onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      returnFocus={returnFocus}
      title="Mark live"
      subtitle={`${c.brand} · ${c.campaign}`}
    >
      <form
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <Segmented
          label="Platform"
          value={platform}
          onChange={setPlatform}
          options={PLATFORMS.map((p) => ({ value: p, label: p }))}
        />
        <Segmented<Term>
          label="Rights term"
          value={term}
          onChange={setTerm}
          options={[
            ...([30, 60, 90] as const).map((d) => ({
              value: d,
              label: `${d} days`,
              meta: `to ${formatShort(addDays(start, d - 1))}`,
            })),
            { value: 'custom' as const, label: 'Custom', meta: 'days' },
          ]}
        />
        {term === 'custom' && (
          <TextField
            label="Days"
            inputMode="numeric"
            value={custom}
            placeholder="e.g. 45"
            data-autofocus
            onChange={(e) => setCustom(e.target.value)}
          />
        )}
        <TextField
          label="Go-live date"
          type="date"
          value={goLive}
          onChange={(e) => setGoLive(e.target.value)}
        />
        <p className={styles.note}>
          {end
            ? `Rights run ${formatShort(start)} – ${formatShort(end)}. At expiry the next action becomes “Ask about extension”.`
            : 'Enter the number of days.'}
        </p>
        <Button type="submit" fullWidth large disabled={days <= 0}>
          Mark live
        </Button>
      </form>
    </Sheet>
  );
}
