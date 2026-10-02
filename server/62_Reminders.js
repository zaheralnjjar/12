// Daily reminder mail for each sheikh with overdue next steps (count and app link only).
// The handler must be a public function: Apps Script triggers cannot call names ending in "_".
var REMINDER_HANDLER = 'sendDailyReminders';

function reminderTriggers_() {
  return ScriptApp.getProjectTriggers().filter(function (trigger) {
    return trigger.getHandlerFunction() === REMINDER_HANDLER;
  });
}

registerAction_('recordatorios.configure', {
  roles: [ROLES.SUPERVISOR],
  write: true,
  fn: function (_user, payload) {
    var enabled = payload.enabled === true;
    var settings = getSettings_();
    if (enabled && !/^https:\/\/[^\s]+$/.test(settings.appUrl || '') && !/^http:\/\/localhost(:\d+)?(\/.*)?$/.test(settings.appUrl || '')) {
      fail_('NOT_CONFIGURED', 'Configurá primero la dirección de la aplicación en Ajustes');
    }
    reminderTriggers_().forEach(function (trigger) { ScriptApp.deleteTrigger(trigger); });
    if (enabled) ScriptApp.newTrigger(REMINDER_HANDLER).timeBased().everyDays(1).atHour(8).create();
    setSetting_('recordatoriosHabilitados', enabled ? '1' : '0');
    return { enabled: enabled };
  },
});

/** Sends only a count and the application URL; no record or person data enters the message. */
function sendDailyReminders() {
  if (getSettings_().recordatoriosHabilitados !== '1') return { sent: 0, skipped: 0, disabled: true };
  var appUrl = getSettings_().appUrl;
  if (!appUrl) return { sent: 0, skipped: 0, disabled: false };
  var today = todayIso_();
  var latest = {};
  rows_('Seguimiento').forEach(function (step) {
    var current = latest[step.conversoId];
    if (!current || step.fecha > current.fecha || (step.fecha === current.fecha && step.createdAt > current.createdAt)) latest[step.conversoId] = step;
  });
  var overdueByMaestro = {};
  rows_('Conversos').forEach(function (c) {
    if (!c.maestroId || c.estado === 'archivado') return;
    var step = latest[c.id];
    if (step && step.proximaFecha && step.proximaFecha < today) overdueByMaestro[c.maestroId] = (overdueByMaestro[c.maestroId] || 0) + 1;
  });
  // only sheikhs with something overdue get a mail: a daily "0" would teach people to ignore it
  var maestros = rows_('Maestros').filter(function (maestro) {
    return maestro.active === '1' && overdueByMaestro[maestro.id] > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(maestro.email || '');
  });
  var remaining = Math.max(0, Number(MailApp.getRemainingDailyQuota()) || 0);
  var sent = 0;
  maestros.forEach(function (maestro) {
    if (remaining < 1) return;
    var count = overdueByMaestro[maestro.id];
    MailApp.sendEmail(maestro.email, 'Recordatorio diario de seguimiento', 'Pasos vencidos: ' + count + '\n' + appUrl);
    remaining--;
    sent++;
  });
  return { sent: sent, skipped: Math.max(0, maestros.length - sent), disabled: false };
}
