// Shared constants. Loaded first (files run in name order).

/** Sheet name -> ordered column names. To add a column: append it at the END of its table, never insert or reorder. */
var SCHEMA = {
  Users: ['email', 'role', 'maestroId', 'active', 'expiry', 'lastLogin', 'createdAt'],
  // the sheikh who witnessed the shahada is the same person who follows the convert afterwards
  Maestros: ['id', 'nombre', 'alias', 'telefono', 'email', 'firmaFileId', 'active', 'createdAt', 'updatedAt'],
  Conversos: ['id', 'nombres', 'apellidos', 'nombreIslamico', 'sexo', 'fechaNacimiento', 'edadAlRegistro', 'nacionalidad',
    'tipoDocumento', 'numeroDocumento', 'codigoPais', 'whatsapp', 'email', 'provincia', 'ciudad', 'direccion', 'trabajo', 'estudios',
    'fechaShahada', 'lugarShahada', 'maestroId', 'diasDisponibles', 'resumenVida', 'notas', 'estado',
    'consentimientoContacto', 'fechaConsentimiento',
    // answers to the custom fields the supervisor adds in Ajustes (JSON { fieldId: value })
    'extra',
    // the Drive link of a photo sent through the old Google form (the file stays in the form owner's Drive)
    'fotoFormulario',
    'origen', 'formKey', 'registradoPor', 'revisar', 'createdAt', 'updatedAt'],
  Seguimiento: ['id', 'conversoId', 'autor', 'fecha', 'tipo', 'resumen', 'proximaAccion', 'proximaFecha', 'createdAt'],
  Etapas: ['id', 'nombre', 'descripcion', 'orden', 'active', 'createdAt'],
  Progreso: ['id', 'conversoId', 'etapaId', 'fecha', 'autor', 'createdAt'],
  Nacionalidades: ['id', 'nombre', 'orden', 'active', 'createdAt'],
  // overrides for the built-in fields of BASE_FIELDS (required / shown in the public link / in use)
  CamposBase: ['key', 'requerido', 'enEnlace', 'active'],
  // fields the supervisor adds: a fiqh topic to explain, a cultural detail, anything a case needs
  Campos: ['id', 'etiqueta', 'etiquetaAr', 'tipo', 'opciones', 'ayuda', 'seccion', 'requerido', 'enEnlace', 'active', 'orden', 'createdAt', 'updatedAt'],
  Documentos: ['id', 'conversoId', 'tipo', 'fileId', 'fileName', 'mime', 'uploadedAt', 'uploadedBy', 'removedAt'],
  // `datos` freezes what was printed, so a certificate can be produced again exactly as issued
  Certificados: ['id', 'numero', 'conversoId', 'maestroId', 'emisor', 'idioma', 'fecha', 'datos', 'estado', 'anuladoMotivo', 'emitidoPor', 'createdAt', 'updatedAt', 'verificationHash'],
  // one-time links sent by WhatsApp so a person who embraced Islam remotely fills their own record
  Invitaciones: ['id', 'tokenHash', 'maestroId', 'creadoPor', 'telefono', 'nota', 'expira', 'usadoAt', 'conversoId', 'revocada', 'createdAt'],
  Contactos: ['id', 'nombre', 'tipo', 'organizacion', 'cargo', 'telefono', 'email', 'ciudad', 'notas', 'active', 'createdAt', 'updatedAt'],
  Settings: ['key', 'value'],
  // one line per row of the Google form that the app has looked at (47_FormSync.js); `key` makes a repeat impossible
  FormInbox: ['key', 'receivedAt', 'status', 'conversoId', 'detail', 'processedAt'],
  Auditoria: ['id', 'email', 'accion', 'objeto', 'detalle', 'createdAt'],
};

var ROLES = { SUPERVISOR: 'supervisor', MAESTRO: 'maestro', COLABORADOR: 'colaborador' };
var ALL_ROLES = [ROLES.SUPERVISOR, ROLES.MAESTRO, ROLES.COLABORADOR];
var STAFF = [ROLES.SUPERVISOR, ROLES.MAESTRO];

