const SETTINGS_DEFINITIONS = Object.freeze([
  { key: 'ASSEMBLEE', label: 'Nom de l’assemblée', type: 'text', defaultValue: 'Basse-Terre', description: 'Nom affiché dans l’application et sur les documents imprimés.' },
  { key: 'LANGUE_INTERFACE', label: 'Langue de l’application', type: 'select', options: ['fr', 'gcf'], optionLabels: { fr: 'Français', gcf: 'Kréyòl Gwadloup' }, defaultValue: 'fr', description: 'Langue utilisée pour les menus, formulaires, messages et documents générés.' },
  { key: 'ALERTE_REPETITION_MOIS', label: 'Alerte de répétition', type: 'number', min: 1, max: 60, defaultValue: '12', suffix: 'mois', description: 'Période utilisée pour avertir qu’un discours a déjà été programmé.' },
  { key: 'HEURE_REUNION_DEFAUT', label: 'Heure de réunion par défaut', type: 'time', defaultValue: '09:30', description: 'Heure proposée lors de la création d’une programmation.' },
  { key: 'DUREE_IMPRESSION_MOIS', label: 'Période d’impression par défaut', type: 'select', options: ['3', '6'], defaultValue: '3', suffix: 'mois', description: 'Nombre de mois proposé dans le planning imprimable.' },
  { key: 'HORIZON_ACTIONS_JOURS', label: 'Horizon des actions', type: 'number', min: 1, max: 90, defaultValue: '14', suffix: 'jours', description: 'Période examinée par le tableau de bord pour les invitations et hospitalités manquantes.' },
  { key: 'AUTO_PLAN_MOIS', label: 'Planification automatique — période par défaut', type: 'number', min: 1, max: 6, defaultValue: '4', suffix: 'mois', description: 'Nombre de mois proposé à l’ouverture de l’assistant de planification automatique.' },
  { key: 'AUTO_PLAN_SUIVIS', label: 'Planification automatique — créer les suivis', type: 'boolean', defaultValue: 'OUI', description: 'Prépare automatiquement une invitation et une hospitalité à compléter pour chaque orateur extérieur retenu.' },
  { key: 'RECO_POIDS_DISCOURS', label: 'Recommandation — discours autorisé', type: 'number', min: 0, max: 100, defaultValue: '40', suffix: 'points', description: 'Importance accordée à la capacité de l’orateur à présenter le discours sélectionné.' },
  { key: 'RECO_POIDS_ANCIENNETE', label: 'Recommandation — ancienneté du dernier passage', type: 'number', min: 0, max: 100, defaultValue: '30', suffix: 'points', description: 'Importance accordée au temps écoulé depuis le dernier passage de l’orateur.' },
  { key: 'RECO_POIDS_MOIS', label: 'Recommandation — disponibilité dans le mois', type: 'number', min: 0, max: 100, defaultValue: '15', suffix: 'points', description: 'Importance accordée à l’absence d’une autre programmation durant le même mois.' },
  { key: 'RECO_POIDS_LOCAL', label: 'Recommandation — proximité', type: 'number', min: 0, max: 100, defaultValue: '10', suffix: 'points', description: 'Importance accordée aux orateurs locaux afin de limiter déplacements et accueil.' },
  { key: 'RECO_POIDS_EQUILIBRE', label: 'Recommandation — équilibre des affectations', type: 'number', min: 0, max: 100, defaultValue: '5', suffix: 'points', description: 'Importance accordée aux orateurs les moins sollicités dans le planning.' },
  { key: 'RECO_BONUS_DATE_PREFEREE', label: 'Recommandation — bonus date préférée', type: 'number', min: 0, max: 30, defaultValue: '10', suffix: 'points', description: 'Bonus ajouté au score lorsqu’une date appartient à une période préférée de l’orateur.' },
  { key: 'RECO_MALUS_DATE_A_EVITER', label: 'Recommandation — malus date à éviter', type: 'number', min: 0, max: 50, defaultValue: '18', suffix: 'points', description: 'Malus retiré du score lorsqu’une date appartient à une période signalée comme à éviter.' },
  { key: 'ASSISTANT_LECTURE_SEULE', label: 'Assistant en lecture seule', type: 'boolean', defaultValue: 'OUI', description: 'Conserve les fonctions d’assistance sans autoriser de modification automatique.' }
]);

