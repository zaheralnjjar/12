// Certificates of embracing Islam. The server allocates the serial number and freezes the printed data;
// the PDF itself is drawn in the browser from that frozen data (src/export/certificado.ts).

var CERT_IDIOMAS = ['es', 'es_ar']; // Spanish, or Spanish and Arabic for people travelling to an Arab country
var CERT_EMISORES = ['maestro', 'centro'];

function certificadoView_(x, names) {
  return {
    id: x.id, numero: x.numero, conversoId: x.conversoId, maestroId: x.maestroId, maestroNombre: (names || {})[x.maestroId] || '',
    emisor: x.emisor, idioma: x.idioma, fecha: x.fecha, estado: x.estado, anuladoMotivo: x.anuladoMotivo,
    emitidoPor: x.emitidoPor, createdAt: x.createdAt,
  };
}

function certificadoFor_(user, action, id) {
  var cid = str_(id, 40);
  var x = findOne_('Certificados', function (r) { return r.id === cid; });
  if (!x) fail_('NOT_FOUND', 'El certificado no existe');
  conversoFor_(user, action, x.conversoId);
  return x;
}

registerAction_('certificados.issue', {
  roles: STAFF,
  write: true,
  fn: function (user, payload) {
    var c = conversoFor_(user, 'write', payload.conversoId);
    var emisor = str_(payload.emisor, 10) || 'maestro';
    var idioma = str_(payload.idioma, 10) || 'es';
    if (CERT_EMISORES.indexOf(emisor) < 0) fail_('BAD_INPUT', 'Emisor no válido');
    if (CERT_IDIOMAS.indexOf(idioma) < 0) fail_('BAD_INPUT', 'Idioma no válido');
    if (!c.nombres) fail_('BAD_INPUT', 'Falta el nombre de la persona');
    if (!c.fechaShahada) fail_('BAD_INPUT', 'Falta la fecha de la shahada en el registro');
    var m = c.maestroId ? findOne_('Maestros', function (x) { return x.id === c.maestroId; }) : null;
    if (emisor === 'maestro' && !m) fail_('BAD_INPUT', 'El registro no tiene sheij asignado. Asignalo o emití a nombre del centro');
    var s = getSettings_();
    var now = nowIso_();
    var fecha = todayIso_();
    var datos = {
      nombre: fullName_(c), nombreIslamico: c.nombreIslamico, sexo: c.sexo, nacionalidad: c.nacionalidad,
      tipoDocumento: c.tipoDocumento, numeroDocumento: c.numeroDocumento,
      fechaShahada: c.fechaShahada, lugarShahada: c.lugarShahada,
      maestroNombre: m ? m.nombre : '',
      emisorTexto: emisor === 'maestro' ? m.nombre : s.emisorCentro,
      lugarEmision: s.lugarEmision, fechaEmision: fecha, conversoId: c.id,
    };
    var row = {
      id: newId_('c'), numero: nextSerial_('Certificados', 'numero', 'C-' + now.slice(0, 4) + '-'), conversoId: c.id,
      maestroId: c.maestroId, emisor: emisor, idioma: idioma, fecha: fecha, datos: JSON.stringify(datos),
      estado: 'valido', anuladoMotivo: '', emitidoPor: user.email, createdAt: now, updatedAt: now,
    };
    var verificationToken = newToken_();
    row.verificationHash = tokenHash_(verificationToken);
    insert_('Certificados', row);
    audit_(user, 'emitir_certificado', c.id, row.numero);
    var issued = certificadoView_(row, maestroNames_());
    issued.verificationToken = verificationToken;
    return issued;
  },
});

registerAction_('certificados.list', {
  roles: STAFF,
  fn: function (user) {
    var names = maestroNames_();
    var readable = {};
    readableConversos_(user).forEach(function (c) { readable[c.id] = fullName_(c); });
    return rows_('Certificados')
      .filter(function (x) { return Object.prototype.hasOwnProperty.call(readable, x.conversoId); })
      .sort(function (a, b) { return a.createdAt < b.createdAt ? 1 : -1; })
      .map(function (x) { var v = certificadoView_(x, names); v.nombre = readable[x.conversoId]; return v; });
  },
});

/** The frozen data and, when issued by the sheikh, his signature: everything needed to draw the PDF. */
registerAction_('certificados.get', {
  roles: STAFF,
  fn: function (user, payload) {
    var x = certificadoFor_(user, 'read', payload.id);
    var v = certificadoView_(x, maestroNames_());
    v.datos = parseJson_(x.datos, {});
    v.firma = null;
    if (x.emisor === 'maestro' && x.maestroId) {
      var m = findOne_('Maestros', function (r) { return r.id === x.maestroId; });
      if (m && m.firmaFileId) v.firma = readFileAsDataUrl_(m.firmaFileId);
    }
    v.orgName = getSettings_().orgName;
    return v;
  },
});

/** Re-issue the QR secret when a certificate is reprinted; only the new hash remains stored. */
registerAction_('certificados.verifyToken', {
  roles: STAFF,
  write: true,
  fn: function (user, payload) {
    var cert = certificadoFor_(user, 'read', payload.id);
    var token = newToken_();
    var hashes = String(cert.verificationHash || '').split('|').filter(String);
    hashes.push(tokenHash_(token));
    update_('Certificados', cert, { verificationHash: hashes.join('|'), updatedAt: nowIso_() });
    return { token: token };
  },
});

/** An annulled certificate keeps its number and stays listed; it is never deleted. */
registerAction_('certificados.annul', {
  roles: STAFF,
  write: true,
  fn: function (user, payload) {
    var x = certificadoFor_(user, 'write', payload.id);
    if (x.estado === 'anulado') fail_('BAD_INPUT', 'El certificado ya está anulado');
    var motivo = str_(payload.motivo, 300);
    if (!motivo) fail_('BAD_INPUT', 'Indicá el motivo de la anulación');
    update_('Certificados', x, { estado: 'anulado', anuladoMotivo: motivo, updatedAt: nowIso_() });
    audit_(user, 'anular_certificado', x.conversoId, x.numero);
    return { id: x.id, estado: 'anulado' };
  },
});
