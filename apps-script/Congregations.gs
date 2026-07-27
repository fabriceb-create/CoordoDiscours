function listCongregations(searchText, includeArchived) {
  const sheet = getDatabase_().getSheetByName(APP_CONFIG.sheets.congregations);
  const query = normalizeText_(searchText);
  return sheetRowsAsObjects_(sheet).map(function (row) {
    return {
      id: String(row.ID || ''), name: String(row.NOM || ''), coordinator: String(row.COORDINATEUR || ''),
      phone: String(row.TELEPHONE || ''), email: String(row.EMAIL || ''), address: String(row.ADRESSE || ''),
      meetingDay: String(row.JOUR_REUNION || ''), meetingTime: String(row.HEURE_REUNION || ''), active: booleanValue_(row.ACTIF)
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
  const sheet = getDatabase_().getSheetByName(APP_CONFIG.sheets.congregations);
  const id = String(payload.id || '').trim() || newId_();
  const name = requiredText_(payload.name, 'Le nom de l’assemblée');
  const coordinator = String(payload.coordinator || '').trim();
  const phone = String(payload.phone || '').trim();
  const email = sanitizeEmail_(payload.email);
  const address = String(payload.address || '').trim();
  const meetingDay = String(payload.meetingDay || '').trim();
  const meetingTime = String(payload.meetingTime || '').trim();
  const active = payload.active !== false;
  const row = [id, name, coordinator, phone, email, address, meetingDay, meetingTime, active];
  const existingRow = findRowById_(sheet, id);
  const before = existingRow ? getCongregation(id) : {};
  if (existingRow) sheet.getRange(existingRow, 1, 1, row.length).setValues([row]);
  else sheet.appendRow(row);
  const after = getCongregation(id);
  logAction_(existingRow ? 'MODIFICATION' : 'CREATION', 'ASSEMBLEE', id, buildAuditDetails_(before, after));
  return after;
}

function archiveCongregation(id) {
  assertAccess_('COORDINATEUR');
  const before = getCongregation(id);
  const saved = saveCongregation(Object.assign({}, before, { active: false }));
  logAction_('ARCHIVAGE', 'ASSEMBLEE', id, buildAuditDetails_(before, saved));
  return saved;
}

function restoreCongregation(id) {
  assertAccess_('COORDINATEUR');
  const before = getCongregation(id);
  const saved = saveCongregation(Object.assign({}, before, { active: true }));
  logAction_('RESTAURATION', 'ASSEMBLEE', id, buildAuditDetails_(before, saved));
  return saved;
}
