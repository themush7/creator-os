import { useState } from 'react';
import { useAppData } from '@/app/data';
import type { DetailsSection, SheetProps } from '@/app/sheets';
import { useAction } from '@/app/useAction';
import { Button } from '@/components/Button';
import { TextAreaField, TextField } from '@/components/Field';
import { Sheet } from '@/components/Sheet';
import { updateDetails, type CollabDetailsPatch } from '@/domain/actions';
import type { Collab } from '@/domain/types';
import { parseRupees } from '@/lib/money';
import styles from './sheet.module.css';

const TITLES: Record<DetailsSection, string> = {
  basics: 'Edit basics',
  terms: 'Deliverables & terms',
  production: 'Production',
  delivery: 'Delivery & approval',
};

type FormState = Record<string, string>;

function initial(c: Collab, section: DetailsSection): FormState {
  switch (section) {
    case 'basics':
      return { brand: c.brand, campaign: c.campaign };
    case 'terms':
      return {
        contact: c.contact,
        deliverables: c.deliverables,
        fee: c.fee === null ? '' : String(c.fee),
        usageTerms: c.usageTerms,
      };
    case 'production':
      return { productStatus: c.productStatus, shootDate: c.shootDate ?? '' };
    case 'delivery':
      return { deliveredOn: c.deliveredOn ?? '', links: c.links, goLiveOn: c.goLiveOn ?? '' };
  }
}

function toPatch(form: FormState, section: DetailsSection): CollabDetailsPatch {
  const date = (v: string | undefined) => (v ? v : null);
  switch (section) {
    case 'basics':
      return { brand: form.brand ?? '', campaign: form.campaign ?? '' };
    case 'terms':
      return {
        contact: form.contact ?? '',
        deliverables: form.deliverables ?? '',
        fee: parseRupees(form.fee ?? ''),
        usageTerms: form.usageTerms ?? '',
      };
    case 'production':
      return { productStatus: form.productStatus ?? '', shootDate: date(form.shootDate) };
    case 'delivery':
      return {
        deliveredOn: date(form.deliveredOn),
        links: form.links ?? '',
        goLiveOn: date(form.goLiveOn),
      };
  }
}

/** One sheet per detail section, with plain labelled fields. */
export function DetailsSheet({
  spec,
  open,
  onClose,
  returnFocus,
}: SheetProps<{ type: 'details'; collabId: string; section: DetailsSection }>) {
  const run = useAction();
  const { index } = useAppData();
  const c = index.collabById.get(spec.collabId);
  const [form, setForm] = useState<FormState>(() => (c ? initial(c, spec.section) : {}));
  if (!c) return null;
  const set = (key: string) => (e: { target: { value: string } }) =>
    setForm({ ...form, [key]: e.target.value });
  const valid = spec.section !== 'basics' || (!!form.brand?.trim() && !!form.campaign?.trim());

  async function save() {
    if (!valid) return;
    const ok = await run(
      (ctx) => updateDetails(ctx, c!.id, toPatch(form, spec.section), TITLES[spec.section]),
      {
        toast: 'Saved.',
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
      title={TITLES[spec.section]}
      subtitle={c.brand}
    >
      <form
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        {spec.section === 'basics' && (
          <>
            <TextField
              label="Brand"
              value={form.brand}
              data-autofocus
              onChange={set('brand')}
              required
            />
            <TextField
              label="Campaign or deliverable"
              value={form.campaign}
              onChange={set('campaign')}
              required
            />
          </>
        )}
        {spec.section === 'terms' && (
          <>
            <TextField
              label="Contact"
              value={form.contact}
              placeholder="Riya Menon · Brand manager"
              data-autofocus
              onChange={set('contact')}
            />
            <TextAreaField
              label="Deliverables"
              rows={2}
              value={form.deliverables}
              placeholder="1 reel (45–60 s), 2 stories"
              onChange={set('deliverables')}
            />
            <TextField label="Fee" money value={form.fee} onChange={set('fee')} />
            <TextAreaField
              label="Usage"
              rows={2}
              value={form.usageTerms}
              placeholder="30 days paid usage, Instagram"
              onChange={set('usageTerms')}
            />
          </>
        )}
        {spec.section === 'production' && (
          <>
            <TextField
              label="Product"
              value={form.productStatus}
              placeholder="Received 18 Sep"
              data-autofocus
              onChange={set('productStatus')}
            />
            <TextField
              label="Shoot date"
              type="date"
              value={form.shootDate}
              onChange={set('shootDate')}
            />
          </>
        )}
        {spec.section === 'delivery' && (
          <>
            <TextField
              label="Delivered on"
              type="date"
              value={form.deliveredOn}
              onChange={set('deliveredOn')}
            />
            <TextAreaField
              label="Links"
              rows={2}
              value={form.links}
              placeholder="Drive folder, live post URL"
              onChange={set('links')}
            />
            <TextField
              label="Go-live date"
              type="date"
              value={form.goLiveOn}
              hint="Approval follows the stage. Rights periods are set with Mark live."
              onChange={set('goLiveOn')}
            />
          </>
        )}
        <Button type="submit" fullWidth large disabled={!valid}>
          Save
        </Button>
      </form>
    </Sheet>
  );
}
