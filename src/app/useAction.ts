import { useCallback } from 'react';
import { useToast } from '@/components/Toast';
import { ActionError, type ActionContext, type ActionResult } from '@/domain/actions';
import { useToday } from './today';

interface Options<T> {
  /** Toast on success; may depend on the result. */
  toast?: string | ((value: T) => string);
  /** Offer Undo in the toast for 5 s. */
  undoable?: boolean;
  /** Toast after undo. */
  undoneToast?: string;
}

/**
 * Runs a domain action with today's date, surfaces failures in a toast (never silently),
 * and optionally offers Undo. Resolves to the action's value, or undefined if it failed.
 */
export function useAction() {
  const today = useToday();
  const toast = useToast();

  return useCallback(
    async <T>(
      action: (ctx: ActionContext) => Promise<ActionResult<T>>,
      options: Options<T> = {},
    ): Promise<T | undefined> => {
      try {
        const { value, undo } = await action({ today });
        const message = typeof options.toast === 'function' ? options.toast(value) : options.toast;
        if (message) {
          toast.show(
            message,
            options.undoable
              ? {
                  undo: async () => {
                    try {
                      await undo();
                      toast.show(options.undoneToast ?? 'Undone.');
                    } catch (e) {
                      toast.show(`Couldn't undo. ${errorText(e)}`);
                    }
                  },
                }
              : undefined,
          );
        }
        return value;
      } catch (e) {
        toast.show(e instanceof ActionError ? e.message : `Couldn't save. ${errorText(e)}`);
        console.error(e);
        return undefined;
      }
    },
    [today, toast],
  );
}

function errorText(e: unknown): string {
  return e instanceof Error ? e.message : 'Try again.';
}
