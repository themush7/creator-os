/**
 * Creator OS → Google Sheet mirror (one way: the app writes, the Sheet is for reading).
 *
 * Setup: paste this whole file into Extensions → Apps Script, replace the key below with the
 * one from Creator OS → Settings → Google Sheet, then Deploy → New deployment → Web app,
 * "Execute as: Me", "Who has access: Anyone". Copy the /exec URL into the app.
 *
 * The key stops anyone else who finds the URL from writing to your Sheet.
 */
const SECRET = 'PASTE-YOUR-KEY-HERE';

const MONEY_FORMAT = '#,##0'; // Shows lakh grouping (1,20,000) when File → Settings → Locale is India.

function doGet() {
  return json({ ok: true, app: 'creator-os-sheet', version: 1 });
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (SECRET === 'PASTE-YOUR-KEY-HERE')
      return json({
        ok: false,
        error: 'Paste your key into the script, then deploy a new version.',
      });
    if (body.key !== SECRET)
      return json({ ok: false, error: 'The key does not match the script.' });

    const lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      ['Collabs', 'Invoices', 'Rights', 'Activity'].forEach(function (name) {
        writeTab(ss, name, body.tabs[name] || []);
      });
      writeTab(ss, 'Sync', [
        ['Last synced', 'Statuses as of'],
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
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
