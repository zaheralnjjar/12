// The record of each person who embraced Islam: list, open, register, edit, assign, archive, delete.
// Every access to an existing record goes through conversoFor_ / readableConversos_ (20_Gate.js).

/** Next serial for a prefix such as "NM-2026-": NM-2026-0001, NM-2026-0002, ... (called under the write lock). */
function nextSerial_(table, column, prefix) {
  var max = 0;
  rows_(table).forEach(function (r) {
    var v = String(r[column] || '');
    if (v.indexOf(prefix) !== 0) return;
    var n = Number(v.slice(prefix.length));
    if (n > max) max = n;
  });
  var next = String(max + 1);
  while (next.length < 4) next = '0' + next;
  return prefix + next;
}

function maestroNames_() {
  var out = {};
  rows_('Maestros').forEach(function (m) { out[m.id] = m.nombre; });
  return out;
}

function fullName_(c) {
  return [c.nombres, c.apellidos].filter(String).join(' ');
}

/** The short line shown in lists: no document number, no dates of the shahada, no notes. */
function conversoSummary_(c, names, last) {
  var info = last[c.id] || {};
  return {
    id: c.id, nombre: fullName_(c), nombreIslamico: c.nombreIslamico, sexo: c.sexo, nacionalidad: c.nacionalidad,
    ciudad: c.ciudad, maestroId: c.maestroId, maestroNombre: names[c.maestroId] || '', estado: c.estado || 'activo',
    revisar: !!c.revisar, origen: c.origen, createdAt: c.createdAt,
    ultimoSeguimiento: info.ultimo || '', proximaFecha: info.proxima || '', proximaAccion: info.accion || '',
  };
}

/** Last follow-up date and the nearest pending next step of each record. */
function followUpIndex_() {
  var out = {};
  var today = todayIso_();
  rows_('Seguimiento').forEach(function (s) {
    var o = out[s.conversoId] || (out[s.conversoId] = {});
    if (!o.ultimo || s.fecha > o.ultimo) o.ultimo = s.fecha;
    if (s.proximaFecha && s.proximaFecha >= today && (!o.proxima || s.proximaFecha < o.proxima)) {
      o.proxima = s.proximaFecha;
      o.accion = s.proximaAccion;
    }
  });
  return out;
}

/** The whole record, for those allowed to read it. */
function conversoFull_(c) {
  var names = maestroNames_();
  var out = {};
  SCHEMA.Conversos.forEach(function (k) { out[k] = c[k]; });
  out.extra = parseJson_(c.extra, {});
  out.nombre = fullName_(c);
  out.maestroNombre = names[c.maestroId] || '';
  out.estado = c.estado || 'activo';
  delete out.formKey;
  return out;
}

/** Checks files sent with a new record BEFORE anything is stored, so a bad file leaves no half-made record. */
function parseInlineDocuments_(docs) {
  if (docs === undefined || docs === null) return [];
  if (!Array.isArray(docs) || docs.length > MAX_LINK_DOCUMENTS) fail_('BAD_INPUT', 'Demasiados archivos (máximo ' + MAX_LINK_DOCUMENTS + ')');
  return docs.map(function (d) {
    var tipo = str_(d && d.tipo, 20);
    if (DOC_TYPES.indexOf(tipo) < 0) fail_('BAD_INPUT', 'Tipo de documento no válido');
    return { tipo: tipo, file: parseDataUrl_(d.dataUrl, DOCUMENT_MIMES, MAX_DOCUMENT_BYTES) };
  });
}

function storeInlineDocuments_(conversoId, parsed, who) {
  parsed.forEach(function (p) { storeDocument_(conversoId, p.tipo, p.file, who); });
}

