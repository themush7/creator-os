import { CircleAlert, Download, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { useAppData } from '@/app/data';
import { useToday } from '@/app/today';
import { Button } from '@/components/Button';
import { useToast } from '@/components/Toast';
import { db } from '@/db/db';
import { updateSettings } from '@/domain/actions';
import { BACKUP_STALE_DAYS } from '@/domain/status';
import {
  backupFileName,
  buildBackup,
  deliverBackup,
  describeBackup,
  importMerge,
  importReplace,
  parseBackup,
  type Backup,
} from '@/lib/backup';
import { diffDays, formatShort } from '@/lib/dates';
import styles from './Settings.module.css';

export function BackupSection() {
  const today = useToday();
  const toast = useToast();
  const { settings } = useAppData();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<Backup | null>(null);
  const [error, setError] = useState('');
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [busy, setBusy] = useState(false);

  const last = settings.lastBackupOn;
  const age = last ? diffDays(last, today) : null;
  const stale = age === null || age > BACKUP_STALE_DAYS;

  async function exportBackup() {
    setBusy(true);
    try {
      const backup = await buildBackup(db);
      const result = await deliverBackup(backup, backupFileName(today));
      if (result === 'cancelled') return;
      await updateSettings({ today }, { lastBackupOn: today });
      toast.show(
        result === 'shared'
          ? 'Backup ready. Save it to Files or iCloud Drive.'
          : 'Backup downloaded.',
      );
    } catch (e) {
      toast.show(`Couldn't export. ${e instanceof Error ? e.message : ''}`);
    } finally {
      setBusy(false);
    }
  }

  async function onFile(file: File | undefined) {
    setPreview(null);
    setError('');
    setConfirmReplace(false);
    if (!file) return;
    const result = parseBackup(await file.text());
    if (result.ok) setPreview(result.backup);
    else setError(result.error);
  }

  async function apply(mode: 'replace' | 'merge') {
    if (!preview) return;
    setBusy(true);
    try {
      if (mode === 'replace') {
        await importReplace(db, preview);
        toast.show('Backup restored.');
      } else {
        const r = await importMerge(db, preview);
        toast.show(`Backup merged. ${r.added} added, ${r.updated} updated.`);
      }
      setPreview(null);
      setConfirmReplace(false);
    } catch (e) {
      toast.show(`Import failed; nothing was changed. ${e instanceof Error ? e.message : ''}`);
    } finally {
      setBusy(false);
    }
  }

  const summary = preview ? describeBackup(preview) : null;

  return (
    <section className={styles.section} aria-labelledby="backup-h">
      <h2 id="backup-h" className={styles.header}>
        Backup
      </h2>
      <div className={styles.groupPadded}>
        <div className={styles.row} style={{ padding: 0, minHeight: 0 }}>
          <span className="t-subhead">Last backup</span>
          <span className={`${styles.value} ${stale ? styles.stale : ''}`}>
            {last
              ? `${formatShort(last)}${age !== null && age > BACKUP_STALE_DAYS ? ` · ${age} days ago` : ''}`
              : 'Never'}
          </span>
        </div>
        <div className={styles.buttons}>
          <Button icon={Download} fullWidth large disabled={busy} onClick={exportBackup}>
            Export backup
          </Button>
          <Button
            variant="secondary"
            icon={Upload}
            fullWidth
            large
            disabled={busy}
            onClick={() => fileRef.current?.click()}
          >
            Import backup
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              void onFile(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </div>

        {error && (
          <p className={styles.error} role="alert">
            <CircleAlert size={18} strokeWidth={2} aria-hidden />
            {error}
          </p>
        )}

        {preview && summary && (
          <div className={styles.preview} aria-live="polite">
            <span className="t-headline">{summary.title}</span>
            <span className="t-subhead secondary">{summary.body}</span>
            {confirmReplace ? (
              <>
                <span className="t-subhead">
                  Replace everything on this device with this backup? This cannot be undone.
                </span>
                <div className={styles.pair}>
                  <Button variant="destructive" disabled={busy} onClick={() => apply('replace')}>
                    Replace
                  </Button>
                  <Button variant="gray" onClick={() => setConfirmReplace(false)}>
                    Cancel
                  </Button>
                </div>
              </>
            ) : (
              <>
                <span className="t-footnote secondary">
                  Replace makes this device match the backup. Merge keeps both, and the newer copy
                  of each record wins.
                </span>
                <div className={styles.pair}>
                  <Button
                    variant="secondary"
                    disabled={busy}
                    onClick={() => setConfirmReplace(true)}
                  >
                    Replace
                  </Button>
                  <Button variant="secondary" disabled={busy} onClick={() => apply('merge')}>
                    Merge
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
      <p className={styles.footer}>
        Records live only on this device. Export a backup every week and keep it in Files or iCloud
        Drive.
      </p>
    </section>
  );
}
