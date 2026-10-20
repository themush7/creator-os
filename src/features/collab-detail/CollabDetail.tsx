import { Archive, ArchiveRestore, ChevronLeft, Ellipsis, Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAppData } from '@/app/data';
import { useSheets, type DetailsSection } from '@/app/sheets';
import { useToday } from '@/app/today';
import { useAction } from '@/app/useAction';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { IconButton } from '@/components/IconButton';
import { Menu } from '@/components/Menu';
import { InvoicePill, OwnerPill, PaymentPill, Pill, RightsPill } from '@/components/Pill';
import { ProgressBar } from '@/components/ProgressBar';
import { StageSegments } from '@/components/StageSegments';
import { askExtension, setArchived } from '@/domain/actions';
import { activityOf, invoicesOf, rightsOf } from '@/domain/dataIndex';
import { BRAND_APPROVAL, COMPLETE, DELIVERED, stageName, stageOf } from '@/domain/stages';
import {
  collabPaymentStatus,
  collabRightsStatus,
  currentRightsPeriod,
  invoiceCash,
  invoiceProgress,
  invoiceRemaining,
  invoiceSettled,
  invoiceStatus,
  invoiceTds,
  rightsDaysLeft,
  rightsEndOn,
  rightsEnded,
  rightsStarted,
  rightsStatus,
} from '@/domain/status';
import type { Collab, Invoice, RightsPeriod } from '@/domain/types';
import { formatShort, relativeDayInline } from '@/lib/dates';
import { inr, sum } from '@/lib/money';
import { SectionHeader, Skeleton, sharedStyles } from '../shared/List';
import styles from './Detail.module.css';

type Field = [label: string, value: string | null | undefined];

const TAB_PATHS: Record<string, string> = {
  Home: '/',
  Collabs: '/collabs',
  Payments: '/payments',
  Rights: '/rights',
};

