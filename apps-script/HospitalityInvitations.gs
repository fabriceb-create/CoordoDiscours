function getCommunicationOptions() {
  return measureServerOperation_('getCommunicationOptions', function () {
    return getCachedServerValue_(SERVER_CACHE_KEYS.COMMUNICATION_OPTIONS, function () {
      return {
        plannings: listPlannings('', false).filter(function (item) {
          return item.date && item.status !== 'ANNULE';
        })
      };
    }, SERVER_CACHE_TTL_SECONDS);
  });
}

function listHospitalities(searchText) {
  return listHospitalitiesWithPlannings_(searchText, listPlannings('', true));
}

function listHospitalitiesWithPlannings_(searchText, planningList) {
  const sheet = getDatabase_().getSheetByName(APP_CONFIG.sheets.hospitality);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const planningMap = (planningList || []).reduce(function (map, item) { map[item.id] = item; return map; }, {});
  const query = normalizeText_(searchText);
  return sheetRowsAsObjects_(sheet).map(function (row) {
    const id = String(row.ID || '');
    const planning = planningMap[String(row.PROGRAMMATION_ID || '')] || {};
    const metadata = getEntityVersion_('HOSPITALITE', id);
    return {
      id: id, planningId: String(row.PROGRAMMATION_ID || ''), group: String(row.GROUPE || ''),
      status: String(row.STATUT || 'A_ATTRIBUER'), contact: String(row.CONTACT || ''), notes: String(row.NOTES || ''),
      planningLabel: planning.displayDate ? planning.displayDate + ' - ' + planning.speakerName + ' - discours n° ' + planning.talkNumber : 'Programmation introuvable',
      date: planning.date || '', speakerName: planning.speakerName || '',
      version: metadata.version, updatedAt: metadata.updatedAt, updatedBy: metadata.updatedBy
    };
  }).filter(function (item) {
    return !query || normalizeText_([item.planningLabel, item.group, item.status, item.contact, item.notes].join(' ')).includes(query);
  }).sort(function (a, b) { return String(a.date).localeCompare(String(b.date)); });
}

function saveHospitality(payload) {
  assertAccess_('COORDINATEUR', 'saveHospitality');
  payload = payload || {};
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const planningId = requiredText_(payload.planningId, 'La programmation');
    const planning = listPlannings('', true).find(function (item) { return item.id === planningId && item.status !== 'ANNULE'; });
    if (!planning) throw new Error('La programmation sélectionnée est introuvable ou annulée.');
    const sheet = getDatabase_().getSheetByName(APP_CONFIG.sheets.hospitality);
    const id = String(payload.id || '').trim() || newId_();
    const status = ['A_ATTRIBUER', 'PROPOSE', 'CONFIRME', 'REFUSE', 'ANNULE'].includes(String(payload.status || '').toUpperCase()) ? String(payload.status).toUpperCase() : 'A_ATTRIBUER';
    const values = [id, planningId, String(payload.group || '').trim(), status, String(payload.contact || '').trim(), String(payload.notes || '').trim()];
    const row = findRowById_(sheet, id);
    if (row) assertEntityVersion_('HOSPITALITE', id, payload.version);
    const before = row ? listHospitalities('').find(function (item) { return item.id === id; }) || {} : {};
    if (row) sheet.getRange(row, 1, 1, values.length).setValues([values]);
    else {
      const duplicate = sheetRowsAsObjects_(sheet).find(function (item) { return String(item.PROGRAMMATION_ID || '') === planningId; });
      if (duplicate) throw new Error('Une hospitalité existe déjà pour cette programmation.');
      sheet.appendRow(values);
    }
    const metadata = advanceEntityVersion_('HOSPITALITE', id);
    const after = Object.assign({}, listHospitalities('').find(function (item) { return item.id === id; }) || { id: id, planningId: planningId, status: status }, metadata);
    logAction_(row ? 'MODIFICATION' : 'CREATION', 'HOSPITALITE', id, buildAuditDetails_(before, after));
    return after;
  } finally {
    lock.releaseLock();
  }
}

function setHospitalityStatus(id, status, expectedVersion) {
  assertAccess_('COORDINATEUR', 'setHospitalityStatus');
  const current = listHospitalities('').find(function (item) { return item.id === String(id); });
  if (!current) throw new Error('Hospitalité introuvable.');
  return saveHospitality(Object.assign({}, current, { status: status, version: expectedVersion || current.version }));
}

function listInvitations(searchText) {
  return listInvitationsWithPlannings_(searchText, listPlannings('', true));
}

