import { Handshake, House, Timer, Wallet } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import styles from './TabBar.module.css';

export const TABS = [
  { to: '/', label: 'Home', icon: House },
  { to: '/collabs', label: 'Collabs', icon: Handshake },
  { to: '/payments', label: 'Payments', icon: Wallet },
  { to: '/rights', label: 'Rights', icon: Timer },
] as const;

export function TabBar() {
  return (
    <nav className={styles.tabbar} aria-label="Main">
      <ul className={styles.list}>
        {TABS.map(({ to, label, icon: Icon }) => (
          <li key={to} className={styles.item}>
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `${styles.tab} ${isActive ? styles.active : ''} pressable`
              }
            >
              <Icon size={22} strokeWidth={1.75} aria-hidden />
              <span>{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
