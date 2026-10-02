// Input checks, normalisation (phone, document, dates) and the configurable list of fields of a record.
// Pure helpers first: tests/fields.test.mjs exercises them directly.

// ---------- plain input ----------

function str_(v, max) {
  var s = v === null || v === undefined ? '' : String(v).trim();
  if (s.length > (max || 200)) fail_('BAD_INPUT', 'Texto más largo de lo permitido (máximo ' + (max || 200) + ' caracteres)');
  return s;
}

function dateOrEmpty_(v) {
  var s = v === null || v === undefined ? '' : String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) s = s.slice(0, 10);
  s = str_(s, 10);
  if (s && !validIsoDate_(s)) fail_('BAD_INPUT', 'Fecha no válida');
  return s;
}

function validIsoDate_(s) {
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  var d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.getUTCFullYear() === Number(m[1]) && d.getUTCMonth() === Number(m[2]) - 1 && d.getUTCDate() === Number(m[3]) && Number(m[1]) >= 1900;
}

function email_(v) {
  var s = str_(v, 120).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) fail_('BAD_INPUT', 'Correo electrónico no válido');
  return s;
}

function bool_(v) {
  return v === true || v === '1' || v === 1 ? '1' : '';
}

function pad2_(n) {
  return (n < 10 ? '0' : '') + n;
}

// ---------- normalisation ----------

/** A number read back from a sheet can come as "1123456789.0". */
function stripSheetNumber_(s) {
  return /^\d+\.0+$/.test(s) ? s.replace(/\.0+$/, '') : s;
}

/**
 * Phone -> international form for WhatsApp ("+5491123456789").
 * Without "+" the number is read as Argentine unless another country code is given.
 * Argentine mobiles: 54 + 9 + area code + number, without the trunk 0 and without the 15.
 * Returns { value, ok }: when it cannot be understood, `value` keeps what was typed and ok is false.
 */
function normalizePhone_(raw, codigoPais) {
  var s = stripSheetNumber_(String(raw === null || raw === undefined ? '' : raw).trim());
  if (!s) return { value: '', ok: true };
  s = s.replace(/^00/, '+');
  var intl = s.charAt(0) === '+';
  var d = s.replace(/\D/g, '');
  var cc = String(codigoPais || '').replace(/\D/g, '') || '54';
  if (!intl) {
    if (cc !== '54') {
      d = cc + d.replace(/^0+/, '');
      intl = true;
    } else if (/^54\d{10,11}$/.test(d)) {
      intl = true; // typed with its 54 but without the "+"
    }
  }
  if (intl && d.indexOf('54') !== 0) {
    return d.length >= 8 && d.length <= 15 ? { value: '+' + d, ok: true } : { value: s, ok: false };
  }
  var n = intl ? d.slice(2) : d;
  if (n.length === 11 && n.charAt(0) === '9') n = n.slice(1);
  n = n.replace(/^0/, '');
  if (n.length === 12) {
    if (n.indexOf('11') === 0 && n.substr(2, 2) === '15') n = n.slice(0, 2) + n.slice(4);
    else if (n.substr(3, 2) === '15') n = n.slice(0, 3) + n.slice(5);
    else if (n.substr(4, 2) === '15') n = n.slice(0, 4) + n.slice(6);
  }
  return n.length === 10 ? { value: '+549' + n, ok: true } : { value: s, ok: false };
}

/** Identity document: a DNI keeps only its digits ("12.345.678" -> "12345678"). Returns { tipo, numero, ok }. */
function normalizeDoc_(raw, tipo) {
  var s = stripSheetNumber_(String(raw === null || raw === undefined ? '' : raw).trim());
  if (!s) return { tipo: tipo || '', numero: '', ok: true };
  var compact = s.replace(/[.\s-]/g, '');
  var t = tipo || (/^\d{7,8}$/.test(compact) ? 'DNI' : 'Otro');
  if (t === 'DNI') {
    return /^\d{6,9}$/.test(compact) ? { tipo: t, numero: compact, ok: true } : { tipo: t, numero: s, ok: false };
  }
  return { tipo: t, numero: s.toUpperCase(), ok: true };
}

