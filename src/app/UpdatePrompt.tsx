import { useEffect } from 'react';
import { registerSW } from 'virtual:pwa-register';
import { useToast } from '@/components/Toast';

/**
 * Registers the service worker (production only). When a new version has downloaded,
 * a quiet toast offers to reload; nothing reloads on its own, so no edit is interrupted.
 * Becoming offline-ready is silent: a toast then could replace one the person is reading (and its Undo).
 */
export function UpdatePrompt() {
  const toast = useToast();
  useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
    const update = registerSW({
      onNeedRefresh() {
        toast.show('Update available', {
          action: { label: 'Reload', run: () => update(true) },
          duration: Infinity,
        });
      },
    });
  }, [toast]);
  return null;
}
