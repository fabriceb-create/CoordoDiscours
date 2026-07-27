function listCongregations(searchText, includeArchived) {
  const sheet = getDatabase_().getSheetByName(APP_CONFIG.sheets.congregations);
  const query = normalizeText_(searchText);
  return sheetRowsAsObjects_(sheet).map(function (row) {
    const id = String(row.ID || '');
    const metadata = getEntityVersion_('ASSEMBLEE', id);
    return {
      id: id,
      name: String(row.NOM || ''),
      coordinator: String(row.COORDINATEUR || ''),
      phone: String(row.TELEPHONE || ''),
      email: String(row.EMAIL || ''),
      address: String(row.ADRESSE || ''),
      meetingDay: String(row.JOUR_REUNION || ''),
      meetingTime: String(row.HEURE_REUNION || ''),
      active: booleanValue_(row.ACTIF),
      version: metadata.version,
      updatedAt: metadata.updatedAt,
      updatedBy: metadata.updatedBy
    };
  }).filter(function (item) {
    if (!includeArchived && !item.active) return false;
    if (!query) return true;
    return normalizeText_([item.name, item.coordinator, item.phone, item.email, item.address, item.meetingDay, item.meetingTime].join(' ')).includes(query);
  }).sort(function (a, b) { return a.name.localeCompare(b.name, 'fr'); });
}

function getCongregation(id) {
  const item = listCongregations('', true).find(function (congregation) { return congregation.id === String(id); });
  if (!item) throw new Error('Assemblée introuvable.');
  return item;
}

function saveCongregation(payload) {
  assertAccess_('COORDINATEUR');
  payload = payload || {};
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getDatabase_().getSheetByName(APP_CONFIG.sheets.congregations);
    const id = String(payload.id || '').trim() || newId_();
    const row = [
      id,
      requiredText_(payload.name, 'Le nom de l’assemblée'),
      String(payload.coordinator || '').trim(),
      String(payload.phone || '').trim(),
      sanitizeEmail_(payload.email),
      String(payload.address || '').trim(),
      String(payload.meetingDay || '').trim(),
      String(payload.meetingTime || '').trim(),
      payload.active !== false
    ];
    const existingRow = findRowById_(sheet, id);
    if (existingRow) assertEntityVersion_('ASSEMBLEE', id, payload.version);
    const before = existingRow ? getCongregation(id) : {};
    if (existingRow) sheet.getRange(existingRow, 1, 1, row.length).setValues([row]);
    else sheet.appendRow(row);
    const metadata = advanceEntityVersion_('ASSEMBLEE', id);
    const after = Object.assign({}, getCongregation(id), metadata);
    logAction_(existingRow ? 'MODIFICATION' : 'CREATION', 'ASSEMBLEE', id, buildAuditDetails_(before, after));
    return after;
  } finally {
    lock.releaseLock();
  }
}

function archiveCongregation(id, expectedVersion) {
  assertAccess_('COORDINATEUR');
  const before = getCongregation(id);
  const saved = saveCongregation(Object.assign({}, before, { active: false, version: expectedVersion || before.version }));
  logAction_('ARCHIVAGE', 'ASSEMBLEE', id, buildAuditDetails_(before, saved));
  return saved;
}

function restoreCongregation(id, expectedVersion) {
  assertAccess_('COORDINATEUR');
  const before = getCongregation(id);
  const saved = saveCongregation(Object.assign({}, before, { active: true, version: expectedVersion || before.version }));
  logAction_('RESTAURATION', 'ASSEMBLEE', id, buildAuditDetails_(before, saved));
  return saved;
}
