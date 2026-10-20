/**
 * Development sample data, taken from the prototype. Built around `SEED_TODAY` (2 Oct 2026)
 * so every status appears: overdue, due soon, part-paid, paid, expiring, pending, expired.
 * Open the app with `?today=2026-10-02` to see it as intended.
 */
import type {
  ActivityEntry,
  Collab,
  DataSet,
  Invoice,
  Owner,
  RightsPeriod,
  Settings,
} from '@/domain/types';
import { defaultSettings } from './settings';

export const SEED_TODAY = '2026-10-02';

const ts = (date: string) => `${date}T09:00:00.000Z`;

type CollabSeed = Partial<Collab> &
  Pick<Collab, 'id' | 'brand' | 'campaign' | 'fee' | 'stage' | 'owner'> & {
    activity: [string, string][];
  };

function collab(s: CollabSeed): { collab: Collab; activity: ActivityEntry[] } {
  const created = s.bookedOn ?? s.activity[s.activity.length - 1]?.[0] ?? SEED_TODAY;
  const c: Collab = {
    id: s.id,
    brand: s.brand,
    campaign: s.campaign,
    fee: s.fee,
    stage: s.stage,
    owner: s.owner as Owner,
    nextAction: s.nextAction ?? '',
    nextDue: s.nextDue ?? null,
    bookedOn: s.bookedOn ?? null,
    contact: s.contact ?? '',
    deliverables: s.deliverables ?? '',
    usageTerms: s.usageTerms ?? '',
    productStatus: s.productStatus ?? '',
    shootDate: s.shootDate ?? null,
    deliveredOn: s.deliveredOn ?? null,
    links: s.links ?? '',
    conceptNotes: s.conceptNotes ?? '',
    goLiveOn: s.goLiveOn ?? null,
    archived: s.archived ?? false,
    createdAt: ts(created),
    updatedAt: ts(SEED_TODAY),
  };
  const activity = s.activity.map(([on, text], i): ActivityEntry => ({
    id: `${s.id}-a${i + 1}`,
    collabId: s.id,
    on,
    text,
    kind: 'auto',
    createdAt: ts(on),
  }));
  return { collab: c, activity };
}

