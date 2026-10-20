import { Copy, ExternalLink, Sheet } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAppData } from '@/app/data';
import { useToday } from '@/app/today';
import { useSheetExport } from '@/app/useSheetExport';
import { Button } from '@/components/Button';
import { TextField } from '@/components/Field';
import { Switch } from '@/components/Switch';
import { useToast } from '@/components/Toast';
import { updateSettings } from '@/domain/actions';
import type { Settings } from '@/domain/types';
import { copyText } from '@/lib/clipboard';
import { isAppsScriptUrl, testConnection } from '@/lib/sheetSync';
import script from '../../../docs/google-sheet/Code.gs?raw';
import styles from './Settings.module.css';

export function exportedAgo(iso: string, now = Date.now()): string {
  const mins = Math.round((now - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function useOnline() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

export function SheetSection() {
  const today = useToday();
  const toast = useToast();
  const online = useOnline();
  const { settings } = useAppData();
  const { exportNow, exporting } = useSheetExport();
  const s = settings.sheetSync;
  const [url, setUrl] = useState<string | null>(null);
  const [sheetUrl, setSheetUrl] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [showSteps, setShowSteps] = useState(!s.url);

  const save = (patch: Partial<Settings['sheetSync']>) =>
    updateSettings({ today }, { sheetSync: { ...s, ...patch } });
  const connected = !!s.url;

  const status = !connected
    ? 'Not connected yet.'
    : s.lastError
      ? s.lastError
      : s.lastSyncedAt
        ? `Last export ${exportedAgo(s.lastSyncedAt)}${s.enabled && s.dirty ? ' · changes waiting' : ''}.`
        : 'Connected. Not exported yet.';
  const tone = s.lastError ? styles.bad : s.lastSyncedAt && !s.dirty ? styles.ok : '';

  async function copy(text: string, what: string) {
    toast.show(
      (await copyText(text)) ? `${what} copied.` : `Couldn't copy. Select it and copy by hand.`,
    );
  }

  async function test() {
    setTesting(true);
    try {
      const { paired } = await testConnection(url ?? s.url);
      toast.show(
        paired
          ? 'Connected. The Sheet is paired.'
          : 'Connected. The first export pairs this phone.',
      );
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Could not connect.');
    } finally {
      setTesting(false);
    }
  }

  return (
    <section className={styles.section} aria-labelledby="sheet-h">
      <h2 id="sheet-h" className={styles.header}>
        Google Sheet
      </h2>
      <div className={styles.groupPadded}>
        <Button
          icon={Sheet}
          fullWidth
          large
          disabled={!connected || exporting || !online}
          onClick={exportNow}
        >
          {exporting ? 'Exporting…' : 'Export to Google Sheet'}
        </Button>
        <span className={`t-footnote ${tone || 'secondary'}`} aria-live="polite">
          {online ? status : 'Offline. Export when you are connected.'}
        </span>
        {s.sheetUrl && (
          <Button
            variant="plain"
            icon={ExternalLink}
            onClick={() => window.open(s.sheetUrl, '_blank', 'noopener')}
          >
            Open Sheet
          </Button>
        )}
      </div>

      <div className={styles.group}>
        <Switch
          label="Also update automatically"
          hint="Sends changes a few seconds after you make them, when online."
          checked={s.enabled}
          disabled={!connected}
          onChange={(enabled) =>
            save({ enabled, dirty: true, lastError: null, changedAt: new Date().toISOString() })
          }
        />
      </div>

      <div className={styles.groupPadded}>
        <TextField
          label="Web app URL"
          value={url ?? s.url}
          placeholder="https://script.google.com/macros/s/…/exec"
          inputMode="url"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          hint={
            url !== null && url.trim() && !isAppsScriptUrl(url)
              ? 'This should end in /exec.'
              : undefined
          }
          onChange={(e) => setUrl(e.target.value)}
          onBlur={() => {
            if (url !== null && url.trim() !== s.url)
              void save({ url: url.trim(), lastError: null });
          }}
        />
        <TextField
          label="Sheet link"
          optional
          value={sheetUrl ?? s.sheetUrl}
          placeholder="https://docs.google.com/spreadsheets/…"
          inputMode="url"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          hint="For the Open Sheet shortcut."
          onChange={(e) => setSheetUrl(e.target.value)}
          onBlur={() => {
            if (sheetUrl !== null && sheetUrl.trim() !== s.sheetUrl)
              void save({ sheetUrl: sheetUrl.trim() });
          }}
        />
        <Button variant="secondary" disabled={testing || !(url ?? s.url)} onClick={test}>
          {testing ? 'Testing…' : 'Test connection'}
        </Button>
      </div>

      <div className={styles.groupPadded}>
        <Button
          variant="plain"
          aria-expanded={showSteps}
          onClick={() => setShowSteps((v) => !v)}
          style={{ justifyContent: 'flex-start' }}
        >
          {showSteps ? 'Hide set-up steps' : 'Show set-up steps'}
        </Button>
        {showSteps && (
          <>
            <ol className={styles.steps}>
              <li>Open your Google Sheet on a laptop. Choose Extensions → Apps Script.</li>
              <li>
                Delete what is there and paste the script (Copy script below, or
                docs/google-sheet/Code.gs). Save.
              </li>
              <li>
                Deploy → New deployment → Web app. Execute as Me; access Anyone. Deploy and allow
                access.
              </li>
              <li>
                Paste the Web app URL (ends in /exec) above, then tap Export to Google Sheet. The
                first export pairs this phone.
              </li>
            </ol>
            <Button variant="gray" icon={Copy} fullWidth onClick={() => copy(script, 'Script')}>
              Copy script
            </Button>
          </>
        )}
      </div>
      <p className={styles.footer}>
        One way: the app writes, the Sheet is for reading. Each export replaces the Collabs,
        Invoices, Rights and Activity tabs. Only this phone can write to the paired Sheet.
      </p>
    </section>
  );
}
