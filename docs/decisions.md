# Decisions

Agreed with Sarthak on 20 Oct 2026, before the build started. The spec prompt is in
`../Creator OS mobile app prototype/Claude Code prompt - Creator OS.md`; where this file differs, this file wins.

## Platform

- **Device:** iPhone 17 Pro. Edit on the phone; view on the laptop through the Google Sheet mirror.
- **Install:** Safari → Share → Add to Home Screen. No App Store and no developer account.
- **Hosting:** Cloudflare Pages on the free `*.pages.dev` domain, deployed from a private GitHub repo.
  The URL must never change, because IndexedDB data is tied to the origin.

## Data

- **Main copy:** IndexedDB (Dexie) on the phone. Works fully offline.
- **Google Sheet mirror:** one way, phone → Sheet, through a Google Apps Script web app.
  - Pushes automatically a few seconds after each change. When offline it queues and pushes on reconnect.
  - Readable tabs: Collabs, Invoices, Rights, Activity. Each push fully rewrites the tabs.
  - Protected by a shared secret key, entered in Settings and in the script.
  - Sheet edits never flow back into the app.
- **Backups:** JSON export and import stay as in the spec.
- **Starting data:** empty. Sample data loads only in dev builds.

## Product changes to the spec

- **TDS:** a payment can record TDS deducted (with a 10% chip). Cash plus TDS settles the invoice.
  "Received" counts cash only; TDS is reported separately.
- **Out of scope for v1:**
  - GST (not registered)
  - App lock
  - Notifications
- **Greeting name:** Sarthak, editable in Settings.

## Engineering

- **Version pins:** Vite 6, Vitest 3, TypeScript 5.9, Zod 3, ESLint 9, React 18, React Router 6.
- **Dependencies approved beyond the spec:**
  - `@fontsource-variable/inter`
  - `jsdom`, `fake-indexeddb`, `@testing-library/jest-dom`, `@testing-library/user-event` (all test-only)
- **Checkpoints:** after phase 1, after phase 4, and at deploy.
