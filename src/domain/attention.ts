/**
 * The Home "Needs you" feed. Pure: data + today in, sorted items out.
 *
 * | Weight | Rule                                             |
 * | 0      | Invoice overdue                                  |
 * | 1      | Rights period expiring soon                      |
 * | 2      | Unpaid invoice whose follow-up date has arrived  |
 * | 3      | Your next action due within 2 days (or overdue)  |
 * | 4      | Brand's reply due between 3 days ago and tomorrow |
 */
import { diffDays, relativeDayInline } from '@/lib/dates';
import { inr } from '@/lib/money';
import type { DataIndex } from './dataIndex';
import { invoicesOf, rightsOf } from './dataIndex';
import {
  invoiceRemaining,
  invoiceStatus,
  rightsDaysLeft,
  rightsEndOn,
  rightsStatus,
} from './status';
import type { DateStr } from './types';

export type AttentionRule = 'overdue' | 'rights' | 'follow-up' | 'you' | 'brand';

export interface AttentionItem {
  weight: 0 | 1 | 2 | 3 | 4;
  rule: AttentionRule;
  collabId: string;
  title: string;
  subtitle: string;
  /** Tie-break within a weight: the earlier date is more urgent. */
  sortDate: DateStr;
}

export const ATTENTION_LIMIT = 5;

const PAYMENT_WORDS = /\b(invoice|payment|paid|balance)\b/i;

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

/** "Send rate card" → "send rate card", keeping acronyms such as "INV-…" intact. */
function lowerFirst(s: string): string {
  if (!s) return s;
  const second = s.charAt(1);
  return second && second === second.toUpperCase() && /[A-Z]/.test(second)
    ? s
    : s.charAt(0).toLowerCase() + s.slice(1);
}

/** All attention items, de-duplicated and sorted. Use `ATTENTION_LIMIT` to cap for display. */
export function buildAttention(index: DataIndex, today: DateStr): AttentionItem[] {
  const items: AttentionItem[] = [];
  const seen = new Set<string>();
  const add = (item: AttentionItem) => {
    const key = `${item.collabId}:${item.rule}`;
    if (seen.has(key)) return;
    seen.add(key);
    items.push(item);
  };

  const live = index.data.collabs.filter((c) => !c.archived);

  for (const c of live) {
    for (const inv of invoicesOf(index, c.id)) {
      const status = invoiceStatus(inv, today);
      if (status === 'Paid') continue;
      const open = invoiceRemaining(inv);
      if (status === 'Overdue') {
        const late = diffDays(inv.dueOn, today);
        add({
          weight: 0,
          rule: 'overdue',
          collabId: c.id,
          title: `${c.brand} · invoice overdue`,
          subtitle: `${inr(open)} · ${plural(late, 'day')} late · follow up`,
          sortDate: inv.dueOn,
        });
      } else if (inv.followUpOn && diffDays(inv.followUpOn, today) >= 0) {
        add({
          weight: 2,
          rule: 'follow-up',
          collabId: c.id,
          title: `${c.brand} · follow up on payment`,
          subtitle: `${inv.number} · ${inr(open)} open`,
          sortDate: inv.followUpOn,
        });
      }
    }

    for (const p of rightsOf(index, c.id)) {
      if (rightsStatus(p, today) !== 'Expiring soon') continue;
      const left = rightsDaysLeft(p, today);
      add({
        weight: 1,
        rule: 'rights',
        collabId: c.id,
        title: `${c.brand} · rights end in ${plural(left, 'day')}`,
        subtitle: 'Ask about extension',
        sortDate: rightsEndOn(p),
      });
    }
  }

  for (const c of live) {
    if (!c.nextDue || !c.nextAction.trim()) continue;
    // A payment chase is already on the list for this collab; don't repeat it as a next action.
    const chased = seen.has(`${c.id}:overdue`) || seen.has(`${c.id}:follow-up`);
    if (chased && PAYMENT_WORDS.test(c.nextAction)) continue;
    const n = diffDays(today, c.nextDue);
    const when = relativeDayInline(c.nextDue, today);
    if (c.owner === 'You' && n <= 2) {
      add({
        weight: 3,
        rule: 'you',
        collabId: c.id,
        title: `${c.brand} · ${lowerFirst(c.nextAction)}`,
        subtitle: `Waiting on you · ${when}`,
        sortDate: c.nextDue,
      });
    } else if (c.owner === 'Brand' && n >= -3 && n <= 1) {
      add({
        weight: 4,
        rule: 'brand',
        collabId: c.id,
        title: `${c.brand} · ${lowerFirst(c.nextAction)}`,
        subtitle: `Brand reply due ${when}`,
        sortDate: c.nextDue,
      });
    }
  }

  return items.sort((a, b) => a.weight - b.weight || a.sortDate.localeCompare(b.sortDate));
}

/** "4 things need you today." / "One thing needs you today." / "All clear for today." */
export function attentionSummary(count: number): string {
  if (count === 0) return 'All clear for today.';
  if (count === 1) return 'One thing needs you today.';
  return `${count} things need you today.`;
}
