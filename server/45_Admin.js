// Who the caller is, the shared lists, and the supervisor's control panel (Ajustes):
// settings, sheikhs, accounts, nationalities, learning stages, fields, contacts and the audit log.

function audit_(user, accion, objeto, detalle) {
  insert_('Auditoria', { id: newId_('a'), email: user.email, accion: accion, objeto: objeto || '', detalle: detalle || '', createdAt: nowIso_() });
}

function maestroView_(m, withPrivate) {
  var v = { id: m.id, nombre: m.nombre, active: m.active === '1' };
  if (withPrivate) {
    v.alias = m.alias;
    v.telefono = m.telefono;
    v.email = m.email;
    v.tieneFirma = !!m.firmaFileId;
  }
  return v;
}

/** Fields as the forms need them (labels and rules; never any data). */
function camposPublicos_() {
  return effectiveFields_().map(function (f) {
    return {
      key: f.key, etiqueta: f.etiqueta, etiquetaAr: f.etiquetaAr, tipo: f.tipo, seccion: f.seccion, requerido: f.requerido,
      enEnlace: f.enEnlace, active: f.active, fixed: f.fixed, internal: f.internal, custom: f.custom, opciones: f.opciones, ayuda: f.ayuda,
    };
  });
}

registerAction_('me', {
  roles: ALL_ROLES,
  fn: function (user) {
    if (!user.preview && user._userRow) {
      var today = todayIso_();
      if (String(user._userRow.lastLogin).slice(0, 10) !== today) update_('Users', user._userRow, { lastLogin: nowIso_() });
    }
    var m = user.maestroId ? findOne_('Maestros', function (x) { return x.id === user.maestroId; }) : null;
    var s = getSettings_();
    return {
      user: { email: user.email, role: user.role, maestroId: user.maestroId, preview: !!user.preview },
      maestro: m ? maestroView_(m, true) : null,
      org: s.orgName,
    };
  },
});

/** The lists every form needs. A colaborador gets the sheikhs' names only, to choose who witnessed the shahada. */
registerAction_('catalogo', {
  roles: ALL_ROLES,
  fn: function (user) {
    var staff = user.role !== ROLES.COLABORADOR;
    return {
      campos: camposPublicos_(),
      nacionalidades: rows_('Nacionalidades')
        .slice()
        .sort(function (a, b) { return Number(a.orden || 0) - Number(b.orden || 0) || (a.nombre < b.nombre ? -1 : 1); })
        .filter(function (n) { return staff || n.active === '1'; })
        .map(function (n) { return { id: n.id, nombre: n.nombre, active: n.active === '1' }; }),
      maestros: rows_('Maestros')
        .filter(function (m) { return staff || m.active === '1'; })
        .map(function (m) { return maestroView_(m, false); }),
      etapas: staff ? rows_('Etapas')
        .slice()
        .sort(function (a, b) { return Number(a.orden || 0) - Number(b.orden || 0); })
        .map(function (e) { return { id: e.id, nombre: e.nombre, descripcion: e.descripcion, active: e.active === '1' }; }) : [],
    };
  },
});

// ---------- settings ----------

registerAction_('settings.get', {
  roles: [ROLES.SUPERVISOR],
  fn: function () {
    return getSettings_();
  },
});

registerAction_('settings.save', {
  roles: [ROLES.SUPERVISOR],
  write: true,
  fn: function (user, payload) {
    EDITABLE_SETTINGS.forEach(function (k) {
      if (!Object.prototype.hasOwnProperty.call(payload, k)) return;
      var v = str_(payload[k], k === 'invitacionMensaje' ? 500 : 200);
      if (k === 'appUrl' && v && !/^https:\/\/[^\s]+$/.test(v) && !/^http:\/\/localhost(:\d+)?(\/.*)?$/.test(v)) {
        fail_('BAD_INPUT', 'La dirección debe empezar con https://');
      }
      if (k === 'invitacionDias' && !(Number(v) >= 1 && Number(v) <= 30)) fail_('BAD_INPUT', 'Los días deben estar entre 1 y 30');
      if (k === 'enlaceDocumentos') v = bool_(payload[k]);
      setSetting_(k, v);
    });
    return getSettings_();
  },
});

