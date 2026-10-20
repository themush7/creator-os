import { useState } from 'react';
import { useAppData } from '@/app/data';
import type { SheetProps } from '@/app/sheets';
import { useAction } from '@/app/useAction';
import { Button } from '@/components/Button';
import { TextAreaField } from '@/components/Field';
import { Sheet } from '@/components/Sheet';
import { updateDetails } from '@/domain/actions';
import styles from './sheet.module.css';

/** Full-height editor for concept notes. */
export function NotesSheet({
  spec,
  open,
  onClose,
  returnFocus,
}: SheetProps<{ type: 'notes'; collabId: string }>) {
  const run = useAction();
  const { index } = useAppData();
  const c = index.collabById.get(spec.collabId);
  const [text, setText] = useState(c?.conceptNotes ?? '');
  if (!c) return null;
  const changed = text !== c.conceptNotes;

  async function save() {
    const ok = await run(
      (ctx) => updateDetails(ctx, c!.id, { conceptNotes: text }, 'Concept notes'),
      {
        toast: 'Notes saved.',
        undoable: true,
      },
    );
    if (ok) onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      returnFocus={returnFocus}
      full
      title="Concept notes"
      subtitle={c.brand}
    >
      <form
        className={styles.form}
        style={{ minHeight: '100%' }}
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <TextAreaField
          label="Notes"
          rows={14}
          value={text}
          placeholder="Hook, shots, must-haves from the brief"
          data-autofocus
          onChange={(e) => setText(e.target.value)}
        />
        <Button type="submit" fullWidth large disabled={!changed}>
          Save notes
        </Button>
      </form>
    </Sheet>
  );
}
