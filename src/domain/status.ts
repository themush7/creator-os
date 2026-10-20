/** Status vocabularies. Derivations are added in phase 2. */
export const INVOICE_STATUSES = ['Paid', 'Overdue', 'Part-paid', 'Due soon', 'Invoiced'] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export type PaymentStatus = InvoiceStatus | 'Not invoiced';

export const RIGHTS_STATUSES = [
  'Extended',
  'Extension pending',
  'Expired',
  'Expiring soon',
  'Active',
] as const;
export type RightsStatus = (typeof RIGHTS_STATUSES)[number] | 'Not live';
