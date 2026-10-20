import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it } from 'vitest';
import { db } from '@/db/db';
import { loadSampleData } from '@/db/repo';
import { SEED_TODAY } from '@/db/seed';
import { ToastProvider } from '@/components/Toast';
import { App } from './App';
import { DataProvider } from './data';
import { TodayProvider } from './today';

function renderApp() {
  return render(
    <TodayProvider override={SEED_TODAY}>
      <ToastProvider>
        <DataProvider>
          <App />
        </DataProvider>
      </ToastProvider>
    </TodayProvider>,
  );
}

beforeAll(async () => {
  await loadSampleData(db);
});

describe('app over the sample data', () => {
  it('shows the attention feed and opens a collab from it', async () => {
    const user = userEvent.setup();
    renderApp();
    expect(await screen.findByText('Kohl Coffee · invoice overdue')).toBeInTheDocument();
    expect(screen.getByText('Kohl Coffee · rights end in 3 days')).toBeInTheDocument();
    expect(screen.getByText('5 things need you today.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Sarthak/);

    await user.click(screen.getByText('Kohl Coffee · invoice overdue'));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Morning ritual reel' }),
    ).toBeInTheDocument();
    const status = screen.getByLabelText('Status');
    expect(within(status).getByText('Overdue')).toBeInTheDocument();
    expect(within(status).getByText('₹45,000 outstanding')).toBeInTheDocument();
    expect(within(status).getByText('Ends 4 Oct')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Home/ })).toBeInTheDocument();
  });

  it('labels collab cards for screen readers', async () => {
    window.history.pushState({}, '', '/collabs');
    renderApp();
    expect(
      await screen.findByRole('button', {
        name: 'Northline Audio, Commute earbuds reel, Script review, Brand next',
      }),
    ).toBeInTheDocument();
  });

  it('quick add keeps Save disabled until brand and campaign are filled', async () => {
    const user = userEvent.setup();
    window.history.pushState({}, '', '/');
    renderApp();
    await user.click(await screen.findByRole('button', { name: 'Add collaboration' }));
    const dialog = await screen.findByRole('dialog', { name: 'New collaboration' });
    const save = within(dialog).getByRole('button', { name: 'Save collaboration' });
    expect(save).toBeDisabled();
    await user.type(within(dialog).getByLabelText('Brand'), 'Acme');
    expect(save).toBeDisabled();
    await user.type(within(dialog).getByLabelText('Campaign or deliverable'), 'Reel');
    expect(save).toBeEnabled();
    await user.click(save);
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1, name: 'Reel' })).toBeInTheDocument(),
    );
    expect(await db.collabs.filter((c) => c.brand === 'Acme').count()).toBe(1);
  });
});
