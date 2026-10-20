import { useEffect, useState } from 'react';
import { Button } from '@/components/Button';
import { ChoiceGroup } from '@/components/Chip';
import { SelectField, TextField } from '@/components/Field';
import { Sheet } from '@/components/Sheet';
import { useToast } from '@/components/Toast';
import { STAGES } from '@/domain/stages';
import { OWNERS, type Owner } from '@/domain/types';
import { parseRupees } from '@/lib/money';
import sheet from './sheetForm.module.css';

interface Props {
  open: boolean;
  onClose: () => void;
}

const EMPTY = { brand: '', campaign: '', fee: '', stage: 0, owner: 'You' as Owner };

export function QuickAddSheet({ open, onClose }: Props) {
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    if (open) setForm(EMPTY);
  }, [open]);

  const valid = form.brand.trim() !== '' && form.campaign.trim() !== '';

  function save() {
    if (!valid) return;
    // Wired to domain/actions in phase 4.
    void parseRupees(form.fee);
    toast.show('Saved. Add details when you have them.');
    onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="New collaboration"
      subtitle="Five fields. Details can wait."
    >
      <form
        className={sheet.form}
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <TextField
          label="Brand"
          value={form.brand}
          placeholder="e.g. Northline Audio"
          autoCapitalize="words"
          data-autofocus
          onChange={(e) => setForm({ ...form, brand: e.target.value })}
          required
        />
        <TextField
          label="Campaign or deliverable"
          value={form.campaign}
          placeholder="e.g. Commute earbuds reel"
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
        <ChoiceGroup
          label="Next action owner"
          options={OWNERS.map((o) => ({ value: o, label: o }))}
          value={form.owner}
          onChange={(owner) => setForm({ ...form, owner })}
        />
        <Button type="submit" fullWidth large disabled={!valid}>
          Save collaboration
        </Button>
        <p className={sheet.fine}>Contacts, dates and rights can be added after saving.</p>
      </form>
    </Sheet>
  );
}
