// Follow-up notes, learning progress and identity documents of a record.
// Each action reaches the record through conversoFor_ (20_Gate.js).

function seguimientoView_(s) {
  return {
    id: s.id, conversoId: s.conversoId, autor: s.autor, fecha: s.fecha, tipo: s.tipo, resumen: s.resumen,
    proximaAccion: s.proximaAccion, proximaFecha: s.proximaFecha, createdAt: s.createdAt,
  };
}

registerAction_('seguimiento.add', {
  roles: STAFF,
  write: true,
  fn: function (user, payload) {
    var c = conversoFor_(user, 'write', payload.conversoId);
    var fecha = dateOrEmpty_(payload.fecha) || todayIso_();
    if (fecha > todayIso_()) fail_('BAD_INPUT', 'La fecha del seguimiento no puede ser futura');
    var tipo = str_(payload.tipo, 20) || 'otro';
    if (TIPOS_SEGUIMIENTO.indexOf(tipo) < 0) fail_('BAD_INPUT', 'Tipo de seguimiento no válido');
    var resumen = str_(payload.resumen, 3000);
    if (!resumen) fail_('BAD_INPUT', 'Escribí un resumen del seguimiento');
    var proximaFecha = dateOrEmpty_(payload.proximaFecha);
    var row = {
      id: newId_('s'), conversoId: c.id, autor: user.email, fecha: fecha, tipo: tipo, resumen: resumen,
      proximaAccion: str_(payload.proximaAccion, 300), proximaFecha: proximaFecha, createdAt: nowIso_(),
    };
    insert_('Seguimiento', row);
    return seguimientoView_(row);
  },
});

/** A note is removed by its author or by the supervisor. */
registerAction_('seguimiento.delete', {
  roles: STAFF,
  write: true,
  fn: function (user, payload) {
    var id = str_(payload.id, 40);
    var s = findOne_('Seguimiento', function (x) { return x.id === id; });
    if (!s) fail_('NOT_FOUND', 'La nota no existe');
    conversoFor_(user, 'write', s.conversoId);
    if (user.role !== ROLES.SUPERVISOR && s.autor !== user.email) fail_('FORBIDDEN', DENIED);
    deleteWhere_('Seguimiento', function (x) { return x.id === id; });
    return { deleted: true };
  },
});

/** Ticks or unticks one learning stage of the record. */
registerAction_('progreso.set', {
  roles: STAFF,
  write: true,
  fn: function (user, payload) {
    var c = conversoFor_(user, 'write', payload.conversoId);
    var etapaId = str_(payload.etapaId, 40);
    if (!findOne_('Etapas', function (e) { return e.id === etapaId; })) fail_('NOT_FOUND', 'La etapa no existe');
    deleteWhere_('Progreso', function (p) { return p.conversoId === c.id && p.etapaId === etapaId; });
    if (payload.hecho === true) {
      var fecha = dateOrEmpty_(payload.fecha) || todayIso_();
      insert_('Progreso', { id: newId_('p'), conversoId: c.id, etapaId: etapaId, fecha: fecha, autor: user.email, createdAt: nowIso_() });
    }
    return { etapaId: etapaId, hecho: payload.hecho === true };
  },
});

// ---------- identity documents (Drive, private) ----------

function storeDocument_(conversoId, tipo, parsed, who) {
  var ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf' }[parsed.mime] || 'bin';
  var id = newId_('d');
  var fileName = conversoId + '_' + tipo + '_' + id + '.' + ext;
  var fileId = saveFile_('documentos', fileName, parsed);
  insert_('Documentos', { id: id, conversoId: conversoId, tipo: tipo, fileId: fileId, fileName: fileName, mime: parsed.mime, uploadedAt: nowIso_(), uploadedBy: who, removedAt: '' });
  return id;
}

function documentoFor_(user, action, id) {
  var did = str_(id, 40);
  var d = findOne_('Documentos', function (x) { return x.id === did && !x.removedAt; });
  if (!d) fail_('NOT_FOUND', 'El documento no existe');
  conversoFor_(user, action, d.conversoId);
  return d;
}

registerAction_('documentos.upload', {
  roles: STAFF,
  write: true,
  fn: function (user, payload) {
    var c = conversoFor_(user, 'write', payload.conversoId);
    var tipo = str_(payload.tipo, 20);
    if (DOC_TYPES.indexOf(tipo) < 0) fail_('BAD_INPUT', 'Tipo de documento no válido');
    var parsed = parseDataUrl_(payload.dataUrl, DOCUMENT_MIMES, MAX_DOCUMENT_BYTES);
    return { id: storeDocument_(c.id, tipo, parsed, user.email) };
  },
});

/** Opening an identity document is written to the audit log. */
registerAction_('documentos.get', {
  roles: STAFF,
  fn: function (user, payload) {
    var d = documentoFor_(user, 'read', payload.id);
    var dataUrl = readFileAsDataUrl_(d.fileId);
    if (!dataUrl) fail_('NOT_FOUND', 'No se encontró el archivo');
    if (!user.preview) audit_(user, 'ver_documento', d.conversoId, d.tipo);
    return { id: d.id, tipo: d.tipo, mime: d.mime, fileName: d.fileName, dataUrl: dataUrl };
  },
});

registerAction_('documentos.remove', {
  roles: STAFF,
  write: true,
  fn: function (user, payload) {
    var d = documentoFor_(user, 'write', payload.id);
    trashFile_(d.fileId);
    update_('Documentos', d, { removedAt: nowIso_() });
    return { removed: true };
  },
});