var SEXOS = ['M', 'F'];
var ESTADOS = ['activo', 'sin_contacto', 'se_mudo', 'archivado'];
var TIPOS_DOCUMENTO = ['DNI', 'Pasaporte', 'Otro'];
var TIPOS_SEGUIMIENTO = ['llamada', 'whatsapp', 'visita', 'clase', 'mezquita', 'otro'];
var DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
var DOC_TYPES = ['dni_frente', 'dni_dorso', 'pasaporte', 'partida_nacimiento', 'foto', 'otro'];
var DOCUMENT_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
var MAX_DOCUMENT_BYTES = 8 * 1024 * 1024;
var MAX_SIGNATURE_BYTES = 600 * 1024;
var MAX_LINK_DOCUMENTS = 4;
var CUSTOM_FIELD_TYPES = ['text', 'textarea', 'number', 'date', 'choice', 'multichoice', 'yesno'];
var SECCIONES = ['personal', 'contacto', 'documento', 'islam', 'vida', 'otros'];

/**
 * The built-in fields of a record: [key, Spanish label, Arabic label (exports), type, section, options].
 * Flags: `fixed` = always required and in use; `internal` = never shown in the public link.
 */
var BASE_FIELDS = [
  { key: 'nombres', es: 'Nombres', ar: 'الاسم', tipo: 'text', seccion: 'personal', fixed: true },
  { key: 'apellidos', es: 'Apellidos', ar: 'اسم العائلة', tipo: 'text', seccion: 'personal' },
  { key: 'nombreIslamico', es: 'Nombre islámico', ar: 'الاسم الإسلامي', tipo: 'text', seccion: 'personal' },
  { key: 'sexo', es: 'Sexo', ar: 'الجنس', tipo: 'sexo', seccion: 'personal' },
  { key: 'fechaNacimiento', es: 'Fecha de nacimiento', ar: 'تاريخ الميلاد', tipo: 'date', seccion: 'personal' },
  { key: 'edadAlRegistro', es: 'Edad al registrarse', ar: 'العمر عند التسجيل', tipo: 'number', seccion: 'personal' },
  { key: 'nacionalidad', es: 'Nacionalidad', ar: 'الجنسية', tipo: 'nacionalidad', seccion: 'personal' },
  { key: 'tipoDocumento', es: 'Tipo de documento', ar: 'نوع الوثيقة', tipo: 'tipoDocumento', seccion: 'documento' },
  { key: 'numeroDocumento', es: 'Número de documento', ar: 'رقم الوثيقة', tipo: 'text', seccion: 'documento' },
  { key: 'whatsapp', es: 'WhatsApp', ar: 'واتساب', tipo: 'phone', seccion: 'contacto' },
  { key: 'email', es: 'Correo electrónico', ar: 'البريد الإلكتروني', tipo: 'email', seccion: 'contacto' },
  { key: 'provincia', es: 'Provincia', ar: 'المقاطعة', tipo: 'text', seccion: 'contacto' },
  { key: 'ciudad', es: 'Ciudad', ar: 'المدينة', tipo: 'text', seccion: 'contacto' },
  { key: 'direccion', es: 'Dirección', ar: 'العنوان', tipo: 'text', seccion: 'contacto' },
  { key: 'trabajo', es: 'Trabajo', ar: 'العمل', tipo: 'text', seccion: 'vida' },
  { key: 'estudios', es: 'Estudios', ar: 'الدراسة', tipo: 'text', seccion: 'vida' },
  { key: 'fechaShahada', es: 'Fecha de la shahada', ar: 'تاريخ إعلان الإسلام', tipo: 'date', seccion: 'islam' },
  { key: 'lugarShahada', es: 'Lugar de la shahada', ar: 'مكان إعلان الإسلام', tipo: 'text', seccion: 'islam' },
  { key: 'maestroId', es: 'Sheij / maestro', ar: 'الشيخ المعلم', tipo: 'maestro', seccion: 'islam', internal: true },
  { key: 'diasDisponibles', es: 'Días que puede ir a la mezquita', ar: 'أيام التردد على المسجد', tipo: 'dias', seccion: 'islam' },
  { key: 'resumenVida', es: 'Resumen de vida', ar: 'ملخص الحياة', tipo: 'textarea', seccion: 'vida' },
  { key: 'consentimientoContacto', es: 'Acepta ser contactado por WhatsApp', ar: 'يوافق على التواصل عبر واتساب', tipo: 'yesno', seccion: 'contacto' },
  { key: 'notas', es: 'Notas internas', ar: 'ملاحظات داخلية', tipo: 'textarea', seccion: 'otros', internal: true },
];
/** Required by default until the supervisor changes it in Ajustes. */
var BASE_REQUIRED_DEFAULT = ['nombres', 'sexo', 'nacionalidad', 'whatsapp', 'maestroId'];
/** Off in the public link by default (besides the `internal` ones). */
var BASE_LINK_OFF_DEFAULT = ['edadAlRegistro', 'resumenVida'];
var TEXT_LIMITS = { resumenVida: 5000, notas: 5000, direccion: 200 };

