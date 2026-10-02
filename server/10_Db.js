// Minimal table layer over one Google Sheet. Every cell is stored as text.

var dbCache_ = {};

function spreadsheet_() {
  if (!dbCache_.__ss) {
    var id = prop_('SPREADSHEET_ID');
    if (!id) fail_('NOT_CONFIGURED', 'La aplicación todavía no está configurada');
    dbCache_.__ss = SpreadsheetApp.openById(id);
  }
  return dbCache_.__ss;
}

function sheet_(name) {
  var sh = spreadsheet_().getSheetByName(name);
  if (!sh) throw new Error('missing sheet ' + name);
  return sh;
}

function cellToString_(v) {
  if (v === null || v === undefined) return '';
  if (Object.prototype.toString.call(v) === '[object Date]') {
    // A date typed as text ("2026-09-30") is converted by Sheets to midnight in the sheet's time zone.
    // Give back that same day, not a UTC timestamp that can be off by one day.
    var tz = spreadsheet_().getSpreadsheetTimeZone();
    if (Utilities.formatDate(v, tz, 'HH:mm:ss') === '00:00:00') return Utilities.formatDate(v, tz, 'yyyy-MM-dd');
    return v.toISOString();
  }
  var t = String(v);
  return /^'[=+\-@]/.test(t) ? t.slice(1) : t;
}

/** All rows of a table as objects (all values strings), each with its sheet row number in `_row`. */
function rows_(name) {
  if (dbCache_[name]) return dbCache_[name];
  var cols = SCHEMA[name];
  var values = sheet_(name).getDataRange().getValues();
  var out = [];
  for (var r = 1; r < values.length; r++) {
    var obj = { _row: r + 1 };
    var empty = true;
    for (var c = 0; c < cols.length; c++) {
      obj[cols[c]] = cellToString_(values[r][c]);
      if (obj[cols[c]] !== '') empty = false;
    }
    if (!empty) out.push(obj);
  }
  dbCache_[name] = out;
  return out;
}

/**
 * Text that starts with = + - @ could be taken by Sheets as a formula (=IMPORTXML(...) would leak data)
 * or as a number (+5491123456789 would lose its +). A leading apostrophe keeps it plain text;
 * cellToString_ removes it again, so the app always reads back exactly what it wrote.
 */
function protectCell_(s) {
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function toRowArray_(name, obj) {
  return SCHEMA[name].map(function (c) {
    return obj[c] === null || obj[c] === undefined ? '' : protectCell_(String(obj[c]));
  });
}

function insert_(name, obj) {
  sheet_(name).appendRow(toRowArray_(name, obj));
  delete dbCache_[name];
}

/** Applies `patch` to an existing row object and writes it back. */
function update_(name, row, patch) {
  var merged = {};
  SCHEMA[name].forEach(function (c) {
    merged[c] = Object.prototype.hasOwnProperty.call(patch, c) ? patch[c] : row[c];
  });
  sheet_(name).getRange(row._row, 1, 1, SCHEMA[name].length).setValues([toRowArray_(name, merged)]);
  delete dbCache_[name];
}

function findOne_(name, pred) {
  var all = rows_(name);
  for (var i = 0; i < all.length; i++) if (pred(all[i])) return all[i];
  return null;
}

/** Deletes every row matching `pred`, bottom-up so sheet row numbers stay valid. Returns the deleted row objects. */
function deleteWhere_(name, pred) {
  var hits = rows_(name).filter(pred);
  var sh = sheet_(name);
  hits.slice().sort(function (a, b) { return b._row - a._row; }).forEach(function (r) { sh.deleteRow(r._row); });
  delete dbCache_[name];
  return hits;
}

function getSettings_() {
  var out = {};
  Object.keys(DEFAULT_SETTINGS).forEach(function (k) { out[k] = DEFAULT_SETTINGS[k]; });
  rows_('Settings').forEach(function (r) { out[r.key] = r.value; });
  return out;
}

function setSetting_(key, value) {
  var row = findOne_('Settings', function (r) { return r.key === key; });
  if (row) update_('Settings', row, { value: value });
  else insert_('Settings', { key: key, value: value });
}

function schemaSig_() {
  return Object.keys(SCHEMA).map(function (k) { return k + ':' + SCHEMA[k].length; }).join(',');
}

/**
 * Brings an existing spreadsheet up to date with SCHEMA after columns were appended to it.
 * Touches only the NEW columns (header + plain-text format); existing cells are never reformatted,
 * because turning a date cell into plain text would show it as a serial number.
 */
function migrateSchema_() {
  var ss = spreadsheet_();
  Object.keys(SCHEMA).forEach(function (name) {
    var sh = ss.getSheetByName(name);
    if (!sh) {
      sh = ss.insertSheet(name);
      sh.getRange(1, 1, sh.getMaxRows(), SCHEMA[name].length).setNumberFormat('@');
      sh.getRange(1, 1, 1, SCHEMA[name].length).setValues([SCHEMA[name]]);
      return;
    }
    var header = sh.getRange(1, 1, 1, SCHEMA[name].length).getValues()[0];
    for (var i = 0; i < SCHEMA[name].length; i++) {
      if (String(header[i] || '') === SCHEMA[name][i]) continue;
      sh.getRange(1, i + 1, sh.getMaxRows(), 1).setNumberFormat('@');
      sh.getRange(1, i + 1, 1, 1).setValues([[SCHEMA[name][i]]]);
    }
  });
}

/** Runs the migration once per schema change (remembered in a script property). */
function ensureSchemaCurrent_() {
  var sig = schemaSig_();
  if (prop_('SCHEMA_SIG') === sig) return;
  migrateSchema_();
  PropertiesService.getScriptProperties().setProperty('SCHEMA_SIG', sig);
}

/**
 * Creates any sheet of SCHEMA that does not exist yet, as plain-text columns,
 * and refreshes header rows. Safe to re-run. New columns must be appended at
 * the end of a table, never inserted or reordered.
 */
function ensureSheets_() {
  var ss = spreadsheet_();
  Object.keys(SCHEMA).forEach(function (name) {
    var sh = ss.getSheetByName(name);
    if (!sh) {
      sh = ss.insertSheet(name);
    }
    sh.getRange(1, 1, sh.getMaxRows(), SCHEMA[name].length).setNumberFormat('@');
    sh.getRange(1, 1, 1, SCHEMA[name].length).setValues([SCHEMA[name]]);
  });
}
