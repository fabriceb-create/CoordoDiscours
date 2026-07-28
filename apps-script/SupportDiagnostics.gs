const SUPPORT_DIAGNOSTICS_VERSION = '1.0.0';
const SUPPORT_INCIDENT_MESSAGE_MAX_LENGTH = 240;

function registerClientIncident(payload) {
  const access = assertAccess_('CONSULTATION');
  const data = payload || {};
  const reference = normalizeSupportReference_(data.reference) || buildSupportReference_('ERR');
  const details = {
    diagnosticsVersion: SUPPORT_DIAGNOSTICS_VERSION,
    appVersion: APP_CONFIG.version,
    operation: sanitizeSupportText_(data.operation, 80),
    view: sanitizeSupportText_(data.view, 40),
    message: sanitizeSupportText_(data.message, SUPPORT_INCIDENT_MESSAGE_MAX_LENGTH),
    transient: data.transient === true,
    readOnly: data.readOnly === true,
    role: access.role,
    recordedAt: new Date().toISOString()
  };
  logAction_('INCIDENT_CLIENT', 'SUPPORT', reference, details);
  return { reference: reference, recordedAt: details.recordedAt };
}

function getRecentSupportIncidents(limit) {
  assertAdminAccess_();
  const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 50);
  return listHistory({ action: 'INCIDENT_CLIENT', entity: 'SUPPORT', limit: safeLimit }).map(function (item) {
    return {
      reference: item.entityId,
      timestamp: item.timestamp,
      displayDate: item.displayDate,
      user: item.user,
      operation: sanitizeSupportText_(item.details && item.details.operation, 80),
      view: sanitizeSupportText_(item.details && item.details.view, 40),
      message: sanitizeSupportText_(item.details && item.details.message, SUPPORT_INCIDENT_MESSAGE_MAX_LENGTH),
      transient: Boolean(item.details && item.details.transient),
      readOnly: Boolean(item.details && item.details.readOnly)
    };
  });
}

function buildSupportReference_(prefix) {
  const date = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd');
  const random = String(Utilities.getUuid ? Utilities.getUuid() : Math.random().toString(36))
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .slice(0, 8)
    .padEnd(8, '0');
  return ['CD', String(prefix || 'REF').replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 8) || 'REF', date, random].join('-');
}

function normalizeSupportReference_(value) {
  const reference = String(value || '').trim().toUpperCase();
  return /^CD-[A-Z0-9]{2,8}-[A-Z0-9-]{6,32}$/.test(reference) ? reference.slice(0, 64) : '';
}

function sanitizeSupportText_(value, maxLength) {
  return String(value == null ? '' : value)
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/https?:\/\/\S+/gi, '[lien]')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[e-mail]')
    .replace(/\b\d{8,}\b/g, '[identifiant]')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, Math.max(1, Number(maxLength) || 120));
}
