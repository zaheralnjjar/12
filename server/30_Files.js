// Private files (identity documents, signatures, certificates) in the owner's Drive.
// Nothing here is ever shared: bytes leave only through API actions that passed the gate.

function rootFolder_() {
  var id = prop_('FOLDER_ID');
  if (!id) fail_('NOT_CONFIGURED', 'La aplicación todavía no está configurada');
  return DriveApp.getFolderById(id);
}

function subFolder_(name) {
  var root = rootFolder_();
  var it = root.getFoldersByName(name);
  return it.hasNext() ? it.next() : root.createFolder(name);
}

/** Splits "data:<mime>;base64,<data>" and returns { mime, bytes }. */
function parseDataUrl_(dataUrl, allowedMimes, maxBytes) {
  var m = /^data:([a-z0-9.+\/-]+);base64,([A-Za-z0-9+\/=]+)$/.exec(String(dataUrl || ''));
  if (!m) fail_('BAD_INPUT', 'Archivo no válido');
  if (allowedMimes.indexOf(m[1]) < 0) fail_('BAD_INPUT', 'Tipo de archivo no permitido');
  if (m[2].length * 0.75 > maxBytes) fail_('TOO_LARGE', 'El archivo supera el tamaño permitido');
  var bytes = Utilities.base64Decode(m[2]);
  if (!magicMatches_(m[1], bytes)) fail_('BAD_INPUT', 'El contenido del archivo no coincide con su tipo');
  return { mime: m[1], bytes: bytes };
}

function magicMatches_(mime, bytes) {
  var sig = {
    'image/png': [0x89, 0x50, 0x4e, 0x47],
    'image/jpeg': [0xff, 0xd8, 0xff],
    'application/pdf': [0x25, 0x50, 0x44, 0x46],
    'image/webp': [0x52, 0x49, 0x46, 0x46],
  }[mime];
  if (!sig || bytes.length < sig.length) return false;
  for (var i = 0; i < sig.length; i++) if ((bytes[i] & 0xff) !== sig[i]) return false;
  return true;
}

function saveFile_(folderName, fileName, parsed) {
  var blob = Utilities.newBlob(parsed.bytes, parsed.mime, fileName);
  return subFolder_(folderName).createFile(blob).getId();
}

function readFileAsDataUrl_(fileId) {
  if (!fileId) return null;
  try {
    var blob = DriveApp.getFileById(fileId).getBlob();
    return 'data:' + blob.getContentType() + ';base64,' + Utilities.base64Encode(blob.getBytes());
  } catch (e) {
    return null;
  }
}

/** Moves a file to the Drive trash (recoverable for 30 days). */
function trashFile_(fileId) {
  if (!fileId) return;
  try { DriveApp.getFileById(fileId).setTrashed(true); } catch (e) { /* already gone */ }
}
