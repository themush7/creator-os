import { useState } from 'react';
import { useAppData } from '@/app/data';
import type { SheetProps } from '@/app/sheets';
import { useToday } from '@/app/today';
import { useAction } from '@/app/useAction';
import { Button } from '@/components/Button';
import { TextAreaField } from '@/components/Field';
import { Sheet } from '@/components/Sheet';
import { addNote } from '@/domain/actions';
import { formatShort } from '@/lib/dates';
import styles from './sheet.module.css';

export function AddNoteSheet({
  spec,
  open,
  onClose,
  returnFocus,
}: SheetProps<{ type: 'note'; collabId: string }>) {
  const today = useToday();
  const run = useAction();
  const { index } = useAppData();
  const c = index.collabById.get(spec.collabId);
  const [text, setText] = useState('');
  if (!c) return null;

  async function save() {
    if (!text.trim()) return;
    const ok = await run((ctx) => addNote(ctx, c!.id, text), {
      toast: 'Note added.',
      undoable: true,
    });
    if (ok) onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      returnFocus={returnFocus}
      title="Add note"
      subtitle={`${c.brand} · ${formatShort(today)}`}
    >
      <form
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <TextAreaField
          label="Note"
          rows={4}
          value={text}
          placeholder="Followed up on WhatsApp, brand will confirm Monday"
          data-autofocus
          onChange={(e) => setText(e.target.value)}
        />
        <Button type="submit" fullWidth large disabled={!text.trim()}>
          Save note
        </Button>
      </form>
    </Sheet>
  );
}
