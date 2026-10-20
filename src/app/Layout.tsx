import { useEffect } from 'react';
import { Outlet, useLocation, useMatch } from 'react-router-dom';
import { SheetsProvider, useSheets } from './sheets';
import { TabBar } from './TabBar';
import styles from './Layout.module.css';

function Shell() {
  const location = useLocation();
  const isDetail = !!useMatch('/collabs/:id');
  const { openSheet } = useSheets();

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
      {!isDetail && <TabBar onAdd={() => openSheet({ type: 'add' })} />}
    </div>
  );
}

export function Layout() {
  return (
    <SheetsProvider>
      <Shell />
    </SheetsProvider>
  );
}
