import { STAGE_COUNT, stageOf } from '@/domain/stages';
import styles from './ProgressBar.module.css';

/** Eleven segments: copper up to and including the current stage, hairline after. */
export function StageSegments({ stage }: { stage: number }) {
  return (
    <div className={styles.segments} role="img" aria-label={stageOf(stage)}>
      {Array.from({ length: STAGE_COUNT }, (_, k) => (
        <div key={k} className={`${styles.segment} ${k <= stage ? styles.reached : ''}`} />
      ))}
    </div>
  );
}