// ---------- sheikhs / maestros ----------

registerAction_('maestros.list', {
  roles: [ROLES.SUPERVISOR],
  fn: function () {
    var counts = {};
    rows_('Conversos').forEach(function (c) { counts[c.maestroId] = (counts[c.maestroId] || 0) + 1; });
    return rows_('Maestros').map(function (m) {
      var v = maestroView_(m, true);
      v.total = counts[m.id] || 0;
      return v;
    });
  },
});

/** Adds or edits a sheikh. With an e-mail he can sign in and sees the records assigned to him. */
registerAction_('maestros.save', {
  roles: [ROLES.SUPERVISOR],
  write: true,
  fn: function (user, payload) {
    var id = str_(payload.id, 40);
    var nombre = str_(payload.nombre, 100);
    if (!nombre) fail_('BAD_INPUT', 'El nombre es obligatorio');
    var email = payload.email ? email_(payload.email) : '';
    var alias = str_(payload.alias, 500);
    var telefono = '';
    if (payload.telefono) {
      var ph = normalizePhone_(str_(payload.telefono, 30), str_(payload.codigoPais, 4) || '54');
      if (!ph.ok) fail_('BAD_INPUT', 'Teléfono no válido');
      telefono = ph.value;
    }
    var m = id ? findOne_('Maestros', function (x) { return x.id === id; }) : null;
    if (id && !m) fail_('NOT_FOUND', 'El maestro no existe');
    if (email) {
      var other = findOne_('Maestros', function (x) { return x.email === email && x.id !== id; });
      if (other) fail_('BAD_INPUT', 'Ese correo ya pertenece a otro maestro');
      var u = findOne_('Users', function (x) { return x.email.toLowerCase() === email; });
      if (u && u.role === ROLES.COLABORADOR) fail_('BAD_INPUT', 'Ese correo está registrado como colaborador');
    }
    var now = nowIso_();
    if (m) {
      // the old e-mail stops working when it changes
      if (m.email && m.email !== email) deleteWhere_('Users', function (u) { return u.role === ROLES.MAESTRO && u.maestroId === m.id; });
      update_('Maestros', m, { nombre: nombre, email: email, alias: alias, telefono: telefono, updatedAt: now });
    } else {
      m = { id: newId_('m'), nombre: nombre, alias: alias, telefono: telefono, email: email, firmaFileId: '', active: '1', createdAt: now, updatedAt: now };
      insert_('Maestros', m);
    }
    if (email) {
      var existing = findOne_('Users', function (x) { return x.email.toLowerCase() === email; });
      // a supervisor who is also a sheikh keeps signing in as supervisor (he already sees everything)
      if (!existing) insert_('Users', { email: email, role: ROLES.MAESTRO, maestroId: m.id, active: '1', expiry: '', createdAt: now });
    }
    return maestroView_(findOne_('Maestros', function (x) { return x.id === m.id; }), true);
  },
});

/**
 * Deactivates a sheikh who left (he is never deleted: old records keep his name).
 * His active records must move to another sheikh; he can no longer sign in.
 */
registerAction_('maestros.setActive', {
  roles: [ROLES.SUPERVISOR],
  write: true,
  fn: function (user, payload) {
    var id = str_(payload.id, 40);
    var m = findOne_('Maestros', function (x) { return x.id === id; });
    if (!m) fail_('NOT_FOUND', 'El maestro no existe');
    var active = payload.active === true;
    if (!active) {
      var mine = rows_('Conversos').filter(function (c) { return c.maestroId === id && c.estado !== 'archivado'; });
      var to = str_(payload.reasignarA, 40);
      if (mine.length) {
        if (!to || to === id || !activeMaestro_(to)) fail_('BAD_INPUT', 'Elegí otro maestro activo para sus ' + mine.length + ' registros');
        mine.forEach(function (c) { update_('Conversos', c, { maestroId: to, updatedAt: nowIso_() }); });
        audit_(user, 'reasignar', id, mine.length + ' registros a ' + to);
      }
      rows_('Invitaciones').forEach(function (inv) {
        if (inv.maestroId === id && invitacionEstado_(inv) === 'pendiente') update_('Invitaciones', inv, { revocada: '1' });
      });
    }
    update_('Maestros', m, { active: active ? '1' : '', updatedAt: nowIso_() });
    rows_('Users').forEach(function (u) {
      if (u.role === ROLES.MAESTRO && u.maestroId === id) update_('Users', u, { active: active ? '1' : '' });
    });
    return { id: id, active: active };
  },
});

