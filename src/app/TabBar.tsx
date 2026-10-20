import { Handshake, House, Plus, Timer, Wallet } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import styles from './TabBar.module.css';

export const TABS = [
  { to: '/', label: 'Home', icon: House },
  { to: '/collabs', label: 'Collabs', icon: Handshake },
  { to: '/payments', label: 'Payments', icon: Wallet },
  { to: '/rights', label: 'Rights', icon: Timer },
] as const;

function activeIndex(pathname: string): number {
  const i = TABS.findIndex((t) => (t.to === '/' ? pathname === '/' : pathname.startsWith(t.to)));
  return i < 0 ? 0 : i;
}

export function TabBar({ onAdd }: { onAdd: () => void }) {
  const { pathname } = useLocation();
  const index = activeIndex(pathname);
  return (
    <div className={styles.dock}>
      <nav className={styles.tabbar} aria-label="Main">
        <ul className={styles.list}>
          <li
            className={styles.lens}
            style={{ transform: `translateX(${index * 100}%)` }}
            aria-hidden
          />
          {TABS.map(({ to, label, icon: Icon }) => (
            <li key={to} className={styles.item}>
              <NavLink
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `${styles.tab} ${isActive ? styles.active : ''} pressable`
                }
              >
                <Icon size={24} strokeWidth={1.9} aria-hidden />
                <span>{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <button
        type="button"
        className={`${styles.add} pressable`}
        aria-label="Add collaboration"
        onClick={onAdd}
      >
        <Plus size={28} strokeWidth={2.2} aria-hidden />
      </button>
    </div>
  );
}
