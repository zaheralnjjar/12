// One-time registration links, sent by WhatsApp to a person who embraced Islam remotely.
// The person opens the link WITHOUT signing in, fills only the fields the supervisor marked for the link,
// and the answer becomes a record assigned to the sheikh who created the link.
// Only a hash of the token is stored; the link works once and expires.

var INVALID_LINK = 'Este enlace no es válido, ya fue usado o venció. Pedí uno nuevo a quien te lo envió.';

function tokenHash_(token) {
  return Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, token));
}

function newToken_() {
  return (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
}

function invitacionEstado_(inv) {
  if (inv.usadoAt) return 'usada';
  if (inv.revocada === '1') return 'revocada';
  if (inv.expira < nowIso_()) return 'vencida';
  return 'pendiente';
}

/** The pending invitation behind a token, or a refusal that says nothing about why. */
function invitationByToken_(token) {
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) fail_('INVALID_LINK', INVALID_LINK);
  var h = tokenHash_(token);
  var inv = findOne_('Invitaciones', function (x) { return x.tokenHash === h; });
  if (!inv || invitacionEstado_(inv) !== 'pendiente') fail_('INVALID_LINK', INVALID_LINK);
  return inv;
}

function invitacionView_(inv, names, readable) {
  return {
    id: inv.id, maestroId: inv.maestroId, maestroNombre: names[inv.maestroId] || '', creadoPor: inv.creadoPor,
    telefono: inv.telefono, nota: inv.nota, expira: inv.expira, estado: invitacionEstado_(inv), usadoAt: inv.usadoAt,
    conversoId: readable[inv.conversoId] ? inv.conversoId : '', createdAt: inv.createdAt,
  };
}

function invitacionFor_(user, id) {
  var iid = str_(id, 40);
  var inv = findOne_('Invitaciones', function (x) { return x.id === iid; });
  if (!inv || (user.role === ROLES.MAESTRO && inv.maestroId !== user.maestroId)) fail_('NOT_FOUND', 'La invitación no existe');
  return inv;
}

registerAction_('invitaciones.create', {
  roles: STAFF,
  write: true,
  fn: function (user, payload) {
    var s = getSettings_();
    if (!s.appUrl) fail_('NOT_CONFIGURED', 'Falta la dirección de la aplicación en Ajustes');
    var maestroId = user.role === ROLES.MAESTRO ? user.maestroId : str_(payload.maestroId, 40);
    if (maestroId && !activeMaestro_(maestroId)) fail_('BAD_INPUT', 'Maestro no válido');
    var tel = '';
    if (payload.telefono) {
      var ph = normalizePhone_(str_(payload.telefono, 30), str_(payload.codigoPais, 4) || '54');
      if (!ph.ok) fail_('BAD_INPUT', 'Número de WhatsApp no válido');
      tel = ph.value;
    }
    var days = Math.max(1, Math.min(30, Number(s.invitacionDias) || 7));
    var token = newToken_();
    var inv = {
      id: newId_('i'), tokenHash: tokenHash_(token), maestroId: maestroId, creadoPor: user.email, telefono: tel,
      nota: str_(payload.nota, 200), expira: new Date(Date.now() + days * 86400000).toISOString(), usadoAt: '',
      conversoId: '', revocada: '', createdAt: nowIso_(),
    };
    insert_('Invitaciones', inv);
    var url = String(s.appUrl).replace(/#.*$/, '') + '#r=' + token;
    var mensaje = s.invitacionMensaje + '\n' + url;
    // the token is shown only now; afterwards only its hash exists
    return {
      id: inv.id, url: url, mensaje: mensaje, expira: inv.expira,
      waUrl: tel ? 'https://wa.me/' + tel.replace(/\D/g, '') + '?text=' + encodeURIComponent(mensaje) : '',
    };
  },
});

registerAction_('invitaciones.list', {
  roles: STAFF,
  fn: function (user) {
    var names = maestroNames_();
    var readable = {};
    readableConversos_(user).forEach(function (c) { readable[c.id] = true; });
    return rows_('Invitaciones')
      .filter(function (x) { return user.role === ROLES.SUPERVISOR || x.maestroId === user.maestroId; })
      .sort(function (a, b) { return a.createdAt < b.createdAt ? 1 : -1; })
      .map(function (x) { return invitacionView_(x, names, readable); });
  },
});

registerAction_('invitaciones.revoke', {
  roles: STAFF,
  write: true,
  fn: function (user, payload) {
    var inv = invitacionFor_(user, payload.id);
    if (invitacionEstado_(inv) !== 'pendiente') fail_('BAD_INPUT', 'Solo se puede anular una invitación pendiente');
    update_('Invitaciones', inv, { revocada: '1' });
    return { id: inv.id, estado: 'revocada' };
  },
});

// ---------- reachable without signing in ----------

/** What the link page needs to draw the form: the link's fields and lists, nothing about anyone. */
registerPublicAction_('public.form', {
  fn: function (payload) {
    invitationByToken_(payload.token);
    var s = getSettings_();
    return {
      org: s.orgName,
      campos: effectiveFields_()
        .filter(function (f) { return f.enEnlace; })
        .map(function (f) { return { key: f.key, etiqueta: f.etiqueta, tipo: f.tipo, seccion: f.seccion, requerido: f.requerido, opciones: f.opciones, ayuda: f.ayuda, custom: f.custom }; }),
      nacionalidades: nacionalidadNames_(true),
      documentos: s.enlaceDocumentos === '1',
    };
  },
});

registerPublicAction_('public.submit', {
  write: true,
  fn: function (payload) {
    var inv = invitationByToken_(payload.token);
    var data = payload.data && typeof payload.data === 'object' ? payload.data : {};
    var patch = validateConverso_(data, { mode: 'enlace' });
    patch.maestroId = inv.maestroId && activeMaestro_(inv.maestroId) ? inv.maestroId : '';
    if (getSettings_().enlaceDocumentos !== '1' && payload.documentos) fail_('BAD_INPUT', 'Este enlace no admite archivos');
    var docs = parseInlineDocuments_(payload.documentos);
    var row = insertConverso_(patch, {
      origen: 'enlace',
      registradoPor: 'enlace:' + inv.creadoPor,
      revisar: 'Completado por la persona mediante enlace' + (patch.maestroId ? '' : ' · Sin maestro asignado'),
    });
    storeInlineDocuments_(row.id, docs, 'enlace');
    update_('Invitaciones', inv, { usadoAt: nowIso_(), conversoId: row.id });
    return { registrado: true };
  },
});
