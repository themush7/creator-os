import type { ButtonHTMLAttributes } from 'react';
import type { LucideIcon } from 'lucide-react';
import styles from './IconButton.module.css';

interface Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: LucideIcon;
  /** Accessible name. Required: an icon alone has none. */
  label: string;
  tone?: 'glass' | 'fill' | 'tinted' | 'plain';
  iconSize?: number;
}

export function IconButton({
  icon: Icon,
  label,
  tone = 'glass',
  iconSize = 20,
  className,
  type = 'button',
  ...rest
}: Props) {
  return (
    <button
      type={type}
      aria-label={label}
      className={[styles.iconButton, styles[tone], 'pressable', className]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      <Icon size={iconSize} strokeWidth={2} aria-hidden />
    </button>
  );
}
