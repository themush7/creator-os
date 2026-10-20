import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { tabLabelFor } from '@/app/TabBar';
import type { SheetProps } from '@/app/sheets';
import { useAction } from '@/app/useAction';
import { Button } from '@/components/Button';
import { Segmented } from '@/components/Chip';
import { SelectField, TextField } from '@/components/Field';
import { Sheet } from '@/components/Sheet';
import { createCollab } from '@/domain/actions';
import { STAGES } from '@/domain/stages';
import { OWNERS, type Owner } from '@/domain/types';
import { parseRupees } from '@/lib/money';
import styles from './sheet.module.css';

export function QuickAddSheet({ open, onClose, returnFocus }: SheetProps<{ type: 'add' }>) {
  const run = useAction();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [form, setForm] = useState({
    brand: '',
    campaign: '',
    fee: '',
    stage: 0,
    owner: 'You' as Owner,
  });
  const [saving, setSaving] = useState(false);
  const valid = form.brand.trim() !== '' && form.campaign.trim() !== '';

  async function save() {
    if (!valid || saving) return;
    setSaving(true);
    const c = await run(
      (ctx) =>
        createCollab(ctx, {
          brand: form.brand,
          campaign: form.campaign,
          fee: parseRupees(form.fee),
          stage: form.stage,
          owner: form.owner,
        }),
      { toast: 'Saved. Add details when you have them.' },
    );
    setSaving(false);
    if (c) {
      onClose();
      navigate(`/collabs/${c.id}`, { state: { from: tabLabelFor(pathname) ?? 'Collabs' } });
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      returnFocus={returnFocus}
      title="New collaboration"
      subtitle="Five fields. Details can wait."
    >
      <form
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <TextField
          label="Brand"
          value={form.brand}
          placeholder="e.g. Northline Audio"
          autoCapitalize="words"
          enterKeyHint="next"
          data-autofocus
          onChange={(e) => setForm({ ...form, brand: e.target.value })}
          required
        />
        <TextField
          label="Campaign or deliverable"
          value={form.campaign}
          placeholder="e.g. Commute earbuds reel"
          enterKeyHint="next"
          onChange={(e) => setForm({ ...form, campaign: e.target.value })}
          required
        />
        <TextField
          label="Fee"
          optional
          money
          value={form.fee}
          onChange={(e) => setForm({ ...form, fee: e.target.value })}
        />
        <SelectField
          label="Current stage"
          value={form.stage}
          onChange={(e) => setForm({ ...form, stage: Number(e.target.value) })}
        >
          {STAGES.map((s, i) => (
            <option key={s} value={i}>
              {s}
            </option>
          ))}
        </SelectField>
        <Segmented
          label="Next action owner"
          options={OWNERS.map((o) => ({ value: o, label: o }))}
          value={form.owner}
          onChange={(owner) => setForm({ ...form, owner })}
        />
        <Button type="submit" fullWidth large disabled={!valid || saving}>
          Save collaboration
        </Button>
        <p className={styles.fine}>Contacts, dates and rights can be added after saving.</p>
      </form>
    </Sheet>
  );
}
