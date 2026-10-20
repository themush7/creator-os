import { useEffect, useState } from 'react';
import { Outlet, useLocation, useMatch } from 'react-router-dom';
import { TabBar } from './TabBar';
import { QuickAddSheet } from './QuickAddSheet';
import styles from './Layout.module.css';

export function Layout() {
  const location = useLocation();
  const isDetail = !!useMatch('/collabs/:id');
  const [addOpen, setAddOpen] = useState(false);

  // New screen: start at the top.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className={styles.app}>
      <div className={styles.edge} aria-hidden />
      <main className={`${styles.main} ${isDetail ? styles.detail : ''}`}>
        <Outlet />
      </main>
      {!isDetail && <TabBar onAdd={() => setAddOpen(true)} />}
      <QuickAddSheet open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}
