import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import styles from './Button.module.css';

export type ButtonVariant =
  'primary' | 'secondary' | 'gray' | 'destructive' | 'glass' | 'compact' | 'plain';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  icon?: LucideIcon;
  fullWidth?: boolean;
  large?: boolean;
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  icon: Icon,
  fullWidth,
  large,
  className,
  children,
  type = 'button',
  ...rest
}: Props) {
  const cls = [
    styles.button,
    styles[variant],
    fullWidth && styles.full,
    large && styles.large,
    variant !== 'plain' && 'pressable',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  const iconSize = variant === 'compact' ? 16 : 20;
  return (
    <button type={type} className={cls} {...rest}>
      {Icon && <Icon size={iconSize} strokeWidth={2} aria-hidden />}
      {children}
    </button>
  );
}