const SEED_COLLABS: CollabSeed[] = [
  {
    id: 'seed-northline',
    brand: 'Northline Audio',
    campaign: 'Commute earbuds reel',
    fee: 85000,
    stage: 5,
    owner: 'Brand',
    nextAction: 'Waiting on script feedback',
    nextDue: '2026-10-06',
    bookedOn: '2026-09-12',
    contact: 'Riya Menon · Brand manager',
    deliverables: '1 reel (45–60 s), 2 stories',
    usageTerms: '30 days paid usage, Instagram',
    productStatus: 'Received 18 Sep',
    shootDate: '2026-10-08',
    conceptNotes:
      'Day-in-the-life commute from Indiranagar to HSR. Hook on the noise-cancelling moment at Silk Board junction. Product on screen within the first three seconds, no voiceover until the drop. Brand wants the case colour visible in at least two shots, and the caption to mention the 40-hour battery.',
    activity: [
      ['2026-09-30', 'Script sent for review'],
      ['2026-09-18', 'Product received'],
      ['2026-09-12', 'Confirmed at ₹85,000'],
    ],
  },
  {
    id: 'seed-saffa',
    brand: 'Saffa Skincare',
    campaign: 'Monsoon routine · 3 stories, 1 reel',
    fee: 60000,
    stage: 9,
    owner: 'Brand',
    nextAction: 'Waiting on approval',
    nextDue: '2026-10-03',
    bookedOn: '2026-08-28',
    contact: 'Ankita Rao · Influencer lead',
    deliverables: '1 reel, 3 stories',
    usageTerms: 'Organic only',
    productStatus: 'Received 4 Sep',
    shootDate: '2026-09-20',
    deliveredOn: '2026-09-29',
    links: 'Drive folder shared',
    conceptNotes: 'Humid-weather routine, three steps, shot by the window in natural light.',
    activity: [
      ['2026-09-29', 'Content delivered'],
      ['2026-09-20', 'Shoot done'],
      ['2026-08-28', 'Confirmed at ₹60,000'],
    ],
  },
  {
    id: 'seed-kohl',
    brand: 'Kohl Coffee',
    campaign: 'Morning ritual reel',
    fee: 45000,
    stage: 10,
    owner: 'You',
    nextAction: 'Follow up on invoice',
    nextDue: '2026-10-02',
    bookedOn: '2026-08-10',
    contact: 'Dev Shah · Marketing',
    deliverables: '1 reel (30 s)',
    usageTerms: '30 days paid usage, Instagram',
    productStatus: 'Received 22 Aug',
    shootDate: '2026-08-28',
    deliveredOn: '2026-09-02',
    links: 'instagram.com/reel/…',
    conceptNotes: 'Pour-over at 7 am, one continuous shot, ambient sound only.',
    goLiveOn: '2026-09-05',
    activity: [
      ['2026-09-28', 'Followed up on INV-2026-031'],
      ['2026-09-09', 'Invoice INV-2026-031 recorded · ₹45,000'],
      ['2026-09-05', 'Went live on Instagram · 30-day rights'],
    ],
  },
  {
    id: 'seed-tidewear',
    brand: 'Tidewear',
    campaign: 'Festive lookbook carousel',
    fee: 120000,
    stage: 6,
    owner: 'You',
    nextAction: 'Shoot lookbook',
    nextDue: '2026-10-04',
    bookedOn: '2026-09-20',
    contact: 'Meera Iyer · Brand partnerships',
    deliverables: '1 carousel (8 frames), 1 reel',
    usageTerms: '60 days paid usage, Instagram and Meta ads',
    productStatus: 'Received 26 Sep',
    shootDate: '2026-10-04',
    conceptNotes:
      'Four festive looks, rooftop at golden hour. Carousel ends on the full family of colours.',
    activity: [
      ['2026-09-30', 'Moodboard approved'],
      ['2026-09-22', 'Advance invoice INV-2026-035 recorded · ₹60,000'],
      ['2026-09-20', 'Confirmed at ₹1,20,000'],
    ],
  },
  {
    id: 'seed-pace',
    brand: 'Pace Running',
    campaign: 'Marathon prep series · 3 reels',
    fee: 150000,
    stage: 3,
    owner: 'Scheduled',
    nextAction: 'Shoes arriving',
    nextDue: '2026-10-07',
    bookedOn: '2026-10-01',
    contact: 'Karan Gill · Community',
    deliverables: '3 reels across 6 weeks',
    usageTerms: '90 days paid usage, Instagram and YouTube Shorts',
    productStatus: 'Dispatched 30 Sep',
    conceptNotes: 'Training block for the Bengaluru 10K: week one, mid-block, race day.',
    activity: [['2026-10-01', 'Confirmed at ₹1,50,000']],
  },
  {
    id: 'seed-mitti',
    brand: 'Mitti Home',
    campaign: 'Diwali gifting reel',
    fee: null,
    stage: 0,
    owner: 'You',
    nextAction: 'Send rate card',
    nextDue: '2026-10-03',
    contact: 'hello@mittihome.in',
    activity: [['2026-09-30', 'Inbound enquiry on email']],
  },
  {
    id: 'seed-lumen',
    brand: 'Lumen Studio',
    campaign: 'Desk setup reel',
    fee: 70000,
    stage: 10,
    owner: 'Brand',
    nextAction: 'Waiting on extension reply',
    nextDue: '2026-10-05',
    bookedOn: '2026-07-30',
    contact: 'Neha Kapoor · Growth',
    deliverables: '1 reel',
    usageTerms: '30 days paid usage, Instagram',
    productStatus: 'Received 4 Aug',
    shootDate: '2026-08-10',
    deliveredOn: '2026-08-16',
    links: 'instagram.com/reel/…',
    conceptNotes: 'Night desk setup, warm lamp, slow pans.',
    goLiveOn: '2026-08-20',
    activity: [
      ['2026-09-30', 'Asked about extension'],
      ['2026-09-05', 'Payment received · ₹70,000'],
      ['2026-08-20', 'Went live on Instagram · 30-day rights'],
    ],
  },
  {
    id: 'seed-halden',
    brand: 'Halden Watches',
    campaign: 'Everyday watch reel',
    fee: 95000,
    stage: 10,
    owner: 'Brand',
    nextAction: 'Balance due 8 Oct',
    nextDue: '2026-10-08',
    bookedOn: '2026-09-02',
    contact: 'Arjun Bose · Brand',
    deliverables: '1 reel, 1 static post',
    usageTerms: '60 days paid usage, Instagram',
    productStatus: 'Received 6 Sep',
    shootDate: '2026-09-09',
    deliveredOn: '2026-09-12',
    links: 'instagram.com/reel/…',
    conceptNotes: 'Wrist-level POV through a working day.',
    goLiveOn: '2026-09-15',
    activity: [
      ['2026-10-01', 'Part-payment received · ₹50,000'],
      ['2026-09-18', 'Invoice INV-2026-034 recorded · ₹95,000'],
      ['2026-09-15', 'Went live on Instagram · 60-day rights'],
    ],
  },
  {
    id: 'seed-verde',
    brand: 'Verde Bottles',
    campaign: 'Hydration habit reel',
    fee: 40000,
    stage: 1,
    owner: 'Brand',
    nextAction: 'Awaiting counter-offer',
    nextDue: '2026-10-05',
    contact: 'Sana Q · Marketing',
    deliverables: '1 reel',
    activity: [['2026-09-29', 'Rate card sent · ₹40,000']],
  },
  {
    id: 'seed-kohl-coldbrew',
    brand: 'Kohl Coffee',
    campaign: 'Cold brew launch',
    fee: 55000,
    stage: 10,
    owner: 'Clear',
    bookedOn: '2026-06-10',
    archived: true,
    contact: 'Dev Shah · Marketing',
    deliverables: '1 reel',
    usageTerms: '30 days paid usage',
    deliveredOn: '2026-06-28',
    goLiveOn: '2026-07-01',
    activity: [['2026-07-20', 'Payment received · ₹55,000']],
  },
];