/** Creates a record from an already validated patch. Returns the stored row. */
function insertConverso_(patch, meta) {
  var now = nowIso_();
  var row = {};
  SCHEMA.Conversos.forEach(function (k) { row[k] = Object.prototype.hasOwnProperty.call(patch, k) ? patch[k] : ''; });
  // the year of registration, so records imported from the old form keep their own year
  row.id = nextSerial_('Conversos', 'id', 'NM-' + String(meta.createdAt || now).slice(0, 4) + '-');
  row.estado = 'activo';
  row.origen = meta.origen;
  row.registradoPor = meta.registradoPor || '';
  row.formKey = meta.formKey || '';
  var reasons = meta.revisar ? [meta.revisar] : [];
  var dup = findDuplicate_(row, row.id);
  if (dup) reasons.push('Posible duplicado de ' + dup.id);
  row.revisar = reasons.join(' · ');
  row.createdAt = meta.createdAt || now;
  row.updatedAt = now;
  insert_('Conversos', row);
  return row;
}

// ---------- actions ----------

registerAction_('conversos.list', {
  roles: STAFF,
  fn: function (user, payload) {
    var q = looseKey_(str_(payload.q, 80));
    var qDigits = q.replace(/\D/g, '');
    var estado = str_(payload.estado, 20);
    var maestroId = str_(payload.maestroId, 40);
    var nacionalidad = str_(payload.nacionalidad, 60);
    var soloRevisar = payload.revisar === true;
    var names = maestroNames_();
    var last = followUpIndex_();
    return readableConversos_(user)
      .filter(function (c) {
        if (estado && (c.estado || 'activo') !== estado) return false;
        if (!estado && c.estado === 'archivado' && !q) return false; // archived records appear only when asked for or searched
        if (maestroId && c.maestroId !== maestroId) return false;
        if (nacionalidad && c.nacionalidad !== nacionalidad) return false;
        if (soloRevisar && !c.revisar) return false;
        if (!q) return true;
        var hay = looseKey_([c.id, c.nombres, c.apellidos, c.nombreIslamico, c.ciudad, c.email].join(' '));
        if (hay.indexOf(q) >= 0) return true;
        // a number finds the document or the WhatsApp without either being listed
        return qDigits.length >= 4 && (String(c.numeroDocumento).indexOf(qDigits) >= 0 || String(c.whatsapp).replace(/\D/g, '').indexOf(qDigits) >= 0);
      })
      .sort(function (a, b) { return a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0; })
      .map(function (c) { return conversoSummary_(c, names, last); });
  },
});

registerAction_('conversos.get', {
  roles: STAFF,
  fn: function (user, payload) {
    var c = conversoFor_(user, 'read', payload.id);
    var names = maestroNames_();
    var etapas = {};
    rows_('Etapas').forEach(function (e) { etapas[e.id] = e.nombre; });
    return {
      converso: conversoFull_(c),
      seguimiento: rows_('Seguimiento')
        .filter(function (s) { return s.conversoId === c.id; })
        .sort(function (a, b) { return a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : (a.createdAt < b.createdAt ? 1 : -1); })
        .map(seguimientoView_),
      progreso: rows_('Progreso')
        .filter(function (p) { return p.conversoId === c.id; })
        .map(function (p) { return { etapaId: p.etapaId, nombre: etapas[p.etapaId] || '', fecha: p.fecha, autor: p.autor }; }),
      documentos: rows_('Documentos')
        .filter(function (d) { return d.conversoId === c.id && !d.removedAt; })
        .map(function (d) { return { id: d.id, tipo: d.tipo, fileName: d.fileName, mime: d.mime, uploadedAt: d.uploadedAt }; }),
      certificados: rows_('Certificados')
        .filter(function (x) { return x.conversoId === c.id; })
        .map(function (x) { return certificadoView_(x, names); }),
    };
  },
});

/**
 * Registers a new person. The colaborador gets back only "registered": no id, no data,
 * so nothing of the record can be reached again through his account.
 */
registerAction_('conversos.create', {
  roles: ALL_ROLES,
  write: true,
  fn: function (user, payload) {
    var data = payload.data && typeof payload.data === 'object' ? payload.data : {};
    var patch = validateConverso_(data, { mode: 'staff', user: user });
    var docs = parseInlineDocuments_(payload.documentos);
    var row = insertConverso_(patch, {
      origen: user.role === ROLES.COLABORADOR ? 'colaborador' : 'manual',
      registradoPor: user.email,
    });
    storeInlineDocuments_(row.id, docs, user.email);
    if (user.role === ROLES.COLABORADOR) return { registrado: true };
    return { registrado: true, id: row.id };
  },
});

