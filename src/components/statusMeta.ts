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

export type PillTone = 'attention' | 'alert' | 'neutral' | 'quiet';

export interface PillMeta {
  tone: PillTone;
  icon: LucideIcon;
}

export const PAYMENT_META: Record<PaymentStatus, PillMeta> = {
  'Not invoiced': { tone: 'quiet', icon: File },
  Invoiced: { tone: 'neutral', icon: FileText },
  'Due soon': { tone: 'attention', icon: Clock },
  Overdue: { tone: 'alert', icon: CircleAlert },
  'Part-paid': { tone: 'neutral', icon: CircleDashed },
  Paid: { tone: 'quiet', icon: Check },
};

export const INVOICE_META: Record<InvoiceStatus, PillMeta> = PAYMENT_META;

export const RIGHTS_META: Record<RightsStatus, PillMeta> = {
  'Not live': { tone: 'quiet', icon: Circle },
  Active: { tone: 'neutral', icon: Play },
  'Expiring soon': { tone: 'attention', icon: Hourglass },
  Expired: { tone: 'alert', icon: CircleOff },
  'Extension pending': { tone: 'neutral', icon: RefreshCw },
  Extended: { tone: 'quiet', icon: Check },
};

export const OWNER_META: Record<Owner, PillMeta> = {
  You: { tone: 'attention', icon: UserRound },
  Brand: { tone: 'neutral', icon: Store },
  Scheduled: { tone: 'neutral', icon: CalendarClock },
  Clear: { tone: 'quiet', icon: Check },
};
