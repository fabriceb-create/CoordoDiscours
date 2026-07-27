function listPlannings(query, includeCancelled) {
  const ss = getDatabase_();
  const sheet = ss.getSheetByName(APP_CONFIG.sheets.events);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const speakers = listSpeakers('', true).reduce((map, item) => { map[item.id] = item; return map; }, {});
  const talks = listTalks('', true).reduce((map, item) => { map[String(item.number)] = item; return map; }, {});
  const normalizedQuery = normalizeText_(query);
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, 8).getValues()
    .map(row => {
      const speaker = speakers[String(row[3])] || {};
      const talk = talks[String(row[4])] || {};
      const status = String(row[5] || 'PROGRAMME').toUpperCase();
      const date = row[1] instanceof Date ? row[1] : new Date(row[1]);
      return {
        id: String(row[0] || ''), date: isNaN(date.getTime()) ? '' : Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd'),
        displayDate: isNaN(date.getTime()) ? '' : Utilities.formatDate(date, Session.getScriptTimeZone(), 'dd/MM/yyyy'),
        time: formatTimeValue_(row[2]), speakerId: String(row[3] || ''), speakerName: speaker.fullName || speaker.lastName || 'Orateur à définir',
        talkNumber: Number(row[4]) || '', talkTitle: talk.title || '', status: status, originCongregationId: String(row[6] || ''), notes: String(row[7] || '')
      };
    })
    .filter(item => includeCancelled || item.status !== 'ANNULE')
    .filter(item => !normalizedQuery || normalizeText_([item.displayDate, item.speakerName, item.talkNumber, item.talkTitle, item.status, item.notes].join(' ')).includes(normalizedQuery))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.time).localeCompare(String(b.time)));
}

function getPlanningOptions() {
  return { speakers: listSpeakers('', false), talks: listTalks('', false).filter(item => item.active), congregations: listCongregations('', false) };
}

function validatePlanning(payload) {
  const data = normalizePlanningPayload_(payload);
  const evaluation = evaluatePlanningRules_(data);
  return {
    valid: evaluation.valid,
    errors: ruleMessages_(evaluation.errors),
    warnings: ruleMessages_(evaluation.warnings),
    infos: ruleMessages_(evaluation.infos),
    rules: evaluation.rules,
    data: data
  };
}

function savePlanning(payload, confirmWarnings) {
  assertEditAccess_();
  const validation = validatePlanning(payload);
  if (!validation.valid) throw new Error(validation.errors.join('\n'));
  if (validation.warnings.length && !confirmWarnings) {
    return { saved: false, requiresConfirmation: true, warnings: validation.warnings, rules: validation.rules };
  }
  const data = validation.data;
  const sheet = getDatabase_().getSheetByName(APP_CONFIG.sheets.events);
  const id = data.id || Utilities.getUuid();
  const values = [id, new Date(data.date + 'T12:00:00'), data.time, data.speakerId, data.talkNumber, data.status || 'PROGRAMME', data.originCongregationId || '', data.notes || ''];
  const rowIndex = findRowById_(sheet, id);
  if (rowIndex) {
    sheet.getRange(rowIndex, 1, 1, values.length).setValues([values]);
    logAction_('MODIFICATION', 'PROGRAMMATION', id, { data: data, rules: validation.rules });
  } else {
    sheet.appendRow(values);
    logAction_('CREATION', 'PROGRAMMATION', id, { data: data, rules: validation.rules });
  }
  return { saved: true, id: id, warnings: validation.warnings, rules: validation.rules };
}

function cancelPlanning(id) { assertEditAccess_(); return setPlanningStatus_(id, 'ANNULE'); }
function restorePlanning(id) { assertEditAccess_(); return setPlanningStatus_(id, 'PROGRAMME'); }

function setPlanningStatus_(id, status) {
  assertEditAccess_();
  const sheet = getDatabase_().getSheetByName(APP_CONFIG.sheets.events);
  const rowIndex = findRowById_(sheet, id);
  if (!rowIndex) throw new Error('Programmation introuvable.');
  sheet.getRange(rowIndex, 6).setValue(status);
  logAction_('CHANGEMENT_STATUT', 'PROGRAMMATION', id, { status: status });
  return { id: id, status: status };
}

function getSpeakerTalkNumbers_(speakerId) {
  const sheet = getDatabase_().getSheetByName(APP_CONFIG.sheets.speakerTalks);
  if (!sheet || sheet.getLastRow() < 2) return [];
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues().filter(row => String(row[0]) === String(speakerId)).map(row => Number(row[1])).filter(number => Number.isFinite(number));
}

function normalizePlanningPayload_(payload) {
  const data = payload || {};
  const date = String(data.date || '').trim();
  const time = String(data.time || '').trim();
  const speakerId = String(data.speakerId || '').trim();
  const talkNumber = Number(data.talkNumber);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('La date est obligatoire.');
  if (!/^\d{2}:\d{2}$/.test(time)) throw new Error('L’heure est obligatoire.');
  if (!speakerId) throw new Error('L’orateur est obligatoire.');
  if (!Number.isFinite(talkNumber)) throw new Error('Le discours est obligatoire.');
  return { id: String(data.id || ''), date: date, time: time, speakerId: speakerId, talkNumber: talkNumber, status: String(data.status || 'PROGRAMME').toUpperCase(), originCongregationId: String(data.originCongregationId || ''), notes: String(data.notes || '').trim() };
}

function formatTimeValue_(value) {
  if (value instanceof Date) return Utilities.formatDate(value, Session.getScriptTimeZone(), 'HH:mm');
  const text = String(value || '').trim();
  const match = text.match(/(\d{1,2}):(\d{2})/);
  return match ? ('0' + match[1]).slice(-2) + ':' + match[2] : text;
}
