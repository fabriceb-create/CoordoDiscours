const CONCURRENCY_PROPERTY_PREFIX = 'ENTITY_VERSION_';

function getEntityVersion_(entity, entityId) {
  const key = concurrencyKey_(entity, entityId);
  const properties = PropertiesService.getScriptProperties();
  let raw = properties.getProperty(key);
  if (!raw) {
    raw = JSON.stringify({
      version: Utilities.getUuid(),
      updatedAt: new Date().toISOString(),
      updatedBy: Session.getActiveUser().getEmail() || 'Utilisateur'
    });
    properties.setProperty(key, raw);
  }
  return parseEntityVersion_(raw);
}

function assertEntityVersion_(entity, entityId, expectedVersion) {
  const current = getEntityVersion_(entity, entityId);
  const expected = String(expectedVersion || '').trim();
  if (!expected || expected !== current.version) {
    const error = new Error('CONFLIT_VERSION|Cette fiche a été modifiée par un autre utilisateur. Recharge-la avant de poursuivre.');
    error.name = 'OptimisticLockError';
    error.details = current;
    throw error;
  }
  return current;
}

function advanceEntityVersion_(entity, entityId) {
  const metadata = {
    version: Utilities.getUuid(),
    updatedAt: new Date().toISOString(),
    updatedBy: Session.getActiveUser().getEmail() || 'Utilisateur'
  };
  PropertiesService.getScriptProperties().setProperty(
    concurrencyKey_(entity, entityId),
    JSON.stringify(metadata)
  );
  return metadata;
}

function restoreEntityVersion_(entity, entityId, metadata) {
  const previous = metadata || {};
  if (!String(previous.version || '').trim()) {
    removeEntityVersion_(entity, entityId);
    return;
  }
  PropertiesService.getScriptProperties().setProperty(
    concurrencyKey_(entity, entityId),
    JSON.stringify({
      version: String(previous.version),
      updatedAt: String(previous.updatedAt || ''),
      updatedBy: String(previous.updatedBy || 'Utilisateur')
    })
  );
}

function removeEntityVersion_(entity, entityId) {
  PropertiesService.getScriptProperties().deleteProperty(concurrencyKey_(entity, entityId));
}

function concurrencyKey_(entity, entityId) {
  return CONCURRENCY_PROPERTY_PREFIX + String(entity || '').toUpperCase() + '_' + String(entityId || '');
}

function parseEntityVersion_(raw) {
  try {
    const parsed = JSON.parse(String(raw || '{}'));
    return {
      version: String(parsed.version || ''),
      updatedAt: String(parsed.updatedAt || ''),
      updatedBy: String(parsed.updatedBy || 'Utilisateur')
    };
  } catch (error) {
    return { version: '', updatedAt: '', updatedBy: 'Utilisateur' };
  }
}
