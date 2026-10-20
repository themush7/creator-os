import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { CollabDetail } from '@/features/collab-detail/CollabDetail';
import { Collabs } from '@/features/collabs/Collabs';
import { Home } from '@/features/home/Home';
import { Payments } from '@/features/payments/Payments';
import { Rights } from '@/features/rights/Rights';
import { Settings } from '@/features/settings/Settings';
import { EmptyState } from '@/components/EmptyState';
import { ScreenHeader } from './Screen';
import { Layout } from './Layout';

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
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/collabs" element={<Collabs />} />
          <Route path="/collabs/:id" element={<CollabDetail />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/rights" element={<Rights />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
