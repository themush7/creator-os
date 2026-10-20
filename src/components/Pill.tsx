import type { LucideIcon } from 'lucide-react';
import { INVOICE_META, OWNER_META, PAYMENT_META, RIGHTS_META, type PillTone } from './statusMeta';
import type { Owner } from '@/domain/types';
import type { InvoiceStatus, PaymentStatus, RightsStatus } from '@/domain/status';
import styles from './Pill.module.css';

interface Props {
  tone: PillTone;
  icon: LucideIcon;
  label: string;
}

/** A labelled status. Colour is never the only signal: every pill has text and an icon. */
export function Pill({ tone, icon: Icon, label }: Props) {
  return (
    <span className={`${styles.pill} ${styles[tone]}`}>
      <Icon size={13} strokeWidth={2.25} aria-hidden />
      {label}
    </span>
  );
}

export function PaymentPill({ status }: { status: PaymentStatus }) {
  return <Pill {...PAYMENT_META[status]} label={status} />;
}

export function InvoicePill({ status }: { status: InvoiceStatus }) {
  return <Pill {...INVOICE_META[status]} label={status} />;
}

export function RightsPill({ status }: { status: RightsStatus }) {
  return <Pill {...RIGHTS_META[status]} label={status} />;
}

export function OwnerPill({ owner }: { owner: Owner }) {
  return <Pill {...OWNER_META[owner]} label={owner} />;
}
