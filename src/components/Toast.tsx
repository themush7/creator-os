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
}

interface ToastApi {
  show: (message: string, options?: ToastOptions) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const SHORT_MS = 2600;
const UNDO_MS = 5000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{
    message: string;
    undo?: ToastOptions['undo'];
    key: number;
  } | null>(null);
  const [shown, setShown] = useState(false);
  const timer = useRef<number>();

  const hide = useCallback(() => {
    window.clearTimeout(timer.current);
    setShown(false);
  }, []);

  const show = useCallback<ToastApi['show']>((message, options) => {
    window.clearTimeout(timer.current);
    setState({ message, undo: options?.undo, key: Date.now() });
    setShown(true);
    timer.current = window.setTimeout(() => setShown(false), options?.undo ? UNDO_MS : SHORT_MS);
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
                {state.undo && (
                  <button
                    type="button"
                    className={styles.undo}
                    onClick={async () => {
                      const undo = state.undo;
                      hide();
                      await undo?.();
                    }}
                  >
                    Undo
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
