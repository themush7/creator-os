import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { OwnerPill, PaymentPill, RightsPill } from '@/components/Pill';
import { ProgressBar } from '@/components/ProgressBar';
import { invoicesOf, rightsOf, type DataIndex } from '@/domain/dataIndex';
import { DELIVERED, stageName, stageProgress, stageShort } from '@/domain/stages';
import { collabPaymentStatus, collabRightsStatus, isNextDueUrgent } from '@/domain/status';
import type { Collab, DateStr } from '@/domain/types';
import { relativeDay } from '@/lib/dates';
import { inr } from '@/lib/money';
import styles from './shared.module.css';

interface Props {
  collab: Collab;
  index: DataIndex;
  today: DateStr;
  /** Tab name for the detail screen's back button. */
  from: string;
}

function CollabCardImpl({ collab: c, index, today, from }: Props) {
  const navigate = useNavigate();
  const stage = stageName(c.stage);
  const showMoney = c.stage >= DELIVERED;
  const payment = showMoney ? collabPaymentStatus(invoicesOf(index, c.id), today) : null;
  const rights = showMoney ? collabRightsStatus(rightsOf(index, c.id), today) : null;
  const urgent = isNextDueUrgent(c, today);

  return (
    <button
      type="button"
      className={`${styles.card} pressable`}
      aria-label={`${c.brand}, ${c.campaign}, ${stage}, ${c.owner} next`}
      onClick={() => navigate(`/collabs/${c.id}`, { state: { from } })}
    >
      <div className={styles.cardTop}>
        <div className={styles.cardNames}>
          <span className="t-headline">{c.brand}</span>
          <span className="t-subhead secondary ellipsis">{c.campaign}</span>
        </div>
        {c.fee !== null ? (
          <span className={styles.fee}>{inr(c.fee)}</span>
        ) : (
          <span className={styles.feeMissing}>Fee not set</span>
        )}
      </div>
      <div>
        <div className={styles.stageLine}>
          <span>{stage}</span>
          <span className="num">{stageShort(c.stage)}</span>
        </div>
        <ProgressBar value={stageProgress(c.stage)} />
      </div>
      <div className={styles.nextLine}>
        <OwnerPill owner={c.owner} />
        <span className={`${styles.nextText} ellipsis`}>{c.nextAction || 'No next action'}</span>
        {c.nextDue && (
          <span className={`${styles.due} ${urgent ? styles.dueUrgent : ''}`}>
            {relativeDay(c.nextDue, today)}
          </span>
        )}
      </div>
      {payment && rights && (
        <div className={styles.cardFoot}>
          <PaymentPill status={payment} />
          <RightsPill status={rights} />
        </div>
      )}
    </button>
  );
}

/** Memoised: typing in search or switching filters does not re-render cards whose props are unchanged. */
export const CollabCard = memo(CollabCardImpl);
