// The Google form "Nuevo musulmán": reads its response sheet (READ ONLY) and turns new rows into records.
// Runs only when the supervisor presses a button. The form's own sheet is NEVER written to.
// Rows are recognised by their columns' titles, so questions may be reordered or added to the form;
// a new question whose title equals a custom field's label fills that field.

var FORM_SYNC_BATCH = 300;

/** [key, words that identify the column]. Order matters: the first match wins and a column is used once. */
var FORM_COLUMNS = [
  ['stamp', ['marca temporal', 'timestamp']],
  ['email', ['direccion de correo', 'correo electronico', 'email']],
  ['nombreIslamico', ['nombre islamico']],
  ['apellidos', ['apellido']],
  ['nombre', ['nombre']],
  ['fechaShahada', ['islam', 'shahada']],
  ['fechaNacimiento', ['fecha de nacimiento', 'nacimiento']],
  ['edad', ['edad']],
  ['sexo', ['sexo', 'genero']],
  ['provincia', ['provincia']],
  ['ciudad', ['ciudad']],
  ['dias', ['dias', 'mezquita']],
  ['codigoPais', ['codigo de pais', 'codigo del pais', 'codigo pais']],
  ['whatsapp', ['whatsapp', 'telefono', 'celular']],
  ['trabajo', ['trabajo', 'ocupacion']],
  ['estudios', ['estudio']],
  ['documento', ['dni', 'documento', 'pasaporte']],
  ['nacionalidad', ['nacionalidad']],
  ['lugarShahada', ['lugar']],
  ['sheij', ['sheij', 'sheikh', 'sheik', 'jeque', 'maestro']],
  ['foto', ['foto']],
];

/** Demonyms people write instead of the country ("argentino" -> Argentina). */
var DEMONYMS = {
  argentin: 'Argentina', venezolan: 'Venezuela', paraguay: 'Paraguay', uruguay: 'Uruguay', chilen: 'Chile', chile: 'Chile',
  brasil: 'Brasil', brazil: 'Brasil', brasilen: 'Brasil', bolivian: 'Bolivia', bolivia: 'Bolivia', peruan: 'Perú', peru: 'Perú',
  colombian: 'Colombia', colombia: 'Colombia', ecuatorian: 'Ecuador', ecuador: 'Ecuador', mexican: 'México', mexico: 'México',
  cuban: 'Cuba', cuba: 'Cuba', dominican: 'República Dominicana', espanol: 'España', espanola: 'España', espana: 'España',
};

// ---------- pure helpers ----------

/** Which column holds what. Returns { map: { key: index }, extra: { fieldId: index }, unused: [titles], missing: [keys] }. */
function formSyncColumns_(header, customFields) {
  var map = {};
  var extra = {};
  var unused = [];
  header.forEach(function (h, i) {
    var k = looseKey_(h);
    if (!k) return;
    var hit = null;
    for (var c = 0; c < FORM_COLUMNS.length && !hit; c++) {
      var col = FORM_COLUMNS[c];
      if (Object.prototype.hasOwnProperty.call(map, col[0])) continue;
      if (col[0] === 'fechaShahada' && k.indexOf('fecha') < 0) continue; // "¿cuándo abrazó el Islam?" needs the word fecha
      for (var w = 0; w < col[1].length; w++) if (k.indexOf(col[1][w]) >= 0) { hit = col[0]; break; }
    }
    if (hit) { map[hit] = i; return; }
    var cf = (customFields || []).filter(function (f) { return looseKey_(f.etiqueta) === k; })[0];
    if (cf) extra[cf.key] = i;
    else unused.push(String(h).trim());
  });
  var missing = ['stamp', 'nombre'].filter(function (k) { return !Object.prototype.hasOwnProperty.call(map, k); });
  return { map: map, extra: extra, unused: unused, missing: missing };
}

