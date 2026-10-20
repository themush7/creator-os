import { useState } from 'react';
import { useAppData } from '@/app/data';
import { ScreenHeader, screenStyles } from '@/app/Screen';
import { useToday } from '@/app/today';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { TextField } from '@/components/Field';
import { useToast } from '@/components/Toast';
import { loadSampleData } from '@/db/repo';
import { updateSettings } from '@/domain/actions';
import { sharedStyles } from '../shared/List';

/** Minimal settings until phase 5 (backup, import, Sheet mirror, storage). */
export function Settings() {
  const today = useToday();
  const toast = useToast();
  const { settings, index } = useAppData();
  const [name, setName] = useState<string | null>(null);

  return (
    <>
      <ScreenHeader title="Settings" />
      <div className={screenStyles.body}>
        <section className={sharedStyles.stack}>
          <TextField
            label="Your name"
            value={name ?? settings.name}
            placeholder="For the greeting on Home"
            autoCapitalize="words"
            onChange={(e) => setName(e.target.value)}
            onBlur={async () => {
              if (name === null || name === settings.name) return;
              await updateSettings({ today }, { name: name.trim() });
              toast.show('Name saved.');
            }}
          />
        </section>
        <Card>
          <p className="t-subhead secondary">
            {index.data.collabs.length} collaborations, {index.data.invoices.length} invoices,{' '}
            {index.data.rights.length} rights periods. Backup and import arrive in phase 5.
          </p>
        </Card>
        {import.meta.env.DEV && (
          <section className={sharedStyles.stack}>
            <span className="field-label">Development</span>
            <Button
              variant="secondary"
              fullWidth
              onClick={async () => {
                await loadSampleData();
                toast.show('Sample data loaded. Open with ?today=2026-10-02.');
              }}
            >
              Load sample data
            </Button>
          </section>
        )}
      </div>
    </>
  );
}
