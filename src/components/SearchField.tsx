import { CircleX, Search } from 'lucide-react';
import { IconButton } from './IconButton';
import styles from './SearchField.module.css';

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
}

export function SearchField({ value, onChange, placeholder = 'Search', label = 'Search' }: Props) {
  return (
    <div className={styles.search} role="search">
      <Search size={18} strokeWidth={2} aria-hidden />
      <input
        type="search"
        className={styles.input}
        value={value}
        placeholder={placeholder}
        aria-label={label}
        enterKeyHint="search"
        autoComplete="off"
        autoCorrect="off"
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <IconButton
          icon={CircleX}
          label="Clear search"
          tone="plain"
          iconSize={18}
          style={{ color: 'var(--label-3)' }}
          onClick={() => onChange('')}
        />
      )}
    </div>
  );
}