function invoice(
  i: Omit<Invoice, 'createdAt' | 'updatedAt' | 'payments'> & {
    payments?: [string, number][];
  },
): Invoice {
  return {
    ...i,
    payments: (i.payments ?? []).map(([on, amount], k) => ({
      id: `${i.id}-p${k + 1}`,
      on,
      amount,
    })),
    createdAt: ts(i.issuedOn),
    updatedAt: ts(SEED_TODAY),
  };
}

const SEED_INVOICES: Invoice[] = [
  invoice({
    id: 'seed-inv-031',
    collabId: 'seed-kohl',
    number: 'INV-2026-031',
    kind: 'Content fee',
    amount: 45000,
    issuedOn: '2026-09-09',
    dueOn: '2026-09-24',
    followUpOn: '2026-10-02',
  }),
  invoice({
    id: 'seed-inv-027',
    collabId: 'seed-lumen',
    number: 'INV-2026-027',
    kind: 'Content fee',
    amount: 70000,
    issuedOn: '2026-08-22',
    dueOn: '2026-09-06',
    followUpOn: null,
    payments: [['2026-09-05', 70000]],
  }),
  invoice({
    id: 'seed-inv-034',
    collabId: 'seed-halden',
    number: 'INV-2026-034',
    kind: 'Content fee',
    amount: 95000,
    issuedOn: '2026-09-18',
    dueOn: '2026-10-08',
    followUpOn: '2026-10-06',
    payments: [['2026-10-01', 50000]],
  }),
  invoice({
    id: 'seed-inv-035',
    collabId: 'seed-tidewear',
    number: 'INV-2026-035',
    kind: 'Advance',
    amount: 60000,
    issuedOn: '2026-09-22',
    dueOn: '2026-10-20',
    followUpOn: '2026-10-09',
  }),
  invoice({
    id: 'seed-inv-022',
    collabId: 'seed-kohl-coldbrew',
    number: 'INV-2026-022',
    kind: 'Content fee',
    amount: 55000,
    issuedOn: '2026-07-02',
    dueOn: '2026-07-17',
    followUpOn: null,
    payments: [['2026-07-20', 55000]],
  }),
];

function rights(r: Omit<RightsPeriod, 'createdAt' | 'updatedAt'>): RightsPeriod {
  return { ...r, createdAt: ts(r.startOn), updatedAt: ts(SEED_TODAY) };
}

const SEED_RIGHTS: RightsPeriod[] = [
  rights({
    id: 'seed-r-kohl',
    collabId: 'seed-kohl',
    platform: 'Instagram',
    startOn: '2026-09-05',
    days: 30,
    isExtension: false,
    extensionPending: false,
  }),
  rights({
    id: 'seed-r-lumen',
    collabId: 'seed-lumen',
    platform: 'Instagram',
    startOn: '2026-08-20',
    days: 30,
    isExtension: false,
    extensionPending: true,
  }),
  rights({
    id: 'seed-r-halden',
    collabId: 'seed-halden',
    platform: 'Instagram',
    startOn: '2026-09-15',
    days: 60,
    isExtension: false,
    extensionPending: false,
  }),
  rights({
    id: 'seed-r-coldbrew',
    collabId: 'seed-kohl-coldbrew',
    platform: 'Instagram',
    startOn: '2026-07-01',
    days: 30,
    isExtension: false,
    extensionPending: false,
  }),
];

export function buildSeed(): { data: DataSet; settings: Settings } {
  const built = SEED_COLLABS.map(collab);
  const settings: Settings = {
    ...defaultSettings(2026),
    name: 'Sarthak',
    invoiceNext: 36,
    lastBackupOn: '2026-09-21',
  };
  return {
    data: {
      collabs: built.map((b) => b.collab),
      activity: built.flatMap((b) => b.activity),
      invoices: SEED_INVOICES,
      rights: SEED_RIGHTS,
    },
    settings,
  };
}