/** The sheikh's signature for certificates: he saves his own, the supervisor anyone's. */
registerAction_('firma.save', {
  roles: STAFF,
  write: true,
  fn: function (user, payload) {
    var id = str_(payload.maestroId, 40);
    if (user.role === ROLES.MAESTRO && id !== user.maestroId) fail_('FORBIDDEN', DENIED);
    var m = findOne_('Maestros', function (x) { return x.id === id; });
    if (!m) fail_('NOT_FOUND', 'El maestro no existe');
    var parsed = parseDataUrl_(payload.dataUrl, ['image/png'], MAX_SIGNATURE_BYTES);
    var fileId = saveFile_('firmas', 'firma_' + id + '.png', parsed);
    trashFile_(m.firmaFileId);
    update_('Maestros', m, { firmaFileId: fileId, updatedAt: nowIso_() });
    return { saved: true };
  },
});

registerAction_('firma.get', {
  roles: STAFF,
  fn: function (user, payload) {
    var id = str_(payload.maestroId, 40);
    if (user.role === ROLES.MAESTRO && id !== user.maestroId) fail_('FORBIDDEN', DENIED);
    var m = findOne_('Maestros', function (x) { return x.id === id; });
    if (!m) fail_('NOT_FOUND', 'El maestro no existe');
    return { dataUrl: readFileAsDataUrl_(m.firmaFileId) };
  },
});

// ---------- accounts: colaboradores and supervisors ----------

registerAction_('usuarios.list', {
  roles: [ROLES.SUPERVISOR],
  fn: function (user) {
    return rows_('Users')
      .filter(function (u) { return u.role !== ROLES.MAESTRO; })
      .map(function (u) {
        return { email: u.email.toLowerCase(), role: u.role, active: u.active === '1', expiry: u.expiry, lastLogin: u.lastLogin, isMe: u.email.toLowerCase() === user.email };
      });
  },
});

/** Adds (or re-enables) a colaborador or a supervisor. A colaborador's access may end on a date. */
registerAction_('usuarios.save', {
  roles: [ROLES.SUPERVISOR],
  write: true,
  fn: function (user, payload) {
    var email = email_(payload.email);
    var role = str_(payload.role, 20);
    if (role !== ROLES.COLABORADOR && role !== ROLES.SUPERVISOR) fail_('BAD_INPUT', 'Rol no válido');
    var expiry = role === ROLES.COLABORADOR ? dateOrEmpty_(payload.expiry) : '';
    if (expiry && expiry < todayIso_()) fail_('BAD_INPUT', 'La fecha de vencimiento ya pasó');
    var existing = findOne_('Users', function (u) { return u.email.toLowerCase() === email; });
    if (existing && existing.role !== role) fail_('BAD_INPUT', 'Ese correo ya tiene otro rol. Desactivalo primero');
    if (existing) update_('Users', existing, { active: '1', expiry: expiry });
    else insert_('Users', { email: email, role: role, maestroId: '', active: '1', expiry: expiry, createdAt: nowIso_() });
    return { email: email, role: role, active: true, expiry: expiry };
  },
});

