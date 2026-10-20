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

## Design system: replaced on 20 Oct 2026

Sarthak asked for an Apple look and feel, referencing github.com/emilkowalski/skills
(`apple-design`, `mobile-native`, `emil-design-eng`). This **replaces section 3 of the spec**
(the Gradient system: Inter, copper, no status colours).

- **Look:** iOS 26 Liquid Glass.
  - Floating glass tab bar with a sliding selection lens.
  - Round glass Add button.
  - Large titles that collapse into a compact frosted bar.
  - Inset grouped lists, segmented controls, floating sheets.
- **Palette:** Apple's.
  - Tint `#0066CC`; filled controls use `#0071E3` in dark mode so white text stays at 4.7:1.
  - Label `#1D1D1F`, grouped background `#F5F5F7`, white surfaces.
- **Status colours:** iOS system red, orange and green, plus tint and grey. Pills always keep
  their icon and label. Pill text uses darkened "accessible" variants, so every pair is at least 4.5:1.
- **Dark mode:** follows the iPhone setting. Reduced transparency and increased contrast are honoured.
- **Type:** the system font (SF Pro on Apple devices) at iOS text-style sizes, using Apple's
  size-specific tracking. `@fontsource-variable/inter` is removed.
- **Motion:** hand-written springs in `src/lib/spring.ts`, with no new dependency.
  - Sheets track the finger 1:1, inherit release velocity, project flicks and rubber-band upward.
  - Press feedback is `scale(0.97)` on touch-down.
- **Mobile-native baseline:**
  - No tap highlight; `touch-action: manipulation`.
  - No text selection on controls; hover styles gated behind `(hover: hover)`.
  - Inputs at 16px or larger; `overscroll-behavior: none`.
  - `theme-color` set per colour scheme; `interactive-widget=resizes-content`.

## Judgement calls made in phases 2 to 4 (spec was silent or ambiguous)

### Attention feed and statuses
- **No repeated payment chase:** when a collab already has an overdue or follow-up item, its next action
  is not listed again *if* that action is about payment (e.g. Kohl's "Follow up on invoice").
- **Summary count:** "N things need you today." counts the items shown (at most 5), as in the prototype.
- **Archived collabs:** excluded from the attention feed and from every Collabs filter except Archived.
  Their invoices and rights still count in money totals and history.
- **Urgent due date:** highlighted (orange) only when the owner is You and the date is overdue or
  within a day, as in the prototype.

### Automatic next actions
- **Brand-owned:** quick actions that hand work to the brand ("Send script for review",
  "Mark delivered") set the next action due in 3 days, so a stalled reply surfaces on Home.
- **"Mark approved":** sets "Record invoice" due today.
- **Payments:** after a payment, the next action points at the earliest still-open invoice
  ("Balance due …"). When nothing is owed and the stage is Complete, the owner becomes Clear.

### Invoices and payments
- **Kind:** the first invoice defaults to Content fee; later ones default to Balance.
- **Number:** editable. Duplicates are rejected, and the counter skips past a typed higher number.
- **TDS:** the "10% TDS" chip computes 10% of the invoice amount. Applied to a full-balance entry,
  it reduces the cash figure by the same amount.

### Rights
- A period past its last day reads "Ended {date}", even when its status is Extension pending.

### Screens and navigation
- **Settings:** the Home gear opens Settings as a screen (`/settings`), not a sheet.
- **Spec 4 hero:** the espresso hero is replaced by an iOS large title, per the redesign.
- **Undo:** offered on every flow (5 s), not only delete and payment.
- **Router:** a plain `BrowserRouter` (no data-router features are used).
