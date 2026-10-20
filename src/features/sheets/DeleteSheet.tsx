import { useNavigate } from 'react-router-dom';
import { useAppData } from '@/app/data';
import type { SheetProps } from '@/app/sheets';
import { useAction } from '@/app/useAction';
import { Button } from '@/components/Button';
import { Sheet } from '@/components/Sheet';
import { deleteCollab } from '@/domain/actions';
import { invoicesOf, rightsOf } from '@/domain/dataIndex';
import styles from './sheet.module.css';

function count(n: number, word: string) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

export function DeleteSheet({
  spec,
  open,
  onClose,
  returnFocus,
}: SheetProps<{ type: 'delete'; collabId: string }>) {
  const run = useAction();
  const navigate = useNavigate();
  const { index } = useAppData();
  const c = index.collabById.get(spec.collabId);
  if (!c) return null;
  const invoices = invoicesOf(index, c.id).length;
  const rights = rightsOf(index, c.id).length;

  async function confirm() {
    const deleted = await run((ctx) => deleteCollab(ctx, c!.id), {
      toast: `Deleted ${c!.brand}.`,
      undoable: true,
      undoneToast: `Restored ${c!.brand}.`,
    });
    if (deleted) {
      onClose();
      navigate('/collabs', { replace: true });
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      returnFocus={returnFocus}
      title={`Delete ${c.brand}?`}
      subtitle={c.campaign}
    >
      <div className={styles.form}>
        <p className={styles.note}>
          This also deletes {count(invoices, 'invoice')}, {count(rights, 'rights period')} and the
          activity log. You can undo for a few seconds afterwards. To keep the history, archive it
          instead.
        </p>
        <div className={styles.buttons}>
          <Button variant="destructive" fullWidth large onClick={confirm}>
            Delete collaboration
          </Button>
          <Button variant="gray" fullWidth large data-autofocus onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
