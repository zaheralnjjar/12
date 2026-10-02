// One-time setup, run by the owner from the Apps Script editor (Run ▶ setup).

/**
 * Creates the data spreadsheet and the private Drive folder, registers the account running it as
 * the supervisor and fills the starting lists. Running it again changes nothing.
 */
function setup() {
  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty('SPREADSHEET_ID')) {
    props.setProperty('SPREADSHEET_ID', SpreadsheetApp.create('Nuevo Musulmán - datos').getId());
  }
  if (!props.getProperty('FOLDER_ID')) {
    props.setProperty('FOLDER_ID', DriveApp.createFolder('Nuevo Musulmán - archivos privados').getId());
  }
  dbCache_ = {};
  ensureSheets_();
  props.setProperty('SCHEMA_SIG', schemaSig_());
  var owner = Session.getEffectiveUser().getEmail().toLowerCase();
  var now = nowIso_();
  if (!findOne_('Users', function (u) { return u.role === ROLES.SUPERVISOR; })) {
    insert_('Users', { email: owner, role: ROLES.SUPERVISOR, active: '1', createdAt: now });
  }
  Object.keys(DEFAULT_SETTINGS).forEach(function (k) {
    if (!findOne_('Settings', function (r) { return r.key === k; })) insert_('Settings', { key: k, value: DEFAULT_SETTINGS[k] });
  });
  if (!rows_('Nacionalidades').length) {
    DEFAULT_NACIONALIDADES.forEach(function (n, i) { insert_('Nacionalidades', { id: newId_('n'), nombre: n, orden: String(i), active: '1', createdAt: now }); });
  }
  if (!rows_('Etapas').length) {
    DEFAULT_ETAPAS.forEach(function (e, i) { insert_('Etapas', { id: newId_('e'), nombre: e[0], descripcion: e[1], orden: String(i), active: '1', createdAt: now }); });
  }
  var msg = 'Listo. Supervisor: ' + owner + (props.getProperty('CLIENT_ID') ? '' : ' — falta cargar CLIENT_ID en las propiedades del script.');
  console.log(msg);
  return msg;
}
