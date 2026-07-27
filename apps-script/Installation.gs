const INSTALLATION_SCHEMA_VERSION = '1.4.0';

function installCoordoDiscours() {
  const startedAt = new Date();
  const database = setupDatabase_();
  const migrations = runDatabaseMigrations_();
  const tests = runAcceptanceTests();
  const result = {
    success: tests.success,
    version: APP_CONFIG.version,
    schemaVersion: INSTALLATION_SCHEMA_VERSION,
    database: database,
    migrations: migrations,
    tests: tests,
    startedAt: startedAt.toISOString(),
    finishedAt: new Date().toISOString()
  };
  logAction_('INSTALLATION_COMPLETE', 'APPLICATION', APP_CONFIG.version, result);
  return result;
}

function runDatabaseMigrations_() {
  const ss = getDatabase_();
  const sheet = ss.getSheetByName(APP_CONFIG.sheets.settings);
  const applied = [];

  const defaults = {
    LANGUE: 'fr',
    HEURE_REUNION_DEFAUT: '09:30',
    DUREE_IMPRESSION_MOIS: '3',
    HORIZON_ACTIONS_JOURS: '14'
  };

  Object.keys(defaults).forEach(function (key) {
    if (!String(getSetting_(key) || '').trim()) {
      upsertSetting_(sheet, key, defaults[key], 'Valeur ajoutée automatiquement lors de la migration.');
      applied.push('Ajout du paramètre ' + key);
    }
  });

  upsertSetting_(sheet, 'SCHEMA_VERSION', INSTALLATION_SCHEMA_VERSION, 'Version de structure de la base.');
  upsertSetting_(sheet, 'VERSION', APP_CONFIG.version, 'Version installée de l’application.');

  return {
    schemaVersion: INSTALLATION_SCHEMA_VERSION,
    applied: applied,
    appliedCount: applied.length
  };
}

function getInstallationStatus() {
  const ss = getDatabase_();
  const expectedSheets = Object.values(APP_CONFIG.sheets);
  const existingSheets = ss.getSheets().map(function (sheet) { return sheet.getName(); });
  const missingSheets = expectedSheets.filter(function (name) {
    return existingSheets.indexOf(name) === -1;
  });

  return {
    installed: missingSheets.length === 0,
    appVersion: APP_CONFIG.version,
    schemaVersion: getSetting_('SCHEMA_VERSION') || '',
    databaseId: ss.getId(),
    databaseName: ss.getName(),
    databaseUrl: ss.getUrl(),
    timezone: Session.getScriptTimeZone(),
    missingSheets: missingSheets,
    lastCheck: new Date().toISOString()
  };
}

function runAcceptanceTests() {
  const tests = [];

  function test(name, callback) {
    try {
      const details = callback();
      tests.push({ name: name, success: true, details: details || '' });
    } catch (error) {
      tests.push({ name: name, success: false, error: error.message || String(error) });
    }
  }

  test('Connexion à la base', function () {
    const ss = getDatabase_();
    if (!ss || !ss.getId()) throw new Error('Base Google Sheets inaccessible.');
    return ss.getName();
  });

  test('Présence des feuilles obligatoires', function () {
    const status = getInstallationStatus();
    if (status.missingSheets.length) {
      throw new Error('Feuilles manquantes : ' + status.missingSheets.join(', '));
    }
    return Object.values(APP_CONFIG.sheets).length + ' feuilles vérifiées';
  });

  test('Paramètres essentiels', function () {
    const required = ['ASSEMBLEE', 'LANGUE', 'ALERTE_REPETITION_MOIS', 'SCHEMA_VERSION'];
    const missing = required.filter(function (key) { return !String(getSetting_(key) || '').trim(); });
    if (missing.length) throw new Error('Paramètres manquants : ' + missing.join(', '));
    return required.join(', ');
  });

  test('Langue configurée', function () {
    const language = String(getSetting_('LANGUE') || 'fr').toLowerCase();
    if (['fr', 'gcf'].indexOf(language) === -1) throw new Error('Langue non reconnue : ' + language);
    return language;
  });

  test('Discours officiellement inactifs', function () {
    const talks = listTalks('', true);
    const invalid = APP_CONFIG.inactiveTalks.filter(function (number) {
      const talk = talks.find(function (item) { return Number(item.number) === Number(number); });
      return talk && talk.active;
    });
    if (invalid.length) throw new Error('Discours actifs à tort : ' + invalid.join(', '));
    return APP_CONFIG.inactiveTalks.join(', ');
  });

  test('Chargement des modules principaux', function () {
    listSpeakers('', true);
    listCongregations('', true);
    listTalks('', true);
    listPlannings('', true);
    return 'Orateurs, assemblées, discours et programmations';
  });

  const failed = tests.filter(function (item) { return !item.success; });
  const result = {
    success: failed.length === 0,
    total: tests.length,
    passed: tests.length - failed.length,
    failed: failed.length,
    tests: tests,
    executedAt: new Date().toISOString()
  };
  logAction_('TEST_ACCEPTATION', 'APPLICATION', APP_CONFIG.version, result);
  return result;
}
