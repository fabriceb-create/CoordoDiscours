function listTalks(searchText, includeInactive) {
  const ss = getDatabase_();
  const sheet = ss.getSheetByName(APP_CONFIG.sheets.talks);
  const query = normalizeText_(searchText);

  return sheetRowsAsObjects_(sheet)
    .map(function (row) {
      return {
        number: Number(row.NUMERO),
        title: String(row.TITRE || ''),
        active: booleanValue_(row.ACTIF),
        updatedAt: row.DATE_MISE_A_JOUR || ''
      };
    })
    .filter(function (item) {
      if (!includeInactive && !item.active) return false;
      if (!query) return true;
      return normalizeText_(String(item.number) + ' ' + item.title).includes(query);
    })
    .sort(function (a, b) { return a.number - b.number; });
}

function getTalk(number) {
  const item = listTalks('', true).find(function (talk) {
    return Number(talk.number) === Number(number);
  });
  if (!item) throw new Error('Discours introuvable.');
  return item;
}

function saveTalk(payload) {
  payload = payload || {};
  const number = Number(payload.number);
  if (!Number.isInteger(number) || number <= 0) {
    throw new Error('Le numéro du discours doit être un entier positif.');
  }
  const title = requiredText_(payload.title, 'Le titre');
  const active = payload.active !== false && !APP_CONFIG.inactiveTalks.includes(number);
  const ss = getDatabase_();
  const sheet = ss.getSheetByName(APP_CONFIG.sheets.talks);
  const rows = sheetRowsAsObjects_(sheet);
  const existing = rows.find(function (row) { return Number(row.NUMERO) === number; });
  const values = [number, title, active, new Date()];

  if (existing) {
    sheet.getRange(existing._row, 1, 1, values.length).setValues([values]);
    logAction_('MODIFICATION', 'DISCOURS', number, { titre: title, actif: active });
  } else {
    sheet.appendRow(values);
    logAction_('CREATION', 'DISCOURS', number, { titre: title, actif: active });
  }
  return getTalk(number);
}

function setTalkActive(number, active) {
  const talk = getTalk(number);
  if (active && APP_CONFIG.inactiveTalks.includes(Number(number))) {
    throw new Error('Ce discours est officiellement inactif et ne peut pas être réactivé.');
  }
  talk.active = Boolean(active);
  const saved = saveTalk(talk);
  logAction_(active ? 'ACTIVATION' : 'DESACTIVATION', 'DISCOURS', number, { titre: talk.title });
  return saved;
}

function importTalkReference(rows) {
  if (!Array.isArray(rows)) throw new Error('Format d’import invalide.');
  const summary = { created: 0, updated: 0, ignored: 0, errors: [] };
  rows.forEach(function (row, index) {
    try {
      const number = Number(row.number || row.NUMERO);
      const title = String(row.title || row.TITRE || '').trim();
      if (!number || !title) {
        summary.ignored += 1;
        return;
      }
      const exists = listTalks('', true).some(function (talk) { return talk.number === number; });
      saveTalk({ number: number, title: title, active: row.active !== false });
      if (exists) summary.updated += 1;
      else summary.created += 1;
    } catch (error) {
      summary.errors.push({ line: index + 1, message: error.message });
    }
  });
  logAction_('IMPORT', 'REFERENTIEL_DISCOURS', APP_CONFIG.version, summary);
  return summary;
}
