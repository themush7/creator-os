import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { CollabDetail } from '@/features/collab-detail/CollabDetail';
import { Collabs } from '@/features/collabs/Collabs';
import { Home } from '@/features/home/Home';
import { Payments } from '@/features/payments/Payments';
import { Rights } from '@/features/rights/Rights';
import { EmptyState } from '@/components/EmptyState';
import { ScreenHeader } from './Screen';
import { Layout } from './Layout';
import { BackgroundTasks } from './background';

// Settings carries backup, import and Sheet code; load it only when opened.
const Settings = lazy(() =>
  import('@/features/settings/Settings').then((m) => ({ default: m.Settings })),
);

function NotFound() {
  return (
    <>
      <ScreenHeader title="Not found" />
      <EmptyState>This page does not exist.</EmptyState>
    </>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <BackgroundTasks />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/collabs" element={<Collabs />} />
          <Route path="/collabs/:id" element={<CollabDetail />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/rights" element={<Rights />} />
          <Route
            path="/settings"
            element={
              <Suspense fallback={<ScreenHeader title="Settings" />}>
                <Settings />
              </Suspense>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