/** "juan PÉREZ" stays as typed unless it is all lower or all upper case. */
function tidyName_(s) {
  var t = String(s || '').replace(/\s+/g, ' ').trim();
  if (t !== t.toLowerCase() && t !== t.toUpperCase()) return t;
  return t.toLowerCase().replace(/(^|[\s'-])(\S)/g, function (m, a, b) { return a + b.toUpperCase(); });
}

function mapNacionalidad_(raw, names) {
  var k = looseKey_(raw);
  if (!k) return { value: '', ok: true };
  for (var i = 0; i < names.length; i++) if (looseKey_(names[i]) === k) return { value: names[i], ok: true };
  var stem = k.replace(/[oa]s?$/, '');
  var hit = DEMONYMS[k] || DEMONYMS[stem] || DEMONYMS[k.replace(/s$/, '')];
  if (hit) return { value: hit, ok: true };
  return { value: tidyName_(raw), ok: false };
}

function mapSexo_(raw) {
  var k = looseKey_(raw);
  if (!k) return '';
  if (/^(m|masculino|hombre|varon)$/.test(k)) return 'M';
  if (/^(f|femenino|mujer)$/.test(k)) return 'F';
  return '';
}

/** Free text such as "los viernes y sábados" -> "viernes,sabado"; anything not understood is kept as typed. */
function mapDias_(raw) {
  var k = looseKey_(raw);
  if (!k) return '';
  if (/^(todos|todos los dias|toda la semana)$/.test(k)) return DIAS.join(',');
  var words = k.replace(/fines? de semana/g, 'sabado domingo').split(/[\s,;\/.]+|\by\b/).filter(function (w) { return w && w !== 'los' && w !== 'el' && w !== 'y'; });
  var out = [];
  for (var i = 0; i < words.length; i++) {
    // "sabados" -> "sabado", but "viernes" stays: its s is part of the name
    var d = DIAS.indexOf(words[i]) >= 0 ? words[i] : words[i].replace(/s$/, '');
    if (DIAS.indexOf(d) >= 0) { if (out.indexOf(d) < 0) out.push(d); }
    else return String(raw).trim();
  }
  return DIAS.filter(function (d) { return out.indexOf(d) >= 0; }).join(',');
}

/** A sheikh by his name or one of his alternative spellings (Maestros.alias, comma-separated). */
function matchMaestro_(raw, maestros) {
  var k = looseKey_(raw);
  if (!k) return null;
  for (var i = 0; i < maestros.length; i++) {
    var m = maestros[i];
    var keys = [m.nombre].concat(String(m.alias || '').split(',')).map(looseKey_).filter(String);
    if (keys.indexOf(k) >= 0) return m;
  }
  return null;
}

function formCellText_(v, tz) {
  if (v === null || v === undefined) return '';
  if (Object.prototype.toString.call(v) === '[object Date]') {
    if (Utilities.formatDate(v, tz, 'HH:mm:ss') === '00:00:00') return Utilities.formatDate(v, tz, 'yyyy-MM-dd');
    return v.toISOString();
  }
  return String(v).trim();
}

/**
 * One response row -> { patch, reasons } ready for insertConverso_.
 * Nothing here refuses a row except a missing name: doubtful values are kept and listed in `reasons`.
 */
function formRowToPatch_(cells, cols, ctx) {
  var get = function (k) { return Object.prototype.hasOwnProperty.call(cols.map, k) ? formCellText_(cells[cols.map[k]], ctx.tz) : ''; };
  var reasons = [];
  var patch = { nombres: tidyName_(get('nombre')), apellidos: tidyName_(get('apellidos')), nombreIslamico: tidyName_(get('nombreIslamico')) };

  var edad = get('edad').replace(/[^\d]/g, '');
  if (edad && Number(edad) >= 1 && Number(edad) <= 120) patch.edadAlRegistro = String(Number(edad));
  else if (get('edad')) reasons.push('Edad no reconocida: «' + get('edad') + '»');

  var nac = parseDateLoose_(get('fechaNacimiento'), ctx.today);
  if (nac.ok) patch.fechaNacimiento = nac.value; else reasons.push('Fecha de nacimiento no reconocida: «' + nac.value + '»');

  patch.sexo = mapSexo_(get('sexo'));
  patch.provincia = get('provincia').slice(0, 120);
  patch.ciudad = get('ciudad').slice(0, 120);
  patch.diasDisponibles = mapDias_(get('dias')).slice(0, 300);
  patch.trabajo = get('trabajo').slice(0, 120);
  patch.estudios = get('estudios').slice(0, 120);
  patch.lugarShahada = get('lugarShahada').slice(0, 120);

  var cc = get('codigoPais').replace(/\D/g, '') || '54';
  var ph = normalizePhone_(get('whatsapp'), cc);
  patch.whatsapp = ph.value;
  patch.codigoPais = cc;
  if (!ph.ok) reasons.push('WhatsApp no reconocido');

  var doc = normalizeDoc_(get('documento'), '');
  patch.tipoDocumento = doc.numero ? doc.tipo : '';
  patch.numeroDocumento = doc.numero;
  if (!doc.ok) reasons.push('Documento no reconocido');

  var n = mapNacionalidad_(get('nacionalidad'), ctx.nacionalidades);
  patch.nacionalidad = n.value;
  if (!n.ok) reasons.push('Nacionalidad no reconocida: «' + n.value + '»');

  var fs = parseDateLoose_(get('fechaShahada'), ctx.today);
  if (fs.ok) patch.fechaShahada = fs.value; else reasons.push('Fecha de shahada no reconocida: «' + fs.value + '»');

  var sheij = get('sheij');
  var m = matchMaestro_(sheij, ctx.maestros);
  patch.maestroId = m ? m.id : '';
  if (sheij && !m) reasons.push('Sheij no reconocido: «' + sheij + '»');

  var foto = get('foto');
  if (/^https:\/\/[^\s]+$/.test(foto)) patch.fotoFormulario = foto.slice(0, 500);
  var mail = get('email').toLowerCase();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) patch.email = mail;

  var extra = {};
  Object.keys(cols.extra).forEach(function (fid) {
    var v = formCellText_(cells[cols.extra[fid]], ctx.tz);
    if (v) extra[fid] = v.slice(0, 2000);
  });
  if (Object.keys(extra).length) patch.extra = JSON.stringify(extra);
  return { patch: patch, reasons: reasons };
}

function formStampIso_(raw, tz) {
  var t = formCellText_(raw, tz);
  if (!t) return '';
  var ms = Date.parse(t.length === 10 ? t + 'T12:00:00Z' : t);
  if (isNaN(ms)) {
    var d = parseDateLoose_(t.split(' ')[0]);
    if (!d.ok) return '';
    ms = Date.parse(d.value + 'T12:00:00Z');
  }
  return new Date(ms).toISOString();
}

// ---------- reading the sheet ----------

function formSyncOpen_() {
  var s = getSettings_();
  if (!s.formSheetId) fail_('NOT_CONFIGURED', 'Todavía no se vinculó la hoja de respuestas del formulario');
  var ss;
  try { ss = SpreadsheetApp.openById(s.formSheetId); } catch (e) { fail_('BAD_INPUT', 'No se pudo abrir la hoja de respuestas'); }
  var sh = ss.getSheetByName(s.formSheetTab);
  if (!sh) fail_('BAD_INPUT', 'No existe la pestaña «' + s.formSheetTab + '»');
  return { ss: ss, sh: sh };
}

/**
 * Looks at every response row not seen before and imports it unless `dry`.
 * Oldest first, so serial numbers follow the order in which people registered.
 */
function formSyncPass_(dry) {
  var src = formSyncOpen_();
  var tz = src.ss.getSpreadsheetTimeZone();
  var values = src.sh.getDataRange().getValues();
  var cols = formSyncColumns_(values[0] || [], effectiveFields_().filter(function (f) { return f.custom; }));
  if (cols.missing.length) fail_('BAD_INPUT', 'Faltan columnas en la hoja: ' + cols.missing.join(', '));
  var seen = {};
  rows_('FormInbox').forEach(function (r) { seen[r.key] = true; });
  var ctx = { tz: tz, today: todayIso_(), nacionalidades: nacionalidadNames_(false), maestros: rows_('Maestros') };
  var summary = { leidas: Math.max(0, values.length - 1), yaVistas: 0, importadas: 0, duplicadas: 0, errores: 0, aRevisar: 0, pendientes: 0, columnasSinUsar: cols.unused };
  var work = [];
  for (var r = 1; r < values.length; r++) {
    var cells = values[r];
    if (!cells.some(function (c) { return String(c === null || c === undefined ? '' : c).trim() !== ''; })) continue;
    var stamp = formStampIso_(cells[cols.map.stamp], tz);
    var name = formCellText_(cells[cols.map.nombre], tz);
    var key = 'f:' + (stamp || 'fila' + (r + 1)) + ':' + tokenHash_(looseKey_(name)).slice(0, 12);
    if (seen[key]) { summary.yaVistas++; continue; }
    seen[key] = true;
    work.push({ key: key, row: r + 1, stamp: stamp, cells: cells });
  }
  work.sort(function (a, b) { return a.stamp < b.stamp ? -1 : a.stamp > b.stamp ? 1 : a.row - b.row; });
  summary.pendientes = Math.max(0, work.length - FORM_SYNC_BATCH);
  work = work.slice(0, FORM_SYNC_BATCH);

  var items = [];
  var planned = []; // rows of this pass not yet in the table (a dry run stores nothing, but must still see repeats)
  work.forEach(function (w) {
    var out = formRowToPatch_(w.cells, cols, ctx);
    var status;
    var detail = '';
    var conversoId = '';
    if (!out.patch.nombres) {
      status = 'error';
      detail = 'Fila ' + w.row + ' sin nombre';
      summary.errores++;
    } else {
      // only the same document means the same person; a shared WhatsApp (a couple, a family) is imported and flagged
      var docOnly = { numeroDocumento: out.patch.numeroDocumento };
      var dup = findDuplicate_(docOnly, '');
      var twin = dup ? null : planned.filter(function (p) { return docOnly.numeroDocumento && p.numeroDocumento === docOnly.numeroDocumento; })[0];
      if (dup || twin) {
        status = 'duplicado';
        conversoId = dup ? dup.id : '';
        detail = 'Mismo documento que ' + (dup ? dup.id : 'otra fila de esta importación');
        summary.duplicadas++;
      } else {
        status = 'importado';
        if (out.reasons.length) summary.aRevisar++;
        summary.importadas++;
        if (!dry) {
          conversoId = insertConverso_(out.patch, {
            origen: 'formulario', registradoPor: 'formulario', formKey: w.key, createdAt: w.stamp || nowIso_(), revisar: out.reasons.join(' · '),
          }).id;
        }
        detail = out.reasons.join(' · ');
        if (dry) planned.push(out.patch);
      }
    }
    items.push({ fila: w.row, fecha: w.stamp.slice(0, 10), nombre: out.patch.nombres, status: status, detalle: detail, conversoId: conversoId });
    if (!dry) insert_('FormInbox', { key: w.key, receivedAt: w.stamp, status: status, conversoId: conversoId, detail: detail, processedAt: nowIso_() });
  });
  if (!dry) {
    setSetting_('formSyncLastRunAt', nowIso_());
    setSetting_('formSyncLastSummary', JSON.stringify(summary));
  }
  return { summary: summary, items: items.slice(0, 150) };
}

// ---------- actions (supervisor only) ----------

function formSyncStatus_() {
  var s = getSettings_();
  return {
    configured: !!s.formSheetId, sheetId: s.formSheetId, tab: s.formSheetTab,
    lastRunAt: s.formSyncLastRunAt, lastSummary: parseJson_(s.formSyncLastSummary, {}),
  };
}

registerAction_('formSync.status', {
  roles: [ROLES.SUPERVISOR],
  fn: function () { return formSyncStatus_(); },
});

/** Links the response sheet (a link or a bare id) after checking that it opens and has the expected columns. */
registerAction_('formSync.setSource', {
  roles: [ROLES.SUPERVISOR],
  write: true,
  fn: function (user, payload) {
    var raw = str_(payload.source, 400);
    var tab = str_(payload.tab, 100) || DEFAULT_SETTINGS.formSheetTab;
    if (!raw) {
      setSetting_('formSheetId', '');
      return formSyncStatus_();
    }
    var m = /\/spreadsheets\/d\/([A-Za-z0-9_-]+)/.exec(raw);
    var id = m ? m[1] : raw;
    if (!/^[A-Za-z0-9_-]{20,120}$/.test(id)) fail_('BAD_INPUT', 'El enlace o identificador no es válido');
    if (id === prop_('SPREADSHEET_ID')) fail_('BAD_INPUT', 'Esa es la hoja de datos de la aplicación; vinculá la hoja de respuestas del formulario');
    var ss;
    try { ss = SpreadsheetApp.openById(id); } catch (e) { fail_('BAD_INPUT', 'No se pudo abrir la hoja. Revisá el enlace y que la cuenta dueña de la aplicación pueda leerla'); }
    var sh = ss.getSheetByName(tab);
    if (!sh) fail_('BAD_INPUT', 'No existe una pestaña llamada «' + tab + '»');
    var cols = formSyncColumns_(sh.getDataRange().getValues()[0] || [], []);
    if (cols.missing.length) fail_('BAD_INPUT', 'Faltan columnas en la hoja: ' + cols.missing.join(', '));
    setSetting_('formSheetId', id);
    setSetting_('formSheetTab', tab);
    return formSyncStatus_();
  },
});

/** Dry run: says what importing would do, and writes nothing at all. */
registerAction_('formSync.preview', {
  roles: [ROLES.SUPERVISOR],
  fn: function () { return formSyncPass_(true); },
});

registerAction_('formSync.run', {
  roles: [ROLES.SUPERVISOR],
  write: true,
  fn: function (user) {
    var out = formSyncPass_(false);
    audit_(user, 'importar_formulario', '', out.summary.importadas + ' importadas');
    out.status = formSyncStatus_();
    return out;
  },
});

/**
 * After the supervisor adds a sheikh or his alternative spellings, records imported with an unknown
 * sheikh are matched again. Only records still without a sheikh are touched.
 */
registerAction_('formSync.rematch', {
  roles: [ROLES.SUPERVISOR],
  write: true,
  fn: function () {
    var maestros = rows_('Maestros');
    var fixed = 0;
    var pending = 0;
    rows_('Conversos').forEach(function (c) {
      var m = /Sheij no reconocido: «([^»]*)»/.exec(c.revisar || '');
      if (!m || c.maestroId) return;
      var hit = matchMaestro_(m[1], maestros);
      if (!hit) { pending++; return; }
      var left = String(c.revisar).split(' · ').filter(function (r) { return r.indexOf('Sheij no reconocido') !== 0; }).join(' · ');
      update_('Conversos', c, { maestroId: hit.id, revisar: left, updatedAt: nowIso_() });
      fixed++;
    });
    return { asignados: fixed, sinReconocer: pending };
  },
});
