import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { Sheet } from './Sheet';
import { Segmented } from './Chip';

function Harness() {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState(30);
  return (
    <div id="root">
      <button onClick={() => setOpen(true)}>Open</button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Mark live" subtitle="Kohl Coffee">
        <Segmented
          label="Rights term"
          value={v}
          onChange={setV}
          options={[30, 60, 90].map((d) => ({ value: d, label: `${d} days` }))}
        />
        <button>Save</button>
      </Sheet>
    </div>
  );
}

describe('Sheet', () => {
  it('is a labelled modal dialog that closes on Esc and returns focus', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const trigger = screen.getByRole('button', { name: 'Open' });
    await user.click(trigger);
    const dialog = await screen.findByRole('dialog', { name: 'Mark live' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleDescription('Kohl Coffee');
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it('traps focus inside', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Open' }));
    const dialog = await screen.findByRole('dialog');
    for (let i = 0; i < 6; i++) {
      await user.tab();
      expect(dialog.contains(document.activeElement)).toBe(true);
    }
  });

  it('closes from the close button', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.click(await screen.findByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});

describe('Segmented', () => {
  it('uses radio semantics and arrow keys', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Open' }));
    const group = await screen.findByRole('radiogroup', { name: 'Rights term' });
    expect(group).toBeInTheDocument();
    const thirty = screen.getByRole('radio', { name: '30 days' });
    expect(thirty).toHaveAttribute('aria-checked', 'true');
    thirty.focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: '60 days' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: '60 days' })).toHaveFocus();
  });
});
