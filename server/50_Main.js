// Web entry points.

function doGet() {
  return ContentService.createTextOutput('nuevo-musulman server is running').setMimeType(ContentService.MimeType.TEXT);
}

/** Body: JSON { token, action, payload } sent as text/plain. Reply: { ok, data } or { ok:false, error:{code,message} }. */
function doPost(e) {
  var out;
  try {
    var req = JSON.parse(e.postData.contents);
    out = { ok: true, data: dispatch_(req) };
  } catch (err) {
    if (err && err.apiCode) out = { ok: false, error: { code: err.apiCode, message: err.message } };
    else {
      console.error(err && err.stack ? err.stack : err);
      out = { ok: false, error: { code: 'SERVER', message: 'Ocurrió un error en el servidor. Intentá de nuevo.' } };
    }
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

function withLock_(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

function dispatch_(req) {
  dbCache_ = {};
  var name = req && typeof req.action === 'string' ? req.action : '';
  var payload = req && req.payload && typeof req.payload === 'object' ? req.payload : {};

  // the one-time invitation link: no sign-in, the action checks its own token
  if (Object.prototype.hasOwnProperty.call(PUBLIC_ACTIONS, name)) {
    var pub = PUBLIC_ACTIONS[name];
    ensureSchemaCurrent_();
    return pub.write ? withLock_(function () { return pub.fn(payload); }) : pub.fn(payload);
  }

  var spec = Object.prototype.hasOwnProperty.call(ACTIONS, name) ? ACTIONS[name] : null;
  var user = authenticate_(req && req.token); // authenticate before revealing whether the action exists
  if (!spec) fail_('BAD_ACTION', 'Solicitud desconocida');
  ensureSchemaCurrent_();
  user = previewUser_(user, req, spec);
  if (spec.roles.indexOf(user.role) < 0) fail_('FORBIDDEN', DENIED);
  if (!spec.write) return spec.fn(user, payload);
  return withLock_(function () { return spec.fn(user, payload); });
}
