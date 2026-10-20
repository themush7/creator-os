import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/tokens.css';
import './styles/reset.css';
import { App } from './app/App';
import { TodayProvider, readTodayOverride } from './app/today';
import { ToastProvider } from './components/Toast';
import { DataProvider } from './app/data';

// iOS Safari only applies :active (the press scale) when a touch listener exists.
document.addEventListener('touchstart', () => {}, { passive: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TodayProvider override={readTodayOverride()}>
      <ToastProvider>
        <DataProvider>
          <App />
        </DataProvider>
      </ToastProvider>
    </TodayProvider>
  </StrictMode>,
);
