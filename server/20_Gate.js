// THE GATE: who is calling, and what they may touch.
// Every permission decision about a convert's record goes through this file.
// Do not add access checks anywhere else, and do not bypass these helpers.

var DENIED = 'No tenés permiso para esta acción';

/** Verifies a Google ID token with Google and returns the verified, lower-cased e-mail. */
function verifyIdToken_(token) {
  if (typeof token !== 'string' || token.length < 20 || token.length > 4096) {
    fail_('UNAUTHENTICATED', 'Iniciá sesión primero');
  }
  var clientId = prop_('CLIENT_ID');
  if (!clientId) fail_('NOT_CONFIGURED', 'La aplicación todavía no está configurada');

  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, token);
  var key = 'tok_' + Utilities.base64EncodeWebSafe(digest);
  var cache = CacheService.getScriptCache();
  var cached = cache.get(key);
  if (cached) return cached;

  var res = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(token), {
    muteHttpExceptions: true,
  });
  if (res.getResponseCode() !== 200) fail_('UNAUTHENTICATED', 'La sesión terminó. Volvé a iniciar sesión');
  var claims = JSON.parse(res.getContentText());
  var secondsLeft = Number(claims.exp) - Math.floor(Date.now() / 1000);
  var issuerOk = claims.iss === 'accounts.google.com' || claims.iss === 'https://accounts.google.com';
  var emailOk = claims.email && String(claims.email_verified) === 'true';
  if (claims.aud !== clientId || !issuerOk || !emailOk || !(secondsLeft > 0)) {
    fail_('UNAUTHENTICATED', 'La sesión terminó. Volvé a iniciar sesión');
  }
  var email = String(claims.email).toLowerCase();
  cache.put(key, email, Math.max(1, Math.min(secondsLeft, 3000)));
  return email;
}

function todayIso_() {
  return nowIso_().slice(0, 10);
}

/**
 * Resolves the caller. Returns { email, role, maestroId, _userRow } or refuses.
 * A maestro whose sheikh entry was deactivated, or a colaborador whose access expired, is refused.
 */
function authenticate_(token) {
  var email = verifyIdToken_(token);
  var row = findOne_('Users', function (u) { return u.email.toLowerCase() === email; });
  if (!row || row.active !== '1' || ALL_ROLES.indexOf(row.role) < 0) {
    fail_('NOT_REGISTERED', 'Este correo (' + email + ') no está registrado en la aplicación. Hablá con el supervisor.');
  }
  var user = { email: email, role: row.role, maestroId: '', _userRow: row };
  if (row.role === ROLES.MAESTRO) {
    var m = findOne_('Maestros', function (x) { return x.id === row.maestroId; });
    if (!m || m.active !== '1') fail_('NOT_REGISTERED', 'Tu cuenta no está activa. Hablá con el supervisor.');
    user.maestroId = m.id;
  }
  if (row.expiry && row.expiry.slice(0, 10) < todayIso_()) {
    fail_('EXPIRED', 'Tu acceso venció. Hablá con el supervisor.');
  }
  return user;
}

/**
 * A supervisor may look at the app as a maestro sees it (req.asMaestro). The result is a
 * maestro-role caller limited to READ actions, so it can only ever see less than the supervisor.
 */
function previewUser_(user, req, spec) {
  var as = req && typeof req.asMaestro === 'string' ? req.asMaestro : '';
  if (!as) return user;
  if (user.role !== ROLES.SUPERVISOR) fail_('FORBIDDEN', DENIED);
  if (spec.write) fail_('PREVIEW_READONLY', 'Modo vista previa: solo lectura, no se guarda nada');
  var m = findOne_('Maestros', function (x) { return x.id === as; });
  if (!m) fail_('NOT_FOUND', 'El maestro no existe');
  return { email: user.email, role: ROLES.MAESTRO, maestroId: m.id, _userRow: user._userRow, preview: true };
}

/**
 * The single permission rule for an existing record.
 *   'read'  – see the record, its follow-up, progress, documents and certificates
 *   'write' – change any of them, upload documents, issue a certificate
 * The supervisor may do everything; a maestro only on the converts assigned to him;
 * a colaborador NEVER sees or changes a record once it was sent.
 */
function can_(user, action, converso) {
  if (!converso || !converso.id) return false;
  if (user.role === ROLES.SUPERVISOR) return true;
  if (user.role === ROLES.MAESTRO) return !!user.maestroId && converso.maestroId === user.maestroId;
  return false;
}

/** Loads a record by id and refuses unless the caller may act on it. "Not found" and "not yours" look the same. */
function conversoFor_(user, action, id) {
  var cid = typeof id === 'string' ? id.trim() : '';
  var c = cid ? findOne_('Conversos', function (x) { return x.id === cid; }) : null;
  if (!c || !can_(user, action, c)) fail_('NOT_FOUND', 'El registro no existe o no tenés acceso');
  return c;
}

/** Records this caller may read. */
function readableConversos_(user) {
  return rows_('Conversos').filter(function (c) { return can_(user, 'read', c); });
}
