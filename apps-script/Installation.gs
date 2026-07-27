const INSTALLATION_SCHEMA_VERSION = '1.5.0';

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
    LANGUE_INTERFACE: 'fr',
    HEURE_REUNION_DEFAUT: '09:30',
    DUREE_IMPRESSION_MOIS: '3',
    HORIZON_ACTIONS_JOURS: '14',
    ALERTE_REPETITION_MOIS: '12'
  };

  Object.keys(defaults).forEach(function (key) {
    if (!String(getSetting_(key) || '').trim()) {
      upsertSetting_(sheet, key, defaults[key], 'Valeur ajoutée automatiquement lors de la migration.');
      applied.push('Ajout du paramètre ' + key);
    }
  });

  // Migration de l’ancien paramètre LANGUE vers LANGUE_INTERFACE.
  const legacyLanguage = String(getSetting_('LANGUE') || '').trim();
  if (legacyLanguage && !String(getSetting_('LANGUE_INTERFACE') || '').trim()) {
    upsertSetting_(sheet, 'LANGUE_INTERFACE', legacyLanguage, 'Langue de l’interface migrée automatiquement.');
    applied.push('Migration du paramètre LANGUE vers LANGUE_INTERFACE');
  }

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
  assertAccess_('ADMIN', 'runAcceptanceTests');
  const tests = [];

  function test(name, callback, blocking) {
    try {
      const details = callback();
      tests.push({ name: name, success: true, blocking: blocking !== false, details: details || '' });
    } catch (error) {
      tests.push({ name: name, success: false, blocking: blocking !== false, error: error.message || String(error) });
    }
  }

  test('Connexion à la base', function () {
    const ss = getDatabase_();
    if (!ss || !ss.getId()) throw new Error('Base Google Sheets inaccessible.');
    return ss.getName();
  });

  test('Présence des feuilles obligatoires', function () {
    const status = getInstallationStatus();
    if (status.missingSheets.length) throw new Error('Feuilles manquantes : ' + status.missingSheets.join(', '));
    return Object.values(APP_CONFIG.sheets).length + ' feuilles vérifiées';
  });

  test('Fuseau horaire Guadeloupe', function () {
    const timezone = Session.getScriptTimeZone();
    if (timezone !== 'America/Guadeloupe') throw new Error('Fuseau incorrect : ' + timezone);
    return timezone;
  });

  test('Paramètres essentiels', function () {
    const required = ['ASSEMBLEE', 'LANGUE_INTERFACE', 'ALERTE_REPETITION_MOIS', 'SCHEMA_VERSION'];
    const missing = required.filter(function (key) { return !String(getSetting_(key) || '').trim(); });
    if (missing.length) throw new Error('Paramètres manquants : ' + missing.join(', '));
    return required.join(', ');
  });

  test('Langue configurée', function () {
    const language = String(getSetting_('LANGUE_INTERFACE') || 'fr').toLowerCase();
    if (['fr', 'gcf'].indexOf(language) === -1) throw new Error('Langue non reconnue : ' + language);
    return language;
  });

  test('Compte administrateur actif', function () {
    const administrators = listAccessUsers_().filter(function (user) { return user.active && user.role === 'ADMIN'; });
    if (!administrators.length) throw new Error('Aucun administrateur actif.');
    return administrators.length + ' administrateur(s) actif(s)';
  });

  test('Discours officiellement inactifs', function () {
    const talks = listTalks('', true);
    const invalid = APP_CONFIG.inactiveTalks.filter(function (number) {
      const talk = talks.find(function (item) { return Number(item.number) === Number(number); });
      return !talk || talk.active;
    });
    if (invalid.length) throw new Error('Discours absents ou actifs à tort : ' + invalid.join(', '));
    return APP_CONFIG.inactiveTalks.join(', ');
  });

  test('Chargement des modules principaux', function () {
    listSpeakers('', true);
    listCongregations('', true);
    listTalks('', true);
    listPlannings('', true);
    listHospitalities('');
    listInvitations('');
    return 'Tous les modules métier sont accessibles';
  });

  test('Intégrité des relations', function () {
    const integrity = getDataIntegrityReport_();
    if (!integrity.ok) throw new Error(integrity.issues.length + ' anomalie(s) bloquante(s) détectée(s).');
    return integrity.counts;
  });

  test('Création d’une sauvegarde en mémoire', function () {
    const payload = buildBackupPayload_();
    const summary = backupSummaryFromPayload_(payload);
    if (!payload.sheets.length) throw new Error('La sauvegarde ne contient aucune feuille.');
    return summary.sheets.length + ' feuilles sauvegardables';
  });

  test('Validation du format de sauvegarde', function () {
    const payload = buildBackupPayload_();
    const parsed = parseAndValidateBackup_(JSON.stringify(payload));
    if (parsed.product !== APP_CONFIG.name) throw new Error('Produit de sauvegarde incorrect.');
    return 'Format ' + parsed.formatVersion;
  });

  test('Disponibilité de l’impression', function () {
    if (typeof getPrintablePlanning !== 'function' && typeof buildPrintablePlanning !== 'function') {
      throw new Error('Fonction d’impression du planning introuvable.');
    }
    return 'Module d’impression chargé';
  }, false);

  const blockingFailures = tests.filter(function (item) { return !item.success && item.blocking; });
  const result = {
    success: blockingFailures.length === 0,
    total: tests.length,
    passed: tests.filter(function (item) { return item.success; }).length,
    failed: tests.filter(function (item) { return !item.success; }).length,
    blockingFailed: blockingFailures.length,
    tests: tests,
    executedAt: new Date().toISOString()
  };
  logAction_('TEST_ACCEPTATION', 'APPLICATION', APP_CONFIG.version, result);
  return result;
}