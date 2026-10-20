# Google Sheet export: setup

Creator OS can copy all your data into a Google Sheet so you can read and filter it on a laptop.
Tap **Export to Google Sheet** (Settings, or the Google Sheet line on Home) whenever you want a fresh
copy. You can also turn on **Also update automatically**.

It is **one way**: the app writes, and each export replaces the tabs. Edits made in the Sheet are
overwritten. Your phone stays the main copy.

Setup takes about five minutes, once. A laptop is easiest.

1. Open your Google Sheet. *(Optional)* For lakh grouping (₹1,20,000):
   **File → Settings → Locale → India**.
2. **Extensions → Apps Script.** Delete what is there, paste the whole of [`Code.gs`](Code.gs), and save.
   In the app, **Settings → Google Sheet → Copy script** copies the same file.
3. **Deploy → New deployment → Select type: Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone**

   Click **Deploy** and allow access when Google asks. Google may warn that the app is unverified,
   because it is your own script: choose **Advanced → Go to … (unsafe)**.
4. Copy the **Web app URL** (it ends in `/exec`) into the app: **Settings → Google Sheet → Web app URL**.
   Optionally paste the Sheet's own link into **Sheet link**, for the Open Sheet shortcut.
5. Tap **Export to Google Sheet**. The first export pairs the Sheet with your phone. From then on, only
   your phone can write to it.

If you change the script later, choose **Deploy → Manage deployments → Edit → Version: New version**.
That keeps the URL the same.

**New phone?** Restore a backup on it: backups include the pairing key, so exports keep working.
Without a backup, open Apps Script, choose `resetPairing` in the toolbar, click **Run**, then export
from the new phone.

## Why "Anyone" access is safe enough

The URL alone cannot change anything. The script only accepts exports carrying the key it paired with.
Visiting the URL returns nothing but `{"ok":true,...}`. The script runs as you, and only touches the
spreadsheet it is attached to.

## What gets written

| Tab      | Contents                                                                              |
|----------|---------------------------------------------------------------------------------------|
| Collabs  | One row per collaboration: stage, owner, next action, fee, payment and rights status  |
| Invoices | Number, amount, received, TDS, outstanding, status, dates                             |
| Rights   | Platform, window, days left, status                                                   |
| Activity | Every logged update and note                                                          |
| Sync     | When the last export ran                                                              |

Statuses such as Overdue are worked out on the day of the export.
