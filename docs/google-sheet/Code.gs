/**
 * Creator OS → Google Sheet export (one way: the app writes, the Sheet is for reading).
 *
 * Setup, once:
 *  1. In your Google Sheet: Extensions → Apps Script. Replace everything with this file. Save.
 *  2. Deploy → New deployment → type: Web app. Execute as: Me. Who has access: Anyone. Deploy, allow access.
 *  3. Copy the Web app URL (ends in /exec) into Creator OS → Settings → Google Sheet.
 *  4. Tap "Export to Google Sheet". The first export pairs this Sheet with your phone.
 *
 * After pairing, only the phone holding the same key can write here. To pair a different phone,
 * run resetPairing() below once (select it in the toolbar, then Run).
 */
const KEY_PROPERTY = 'CREATOR_OS_KEY';
const MONEY_FORMAT = '#,##0'; // Shows 1,20,000 when File → Settings → Locale is India.

function doGet() {
  const paired = !!PropertiesService.getScriptProperties().getProperty(KEY_PROPERTY);
  return json({ ok: true, app: 'creator-os-sheet', version: 2, paired: paired });
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (!body.key) return json({ ok: false, error: 'The app sent no key.' });

    const lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      const props = PropertiesService.getScriptProperties();
      const saved = props.getProperty(KEY_PROPERTY);
      if (!saved) {
        props.setProperty(KEY_PROPERTY, body.key); // First export pairs this Sheet with the phone.
      } else if (saved !== body.key) {
        return json({
          ok: false,
          error: 'This Sheet is paired with another phone. In Apps Script, run resetPairing, then export again.',
        });
      }

      const ss = SpreadsheetApp.getActiveSpreadsheet();
      ['Collabs', 'Invoices', 'Rights', 'Activity'].forEach(function (name) {
        writeTab(ss, name, body.tabs[name] || []);
      });
      writeTab(ss, 'Sync', [
        ['Last export', 'Statuses as of'],
        [new Date(body.syncedAt), body.today],
      ]);
    } finally {
      lock.releaseLock();
    }
    return json({ ok: true, at: new Date().toISOString() });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

/** Forget the paired phone. The next export from any phone pairs again. */
function resetPairing() {
  PropertiesService.getScriptProperties().deleteProperty(KEY_PROPERTY);
}

function writeTab(ss, name, rows) {
  const sheet = ss.getSheetByName(name) || ss.insertSheet(name);
  sheet.clearContents();
  if (!rows.length) return;
  const width = rows[0].length;
  const grid = rows.map(function (r) {
    const row = r.slice(0, width);
    while (row.length < width) row.push('');
    return row;
  });
  sheet.getRange(1, 1, grid.length, width).setValues(grid);
  sheet.getRange(1, 1, 1, width).setFontWeight('bold');
  sheet.setFrozenRows(1);
  rows[0].forEach(function (header, i) {
    if (String(header).indexOf('₹') !== -1 && grid.length > 1) {
      sheet.getRange(2, i + 1, grid.length - 1, 1).setNumberFormat(MONEY_FORMAT);
    }
  });
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
