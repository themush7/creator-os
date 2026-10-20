import {
  BadgeCheck,
  Check,
  CheckCheck,
  ChevronRight,
  FilePlus,
  IndianRupee,
  PackageCheck,
  Radio,
  Send,
  Upload,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';
import { useAppData } from '@/app/data';
import { useSheets, type SheetProps } from '@/app/sheets';
import { useAction } from '@/app/useAction';
import { Button } from '@/components/Button';
import { Segmented } from '@/components/Chip';
import { TextField } from '@/components/Field';
import { Sheet } from '@/components/Sheet';
import { runQuickAction, setNextAction, setOwner, setStage } from '@/domain/actions';
import { invoicesOf, rightsOf } from '@/domain/dataIndex';
import { quickActionsFor, STAGE_TRANSITIONS, type QuickActionId } from '@/domain/stageActions';
import { COMPLETE, STAGE_COUNT, STAGES, stageName, stageOf } from '@/domain/stages';
import { isUnpaid } from '@/domain/status';
import { OWNERS } from '@/domain/types';
import styles from './sheet.module.css';

const ICONS: Record<QuickActionId, LucideIcon> = {
  'product-received': PackageCheck,
  'send-script': Send,
  'script-approved': CheckCheck,
  'mark-delivered': Upload,
  'mark-approved': BadgeCheck,
  'mark-live': Radio,
  'record-invoice': FilePlus,
  'record-payment': IndianRupee,
};

export function StageSheet({
  spec,
  open,
  onClose,
  returnFocus,
}: SheetProps<{ type: 'stage'; collabId: string }>) {
  const run = useAction();
  const { openSheet } = useSheets();
  const { index } = useAppData();
  const c = index.collabById.get(spec.collabId);
  const [next, setNext] = useState({ text: c?.nextAction ?? '', due: c?.nextDue ?? '' });

  if (!c) return null;
  const invoices = invoicesOf(index, c.id);
  const unpaid = invoices.filter(isUnpaid).sort((a, b) => a.dueOn.localeCompare(b.dueOn))[0];
  const actions = quickActionsFor(c, rightsOf(index, c.id).length > 0, !!unpaid);
  const nextChanged = next.text.trim() !== c.nextAction || (next.due || null) !== c.nextDue;

  async function moveTo(stage: number) {
    const ok = await run((ctx) => setStage(ctx, c!.id, stage), {
      toast: `Moved to ${stageName(stage)}.`,
      undoable: true,
    });
    if (ok) onClose();
  }

  async function quick(id: QuickActionId) {
    if (id === 'mark-live') return openSheet({ type: 'live', collabId: c!.id });
    if (id === 'record-invoice') return openSheet({ type: 'invoice', collabId: c!.id });
    if (id === 'record-payment' && unpaid)
      return openSheet({ type: 'payment', invoiceId: unpaid.id });
    const t = STAGE_TRANSITIONS[id];
    const ok = await run((ctx) => runQuickAction(ctx, c!.id, id), {
      toast:
        id === 'mark-delivered'
          ? 'Delivered. Waiting on brand approval.'
          : `Moved to ${stageName(t?.to ?? c!.stage)}.`,
      undoable: true,
    });
    if (ok) onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      returnFocus={returnFocus}
      title="Update stage"
      subtitle={`${c.brand} · ${stageName(c.stage)}, ${stageOf(c.stage).toLowerCase()}`}
    >
      <div className={styles.form}>
        {c.stage < COMPLETE && (
          <Button fullWidth large data-autofocus onClick={() => moveTo(c.stage + 1)}>
            Move to {stageName(c.stage + 1)}
          </Button>
        )}

        <div className={styles.list} role="group" aria-label="Quick actions">
          {actions.map((a) => {
            const Icon = ICONS[a.id];
            return (
              <button
                key={a.id}
                type="button"
                className={`${styles.action} row-press`}
                onClick={() => quick(a.id)}
              >
                <span className={styles.actionIcon}>
                  <Icon size={20} strokeWidth={2} aria-hidden />
                </span>
                <span style={{ flex: 1 }}>{a.label}</span>
                <ChevronRight size={18} strokeWidth={2.4} className={styles.chevron} aria-hidden />
              </button>
            );
          })}
        </div>

        <Segmented
          label="Next action owner"
          options={OWNERS.map((o) => ({ value: o, label: o }))}
          value={c.owner}
          onChange={(owner) =>
            run((ctx) => setOwner(ctx, c.id, owner), {
              toast: owner === 'Clear' ? 'All clear.' : `${owner} next.`,
            })
          }
        />

        <div className={styles.group}>
          <div className={styles.row2}>
            <TextField
              label="Next action"
              value={next.text}
              placeholder="e.g. Waiting on script feedback"
              onChange={(e) => setNext({ ...next, text: e.target.value })}
            />
            <TextField
              label="Due"
              type="date"
              value={next.due}
              onChange={(e) => setNext({ ...next, due: e.target.value })}
            />
          </div>
          {nextChanged && (
            <Button
              variant="secondary"
              fullWidth
              onClick={() =>
                run((ctx) => setNextAction(ctx, c.id, next.text, next.due || null), {
                  toast: 'Next action saved.',
                })
              }
            >
              Save next action
            </Button>
          )}
        </div>

        <div className={styles.group}>
          <span className="field-label">All stages</span>
          <div className={styles.list} role="radiogroup" aria-label="All stages">
            {STAGES.map((s, i) => {
              const current = i === c.stage;
              return (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={current}
                  className={`${styles.action} row-press ${current ? styles.current : ''}`}
                  onClick={() => !current && moveTo(i)}
                >
                  <span className={styles.stageNo}>
                    {i + 1}
                    <span className="visually-hidden"> of {STAGE_COUNT}</span>
                  </span>
                  <span style={{ flex: 1 }}>{s}</span>
                  {current && (
                    <span className={styles.check}>
                      <Check size={20} strokeWidth={2.4} aria-hidden />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </Sheet>
  );
}