/**
 * A date as people type it -> "yyyy-mm-dd". Day first, as in Argentina: 5/3/2020 is 5 March.
 * Two-digit years belong to this century unless that would be in the future.
 * Returns { value, ok }.
 */
function parseDateLoose_(raw, todayIso) {
  var s = String(raw === null || raw === undefined ? '' : raw).trim();
  if (!s) return { value: '', ok: true };
  if (/^\d{4}-\d{2}-\d{2}(T.*)?$/.test(s)) {
    s = s.slice(0, 10);
    return validIsoDate_(s) && s <= (todayIso || '9999') ? { value: s, ok: true } : { value: s, ok: false };
  }
  var m = /^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2}|\d{4})$/.exec(s);
  if (!m) return { value: s, ok: false };
  var y = Number(m[3]);
  var today = todayIso || nowIso_().slice(0, 10);
  if (m[3].length === 2) {
    var cur = Number(today.slice(2, 4));
    y = (y <= cur ? 2000 : 1900) + y;
  }
  var iso = y + '-' + pad2_(Number(m[2])) + '-' + pad2_(Number(m[1]));
  return validIsoDate_(iso) && iso <= today ? { value: iso, ok: true } : { value: s, ok: false };
}

/** Text compared loosely: no direction marks, one space, lower case, no accents. */
function looseKey_(v) {
  var s = String(v === null || v === undefined ? '' : v);
  s = s.replace(/[‎‏‪-‮؜]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
  try { s = s.normalize('NFD').replace(/[̀-ͯ]/g, ''); } catch (e) { /* keep as is */ }
  return s;
}

/** Selected days ("lunes,viernes") from a list of keys; anything unknown is refused. */
function diasValue_(v) {
  var list = Array.isArray(v) ? v : String(v || '').split(',');
  var out = [];
  list.forEach(function (d) {
    var k = looseKey_(d);
    if (!k) return;
    if (DIAS.indexOf(k) < 0) fail_('BAD_INPUT', 'Día no válido');
    if (out.indexOf(k) < 0) out.push(k);
  });
  return DIAS.filter(function (d) { return out.indexOf(d) >= 0; }).join(',');
}

// ---------- the configurable field list ----------

function parseJson_(s, fallback) {
  try { return s ? JSON.parse(s) : fallback; } catch (e) { return fallback; }
}

/**
 * Every field of a record as the supervisor configured it, in display order:
 * { key, etiqueta, etiquetaAr, tipo, seccion, requerido, enEnlace, active, fixed, internal, custom, opciones, ayuda }.
 * Custom fields carry their id as `key` and live in the record's `extra`.
 */
function effectiveFields_() {
  if (dbCache_.__fields) return dbCache_.__fields;
  var over = {};
  rows_('CamposBase').forEach(function (r) { over[r.key] = r; });
  var out = BASE_FIELDS.map(function (f, i) {
    var o = over[f.key];
    var requerido = o ? o.requerido === '1' : BASE_REQUIRED_DEFAULT.indexOf(f.key) >= 0;
    var enEnlace = o ? o.enEnlace === '1' : BASE_LINK_OFF_DEFAULT.indexOf(f.key) < 0;
    var active = o ? o.active === '1' : true;
    if (f.fixed) { requerido = true; active = true; enEnlace = true; }
    if (f.internal) enEnlace = false;
    return {
      key: f.key, etiqueta: f.es, etiquetaAr: f.ar, tipo: f.tipo, seccion: f.seccion,
      requerido: requerido && active, enEnlace: enEnlace && active, active: active,
      fixed: !!f.fixed, internal: !!f.internal, custom: false, opciones: [], ayuda: '', orden: i,
    };
  });
  rows_('Campos')
    .slice()
    .sort(function (a, b) { return Number(a.orden || 0) - Number(b.orden || 0); })
    .forEach(function (c, i) {
      var active = c.active === '1';
      out.push({
        key: c.id, etiqueta: c.etiqueta, etiquetaAr: c.etiquetaAr || c.etiqueta, tipo: c.tipo, seccion: c.seccion || 'otros',
        requerido: active && c.requerido === '1', enEnlace: active && c.enEnlace === '1', active: active,
        fixed: false, internal: false, custom: true, opciones: parseJson_(c.opciones, []), ayuda: c.ayuda || '', orden: 100 + i,
      });
    });
  dbCache_.__fields = out;
  return out;
}

function nacionalidadNames_(onlyActive) {
  return rows_('Nacionalidades')
    .filter(function (n) { return !onlyActive || n.active === '1'; })
    .map(function (n) { return n.nombre; });
}

function activeMaestro_(id) {
  return findOne_('Maestros', function (m) { return m.id === id && m.active === '1'; });
}

function isEmptyValue_(v) {
  return v === null || v === undefined || v === '' || (Array.isArray(v) && !v.length);
}

/** One custom-field answer, checked against its type. */
function customValue_(f, v) {
  if (isEmptyValue_(v)) return '';
  if (f.tipo === 'text') return str_(v, 300);
  if (f.tipo === 'textarea') return str_(v, 5000);
  if (f.tipo === 'number') {
    var n = Number(v);
    if (isNaN(n) || Math.abs(n) > 1e9) fail_('BAD_INPUT', 'Número no válido: ' + f.etiqueta);
    return String(n);
  }
  if (f.tipo === 'date') return dateOrEmpty_(v);
  if (f.tipo === 'yesno') return bool_(v);
  if (f.tipo === 'choice') {
    if (f.opciones.indexOf(String(v)) < 0) fail_('BAD_INPUT', 'Opción no válida: ' + f.etiqueta);
    return String(v);
  }
  if (f.tipo === 'multichoice') {
    var arr = Array.isArray(v) ? v : [v];
    arr.forEach(function (x) { if (f.opciones.indexOf(String(x)) < 0) fail_('BAD_INPUT', 'Opción no válida: ' + f.etiqueta); });
    return arr.map(String);
  }
  return str_(v, 300);
}

/**
 * Checks and normalises the fields of a record.
 *   opts.mode      'staff' (inside the app) or 'enlace' (the public one-time link: only its fields)
 *   opts.existing  the current row when updating; on update only the keys present in `input` change
 *   opts.user      the caller (a maestro may only assign records to himself)
 * Returns the patch to store (`extra` already serialised).
 */
function validateConverso_(input, opts) {
  var existing = opts.existing || null;
  var creating = !existing;
  var link = opts.mode === 'enlace';
  var patch = {};
  var extra = existing ? parseJson_(existing.extra, {}) : {};
  var extraIn = input.extra && typeof input.extra === 'object' ? input.extra : {};
  var extraChanged = false;

  effectiveFields_().forEach(function (f) {
    if (!f.active) return;
    if (link && !f.enEnlace) return;
    var has = f.custom ? Object.prototype.hasOwnProperty.call(extraIn, f.key) : Object.prototype.hasOwnProperty.call(input, f.key);
    if (!creating && !has) return;
    var raw = f.custom ? extraIn[f.key] : input[f.key];
    if (f.requerido && isEmptyValue_(raw) && !(f.key === 'maestroId' && opts.user && opts.user.role === ROLES.MAESTRO)) {
      fail_('BAD_INPUT', 'Falta completar: ' + f.etiqueta);
    }
    if (f.custom) {
      extra[f.key] = customValue_(f, raw);
      extraChanged = true;
      return;
    }
    var v;
    switch (f.tipo) {
      case 'sexo':
        v = str_(raw, 1).toUpperCase();
        if (v && SEXOS.indexOf(v) < 0) fail_('BAD_INPUT', 'Sexo no válido');
        break;
      case 'date':
        v = dateOrEmpty_(raw);
        if (v && v > todayIso_()) fail_('BAD_INPUT', 'La fecha no puede ser futura: ' + f.etiqueta);
        break;
      case 'number':
        v = isEmptyValue_(raw) ? '' : Number(raw);
        if (v !== '' && !(v >= 0 && v <= 130 && v % 1 === 0)) fail_('BAD_INPUT', 'Número no válido: ' + f.etiqueta);
        v = String(v);
        break;
      case 'nacionalidad':
        v = str_(raw, 60);
        if (v && nacionalidadNames_(link).indexOf(v) < 0 && !(existing && existing.nacionalidad === v)) {
          fail_('BAD_INPUT', 'Nacionalidad no válida');
        }
        break;
      case 'tipoDocumento':
        v = str_(raw, 20);
        if (v && TIPOS_DOCUMENTO.indexOf(v) < 0) fail_('BAD_INPUT', 'Tipo de documento no válido');
        break;
      case 'phone': {
        var cc = str_(input.codigoPais, 4).replace(/\D/g, '') || (existing && existing.codigoPais) || '54';
        var ph = normalizePhone_(str_(raw, 30), cc);
        if (!ph.ok) fail_('BAD_INPUT', 'Número de WhatsApp no válido. Si no es de Argentina, elegí el código del país');
        v = ph.value;
        patch.codigoPais = cc;
        break;
      }
      case 'email':
        v = isEmptyValue_(raw) ? '' : email_(raw);
        break;
      case 'maestro':
        if (opts.user && opts.user.role === ROLES.MAESTRO) {
          v = opts.user.maestroId; // a maestro registers and keeps records under his own name only
        } else {
          v = str_(raw, 40);
          if (v && !activeMaestro_(v) && !(existing && existing.maestroId === v)) fail_('BAD_INPUT', 'Maestro no válido');
        }
        break;
      case 'dias':
        v = diasValue_(raw);
        break;
      case 'yesno':
        v = bool_(raw);
        if (f.key === 'consentimientoContacto' && v === '1' && (!existing || existing.consentimientoContacto !== '1')) {
          patch.fechaConsentimiento = todayIso_();
        }
        if (f.key === 'consentimientoContacto' && v !== '1') patch.fechaConsentimiento = '';
        break;
      case 'textarea':
        v = str_(raw, TEXT_LIMITS[f.key] || 5000);
        break;
      default:
        v = str_(raw, TEXT_LIMITS[f.key] || 120);
    }
    patch[f.key] = v;
  });

  // the document number follows its type: a DNI keeps only digits
  if (Object.prototype.hasOwnProperty.call(patch, 'numeroDocumento') || Object.prototype.hasOwnProperty.call(patch, 'tipoDocumento')) {
    var tipo = Object.prototype.hasOwnProperty.call(patch, 'tipoDocumento') ? patch.tipoDocumento : (existing ? existing.tipoDocumento : '');
    var num = Object.prototype.hasOwnProperty.call(patch, 'numeroDocumento') ? patch.numeroDocumento : (existing ? existing.numeroDocumento : '');
    var doc = normalizeDoc_(num, tipo);
    if (!doc.ok) fail_('BAD_INPUT', 'Número de DNI no válido');
    if (num) { patch.tipoDocumento = doc.tipo; patch.numeroDocumento = doc.numero; }
  }
  if (extraChanged) patch.extra = JSON.stringify(extra);
  return patch;
}

/** Another record with the same document number or WhatsApp, if any (used only to flag, never to refuse). */
function findDuplicate_(patch, exceptId) {
  var doc = patch.numeroDocumento || '';
  var tel = patch.whatsapp || '';
  if (!doc && !tel) return null;
  return findOne_('Conversos', function (c) {
    if (c.id === exceptId) return false;
    return (doc && c.numeroDocumento === doc) || (tel && c.whatsapp === tel);
  });
}
