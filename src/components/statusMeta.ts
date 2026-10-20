import {
  CalendarClock,
  Check,
  Circle,
  CircleAlert,
  CircleDashed,
  CircleOff,
  Clock,
  File,
  FileText,
  Hourglass,
  Play,
  RefreshCw,
  Store,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import type { Owner } from '@/domain/types';
import type { InvoiceStatus, PaymentStatus, RightsStatus } from '@/domain/status';

/** iOS system colours. Always paired with an icon and a label. */
export type PillTone = 'red' | 'orange' | 'green' | 'tint' | 'gray';

export interface PillMeta {
  tone: PillTone;
  icon: LucideIcon;
}

export const PAYMENT_META: Record<PaymentStatus, PillMeta> = {
  'Not invoiced': { tone: 'gray', icon: File },
  Invoiced: { tone: 'gray', icon: FileText },
  'Due soon': { tone: 'orange', icon: Clock },
  Overdue: { tone: 'red', icon: CircleAlert },
  'Part-paid': { tone: 'tint', icon: CircleDashed },
  Paid: { tone: 'green', icon: Check },
};

export const INVOICE_META: Record<InvoiceStatus, PillMeta> = PAYMENT_META;

export const RIGHTS_META: Record<RightsStatus, PillMeta> = {
  'Not live': { tone: 'gray', icon: Circle },
  Active: { tone: 'green', icon: Play },
  'Expiring soon': { tone: 'orange', icon: Hourglass },
  Expired: { tone: 'red', icon: CircleOff },
  'Extension pending': { tone: 'tint', icon: RefreshCw },
  Extended: { tone: 'gray', icon: Check },
};

export const OWNER_META: Record<Owner, PillMeta> = {
  You: { tone: 'tint', icon: UserRound },
  Brand: { tone: 'gray', icon: Store },
  Scheduled: { tone: 'gray', icon: CalendarClock },
  Clear: { tone: 'gray', icon: Check },
};

/** Fill colour for an icon tile (white glyph on a rounded square), Settings-app style. */
export const TILE_COLOR: Record<PillTone, string> = {
  red: 'var(--red)',
  orange: 'var(--orange)',
  green: 'var(--green)',
  tint: 'var(--tint)',
  gray: 'var(--gray)',
};
