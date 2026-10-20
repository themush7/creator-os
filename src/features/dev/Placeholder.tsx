import { ScreenHeader, screenStyles } from '@/app/Screen';
import { EmptyState } from '@/components/EmptyState';

export function Placeholder({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <>
      <ScreenHeader title={title} subtitle={subtitle} />
      <div className={screenStyles.body}>
        <EmptyState>This screen is built in phase 3.</EmptyState>
      </div>
    </>
  );
}