/** Turns an account off (kept so it can be turned back on). Never the caller, never the last supervisor. */
registerAction_('usuarios.disable', {
  roles: [ROLES.SUPERVISOR],
  write: true,
  fn: function (user, payload) {
    var email = email_(payload.email);
    if (email === user.email) fail_('BAD_INPUT', 'No podés desactivar tu propia cuenta');
    var row = findOne_('Users', function (u) { return u.email.toLowerCase() === email && u.role !== ROLES.MAESTRO; });
    if (!row) fail_('NOT_FOUND', 'La cuenta no existe');
    if (row.role === ROLES.SUPERVISOR) {
      var others = rows_('Users').filter(function (u) { return u.role === ROLES.SUPERVISOR && u.active === '1' && u.email.toLowerCase() !== email; });
      if (!others.length) fail_('BAD_INPUT', 'Tiene que quedar al menos un supervisor');
    }
    update_('Users', row, { active: '' });
    return { email: email, active: false };
  },
});

// ---------- lists the supervisor maintains ----------

registerAction_('nacionalidades.save', {
  roles: [ROLES.SUPERVISOR],
  write: true,
  fn: function (user, payload) {
    var id = str_(payload.id, 40);
    var nombre = str_(payload.nombre, 60);
    if (!nombre) fail_('BAD_INPUT', 'El nombre es obligatorio');
    var dup = findOne_('Nacionalidades', function (n) { return looseKey_(n.nombre) === looseKey_(nombre) && n.id !== id; });
    if (dup) fail_('BAD_INPUT', 'Esa nacionalidad ya existe');
    var active = payload.active === false ? '' : '1';
    var orden = String(Number(payload.orden) || 0);
    if (id) {
      var n = findOne_('Nacionalidades', function (x) { return x.id === id; });
      if (!n) fail_('NOT_FOUND', 'La nacionalidad no existe');
      // renaming keeps the records that already carry the old name in line
      if (n.nombre !== nombre) {
        rows_('Conversos').forEach(function (c) { if (c.nacionalidad === n.nombre) update_('Conversos', c, { nacionalidad: nombre }); });
      }
      update_('Nacionalidades', n, { nombre: nombre, active: active, orden: orden });
      return { id: id, nombre: nombre, active: active === '1' };
    }
    var row = { id: newId_('n'), nombre: nombre, orden: orden, active: active, createdAt: nowIso_() };
    insert_('Nacionalidades', row);
    return { id: row.id, nombre: nombre, active: active === '1' };
  },
});

registerAction_('etapas.save', {
  roles: [ROLES.SUPERVISOR],
  write: true,
  fn: function (user, payload) {
    var id = str_(payload.id, 40);
    var nombre = str_(payload.nombre, 120);
    if (!nombre) fail_('BAD_INPUT', 'El nombre es obligatorio');
    var patch = { nombre: nombre, descripcion: str_(payload.descripcion, 2000), orden: String(Number(payload.orden) || 0), active: payload.active === false ? '' : '1' };
    if (id) {
      var e = findOne_('Etapas', function (x) { return x.id === id; });
      if (!e) fail_('NOT_FOUND', 'La etapa no existe');
      update_('Etapas', e, patch);
      return { id: id };
    }
    patch.id = newId_('e');
    patch.createdAt = nowIso_();
    insert_('Etapas', patch);
    return { id: patch.id };
  },
});

/** Required / in the public link / in use, for one built-in field. */
registerAction_('camposBase.save', {
  roles: [ROLES.SUPERVISOR],
  write: true,
  fn: function (user, payload) {
    var key = str_(payload.key, 40);
    var f = null;
    BASE_FIELDS.forEach(function (x) { if (x.key === key) f = x; });
    if (!f) fail_('NOT_FOUND', 'El campo no existe');
    if (f.fixed) fail_('BAD_INPUT', 'Este campo es siempre obligatorio');
    var patch = { key: key, requerido: bool_(payload.requerido), enEnlace: f.internal ? '' : bool_(payload.enEnlace), active: bool_(payload.active) };
    var row = findOne_('CamposBase', function (r) { return r.key === key; });
    if (row) update_('CamposBase', row, patch);
    else insert_('CamposBase', patch);
    delete dbCache_.__fields;
    return camposPublicos_();
  },
});

