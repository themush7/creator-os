import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import styles from './Field.module.css';

interface Wrap {
  label: string;
  optional?: boolean;
  hint?: ReactNode;
}

function Frame({
  id,
  label,
  optional,
  hint,
  children,
}: Wrap & { id: string; children: ReactNode }) {
  return (
    <div className={styles.field}>
      <label htmlFor={id} className="field-label">
        {label}
        {optional && <span className={styles.optional}> · optional</span>}
      </label>
      {children}
      {hint && (
        <span id={`${id}-hint`} className={styles.hint}>
          {hint}
        </span>
      )}
    </div>
  );
}

type InputProps = Wrap & InputHTMLAttributes<HTMLInputElement> & { money?: boolean };

export function TextField({ label, optional, hint, money, className, ...rest }: InputProps) {
  const id = useId();
  const kind = rest.type === 'date' ? styles.date : '';
  return (
    <Frame id={id} label={label} optional={optional} hint={hint}>
      <input
        id={id}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className={[styles.control, money && styles.money, kind, className]
          .filter(Boolean)
          .join(' ')}
        {...(money
          ? { inputMode: 'numeric' as const, placeholder: '₹', autoComplete: 'off' }
          : null)}
        {...rest}
      />
    </Frame>
  );
}

type SelectProps = Wrap & SelectHTMLAttributes<HTMLSelectElement>;

export function SelectField({ label, optional, hint, className, children, ...rest }: SelectProps) {
  const id = useId();
  return (
    <Frame id={id} label={label} optional={optional} hint={hint}>
      <select
        id={id}
        className={[styles.control, styles.select, className].filter(Boolean).join(' ')}
        {...rest}
      >
        {children}
      </select>
    </Frame>
  );
}

type AreaProps = Wrap & TextareaHTMLAttributes<HTMLTextAreaElement>;

export function TextAreaField({ label, optional, hint, className, ...rest }: AreaProps) {
  const id = useId();
  return (
    <Frame id={id} label={label} optional={optional} hint={hint}>
      <textarea
        id={id}
        className={[styles.control, styles.textarea, className].filter(Boolean).join(' ')}
        {...rest}
      />
    </Frame>
  );
}
