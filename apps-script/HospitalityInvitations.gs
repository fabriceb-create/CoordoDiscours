function getCommunicationOptions() {
  return { plannings: listPlannings('', false).filter(function (item) { return item.date && item.status !== 'ANNULE'; }) };
}

function listHospitalities(searchText) {
  const sheet = getDatabase_().getSheetByName(APP_CONFIG.sheets.hospitality);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const planningMap = listPlannings('', true).reduce(function (map, item) { map[item.id] = item; return map; }, {});
  const query = normalizeText_(searchText);
  return sheetRowsAsObjects_(sheet).map(function (row) {
    const planning = planningMap[String(row.PROGRAMMATION_ID || '')] || {};
    return {
      id: String(row.ID || ''), planningId: String(row.PROGRAMMATION_ID || ''), group: String(row.GROUPE || ''),
      status: String(row.STATUT || 'A_ATTRIBUER'), contact: String(row.CONTACT || ''), notes: String(row.NOTES || ''),
      planningLabel: planning.displayDate ? planning.displayDate + ' - ' + planning.speakerName + ' - discours n° ' + planning.talkNumber : 'Programmation introuvable',
      date: planning.date || '', speakerName: planning.speakerName || ''
    };
  }).filter(function (item) {
    return !query || normalizeText_([item.planningLabel, item.group, item.status, item.contact, item.notes].join(' ')).includes(query);
  }).sort(function (a, b) { return String(a.date).localeCompare(String(b.date)); });
}

function saveHospitality(payload) {
  assertAccess_('COORDINATEUR', 'saveHospitality');
  payload = payload || {};
  const planningId = requiredText_(payload.planningId, 'La programmation');
  const planning = listPlannings('', true).find(function (item) { return item.id === planningId && item.status !== 'ANNULE'; });
  if (!planning) throw new Error('La programmation sélectionnée est introuvable ou annulée.');
  const sheet = getDatabase_().getSheetByName(APP_CONFIG.sheets.hospitality);
  const id = String(payload.id || '').trim() || newId_();
  const status = ['A_ATTRIBUER', 'PROPOSE', 'CONFIRME', 'REFUSE', 'ANNULE'].includes(String(payload.status || '').toUpperCase()) ? String(payload.status).toUpperCase() : 'A_ATTRIBUER';
  const values = [id, planningId, String(payload.group || '').trim(), status, String(payload.contact || '').trim(), String(payload.notes || '').trim()];
  const row = findRowById_(sheet, id);
  const before = row ? listHospitalities('').find(function (item) { return item.id === id; }) || {} : {};
  if (row) sheet.getRange(row, 1, 1, values.length).setValues([values]);
  else {
    const duplicate = sheetRowsAsObjects_(sheet).find(function (item) { return String(item.PROGRAMMATION_ID || '') === planningId; });
    if (duplicate) throw new Error('Une hospitalité existe déjà pour cette programmation.');
    sheet.appendRow(values);
  }
  const after = listHospitalities('').find(function (item) { return item.id === id; }) || { id: id, planningId: planningId, status: status };
  logAction_(row ? 'MODIFICATION' : 'CREATION', 'HOSPITALITE', id, buildAuditDetails_(before, after));
  return after;
}

function setHospitalityStatus(id, status) {
  assertAccess_('COORDINATEUR', 'setHospitalityStatus');
  const allowed = ['A_ATTRIBUER', 'PROPOSE', 'CONFIRME', 'REFUSE', 'ANNULE'];
  status = String(status || '').toUpperCase();
  if (!allowed.includes(status)) throw new Error('Statut d’hospitalité invalide.');
  const sheet = getDatabase_().getSheetByName(APP_CONFIG.sheets.hospitality);
  const row = findRowById_(sheet, id);
  if (!row) throw new Error('Hospitalité introuvable.');
  const before = listHospitalities('').find(function (item) { return item.id === String(id); }) || {};
  sheet.getRange(row, 4).setValue(status);
  const after = listHospitalities('').find(function (item) { return item.id === String(id); }) || Object.assign({}, before, { status: status });
  logAction_('CHANGEMENT_STATUT', 'HOSPITALITE', id, buildAuditDetails_(before, after));
  return after;
}