registerAction_('conversos.update', {
  roles: STAFF,
  write: true,
  fn: function (user, payload) {
    var c = conversoFor_(user, 'write', payload.id);
    var data = payload.data && typeof payload.data === 'object' ? payload.data : {};
    var patch = validateConverso_(data, { mode: 'staff', existing: c, user: user });
    patch.updatedAt = nowIso_();
    update_('Conversos', c, patch);
    return conversoFull_(findOne_('Conversos', function (x) { return x.id === c.id; }));
  },
});

registerAction_('conversos.setEstado', {
  roles: STAFF,
  write: true,
  fn: function (user, payload) {
    var c = conversoFor_(user, 'write', payload.id);
    var estado = str_(payload.estado, 20);
    if (ESTADOS.indexOf(estado) < 0) fail_('BAD_INPUT', 'Estado no válido');
    update_('Conversos', c, { estado: estado, updatedAt: nowIso_() });
    return { id: c.id, estado: estado };
  },
});

/** The supervisor marks as checked a record the import or a link flagged for review. */
registerAction_('conversos.revisado', {
  roles: [ROLES.SUPERVISOR],
  write: true,
  fn: function (user, payload) {
    var c = conversoFor_(user, 'write', payload.id);
    update_('Conversos', c, { revisar: '', updatedAt: nowIso_() });
    return { id: c.id, revisar: false };
  },
});

/**
 * Deletes a record for good (for instance when the person withdraws consent). Documents go to the Drive trash;
 * issued certificates keep their number but lose their data and are marked annulled.
 */
registerAction_('conversos.delete', {
  roles: [ROLES.SUPERVISOR],
  write: true,
  fn: function (user, payload) {
    if (payload.confirm !== true) fail_('BAD_INPUT', 'Hace falta confirmar la eliminación');
    var c = conversoFor_(user, 'write', payload.id);
    rows_('Documentos').forEach(function (d) { if (d.conversoId === c.id) trashFile_(d.fileId); });
    ['Documentos', 'Seguimiento', 'Progreso'].forEach(function (t) {
      deleteWhere_(t, function (r) { return r.conversoId === c.id; });
    });
    rows_('Certificados').forEach(function (x) {
      if (x.conversoId === c.id) update_('Certificados', x, { datos: '{}', estado: 'anulado', anuladoMotivo: 'Registro eliminado', updatedAt: nowIso_() });
    });
    deleteWhere_('Conversos', function (x) { return x.id === c.id; });
    audit_(user, 'eliminar_registro', c.id, '');
    return { deleted: true };
  },
});

/** Numbers for the home screen, limited to what the caller may read. */
registerAction_('resumen', {
  roles: STAFF,
  fn: function (user) {
    var list = readableConversos_(user);
    var month = todayIso_().slice(0, 7);
    var porEstado = {};
    ESTADOS.forEach(function (e) { porEstado[e] = 0; });
    var porMaestro = {};
    var revisar = 0;
    var delMes = 0;
    list.forEach(function (c) {
      porEstado[c.estado || 'activo'] = (porEstado[c.estado || 'activo'] || 0) + 1;
      porMaestro[c.maestroId || ''] = (porMaestro[c.maestroId || ''] || 0) + 1;
      if (c.revisar) revisar++;
      if (String(c.fechaShahada || c.createdAt).slice(0, 7) === month) delMes++;
    });
    var names = maestroNames_();
    var last = followUpIndex_();
    var today = todayIso_();
    var in7 = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    var proximas = list
      .filter(function (c) { var p = last[c.id] && last[c.id].proxima; return p && p >= today && p <= in7; })
      .map(function (c) { return conversoSummary_(c, names, last); })
      .sort(function (a, b) { return a.proximaFecha < b.proximaFecha ? -1 : 1; });
    return {
      total: list.length, porEstado: porEstado, revisar: revisar, delMes: delMes, proximas: proximas,
      porMaestro: Object.keys(porMaestro).map(function (id) { return { maestroId: id, nombre: names[id] || '', total: porMaestro[id] }; }),
    };
  },
});
