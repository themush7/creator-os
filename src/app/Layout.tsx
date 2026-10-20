import { Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation, useMatch } from 'react-router-dom';
import { Button } from '@/components/Button';
import { TabBar } from './TabBar';
import { QuickAddSheet } from './QuickAddSheet';
import tabStyles from './TabBar.module.css';
import styles from './Layout.module.css';

/** Light chrome everywhere except Home, whose espresso hero runs under the status bar. */
function useThemeColor(dark: boolean) {
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    meta?.setAttribute('content', dark ? '#241A16' : '#F4F4F8');
  }, [dark]);
}

export function Layout() {
  const location = useLocation();
  const isDetail = !!useMatch('/collabs/:id');
  const isHome = location.pathname === '/';
  const [addOpen, setAddOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  useThemeColor(isHome);

  // New screen: start at the top.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className={styles.app}>
      <main ref={mainRef} className={`${styles.main} ${isDetail ? styles.detail : ''}`}>
        <Outlet />
      </main>
      {!isDetail && (
        <>
          <div className={tabStyles.fab}>
            <Button icon={Plus} onClick={() => setAddOpen(true)} large>
              Add
            </Button>
          </div>
          <TabBar />
        </>
      )}
      <QuickAddSheet open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}