function listInvitations(searchText) {
  const sheet = getDatabase_().getSheetByName(APP_CONFIG.sheets.invitations);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const planningMap = listPlannings('', true).reduce(function (map, item) { map[item.id] = item; return map; }, {});
  const query = normalizeText_(searchText);
  return sheetRowsAsObjects_(sheet).map(function (row) {
    const planning = planningMap[String(row.PROGRAMMATION_ID || '')] || {};
    const sentDate = row.DATE_ENVOI instanceof Date ? Utilities.formatDate(row.DATE_ENVOI, Session.getScriptTimeZone(), 'yyyy-MM-dd') : String(row.DATE_ENVOI || '');
    return {
      id: String(row.ID || ''), planningId: String(row.PROGRAMMATION_ID || ''), sentDate: sentDate,
      displaySentDate: sentDate ? formatDateFr_(sentDate) : '', status: String(row.STATUT || 'A_ENVOYER'),
      recipient: String(row.DESTINATAIRE || ''), notes: String(row.NOTES || ''),
      planningLabel: planning.displayDate ? planning.displayDate + ' - ' + planning.speakerName + ' - discours n° ' + planning.talkNumber : 'Programmation introuvable',
      date: planning.date || '', speakerName: planning.speakerName || ''
    };
  }).filter(function (item) {
    return !query || normalizeText_([item.planningLabel, item.recipient, item.status, item.notes, item.displaySentDate].join(' ')).includes(query);
  }).sort(function (a, b) { return String(a.date).localeCompare(String(b.date)); });
}

function saveInvitation(payload) {
  assertAccess_('COORDINATEUR', 'saveInvitation');
  payload = payload || {};
  const planningId = requiredText_(payload.planningId, 'La programmation');
  const planning = listPlannings('', true).find(function (item) { return item.id === planningId && item.status !== 'ANNULE'; });
  if (!planning) throw new Error('La programmation sélectionnée est introuvable ou annulée.');
  const sheet = getDatabase_().getSheetByName(APP_CONFIG.sheets.invitations);
  const id = String(payload.id || '').trim() || newId_();
  const status = ['A_ENVOYER', 'ENVOYEE', 'ACCEPTEE', 'REFUSEE', 'RELANCEE', 'ANNULEE'].includes(String(payload.status || '').toUpperCase()) ? String(payload.status).toUpperCase() : 'A_ENVOYER';
  const sentDate = String(payload.sentDate || '').trim();
  const recipient = String(payload.recipient || '').trim();
  if (status !== 'A_ENVOYER' && !recipient) throw new Error('Le destinataire est obligatoire.');
  const values = [id, planningId, sentDate ? new Date(sentDate + 'T12:00:00') : '', status, recipient, String(payload.notes || '').trim()];
  const row = findRowById_(sheet, id);
  const before = row ? listInvitations('').find(function (item) { return item.id === id; }) || {} : {};
  if (row) sheet.getRange(row, 1, 1, values.length).setValues([values]);
  else {
    const duplicate = sheetRowsAsObjects_(sheet).find(function (item) { return String(item.PROGRAMMATION_ID || '') === planningId; });
    if (duplicate) throw new Error('Une invitation existe déjà pour cette programmation.');
    sheet.appendRow(values);
  }
  const after = listInvitations('').find(function (item) { return item.id === id; }) || { id: id, planningId: planningId, status: status };
  logAction_(row ? 'MODIFICATION' : 'CREATION', 'INVITATION', id, buildAuditDetails_(before, after));
  return after;
}

function setInvitationStatus(id, status) {
  assertAccess_('COORDINATEUR', 'setInvitationStatus');
  const allowed = ['A_ENVOYER', 'ENVOYEE', 'ACCEPTEE', 'REFUSEE', 'RELANCEE', 'ANNULEE'];
  status = String(status || '').toUpperCase();
  if (!allowed.includes(status)) throw new Error('Statut d’invitation invalide.');
  const sheet = getDatabase_().getSheetByName(APP_CONFIG.sheets.invitations);
  const row = findRowById_(sheet, id);
  if (!row) throw new Error('Invitation introuvable.');
  const before = listInvitations('').find(function (item) { return item.id === String(id); }) || {};
  sheet.getRange(row, 4).setValue(status);
  if (status === 'ENVOYEE' && !sheet.getRange(row, 3).getValue()) sheet.getRange(row, 3).setValue(new Date());
  const after = listInvitations('').find(function (item) { return item.id === String(id); }) || Object.assign({}, before, { status: status });
  logAction_('CHANGEMENT_STATUT', 'INVITATION', id, buildAuditDetails_(before, after));
  return after;
}

function formatDateFr_(isoDate) {
  const match = String(isoDate || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? match[3] + '/' + match[2] + '/' + match[1] : String(isoDate || '');
}
