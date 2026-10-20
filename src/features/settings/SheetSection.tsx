import { Copy, ExternalLink, KeyRound, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAppData } from '@/app/data';
import { useToday } from '@/app/today';
import { Button } from '@/components/Button';
import { TextField } from '@/components/Field';
import { Switch } from '@/components/Switch';
import { useToast } from '@/components/Toast';
import { db } from '@/db/db';
import { updateSettings } from '@/domain/actions';
import type { Settings } from '@/domain/types';
import { copyText } from '@/lib/clipboard';
import { generateKey, isAppsScriptUrl, runSync, testConnection } from '@/lib/sheetSync';
import script from '../../../docs/google-sheet/Code.gs?raw';
import styles from './Settings.module.css';

function ago(iso: string, now = Date.now()): string {
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
  const s = settings.sheetSync;
  const [url, setUrl] = useState<string | null>(null);
  const [sheetUrl, setSheetUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState<'test' | 'sync' | null>(null);
  const [showSteps, setShowSteps] = useState(!s.url);

  const save = (patch: Partial<Settings['sheetSync']>) =>
    updateSettings({ today }, { sheetSync: { ...s, ...patch } });
  const ready = !!s.url && !!s.key;

  const status = !s.enabled
    ? 'Off'
    : !ready
      ? 'Needs a URL and key'
      : s.lastError
        ? s.lastError
        : !online && s.dirty
          ? 'Offline. Will sync when connected.'
          : s.dirty
            ? 'Changes waiting to sync…'
            : s.lastSyncedAt
              ? `Synced ${ago(s.lastSyncedAt)}`
              : 'Not synced yet';
  const tone =
    s.enabled && s.lastError ? styles.bad : s.enabled && ready && !s.dirty ? styles.ok : '';

  async function copy(text: string, what: string) {
    toast.show(
      (await copyText(text)) ? `${what} copied.` : `Couldn't copy. Select it and copy by hand.`,
    );
  }

  async function test() {
    setBusy('test');
    try {
      await testConnection(url ?? s.url);
      toast.show('Connected to your Sheet.');
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Could not connect.');
    } finally {
      setBusy(null);
    }
  }

  async function syncNow() {
    setBusy('sync');
    const outcome = await runSync(db, today, undefined, { force: true });
    setBusy(null);
    toast.show(
      outcome === 'synced'
        ? 'Sheet updated.'
        : outcome === 'failed'
          ? 'Sync failed. See the message below.'
          : 'Turn the mirror on first.',
    );
  }

  return (
    <section className={styles.section} aria-labelledby="sheet-h">
      <h2 id="sheet-h" className={styles.header}>
        Google Sheet
      </h2>
      <div className={styles.group}>
        <Switch
          label="Mirror to Google Sheet"
          hint={<span className={tone}>{status}</span>}
          checked={s.enabled}
          disabled={!ready && !s.enabled}
          onChange={(enabled) =>
            save({
              enabled,
              dirty: enabled ? true : s.dirty,
              lastError: null,
              changedAt: new Date().toISOString(),
            })
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
        <div className="field-block">
          <span className="field-label">Secret key</span>
          {s.key ? (
            <span className={styles.mono} style={{ padding: '0 16px' }}>
              {s.key}
            </span>
          ) : (
            <span className="t-subhead secondary" style={{ padding: '0 16px' }}>
              No key yet.
            </span>
          )}
          <div className={styles.pair}>
            <Button
              variant="gray"
              icon={KeyRound}
              onClick={() => save({ key: generateKey(), lastError: null })}
            >
              {s.key ? 'New key' : 'Generate key'}
            </Button>
            <Button variant="gray" icon={Copy} disabled={!s.key} onClick={() => copy(s.key, 'Key')}>
              Copy key
            </Button>
          </div>
        </div>
        <TextField
          label="Sheet link"
          optional
          value={sheetUrl ?? s.sheetUrl}
          placeholder="https://docs.google.com/spreadsheets/…"
          inputMode="url"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          onChange={(e) => setSheetUrl(e.target.value)}
          onBlur={() => {
            if (sheetUrl !== null && sheetUrl.trim() !== s.sheetUrl)
              void save({ sheetUrl: sheetUrl.trim() });
          }}
        />
        <div className={styles.pair}>
          <Button variant="secondary" disabled={!!busy || !(url ?? s.url)} onClick={test}>
            {busy === 'test' ? 'Testing…' : 'Test connection'}
          </Button>
          <Button
            variant="secondary"
            icon={RefreshCw}
            disabled={!!busy || !s.enabled || !ready}
            onClick={syncNow}
          >
            {busy === 'sync' ? 'Syncing…' : 'Sync now'}
          </Button>
        </div>
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
              <li>
                Create a blank Google Sheet. For ₹1,20,000-style grouping, set File → Settings →
                Locale to India.
              </li>
              <li>
                Open Extensions → Apps Script, delete what is there, and paste the script (Copy
                script below).
              </li>
              <li>
                Tap Generate key, then Copy key, and paste it over PASTE-YOUR-KEY-HERE in the
                script. Save.
              </li>
              <li>
                Deploy → New deployment → Web app. Execute as Me; access Anyone. Deploy and allow
                access.
              </li>
              <li>
                Paste the Web app URL (ends in /exec) above, tap Test connection, then turn the
                mirror on.
              </li>
            </ol>
            <Button variant="gray" icon={Copy} fullWidth onClick={() => copy(script, 'Script')}>
              Copy script
            </Button>
          </>
        )}
      </div>
      <p className={styles.footer}>
        One way: the app writes, the Sheet is for reading. Edits made in the Sheet are replaced on
        the next sync. Your key is stored on this device and in backups.
      </p>
    </section>
  );
}
