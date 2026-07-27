function listSpeakers(searchText, includeArchived) {
  const ss = getDatabase_();
  const sheet = ss.getSheetByName(APP_CONFIG.sheets.speakers);
  const congregations = listCongregations('', true).reduce(function (map, item) {
    map[item.id] = item.name;
    return map;
  }, {});
  const query = normalizeText_(searchText);

  return sheetRowsAsObjects_(sheet).map(function (row) {
    const id = String(row.ID || '');
    const version = getEntityVersion_('ORATEUR', id);
    return {
      id: id, lastName: String(row.NOM || ''), firstName: String(row.PRENOM || ''),
      fullName: [row.PRENOM, row.NOM].filter(Boolean).join(' ').trim(), type: String(row.TYPE || 'LOCAL'),
      congregationId: String(row.ASSEMBLEE_ID || ''), congregationName: congregations[String(row.ASSEMBLEE_ID || '')] || '',
      phone: String(row.TELEPHONE || ''), email: String(row.EMAIL || ''), active: booleanValue_(row.ACTIF), notes: String(row.NOTES || ''),
      version: version.version, updatedAt: version.updatedAt, updatedBy: version.updatedBy
    };
  }).filter(function (item) {
    if (!includeArchived && !item.active) return false;
    if (!query) return true;
    return normalizeText_([item.fullName, item.type, item.congregationName, item.phone, item.email].join(' ')).includes(query);
  }).sort(function (a, b) { return a.fullName.localeCompare(b.fullName, 'fr'); });
}

function saveSpeaker(payload) {
  assertEditAccess_();
  payload = payload || {};
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getDatabase_().getSheetByName(APP_CONFIG.sheets.speakers);
    const id = String(payload.id || '').trim() || newId_();
    const lastName = requiredText_(payload.lastName, 'Le nom');
    const firstName = String(payload.firstName || '').trim();
    const type = String(payload.type || 'LOCAL').toUpperCase() === 'EXTERIEUR' ? 'EXTERIEUR' : 'LOCAL';
    const congregationId = String(payload.congregationId || '').trim();
    const phone = String(payload.phone || '').trim();
    const email = sanitizeEmail_(payload.email);
    const active = payload.active !== false;
    const notes = String(payload.notes || '').trim();
    const row = [id, lastName, firstName, type, congregationId, phone, email, active, notes];
    const existingRow = findRowById_(sheet, id);
    if (existingRow) assertEntityVersion_('ORATEUR', id, payload.version);
    const before = existingRow ? getSpeaker(id) : {};

    if (existingRow) sheet.getRange(existingRow, 1, 1, row.length).setValues([row]);
    else sheet.appendRow(row);

    const version = advanceEntityVersion_('ORATEUR', id);
    const after = Object.assign({}, getSpeaker(id), version);
    logAction_(existingRow ? 'MODIFICATION' : 'CREATION', 'ORATEUR', id, buildAuditDetails_(before, after));
    return after;
  } finally {
    lock.releaseLock();
  }
}

function getSpeaker(id) {
  const item = listSpeakers('', true).find(function (speaker) { return speaker.id === String(id); });
  if (!item) throw new Error('Orateur introuvable.');
  return item;
}

function archiveSpeaker(id, expectedVersion) {
  assertEditAccess_();
  const before = getSpeaker(id);
  const saved = saveSpeaker(Object.assign({}, before, { active: false, version: expectedVersion || before.version }));
  logAction_('ARCHIVAGE', 'ORATEUR', id, buildAuditDetails_(before, saved));
  return saved;
}

function restoreSpeaker(id, expectedVersion) {
  assertEditAccess_();
  const before = getSpeaker(id);
  const saved = saveSpeaker(Object.assign({}, before, { active: true, version: expectedVersion || before.version }));
  logAction_('RESTAURATION', 'ORATEUR', id, buildAuditDetails_(before, saved));
  return saved;
}