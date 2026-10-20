import { Search, X } from 'lucide-react';
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
      <Search size={16} strokeWidth={1.75} aria-hidden />
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
        <IconButton icon={X} label="Clear search" iconSize={16} onClick={() => onChange('')} />
      )}
    </div>
  );
}
