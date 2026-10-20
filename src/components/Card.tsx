import type { HTMLAttributes, ReactNode } from 'react';
import styles from './Card.module.css';

interface Props extends HTMLAttributes<HTMLElement> {
  as?: 'div' | 'section' | 'article' | 'li';
  /** `padded` (16px) for content cards, `flush` for row lists that draw their own padding. */
  variant?: 'padded' | 'flush';
  children: ReactNode;
}

/** White, 18px radius, 1px hairline, no shadow. */
export function Card({ as: Tag = 'div', variant = 'padded', className, children, ...rest }: Props) {
  return (
    <Tag className={[styles.card, styles[variant], className].filter(Boolean).join(' ')} {...rest}>
      {children}
    </Tag>
  );
}