/** Adds or edits a custom field. A field is never deleted (answers already given keep their label); it is turned off. */
registerAction_('campos.save', {
  roles: [ROLES.SUPERVISOR],
  write: true,
  fn: function (user, payload) {
    var id = str_(payload.id, 40);
    var etiqueta = str_(payload.etiqueta, 120);
    if (!etiqueta) fail_('BAD_INPUT', 'La etiqueta es obligatoria');
    var tipo = str_(payload.tipo, 20);
    if (CUSTOM_FIELD_TYPES.indexOf(tipo) < 0) fail_('BAD_INPUT', 'Tipo de campo no válido');
    var seccion = str_(payload.seccion, 20) || 'otros';
    if (SECCIONES.indexOf(seccion) < 0) fail_('BAD_INPUT', 'Sección no válida');
    var opciones = [];
    if (tipo === 'choice' || tipo === 'multichoice') {
      opciones = (Array.isArray(payload.opciones) ? payload.opciones : []).map(function (o) { return str_(o, 80); }).filter(String);
      if (opciones.length < 2) fail_('BAD_INPUT', 'Agregá al menos dos opciones');
    }
    var patch = {
      etiqueta: etiqueta, etiquetaAr: str_(payload.etiquetaAr, 120), tipo: tipo, opciones: JSON.stringify(opciones),
      ayuda: str_(payload.ayuda, 2000), seccion: seccion, requerido: bool_(payload.requerido), enEnlace: bool_(payload.enEnlace),
      active: payload.active === false ? '' : '1', orden: String(Number(payload.orden) || 0), updatedAt: nowIso_(),
    };
    if (id) {
      var c = findOne_('Campos', function (x) { return x.id === id; });
      if (!c) fail_('NOT_FOUND', 'El campo no existe');
      if (c.tipo !== tipo) fail_('BAD_INPUT', 'No se puede cambiar el tipo de un campo ya creado');
      update_('Campos', c, patch);
    } else {
      patch.id = newId_('cf');
      patch.createdAt = patch.updatedAt;
      insert_('Campos', patch);
    }
    delete dbCache_.__fields;
    return camposPublicos_();
  },
});

// ---------- contacts (organisations and people who are not converts) ----------

registerAction_('contactos.list', {
  roles: [ROLES.SUPERVISOR],
  fn: function () {
    return rows_('Contactos').map(function (c) {
      var v = {};
      SCHEMA.Contactos.forEach(function (k) { v[k] = c[k]; });
      v.active = c.active === '1';
      return v;
    });
  },
});

registerAction_('contactos.save', {
  roles: [ROLES.SUPERVISOR],
  write: true,
  fn: function (user, payload) {
    var id = str_(payload.id, 40);
    var nombre = str_(payload.nombre, 120);
    if (!nombre) fail_('BAD_INPUT', 'El nombre es obligatorio');
    var tel = '';
    if (payload.telefono) {
      var ph = normalizePhone_(str_(payload.telefono, 30), str_(payload.codigoPais, 4) || '54');
      if (!ph.ok) fail_('BAD_INPUT', 'Teléfono no válido');
      tel = ph.value;
    }
    var patch = {
      nombre: nombre, tipo: str_(payload.tipo, 40), organizacion: str_(payload.organizacion, 120), cargo: str_(payload.cargo, 80),
      telefono: tel, email: payload.email ? email_(payload.email) : '', ciudad: str_(payload.ciudad, 80),
      notas: str_(payload.notas, 2000), active: payload.active === false ? '' : '1', updatedAt: nowIso_(),
    };
    if (id) {
      var c = findOne_('Contactos', function (x) { return x.id === id; });
      if (!c) fail_('NOT_FOUND', 'El contacto no existe');
      update_('Contactos', c, patch);
      return { id: id };
    }
    patch.id = newId_('k');
    patch.createdAt = patch.updatedAt;
    insert_('Contactos', patch);
    return { id: patch.id };
  },
});

registerAction_('auditoria.list', {
  roles: [ROLES.SUPERVISOR],
  fn: function () {
    return rows_('Auditoria').slice(-300).reverse().map(function (a) {
      return { email: a.email, accion: a.accion, objeto: a.objeto, detalle: a.detalle, createdAt: a.createdAt };
    });
  },
});
