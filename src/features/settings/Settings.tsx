import { HardDrive, Smartphone, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAppData } from '@/app/data';
import { ScreenHeader, screenStyles } from '@/app/Screen';
import { useToday } from '@/app/today';
import { Button } from '@/components/Button';
import { Segmented } from '@/components/Chip';
import { TextField } from '@/components/Field';
import { useToast } from '@/components/Toast';
import { clearRecords, loadSampleData } from '@/db/repo';
import { updateSettings, type SettingsPatch } from '@/domain/actions';
import { nextInvoiceNumber } from '@/domain/invoiceNumber';
import { yearOf } from '@/lib/dates';
import {
  canPromptInstall,
  isIos,
  isStandalone,
  onInstallAvailabilityChange,
  promptInstall,
} from '@/lib/install';
import { BackupSection } from './BackupSection';
import { SheetSection } from './SheetSection';
import styles from './Settings.module.css';

const CONFIRM_WORD = 'delete';

export function Settings() {
  const today = useToday();
  const toast = useToast();
  const { settings, index } = useAppData();
  const [draft, setDraft] = useState<Record<string, string>>({});
  const save = (patch: SettingsPatch, message?: string) =>
    updateSettings({ today }, patch).then(() => message && toast.show(message));

  // Text fields edit a local draft and save on blur.
  const field = (key: 'name' | 'invoicePrefix' | 'invoiceNext', current: string) => ({
    value: draft[key] ?? current,
    onChange: (e: { target: { value: string } }) => setDraft({ ...draft, [key]: e.target.value }),
    onBlur: async () => {
      const v = draft[key];
      if (v === undefined || v === current) return;
      if (key === 'invoiceNext') {
        const n = Number(v.replace(/\D/g, ''));
        if (n > 0) await save({ invoiceNext: n, invoiceYear: yearOf(today) }, 'Next number saved.');
      } else if (key === 'invoicePrefix') {
        await save({ invoicePrefix: v.trim() || 'INV-{YYYY}-' }, 'Prefix saved.');
      } else {
        await save({ name: v.trim() }, 'Name saved.');
      }
      setDraft((d) => {
        const rest = { ...d };
        delete rest[key];
        return rest;
      });
    },
  });

  const next = nextInvoiceNumber(settings, index.data.invoices, today);
  const counts = index.data;

  return (
    <>
      <ScreenHeader title="Settings" />
      <div className={screenStyles.body}>
        <section className={styles.section}>
          <h2 className={styles.header}>You</h2>
          <div className={styles.groupPadded}>
            <TextField
              label="Your name"
              placeholder="For the greeting on Home"
              autoCapitalize="words"
              {...field('name', settings.name)}
            />
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.header}>Defaults</h2>
          <div className={styles.groupPadded}>
            <Segmented
              label="Rights term"
              value={settings.defaultRightsDays}
              onChange={(d) => save({ defaultRightsDays: d })}
              options={[30, 60, 90].map((d) => ({ value: d, label: `${d} days` }))}
            />
            <Segmented
              label="Payment terms"
              value={settings.defaultPaymentDays}
              onChange={(d) => save({ defaultPaymentDays: d })}
              options={[15, 30, 45].map((d) => ({ value: d, label: `${d} days` }))}
            />
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.header}>Invoice numbers</h2>
          <div className={styles.groupPadded}>
            <TextField
              label="Prefix"
              autoCapitalize="characters"
              autoCorrect="off"
              hint="{YYYY} becomes the year."
              {...field('invoicePrefix', settings.invoicePrefix)}
            />
            <TextField
              label="Next number"
              inputMode="numeric"
              {...field('invoiceNext', String(next.sequence))}
              hint={`Next invoice: ${next.number}. Restarts at 001 each January.`}
            />
          </div>
        </section>

        <BackupSection />
        <SheetSection />
        <StorageSection
          counts={[counts.collabs.length, counts.invoices.length, counts.rights.length]}
          persist={settings.persistGranted}
        />
        <InstallSection />
        <DangerZone />
      </div>
    </>
  );
}

function StorageSection({
  counts,
  persist,
}: {
  counts: [number, number, number];
  persist: boolean | null;
}) {
  const [c, i, r] = counts;
  const persistText =
    persist === true
      ? 'Persistent storage granted: the browser will not clear it to save space.'
      : persist === false
        ? 'Persistent storage not granted. Install the app and back up weekly.'
        : window.isSecureContext
          ? 'Asking the browser to keep this data…'
          : 'Persistent storage is requested once the app runs from its HTTPS address.';
  return (
    <section className={styles.section}>
      <h2 className={styles.header}>On this device</h2>
      <div className={styles.groupPadded}>
        <span className="t-subhead" style={{ display: 'flex', gap: 10 }}>
          <HardDrive size={18} strokeWidth={2} color="var(--tint)" aria-hidden />
          {c} collaborations, {i} invoices, {r} rights periods. Works offline. No account.
        </span>
        <span className="t-footnote secondary">{persistText}</span>
      </div>
    </section>
  );
}

function InstallSection() {
  const [promptable, setPromptable] = useState(canPromptInstall());
  useEffect(() => onInstallAvailabilityChange(() => setPromptable(canPromptInstall())), []);
  const installed = isStandalone();
  return (
    <section className={styles.section}>
      <h2 className={styles.header}>Install</h2>
      <div className={styles.groupPadded}>
        <span className="t-subhead" style={{ display: 'flex', gap: 10 }}>
          <Smartphone size={18} strokeWidth={2} color="var(--tint)" aria-hidden />
          {installed
            ? 'Installed. Open Creator OS from your Home Screen.'
            : isIos()
              ? 'In Safari, tap Share, then Add to Home Screen.'
              : promptable
                ? 'Install Creator OS as an app on this device.'
                : 'Open the browser menu and choose Install app or Add to Home Screen.'}
        </span>
        {!installed && promptable && (
          <Button fullWidth onClick={() => void promptInstall()}>
            Install app
          </Button>
        )}
      </div>
    </section>
  );
}

function DangerZone() {
  const toast = useToast();
  const [typed, setTyped] = useState('');
  const [open, setOpen] = useState(false);
  return (
    <section className={styles.section}>
      <h2 className={styles.header}>Danger zone</h2>
      <div className={styles.groupPadded}>
        {!open ? (
          <Button variant="destructive" icon={Trash2} fullWidth onClick={() => setOpen(true)}>
            Clear all records
          </Button>
        ) : (
          <>
            <TextField
              label={`Type “${CONFIRM_WORD}” to clear every collaboration, invoice and rights period`}
              value={typed}
              autoCapitalize="off"
              autoCorrect="off"
              data-autofocus
              onChange={(e) => setTyped(e.target.value)}
            />
            <div className={styles.pair}>
              <Button
                variant="destructive"
                disabled={typed.trim().toLowerCase() !== CONFIRM_WORD}
                onClick={async () => {
                  await clearRecords();
                  setOpen(false);
                  setTyped('');
                  toast.show('All records cleared.');
                }}
              >
                Clear all
              </Button>
              <Button
                variant="gray"
                onClick={() => {
                  setOpen(false);
                  setTyped('');
                }}
              >
                Cancel
              </Button>
            </div>
          </>
        )}
        {import.meta.env.DEV && (
          <Button
            variant="gray"
            fullWidth
            onClick={async () => {
              await loadSampleData();
              toast.show('Sample data loaded. Open with ?today=2026-10-02.');
            }}
          >
            Load sample data
          </Button>
        )}
      </div>
      <p className={styles.footer}>Export a backup first. Clearing cannot be undone.</p>
    </section>
  );
}
