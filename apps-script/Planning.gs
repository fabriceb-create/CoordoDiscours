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
      const id = String(row[0] || '');
      const version = getEntityVersion_('PROGRAMMATION', id);
      return {
        id: id,
        date: isNaN(date.getTime()) ? '' : Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd'),
        displayDate: isNaN(date.getTime()) ? '' : Utilities.formatDate(date, Session.getScriptTimeZone(), 'dd/MM/yyyy'),
        time: formatTimeValue_(row[2]),
        speakerId: String(row[3] || ''),
        speakerName: speaker.fullName || speaker.lastName || 'Orateur à définir',
        talkNumber: Number(row[4]) || '',
        talkTitle: talk.title || '',
        status: status,
        originCongregationId: String(row[6] || ''),
        notes: String(row[7] || ''),
        version: version.version,
        updatedAt: version.updatedAt,
        updatedBy: version.updatedBy
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
  const dataset = buildPlanningRuleDataset_();
  const evaluation = evaluatePlanningRules_(data, dataset);
  return planningValidationResponse_(data, evaluation);
}

function planningValidationResponse_(data, evaluation) {
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
  const data = normalizePlanningPayload_(payload);
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  let dataset;
  let evaluation;
  let result;
  try {
    dataset = buildPlanningRuleDataset_();
    evaluation = evaluatePlanningRules_(data, dataset);
    const validation = planningValidationResponse_(data, evaluation);

    if (!validation.valid) {
      result = {
        saved: false,
        blocked: true,
        errors: validation.errors,
        warnings: validation.warnings,
        rules: validation.rules
      };
    } else if (validation.warnings.length && !confirmWarnings) {
      result = { saved: false, requiresConfirmation: true, warnings: validation.warnings, rules: validation.rules };
    } else {
      const sheet = getDatabase_().getSheetByName(APP_CONFIG.sheets.events);
      const id = data.id || Utilities.getUuid();
      const rowIndex = findRowById_(sheet, id);
      const values = [id, new Date(data.date + 'T12:00:00'), data.time, data.speakerId, data.talkNumber, data.status || 'PROGRAMME', data.originCongregationId || '', data.notes || ''];

      if (rowIndex) {
        assertEntityVersion_('PROGRAMMATION', id, data.version);
        const before = (dataset.plannings || []).find(function (item) { return item.id === id; }) || {};
        sheet.getRange(rowIndex, 1, 1, values.length).setValues([values]);
        const version = advanceEntityVersion_('PROGRAMMATION', id);
        const after = Object.assign({}, data, version);
        logAction_('MODIFICATION', 'PROGRAMMATION', id, buildAuditDetails_(before, after, { rules: validation.rules, concurrency: version }));
        result = { saved: true, id: id, version: version.version, warnings: validation.warnings, rules: validation.rules };
      } else {
        sheet.appendRow(values);
        const version = advanceEntityVersion_('PROGRAMMATION', id);
        const created = Object.assign({}, data, { id: id }, version);
        logAction_('CREATION', 'PROGRAMMATION', id, buildAuditDetails_({}, created, { rules: validation.rules, concurrency: version }));
        result = { saved: true, id: id, version: version.version, warnings: validation.warnings, rules: validation.rules };
      }
    }
  } finally {
    lock.releaseLock();
  }

  if (result && result.blocked) {
    result.resolution = buildPlanningConflictResolution_(data, evaluation, dataset);
  }
  return result;
}

function cancelPlanning(id, version) { assertEditAccess_(); return setPlanningStatus_(id, 'ANNULE', version); }
function restorePlanning(id, version) { assertEditAccess_(); return setPlanningStatus_(id, 'PROGRAMME', version); }

function setPlanningStatus_(id, status, expectedVersion) {
  assertEditAccess_();
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const sheet = getDatabase_().getSheetByName(APP_CONFIG.sheets.events);
    const rowIndex = findRowById_(sheet, id);
    if (!rowIndex) throw new Error('Programmation introuvable.');
    assertEntityVersion_('PROGRAMMATION', id, expectedVersion);
    const before = listPlannings('', true).find(function (item) { return item.id === String(id); }) || {};
    sheet.getRange(rowIndex, 6).setValue(status);
    const version = advanceEntityVersion_('PROGRAMMATION', id);
    const after = Object.assign({}, before, { status: status }, version);
    logAction_('CHANGEMENT_STATUT', 'PROGRAMMATION', id, buildAuditDetails_(before, after, { concurrency: version }));
    return { id: id, status: status, version: version.version };
  } finally {
    lock.releaseLock();
  }
}

function getSpeakerTalkNumbersMap_() {
  const sheet = getDatabase_().getSheetByName(APP_CONFIG.sheets.speakerTalks);
  if (!sheet || sheet.getLastRow() < 2) return {};
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues().reduce(function (map, row) {
    const speakerId = String(row[0] || '');
    const talkNumber = Number(row[1]);
    if (!speakerId || !Number.isFinite(talkNumber)) return map;
    if (!map[speakerId]) map[speakerId] = [];
    if (!map[speakerId].includes(talkNumber)) map[speakerId].push(talkNumber);
    return map;
  }, {});
}

function getSpeakerTalkNumbers_(speakerId, speakerTalksMap) {
  if (speakerTalksMap) return (speakerTalksMap[String(speakerId)] || []).slice();
  return (getSpeakerTalkNumbersMap_()[String(speakerId)] || []).slice();
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
  return {
    id: String(data.id || ''),
    version: String(data.version || ''),
    date: date,
    time: time,
    speakerId: speakerId,
    talkNumber: talkNumber,
    status: String(data.status || 'PROGRAMME').toUpperCase(),
    originCongregationId: String(data.originCongregationId || ''),
    notes: String(data.notes || '').trim()
  };
}

function formatTimeValue_(value) {
  if (value instanceof Date) return Utilities.formatDate(value, Session.getScriptTimeZone(), 'HH:mm');
  const text = String(value || '').trim();
  const match = text.match(/(\d{1,2}):(\d{2})/);
  return match ? ('0' + match[1]).slice(-2) + ':' + match[2] : text;
}
