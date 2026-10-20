export const STAGES = [
  'Lead',
  'Negotiating',
  'Confirmed',
  'Product in transit',
  'Concept',
  'Script review',
  'Ready to shoot',
  'Editing',
  'Delivered',
  'Brand approval',
  'Complete',
] as const;

export type StageName = (typeof STAGES)[number];

export const STAGE_COUNT = STAGES.length;
export const FIRST_STAGE = 0;
export const CONFIRMED = 2;
export const PRODUCT_IN_TRANSIT = 3;
export const CONCEPT = 4;
export const SCRIPT_REVIEW = 5;
export const READY_TO_SHOOT = 6;
export const EDITING = 7;
export const DELIVERED = 8;
export const BRAND_APPROVAL = 9;
export const COMPLETE = 10;

export function stageName(stage: number): StageName {
  return STAGES[clampStage(stage)] as StageName;
}

export function clampStage(stage: number): number {
  return Math.min(COMPLETE, Math.max(FIRST_STAGE, Math.trunc(stage)));
}

/** "Stage 6 of 11" */
export function stageOf(stage: number): string {
  return `Stage ${clampStage(stage) + 1} of ${STAGE_COUNT}`;
}

/** "6 of 11" */
export function stageShort(stage: number): string {
  return `${clampStage(stage) + 1} of ${STAGE_COUNT}`;
}

/** 0..1 share of the pipeline reached, counting the current stage. */
export function stageProgress(stage: number): number {
  return (clampStage(stage) + 1) / STAGE_COUNT;
}
