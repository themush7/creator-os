# Creator OS

A private, installable app for running brand collaborations from first enquiry to final payment, including
the ad-rights window after content goes live. One user, no account. Data lives on the device and works
offline. An optional one-way copy goes to a Google Sheet.

Built with Vite, React 18, TypeScript (strict), Dexie (IndexedDB) and vite-plugin-pwa. The design follows
iOS 26: system font, Apple palette, glass chrome, light and dark mode.

## Run it

Requires Node 20 or later.

```bash
npm install
npm run dev            # http://localhost:5173
```

To try it on a phone during development, use the network address Vite prints (`http://192.168.x.x:5173`)
on the same Wi-Fi. Plain `http://` is not a secure context, so share-sheet export, clipboard and
persistent storage fall back or wait until the app runs on HTTPS. Install and offline only work once it is
deployed.

### Sample data and a fixed date

- **Sample data:** Settings → Development → **Load sample data**. This appears in dev builds only.
- **Fixed date:** append `?today=2026-10-02` to any URL to pin "today", so every status in the sample shows.
  It is remembered for the browser session; `?today=` clears it.

## Check it

```bash
npm run typecheck      # tsc, strict + noUncheckedIndexedAccess
npm run lint           # ESLint (typescript-eslint, react-hooks)
npm test               # Vitest: domain, actions, backup, sync, components
npx playwright install chromium webkit   # once
npm run e2e            # Playwright on an iPhone 14 viewport, WebKit and Chromium
E2E_BASE_URL=https://creator-os.guptasarthak8135.workers.dev npm run e2e   # against the live site
```

The E2E suite builds the production app and covers four scenarios:
1. Quick add through to paid in full.
2. The Kohl Coffee rights extension.
3. Backup export, clear, then restore.
4. Offline use after the first load.

## Build

```bash
npm run build          # type-checks, then writes dist/
npm run preview        # serve dist/ at http://localhost:4173
```

`dist/` is a static site: HTML, JS, CSS, icons, `manifest.webmanifest` and a Workbox service worker that
precaches the whole app.

## Deploy (free)

Any static host works. The URL must never change once you install: IndexedDB data belongs to the exact
origin (for example `creator-os.pages.dev`), so a new URL starts empty. Move data across with a backup file.

### Cloudflare (recommended: free, commercial use allowed)

1. Push this folder to a **private** GitHub repository.
2. In Cloudflare: **Workers & Pages → Create → Import a repository**, and pick it.
3. Settings:
   - Build command: `npm run build`
   - Deploy command: `npx wrangler deploy` (the default)
4. Deploy. Each push to `main` redeploys. The app shows **Update available · Reload** when a new
   version is ready.

`wrangler.jsonc` tells Cloudflare to serve `dist/` and send unknown paths to `index.html`, so routes
like `/collabs/…` work on reload. `public/_headers` stops the CDN caching `sw.js` and `index.html`, so
updates arrive.

The same build also works as a classic **Pages** project (build output directory `dist`). Pages serves
single-page apps automatically.

### Other hosts

- **Netlify:** same build command, publish directory `dist`. Add `public/_redirects` with `/* /index.html 200`.
- **Vercel:** framework "Vite". Add a rewrite of `/(.*)` to `/index.html` in `vercel.json`. The Hobby
  plan is for non-commercial use.
- **GitHub Pages:** free only for public repositories. Serve from the domain root, or set Vite `base`
  plus the PWA `scope` and `start_url`.

## Install on iPhone

Open the deployed URL in **Safari → Share → Add to Home Screen**. From then on, open it from the Home
Screen icon:
- it runs full screen and works offline;
- the browser treats its storage as an installed app's, and does not clear it after a week without use,
  as it can for a website.

Deleting the icon deletes its data. Back up first.

## How data is stored

| Layer | What |
|---|---|
| IndexedDB (Dexie) | `collabs`, `invoices`, `rights`, `activity`, `settings`. Every record has a UUID and `updatedAt`. |
| `localStorage` / `sessionStorage` | UI preferences only (selected filter, the `?today` override). |
| Derivations | All statuses, the attention feed and analytics are pure functions in `src/domain/`, recomputed from the records. Nothing derived is stored. |
| Mutations | Every change goes through `src/domain/actions.ts`: one transaction, an activity entry, `updatedAt`, and an Undo. |

On first launch from HTTPS, the app asks the browser for persistent storage. Settings shows the answer.

### Backups

- **Settings → Export backup** creates `creator-os-backup-YYYY-MM-DD.json`. On iPhone this opens the share
  sheet: save it to Files or iCloud Drive. A backup includes settings and the Sheet key; keep it private.
- **Import backup** validates the file, then shows what is inside before anything changes:
  - **Replace** makes this device match the backup.
  - **Merge** keeps both, and the newer copy of each record wins.
  - A file that fails validation is rejected without changing anything.
- Home shows a quiet reminder when the last backup is more than 7 days old.
- The backup format is versioned (`schema: 1`). `migrateBackup()` upgrades older files, so they always
  import.

### Google Sheet mirror (optional)

A one-way copy for reading on a laptop: tabs for Collabs, Invoices, Rights and Activity, pushed a few
seconds after each change when online. Edits in the Sheet are overwritten. Setup takes about five minutes;
see [docs/google-sheet/README.md](docs/google-sheet/README.md). The script is
[docs/google-sheet/Code.gs](docs/google-sheet/Code.gs), and the app has a **Copy script** button.

## Project layout

```
src/
  app/          App shell, routes, tab bar, sheet host, data provider, background sync
  db/           Dexie schema, seed (dev), repo helpers
  domain/       types, zod schemas, stages, statuses, attention feed, analytics, lists, actions
  lib/          dates, money, ids, backup, sheet sync, springs, clipboard, install
  features/     home, collabs, collab-detail, payments, rights, settings, sheets
  components/   Button, IconButton, Chip/Segmented, Pill, Sheet, Toast, Field, Card, Menu, Switch, …
  styles/       tokens.css (light and dark), reset.css
tests/e2e/      Playwright scenarios
docs/           decisions.md (what was agreed and why), google-sheet/ (script and setup)
scripts/        make-icons.mjs (renders the placeholder icon to PNGs)
```

## Replacing the icon

Edit `scripts/icon.svg` (keep it full-bleed and square; iOS rounds the corners), then run
`node scripts/make-icons.mjs`.