function listInvitationsWithPlannings_(searchText, planningList) {
  const sheet = getDatabase_().getSheetByName(APP_CONFIG.sheets.invitations);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const planningMap = (planningList || []).reduce(function (map, item) { map[item.id] = item; return map; }, {});
  const query = normalizeText_(searchText);
  return sheetRowsAsObjects_(sheet).map(function (row) {
    const id = String(row.ID || '');
    const planning = planningMap[String(row.PROGRAMMATION_ID || '')] || {};
    const sentDate = row.DATE_ENVOI instanceof Date ? Utilities.formatDate(row.DATE_ENVOI, Session.getScriptTimeZone(), 'yyyy-MM-dd') : String(row.DATE_ENVOI || '');
    const metadata = getEntityVersion_('INVITATION', id);
    return {
      id: id, planningId: String(row.PROGRAMMATION_ID || ''), sentDate: sentDate,
      displaySentDate: sentDate ? formatDateFr_(sentDate) : '', status: String(row.STATUT || 'A_ENVOYER'),
      recipient: String(row.DESTINATAIRE || ''), notes: String(row.NOTES || ''),
      planningLabel: planning.displayDate ? planning.displayDate + ' - ' + planning.speakerName + ' - discours n° ' + planning.talkNumber : 'Programmation introuvable',
      date: planning.date || '', speakerName: planning.speakerName || '',
      version: metadata.version, updatedAt: metadata.updatedAt, updatedBy: metadata.updatedBy
    };
  }).filter(function (item) {
    return !query || normalizeText_([item.planningLabel, item.recipient, item.status, item.notes, item.displaySentDate].join(' ')).includes(query);
  }).sort(function (a, b) { return String(a.date).localeCompare(String(b.date)); });
}

function saveInvitation(payload) {
  assertAccess_('COORDINATEUR', 'saveInvitation');
  payload = payload || {};
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const planningId = requiredText_(payload.planningId, 'La programmation');
    const planning = listPlannings('', true).find(function (item) { return item.id === planningId && item.status !== 'ANNULE'; });
    if (!planning) throw new Error('La programmation sélectionnée est introuvable ou annulée.');
    const sheet = getDatabase_().getSheetByName(APP_CONFIG.sheets.invitations);
    const id = String(payload.id || '').trim() || newId_();
    const status = ['A_ENVOYER', 'ENVOYEE', 'ACCEPTEE', 'REFUSEE', 'RELANCEE', 'ANNULEE'].includes(String(payload.status || '').toUpperCase()) ? String(payload.status).toUpperCase() : 'A_ENVOYER';
    const recipient = String(payload.recipient || '').trim();
    if (status !== 'A_ENVOYER' && !recipient) throw new Error('Le destinataire est obligatoire.');
    let sentDate = String(payload.sentDate || '').trim();
    if (status === 'ENVOYEE' && !sentDate) sentDate = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    const values = [id, planningId, sentDate ? new Date(sentDate + 'T12:00:00') : '', status, recipient, String(payload.notes || '').trim()];
    const row = findRowById_(sheet, id);
    if (row) assertEntityVersion_('INVITATION', id, payload.version);
    const before = row ? listInvitations('').find(function (item) { return item.id === id; }) || {} : {};
    if (row) sheet.getRange(row, 1, 1, values.length).setValues([values]);
    else {
      const duplicate = sheetRowsAsObjects_(sheet).find(function (item) { return String(item.PROGRAMMATION_ID || '') === planningId; });
      if (duplicate) throw new Error('Une invitation existe déjà pour cette programmation.');
      sheet.appendRow(values);
    }
    const metadata = advanceEntityVersion_('INVITATION', id);
    const after = Object.assign({}, listInvitations('').find(function (item) { return item.id === id; }) || { id: id, planningId: planningId, status: status }, metadata);
    logAction_(row ? 'MODIFICATION' : 'CREATION', 'INVITATION', id, buildAuditDetails_(before, after));
    return after;
  } finally {
    lock.releaseLock();
  }
}

function setInvitationStatus(id, status, expectedVersion) {
  assertAccess_('COORDINATEUR', 'setInvitationStatus');
  const current = listInvitations('').find(function (item) { return item.id === String(id); });
  if (!current) throw new Error('Invitation introuvable.');
  return saveInvitation(Object.assign({}, current, { status: status, version: expectedVersion || current.version }));
}

function formatDateFr_(isoDate) {
  const match = String(isoDate || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? match[3] + '/' + match[2] + '/' + match[1] : String(isoDate || '');
}