var DEFAULT_NACIONALIDADES = ['Argentina', 'Venezuela', 'Paraguay', 'Brasil', 'Uruguay', 'Chile', 'Bolivia', 'Perú', 'Colombia', 'Ecuador'];
var DEFAULT_ETAPAS = [
  ['Aprendió la shahada y su significado', ''],
  ['Aprendió la ablución (wudu)', ''],
  ['Aprendió a rezar', ''],
  ['Memorizó Al-Fátiha', ''],
  ['Asiste a la oración del viernes', ''],
  ['Ayunó Ramadán', ''],
  ['Asiste a clases', ''],
];

var DEFAULT_SETTINGS = {
  orgName: 'Centro Islámico',
  appUrl: '',
  // the certificate names the sheikh or this generic label, never a specific centre
  emisorCentro: 'Centro Islámico',
  lugarEmision: '',
  invitacionDias: '7',
  invitacionMensaje: 'Assalamu alaikum. Por favor completá tus datos en este enlace (es personal y sirve una sola vez):',
  enlaceDocumentos: '1',
  // the Google form: its response spreadsheet (read only) and tab
  formSheetId: '',
  formSheetTab: 'Respuestas de formulario 1',
  formSyncLastRunAt: '',
  formSyncLastSummary: '',
  recordatoriosHabilitados: '0',
};
/** Settings the supervisor may edit through the API. */
var EDITABLE_SETTINGS = ['orgName', 'appUrl', 'emisorCentro', 'lugarEmision', 'invitacionDias', 'invitacionMensaje', 'enlaceDocumentos'];

/**
 * Action registry. Every action names the roles allowed to call it; anything
 * not listed is refused. `write: true` serialises the call behind a lock.
 */
var ACTIONS = {};
function registerAction_(name, spec) {
  if (ACTIONS[name] || PUBLIC_ACTIONS[name]) throw new Error('duplicate action ' + name);
  if (!spec.roles || !spec.roles.length || typeof spec.fn !== 'function') throw new Error('bad action spec ' + name);
  ACTIONS[name] = spec;
}

/**
 * Actions reachable WITHOUT signing in: only the one-time invitation link (44_Invitaciones.js).
 * Each must check its own token; nothing else may be registered here.
 */
var PUBLIC_ACTIONS = {};
function registerPublicAction_(name, spec) {
  if (ACTIONS[name] || PUBLIC_ACTIONS[name]) throw new Error('duplicate action ' + name);
  if (name.indexOf('public.') !== 0 || typeof spec.fn !== 'function') throw new Error('bad public action ' + name);
  PUBLIC_ACTIONS[name] = spec;
}

/** Throws an error that is safe to show to the caller. */
function fail_(code, message) {
  var e = new Error(message);
  e.apiCode = code;
  throw e;
}

function nowIso_() {
  return new Date().toISOString();
}

function prop_(key) {
  return PropertiesService.getScriptProperties().getProperty(key);
}

function newId_(prefix) {
  return prefix + Utilities.getUuid().replace(/-/g, '').slice(0, 12);
}
