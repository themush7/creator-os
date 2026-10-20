/**
 * Context quick actions offered in the Update stage sheet. Pure: decides what to offer;
 * `actions.runQuickAction` carries them out.
 */
import {
  BRAND_APPROVAL,
  COMPLETE,
  CONCEPT,
  DELIVERED,
  EDITING,
  PRODUCT_IN_TRANSIT,
  READY_TO_SHOOT,
  SCRIPT_REVIEW,
} from './stages';
import type { Collab, Owner } from './types';

export type QuickActionId =
  | 'product-received'
  | 'send-script'
  | 'script-approved'
  | 'mark-delivered'
  | 'mark-approved'
  | 'mark-live'
  | 'record-invoice'
  | 'record-payment';

export interface QuickAction {
  id: QuickActionId;
  label: string;
}

/** Stage transitions behind the quick actions that only move the pipeline. */
export const STAGE_TRANSITIONS: Partial<
  Record<
    QuickActionId,
    { to: number; owner: Owner; nextAction: string; log: string; dueInDays: number | null }
  >
> = {
  'product-received': {
    to: CONCEPT,
    owner: 'You',
    nextAction: 'Write concept',
    log: 'Product received',
    dueInDays: null,
  },
  'send-script': {
    to: SCRIPT_REVIEW,
    owner: 'Brand',
    nextAction: 'Waiting on script feedback',
    log: 'Script sent for review',
    dueInDays: 3,
  },
  'script-approved': {
    to: READY_TO_SHOOT,
    owner: 'You',
    nextAction: 'Shoot',
    log: 'Script approved',
    dueInDays: null,
  },
  'mark-delivered': {
    to: BRAND_APPROVAL,
    owner: 'Brand',
    nextAction: 'Waiting on approval',
    log: 'Content delivered',
    dueInDays: 3,
  },
  'mark-approved': {
    to: COMPLETE,
    owner: 'You',
    nextAction: 'Record invoice',
    log: 'Brand approved content',
    dueInDays: 0,
  },
};

export function quickActionsFor(
  collab: Collab,
  hasRights: boolean,
  hasUnpaidInvoice: boolean,
): QuickAction[] {
  const s = collab.stage;
  const out: QuickAction[] = [];
  if (s === PRODUCT_IN_TRANSIT)
    out.push({ id: 'product-received', label: 'Mark product received' });
  if (s === CONCEPT) out.push({ id: 'send-script', label: 'Send script for review' });
  if (s === SCRIPT_REVIEW) out.push({ id: 'script-approved', label: 'Mark script approved' });
  if (s === READY_TO_SHOOT || s === EDITING)
    out.push({ id: 'mark-delivered', label: 'Mark delivered' });
  if (s === DELIVERED || s === BRAND_APPROVAL)
    out.push({ id: 'mark-approved', label: 'Mark approved' });
  if (s >= DELIVERED && !hasRights) out.push({ id: 'mark-live', label: 'Mark live' });
  out.push({ id: 'record-invoice', label: 'Record invoice' });
  if (hasUnpaidInvoice) out.push({ id: 'record-payment', label: 'Record payment' });
  return out;
}
