const SETTINGS_DEFINITIONS = Object.freeze([
  { key: 'ASSEMBLEE', label: 'Nom de l’assemblée', type: 'text', defaultValue: 'Basse-Terre', description: 'Nom affiché dans l’application et sur les documents imprimés.' },
  { key: 'LANGUE_INTERFACE', label: 'Langue de l’application', type: 'select', options: ['fr', 'gcf'], optionLabels: { fr: 'Français', gcf: 'Kréyòl Gwadloup' }, defaultValue: 'fr', description: 'Langue utilisée pour les menus, formulaires, messages et documents générés.' },
  { key: 'ALERTE_REPETITION_MOIS', label: 'Alerte de répétition', type: 'number', min: 1, max: 60, defaultValue: '12', suffix: 'mois', description: 'Période utilisée pour avertir qu’un discours a déjà été programmé.' },
  { key: 'HEURE_REUNION_DEFAUT', label: 'Heure de réunion par défaut', type: 'time', defaultValue: '09:30', description: 'Heure proposée lors de la création d’une programmation.' },
  { key: 'DUREE_IMPRESSION_MOIS', label: 'Période d’impression par défaut', type: 'select', options: ['3', '6'], defaultValue: '3', suffix: 'mois', description: 'Nombre de mois proposé dans le planning imprimable.' },
  { key: 'HORIZON_ACTIONS_JOURS', label: 'Horizon des actions', type: 'number', min: 1, max: 90, defaultValue: '14', suffix: 'jours', description: 'Période examinée par le tableau de bord pour les invitations et hospitalités manquantes.' },
  { key: 'ASSISTANT_LECTURE_SEULE', label: 'Assistant en lecture seule', type: 'boolean', defaultValue: 'OUI', description: 'Conserve les fonctions d’assistance sans autoriser de modification automatique.' }
]);

function getApplicationSettings() {
  const ss = getDatabase_();
  const sheet = ss.getSheetByName(APP_CONFIG.sheets.settings);
  const stored = {};
  if (sheet && sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, 3).getValues().forEach(row => {
      stored[String(row[0] || '').trim()] = { value: String(row[1] ?? ''), description: String(row[2] || '') };
    });
  }
  return {
    settings: SETTINGS_DEFINITIONS.map(definition => ({
      ...definition,
      value: stored[definition.key] && stored[definition.key].value !== '' ? stored[definition.key].value : definition.defaultValue
    })),
    diagnostics: getSettingsDiagnostics_(),
    spreadsheetUrl: ss.getUrl(),
    version: APP_CONFIG.version,
    language: getInterfaceLanguage()
  };
}

function saveApplicationSettings(payload) {
  const values = payload || {};
  const ss = getDatabase_();
  const sheet = ss.getSheetByName(APP_CONFIG.sheets.settings);
  if (!sheet) throw new Error('La feuille PARAMETRES est introuvable.');
  const saved = {};
  SETTINGS_DEFINITIONS.forEach(definition => {
    let value = String(values[definition.key] ?? definition.defaultValue).trim();
    if (definition.type === 'number') {
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) throw new Error(definition.label + ' doit être un nombre.');
      if (definition.min != null && numeric < definition.min) throw new Error(definition.label + ' doit être supérieur ou égal à ' + definition.min + '.');
      if (definition.max != null && numeric > definition.max) throw new Error(definition.label + ' doit être inférieur ou égal à ' + definition.max + '.');
      value = String(numeric);
    }
    if (definition.type === 'time' && !/^\d{2}:\d{2}$/.test(value)) throw new Error('Heure de réunion invalide.');
    if (definition.type === 'boolean') value = value === 'NON' ? 'NON' : 'OUI';
    if (definition.type === 'select' && !definition.options.includes(value)) value = definition.defaultValue;
    upsertSetting_(sheet, definition.key, value, definition.description);
    saved[definition.key] = value;
  });
  logAction_('MODIFICATION', 'PARAMETRES', 'APPLICATION', saved);
  return getApplicationSettings();
}

function resetApplicationSettings() {
  const defaults = {};
  SETTINGS_DEFINITIONS.forEach(item => { defaults[item.key] = item.defaultValue; });
  logAction_('REINITIALISATION', 'PARAMETRES', 'APPLICATION', defaults);
  return saveApplicationSettings(defaults);
}

function upsertSetting_(sheet, key, value, description) {
  const row = findSettingRow_(sheet, key);
  const values = [[key, value, description || '']];
  if (row) sheet.getRange(row, 1, 1, 3).setValues(values);
  else sheet.appendRow(values[0]);
}

function findSettingRow_(sheet, key) {
  if (sheet.getLastRow() < 2) return 0;
  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues().flat();
  const index = values.findIndex(value => String(value) === String(key));
  return index < 0 ? 0 : index + 2;
}

function getSettingsDiagnostics_() {
  const ss = getDatabase_();
  const requiredSheets = Object.values(APP_CONFIG.sheets);
  const missingSheets = requiredSheets.filter(name => !ss.getSheetByName(name));
  const timezone = Session.getScriptTimeZone();
  return {
    ok: missingSheets.length === 0,
    databaseName: ss.getName(),
    databaseId: ss.getId(),
    timezone: timezone,
    missingSheets: missingSheets,
    sheetCount: requiredSheets.length - missingSheets.length,
    expectedSheetCount: requiredSheets.length
  };
}
