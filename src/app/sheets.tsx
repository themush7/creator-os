import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AddNoteSheet } from '@/features/sheets/AddNoteSheet';
import { DeleteSheet } from '@/features/sheets/DeleteSheet';
import { DetailsSheet } from '@/features/sheets/DetailsSheet';
import { ExtensionSheet } from '@/features/sheets/ExtensionSheet';
import { InvoiceSheet } from '@/features/sheets/InvoiceSheet';
import { MarkLiveSheet } from '@/features/sheets/MarkLiveSheet';
import { NotesSheet } from '@/features/sheets/NotesSheet';
import { PaymentSheet } from '@/features/sheets/PaymentSheet';
import { QuickAddSheet } from '@/features/sheets/QuickAddSheet';
import { StageSheet } from '@/features/sheets/StageSheet';

export type DetailsSection = 'terms' | 'production' | 'delivery' | 'basics';

export type SheetSpec =
  | { type: 'add' }
  | { type: 'stage'; collabId: string }
  | { type: 'invoice'; collabId: string }
  | { type: 'payment'; invoiceId: string }
  | { type: 'live'; collabId: string }
  | { type: 'extend'; periodId: string }
  | { type: 'note'; collabId: string }
  | { type: 'notes'; collabId: string }
  | { type: 'details'; collabId: string; section: DetailsSection }
  | { type: 'delete'; collabId: string };

interface SheetsApi {
  openSheet: (spec: SheetSpec) => void;
  closeSheet: () => void;
}

const SheetsContext = createContext<SheetsApi | null>(null);

/** Props every sheet receives. */
export interface SheetProps<S extends SheetSpec = SheetSpec> {
  spec: S;
  open: boolean;
  onClose: () => void;
  /** Where focus goes when the flow ends: the control that started it, even across swapped sheets. */
  returnFocus: HTMLElement | null;
}

const CLOSE_MS = 600;

/**
 * One host for every flow sheet, so any screen (or another sheet) can open any flow.
 * Opening a sheet from inside another swaps it in place.
 */
export function SheetsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ spec: SheetSpec; open: boolean; key: number } | null>(null);
  const timer = useRef<number>();
  const trigger = useRef<HTMLElement | null>(null);
  const isOpen = useRef(false);

  const openSheet = useCallback((spec: SheetSpec) => {
    window.clearTimeout(timer.current);
    if (!isOpen.current) trigger.current = document.activeElement as HTMLElement | null;
    isOpen.current = true;
    setState({ spec, open: true, key: Date.now() });
  }, []);

  const closeSheet = useCallback(() => {
    isOpen.current = false;
    setState((s) => (s ? { ...s, open: false } : s));
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState((s) => (s && !s.open ? null : s)), CLOSE_MS);
  }, []);

  const api = useMemo(() => ({ openSheet, closeSheet }), [openSheet, closeSheet]);

  return (
    <SheetsContext.Provider value={api}>
      {children}
      {state && (
        <ActiveSheet
          key={state.key}
          spec={state.spec}
          open={state.open}
          onClose={closeSheet}
          returnFocus={trigger.current}
        />
      )}
    </SheetsContext.Provider>
  );
}

function ActiveSheet(props: SheetProps) {
  const { spec } = props;
  const common = { open: props.open, onClose: props.onClose, returnFocus: props.returnFocus };
  switch (spec.type) {
    case 'add':
      return <QuickAddSheet spec={spec} {...common} />;
    case 'stage':
      return <StageSheet spec={spec} {...common} />;
    case 'invoice':
      return <InvoiceSheet spec={spec} {...common} />;
    case 'payment':
      return <PaymentSheet spec={spec} {...common} />;
    case 'live':
      return <MarkLiveSheet spec={spec} {...common} />;
    case 'extend':
      return <ExtensionSheet spec={spec} {...common} />;
    case 'note':
      return <AddNoteSheet spec={spec} {...common} />;
    case 'notes':
      return <NotesSheet spec={spec} {...common} />;
    case 'details':
      return <DetailsSheet spec={spec} {...common} />;
    case 'delete':
      return <DeleteSheet spec={spec} {...common} />;
  }
}

export function useSheets(): SheetsApi {
  const ctx = useContext(SheetsContext);
  if (!ctx) throw new Error('useSheets must be used inside SheetsProvider');
  return ctx;
}