export function CollabDetail() {
  const { id = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const today = useToday();
  const run = useAction();
  const { openSheet } = useSheets();
  const { ready, index } = useAppData();
  const [showNotes, setShowNotes] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const moreRef = useRef<HTMLButtonElement>(null);

  const from = (location.state as { from?: string } | null)?.from;
  const backLabel = from ?? 'Collabs';
  const collab = index.collabById.get(id);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (collab) document.title = `${collab.brand} · Creator OS`;
  }, [collab]);

  // Step back through history when we arrived from inside the app; otherwise (deep link,
  // fresh launch) go to the named tab so Back never leaves the app.
  const canStepBack = !!from && ((window.history.state as { idx?: number } | null)?.idx ?? 0) > 0;
  const goBack = () => (canStepBack ? navigate(-1) : navigate(TAB_PATHS[backLabel] ?? '/collabs'));

  const invoices = useMemo(
    () => [...invoicesOf(index, id)].sort((a, b) => b.issuedOn.localeCompare(a.issuedOn)),
    [index, id],
  );
  const rights = useMemo(
    () => [...rightsOf(index, id)].sort((a, b) => b.startOn.localeCompare(a.startOn)),
    [index, id],
  );
  const activity = useMemo(
    () =>
      [...activityOf(index, id)].sort(
        (a, b) => b.on.localeCompare(a.on) || b.createdAt.localeCompare(a.createdAt),
      ),
    [index, id],
  );

  const bar = (
    <div className={`${styles.bar} ${scrolled ? styles.barScrolled : ''}`}>
      <button type="button" className={`${styles.back} pressable`} onClick={goBack}>
        <ChevronLeft size={24} strokeWidth={2.2} aria-hidden />
        <span className="ellipsis">{backLabel}</span>
      </button>
      <span className={`${styles.barTitle} ellipsis`} aria-hidden>
        {collab?.brand}
      </span>
      {collab && (
        <IconButton
          ref={moreRef}
          icon={Ellipsis}
          label="More actions"
          className={styles.more}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(true)}
        />
      )}
    </div>
  );

  if (!ready) {
    return (
      <>
        {bar}
        <div className={styles.body}>
          <Skeleton height={120} />
          <Skeleton height={180} count={2} />
        </div>
      </>
    );
  }

  if (!collab) {
    return (
      <>
        {bar}
        <EmptyState>This collaboration no longer exists.</EmptyState>
      </>
    );
  }

  const c = collab;
  const payment = collabPaymentStatus(invoices, today);
  const rightsNow = collabRightsStatus(rights, today);
  const current = currentRightsPeriod(rights);
  const open = sum(invoices.map(invoiceRemaining));
  const settled = sum(invoices.map(invoiceSettled));

  const paymentText = invoices.length
    ? open > 0
      ? `${inr(open)} outstanding`
      : `${inr(settled)} received`
    : c.fee !== null
      ? `${inr(c.fee)} agreed`
      : 'Fee not set';
  const rightsText = current
    ? `${rightsStatus(current, today) === 'Expired' ? 'Ended' : 'Ends'} ${formatShort(rightsEndOn(current))}`
    : 'Starts at go-live';
  const nextText = `${c.nextAction || 'No next action'}${c.nextDue ? ` · ${relativeDayInline(c.nextDue, today)}` : ''}`;

  const approval =
    c.stage >= COMPLETE ? 'Approved' : c.stage === BRAND_APPROVAL ? 'Waiting on brand' : null;
  const sections: { key: DetailsSection; title: string; fields: Field[] }[] = [
    {
      key: 'terms',
      title: 'Deliverables & terms',
      fields: [
        ['Contact', c.contact],
        ['Deliverables', c.deliverables],
        ['Fee', c.fee !== null ? inr(c.fee) : null],
        ['Usage', c.usageTerms],
      ],
    },
    {
      key: 'production',
      title: 'Production',
      fields: [
        ['Product', c.productStatus],
        ['Shoot', c.shootDate && formatShort(c.shootDate)],
      ],
    },
    {
      key: 'delivery',
      title: 'Delivery & approval',
      fields: [
        ['Delivered', c.deliveredOn && formatShort(c.deliveredOn)],
        ['Links', c.links],
        ['Approval', approval],
        ['Go-live', c.goLiveOn && formatShort(c.goLiveOn)],
      ],
    },
  ];

  const archiveToggle = () =>
    run((ctx) => setArchived(ctx, c.id, !c.archived), {
      toast: c.archived ? 'Restored from archive.' : 'Archived.',
      undoable: true,
    });

  return (
    <>
      {bar}
      <header className={styles.head}>
        <div className={styles.brandLine}>
          <span className="t-subhead secondary">{c.brand}</span>
          {c.archived && <Pill tone="gray" icon={Archive} label="Archived" />}
        </div>
        <h1 className={`t-title1 ${styles.campaign}`}>{c.campaign}</h1>
        <div className={styles.segments}>
          <StageSegments stage={c.stage} />
        </div>
        <div className={styles.stageLine}>
          <span style={{ fontWeight: 600 }}>{stageName(c.stage)}</span>
          <span className="secondary num">{stageOf(c.stage)}</span>
        </div>
      </header>

      <div className={styles.body}>
        <Card variant="flush" aria-label="Status">
          <div className={styles.signal}>
            <span className={sharedStyles.footnote}>Next action</span>
            <span className={styles.signalLine}>
              <OwnerPill owner={c.owner} />
              <span>{nextText}</span>
            </span>
          </div>
          <div className={styles.signal}>
            <span className={sharedStyles.footnote}>Payment</span>
            <span className={styles.signalLine}>
              <PaymentPill status={payment} />
              <span className="num">{paymentText}</span>
            </span>
          </div>
          <div className={styles.signal}>
            <span className={sharedStyles.footnote}>Rights</span>
            <span className={styles.signalLine}>
              <RightsPill status={rightsNow} />
              <span>{rightsText}</span>
            </span>
          </div>
        </Card>

        {sections.map((s) => (
          <section key={s.key} className={sharedStyles.stack} aria-labelledby={`sec-${s.key}`}>
            <SectionHeader
              id={`sec-${s.key}`}
              title={s.title}
              aside={
                <Button
                  variant="plain"
                  onClick={() => openSheet({ type: 'details', collabId: c.id, section: s.key })}
                >
                  Edit
                </Button>
              }
            />
            <Card variant="flush">
              {s.fields.map(([label, value], i) => (
                <button
                  key={label}
                  type="button"
                  className={`${styles.fieldRow} row-press`}
                  style={i ? { borderTop: '0.5px solid var(--separator)' } : undefined}
                  onClick={() => openSheet({ type: 'details', collabId: c.id, section: s.key })}
                >
                  <span className={styles.fieldLabel}>{label}</span>
                  <span className={`${styles.fieldValue} ${value ? '' : styles.notSet}`}>
                    {value || 'Not set'}
                  </span>
                </button>
              ))}
            </Card>
          </section>
        ))}

        <section className={sharedStyles.stack} aria-labelledby="sec-notes">
          <SectionHeader
            id="sec-notes"
            title="Concept notes"
            aside={
              <Button variant="plain" onClick={() => openSheet({ type: 'notes', collabId: c.id })}>
                Edit
              </Button>
            }
          />
          <Card>
            {c.conceptNotes ? (
              <>
                <p id="concept" className={`${styles.notes} ${showNotes ? '' : styles.clamped}`}>
                  {c.conceptNotes}
                </p>
                <Button
                  variant="plain"
                  aria-expanded={showNotes}
                  aria-controls="concept"
                  onClick={() => setShowNotes((v) => !v)}
                >
                  {showNotes ? 'Show less' : 'Show notes'}
                </Button>
              </>
            ) : (
              <p className={`${styles.notes} ${styles.notSet}`}>No notes yet.</p>
            )}
          </Card>
        </section>

        <InvoicesCard collab={c} invoices={invoices} />
        <RightsCard
          collab={c}
          rights={rights}
          onAsk={(p) =>
            run((ctx) => askExtension(ctx, p.id), {
              toast: 'Marked as extension pending.',
              undoable: true,
            })
          }
        />

        <section className={sharedStyles.stack} aria-labelledby="sec-activity">
          <SectionHeader id="sec-activity" title="Activity" />
          <Card variant="flush">
            {activity.length ? (
              <ol>
                {activity.map((a) => (
                  <li key={a.id} className={styles.activity}>
                    <span className={styles.activityDate}>{formatShort(a.on)}</span>
                    <span className={styles.activityText}>
                      {a.kind === 'note' && <span className={styles.noteMark}>Note · </span>}
                      {a.text}
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className={styles.empty}>No activity yet.</p>
            )}
          </Card>
        </section>
      </div>

      <div className={styles.actions}>
        <Button
          variant="gray"
          icon={Plus}
          large
          onClick={() => openSheet({ type: 'note', collabId: c.id })}
        >
          Note
        </Button>
        <div className={styles.actionMain}>
          <Button fullWidth large onClick={() => openSheet({ type: 'stage', collabId: c.id })}>
            Update stage
          </Button>
        </div>
      </div>

      <Menu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        anchor={moreRef.current}
        label="More actions"
        items={[
          {
            label: 'Edit basics',
            icon: Pencil,
            onSelect: () => openSheet({ type: 'details', collabId: c.id, section: 'basics' }),
          },
          c.archived
            ? { label: 'Unarchive', icon: ArchiveRestore, onSelect: archiveToggle }
            : { label: 'Archive', icon: Archive, onSelect: archiveToggle },
          {
            label: 'Delete',
            icon: Trash2,
            destructive: true,
            onSelect: () => openSheet({ type: 'delete', collabId: c.id }),
          },
        ]}
      />
    </>
  );
}

function InvoicesCard({ collab, invoices }: { collab: Collab; invoices: Invoice[] }) {
  const today = useToday();
  const { openSheet } = useSheets();
  return (
    <section className={sharedStyles.stack} aria-labelledby="sec-invoices">
      <SectionHeader
        id="sec-invoices"
        title="Invoices & payments"
        aside={
          <Button
            variant="compact"
            icon={Plus}
            onClick={() => openSheet({ type: 'invoice', collabId: collab.id })}
          >
            Invoice
          </Button>
        }
      />
      <Card variant="flush">
        {invoices.length ? (
          invoices.map((inv) => {
            const status = invoiceStatus(inv, today);
            const tds = invoiceTds(inv);
            const unpaid = invoiceRemaining(inv) > 0;
            return (
              <div key={inv.id} className={styles.block}>
                <div className={styles.blockTop}>
                  <div className={sharedStyles.stack} style={{ gap: 1 }}>
                    <span className="t-headline">{inv.number}</span>
                    <span className={sharedStyles.footnote}>{inv.kind}</span>
                  </div>
                  <span className={`${sharedStyles.money} t-headline`}>{inr(inv.amount)}</span>
                </div>
                <ProgressBar
                  value={invoiceProgress(inv)}
                  tone="green"
                  label={`${inv.number} paid`}
                />
                <div className={styles.blockLine}>
                  <InvoicePill status={status} />
                  <span className="num">
                    {inr(invoiceCash(inv))} of {inr(inv.amount)} received
                    {tds ? ` · TDS ${inr(tds)}` : ''}
                  </span>
                </div>
                <span className={sharedStyles.footnote}>
                  Issued {formatShort(inv.issuedOn)} · due {formatShort(inv.dueOn)}
                  {unpaid && inv.followUpOn ? ` · follow up ${formatShort(inv.followUpOn)}` : ''}
                </span>
                {unpaid && (
                  <div className={styles.blockAction}>
                    <Button
                      variant="secondary"
                      fullWidth
                      onClick={() => openSheet({ type: 'payment', invoiceId: inv.id })}
                    >
                      Record payment
                    </Button>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <p className={styles.empty}>Not invoiced yet.</p>
        )}
      </Card>
    </section>
  );
}

function RightsCard({
  collab,
  rights,
  onAsk,
}: {
  collab: Collab;
  rights: RightsPeriod[];
  onAsk: (p: RightsPeriod) => void;
}) {
  const today = useToday();
  const { openSheet } = useSheets();
  const canLive = collab.stage >= DELIVERED && rights.length === 0;
  return (
    <section className={sharedStyles.stack} aria-labelledby="sec-rights">
      <SectionHeader id="sec-rights" title="Ad rights" />
      <Card variant="flush">
        {rights.map((p) => {
          const status = rightsStatus(p, today);
          const left = rightsDaysLeft(p, today);
          const days =
            status === 'Extended'
              ? ''
              : !rightsStarted(p, today)
                ? `Starts ${formatShort(p.startOn)}`
                : rightsEnded(p, today)
                  ? `Ended ${formatShort(rightsEndOn(p))}`
                  : `${left} ${left === 1 ? 'day' : 'days'} left`;
          return (
            <div key={p.id} className={styles.block}>
              <div className={styles.blockTop}>
                <div className={sharedStyles.stack} style={{ gap: 1 }}>
                  <span className="t-headline">
                    {p.platform}
                    {p.isExtension ? ' · extension' : ''}
                  </span>
                  <span className={sharedStyles.footnote}>
                    {formatShort(p.startOn)} – {formatShort(rightsEndOn(p))} · {p.days} days
                  </span>
                </div>
                <span className="t-subhead num" style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                  {days}
                </span>
              </div>
              <div className={styles.blockLine}>
                <RightsPill status={status} />
              </div>
              {(status === 'Expiring soon' || status === 'Expired') && (
                <Button variant="secondary" fullWidth onClick={() => onAsk(p)}>
                  Ask about extension
                </Button>
              )}
              {status === 'Extension pending' && (
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={() => openSheet({ type: 'extend', periodId: p.id })}
                >
                  Record extension
                </Button>
              )}
            </div>
          );
        })}
        {!rights.length && (
          <p className={styles.empty}>
            {collab.stage >= DELIVERED
              ? 'Not live yet. Rights start on the go-live date.'
              : 'Rights start once the content goes live.'}
          </p>
        )}
        {canLive && (
          <div className={styles.block} style={{ paddingTop: 0 }}>
            <Button
              variant="secondary"
              fullWidth
              onClick={() => openSheet({ type: 'live', collabId: collab.id })}
            >
              Mark live
            </Button>
          </div>
        )}
      </Card>
    </section>
  );
}
