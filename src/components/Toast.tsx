import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import styles from './Toast.module.css';

export interface ToastOptions {
  /** Shows an Undo button and keeps the toast up for 5 s. */
  undo?: () => void | Promise<void>;
  /** Any other single action, e.g. "Reload". */
  action?: { label: string; run: () => void | Promise<void> };
  /** Milliseconds on screen; `Infinity` keeps it until acted on. */
  duration?: number;
}

interface ToastApi {
  show: (message: string, options?: ToastOptions) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const SHORT_MS = 2600;
const UNDO_MS = 5000;

interface Current {
  message: string;
  action?: { label: string; run: () => void | Promise<void> };
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Current | null>(null);
  const [shown, setShown] = useState(false);
  const timer = useRef<number>();

  const hide = useCallback(() => {
    window.clearTimeout(timer.current);
    setShown(false);
  }, []);

  const show = useCallback<ToastApi['show']>((message, options = {}) => {
    window.clearTimeout(timer.current);
    const action = options.undo ? { label: 'Undo', run: options.undo } : options.action;
    setState({ message, action });
    setShown(true);
    const ms = options.duration ?? (action ? UNDO_MS : SHORT_MS);
    if (Number.isFinite(ms)) timer.current = window.setTimeout(() => setShown(false), ms);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const api = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {createPortal(
        <div className={styles.region}>
          <div
            role="status"
            aria-live="polite"
            className={`${styles.toast} ${shown ? styles.shown : ''}`}
          >
            {state && shown && (
              <>
                <span>{state.message}</span>
                {state.action && (
                  <button
                    type="button"
                    className={styles.undo}
                    onClick={async () => {
                      const run = state.action!.run;
                      hide();
                      await run();
                    }}
                  >
                    {state.action.label}
                  </button>
                )}
              </>
            )}
          </div>
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