function getApplicationSettings() {
  assertAccess_('ADMIN');
  const ss = getDatabase_();
  const sheet = ss.getSheetByName(APP_CONFIG.sheets.settings);
  const stored = {};
  if (sheet && sheet.getLastRow() > 1) sheet.getRange(2, 1, sheet.getLastRow() - 1, 3).getValues().forEach(row => { stored[String(row[0] || '').trim()] = { value: String(row[1] ?? ''), description: String(row[2] || '') }; });
  const metadata = getEntityVersion_('PARAMETRES', 'APPLICATION');
  return {
    settings: SETTINGS_DEFINITIONS.map(definition => ({ ...definition, value: stored[definition.key] && stored[definition.key].value !== '' ? stored[definition.key].value : definition.defaultValue })),
    diagnostics: getSettingsDiagnostics_(),
    spreadsheetUrl: ss.getUrl(),
    version: APP_CONFIG.version,
    language: getInterfaceLanguage(),
    settingsVersion: metadata.version,
    settingsUpdatedAt: metadata.updatedAt,
    settingsUpdatedBy: metadata.updatedBy
  };
}

function settingsAsMap_() {
  return getApplicationSettings().settings.reduce(function (map, item) { map[item.key] = item.value; return map; }, {});
}

function saveApplicationSettings(payload) {
  assertAccess_('ADMIN');
  payload = payload || {};
  return saveApplicationSettings_(payload, 'MODIFICATION', payload.version);
}

function saveApplicationSettings_(values, action, expectedVersion) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    assertEntityVersion_('PARAMETRES', 'APPLICATION', expectedVersion);
    const before = settingsAsMap_();
    const sheet = getDatabase_().getSheetByName(APP_CONFIG.sheets.settings);
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
      saved[definition.key] = value;
    });
    validateRecommendationWeights_(saved);
    SETTINGS_DEFINITIONS.forEach(definition => upsertSetting_(sheet, definition.key, saved[definition.key], definition.description));
    advanceEntityVersion_('PARAMETRES', 'APPLICATION');
    const result = getApplicationSettings();
    const after = result.settings.reduce(function (map, item) { map[item.key] = item.value; return map; }, {});
    logAction_(action || 'MODIFICATION', 'PARAMETRES', 'APPLICATION', buildAuditDetails_(before, after));
    return result;
  } finally {
    lock.releaseLock();
  }
}

function validateRecommendationWeights_(settings) {
  const keys = ['RECO_POIDS_DISCOURS', 'RECO_POIDS_ANCIENNETE', 'RECO_POIDS_MOIS', 'RECO_POIDS_LOCAL', 'RECO_POIDS_EQUILIBRE'];
  const total = keys.reduce(function (sum, key) { return sum + Number(settings[key] || 0); }, 0);
  if (total <= 0) throw new Error('Au moins une pondération de recommandation doit être supérieure à zéro.');
  return total;
}

function resetApplicationSettings(expectedVersion) {
  assertAccess_('ADMIN');
  const defaults = {};
  SETTINGS_DEFINITIONS.forEach(item => { defaults[item.key] = item.defaultValue; });
  return saveApplicationSettings_(defaults, 'REINITIALISATION', expectedVersion);
}

function upsertSetting_(sheet, key, value, description) {
  const row = findSettingRow_(sheet, key);
  const values = [[key, value, description || '']];
  if (row) sheet.getRange(row, 1, 1, 3).setValues(values); else sheet.appendRow(values[0]);
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
  return { ok: missingSheets.length === 0, databaseName: ss.getName(), databaseId: ss.getId(), timezone: timezone, missingSheets: missingSheets, sheetCount: requiredSheets.length - missingSheets.length, expectedSheetCount: requiredSheets.length };
}
