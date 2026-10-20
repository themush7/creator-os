# Google Sheet mirror: setup

Creator OS can copy your data to a Google Sheet every time something changes, so you can read and filter it
on a laptop. It is **one way**: the app writes, and edits made in the Sheet are overwritten on the next sync.
Your phone stays the main copy.

Setup takes about five minutes. A laptop is easiest.

1. Create a blank Google Sheet, for example "Creator OS".
2. _(Optional)_ For lakh grouping (₹1,20,000), set the locale: **File → Settings → Locale → India**.
3. Open **Extensions → Apps Script**. Delete what is there and paste the whole of [`Code.gs`](Code.gs).
   In the app this is under **Settings → Google Sheet → Copy script**.
4. In the app, open **Settings → Google Sheet** and tap **Generate key**, then **Copy key**.
   Paste it in the script in place of `PASTE-YOUR-KEY-HERE`. Save.
5. In Apps Script, choose **Deploy → New deployment → Select type: Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone**

   Click **Deploy** and allow access when Google asks.

6. Copy the **Web app URL** (it ends in `/exec`) and paste it into the app's **Web app URL** field.
7. Tap **Test connection**, then turn on **Mirror to Google Sheet**. The first sync runs right away.

If you change the script later, choose **Deploy → Manage deployments → Edit → Version: New version**.
That keeps the URL the same.

## Why "Anyone" access is safe enough

The URL is only accepted together with your key. Without the key, the script refuses to write. Reading
through the URL returns nothing but `{"ok":true}`. The script runs as you, so it can only touch this one
spreadsheet.

## What gets written

| Tab      | Contents                                                                             |
| -------- | ------------------------------------------------------------------------------------ |
| Collabs  | One row per collaboration: stage, owner, next action, fee, payment and rights status |
| Invoices | Number, amount, received, TDS, outstanding, status, dates                            |
| Rights   | Platform, window, days left, status                                                  |
| Activity | Every logged update and note                                                         |
| Sync     | When the last sync ran                                                               |

Statuses such as Overdue are worked out on the day of the last sync.
