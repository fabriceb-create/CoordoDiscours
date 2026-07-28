import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve('apps-script');
let assertions = 0;
let currentRole = 'ADMIN';
let installationStatus;
let settingsSnapshot;
let integrityReport;
let performanceReport;
let backupEvent;
let acceptanceEvent;
let acceptanceResult;
const auditActions = [];
const properties = new Map();
let uuidCounter = 0;

function isoDaysAgo(days) {
  return new Date(Date.now() - days * 86400000).toISOString();
}

function resetFixtures() {
  installationStatus = {
    installed: true,
    appVersion: '1.13 Stable',
    schemaVersion: '1.8.0',
    timezone: 'America/Guadeloupe',
    missingSheets: []
  };
  settingsSnapshot = { VERSION: '1.13 Stable' };
  integrityReport = { ok: true, counts: { issues: 0 }, issues: [] };
  performanceReport = {
    slowThresholdMs: 1500,
    totals: { operations: 2, calls: 20, slowCalls: 1, errors: 0 },
    operations: []
  };
  backupEvent = { timestamp: isoDaysAgo(1), displayDate: 'hier', entityId: 'backup.json', details: {} };
  acceptanceEvent = { timestamp: isoDaysAgo(1), displayDate: 'hier', entityId: '1.13 Stable', details: { success: true, total: 18, passed: 18, failed: 0, blockingFailed: 0 } };
  acceptanceResult = { success: true, total: 18, passed: 18, failed: 0, blockingFailed: 0, tests: [] };
  auditActions.length = 0;
  properties.clear();
  currentRole = 'ADMIN';
}

const roleDefinitions = {
  ADMIN: { label: 'Administrateur', level: 30 },
  COORDINATEUR: { label: 'Coordinateur', level: 20 },
  CONSULTATION: { label: 'Consultation seule', level: 10 }
};

function access() {
  return { email: currentRole.toLowerCase() + '@example.test', role: currentRole, active: true, canAdminister: currentRole === 'ADMIN' };
}

const context = {
  console,
  Date,
  Math,
  JSON,
  Object,
  Array,
  Number,
  String,
  Boolean,
  RegExp,
  Error,
  Set,
  APP_CONFIG: { name: 'CoordoDiscours', version: '1.13 Stable' },
  INSTALLATION_SCHEMA_VERSION: '1.8.0',
  ACCESS_ROLES: roleDefinitions,
  Session: {
    getScriptTimeZone: () => 'America/Guadeloupe',
    getActiveUser: () => ({ getEmail: () => access().email })
  },
  Utilities: {
    formatDate: date => {
      const d = new Date(date);
      return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    },
    getUuid: () => `00000000-0000-0000-0000-${String(++uuidCounter).padStart(12, '0')}`
  },
  PropertiesService: {
    getScriptProperties: () => ({
      getProperty: key => properties.has(key) ? properties.get(key) : null,
      setProperty: (key, value) => properties.set(key, String(value)),
      deleteProperty: key => properties.delete(key)
    })
  },
  LockService: {
    getScriptLock: () => ({ waitLock: () => true, releaseLock: () => true })
  },
  getCurrentUserAccess: () => access(),
  assertAccess_: minimumRole => {
    const actual = roleDefinitions[currentRole];
    const expected = roleDefinitions[minimumRole];
    if (!actual || actual.level < expected.level) throw new Error('Accès insuffisant');
    return access();
  },
  assertAdminAccess_: () => {
    if (currentRole !== 'ADMIN') throw new Error('Accès insuffisant');
    return access();
  },
  measureServerOperation_: (_name, callback) => callback(),
  getInstallationStatus: () => JSON.parse(JSON.stringify(installationStatus)),
  getSettingsSnapshot_: () => JSON.parse(JSON.stringify(settingsSnapshot)),
  getDataIntegrityReport_: () => JSON.parse(JSON.stringify(integrityReport)),
  getServerPerformanceReport_: () => JSON.parse(JSON.stringify(performanceReport)),
  listHistory: filters => {
    if (filters.action === 'SAUVEGARDE') return backupEvent ? [JSON.parse(JSON.stringify(backupEvent))] : [];
    if (filters.action === 'TEST_ACCEPTATION') return acceptanceEvent ? [JSON.parse(JSON.stringify(acceptanceEvent))] : [];
    if (filters.action === 'INCIDENT_CLIENT') {
      return auditActions.filter(item => item.action === 'INCIDENT_CLIENT').slice(-Number(filters.limit || 10)).reverse().map(item => ({
        entityId: item.entityId,
        timestamp: item.details.recordedAt,
        displayDate: item.details.recordedAt,
        user: 'user@example.test',
        details: item.details
      }));
    }
    return [];
  },
  runAcceptanceTests: () => {
    acceptanceEvent = { timestamp: new Date().toISOString(), displayDate: 'maintenant', entityId: '1.13 Stable', details: JSON.parse(JSON.stringify(acceptanceResult)) };
    return JSON.parse(JSON.stringify(acceptanceResult));
  },
  logAction_: (actionName, entity, entityId, details) => auditActions.push({ action: actionName, entity, entityId, details })
};

vm.createContext(context);
['SupportDiagnostics.gs', 'ReleaseReadiness.gs'].forEach(file => {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
});

function check(condition, message) {
  assertions += 1;
  assert.ok(condition, message);
}

resetFixtures();

// 1. Une installation cohérente doit être conforme.
{
  const result = context.assessInstallationReadiness_(installationStatus, settingsSnapshot);
  assert.equal(result.status, 'PASS');
  assertions += 1;
}

// 2. Un schéma non migré doit bloquer la mise en production.
{
  const result = context.assessInstallationReadiness_({ ...installationStatus, schemaVersion: '1.7.0' }, settingsSnapshot);
  assert.equal(result.status, 'BLOCKING');
  assertions += 1;
}

// 3. La sauvegarde doit être récente, sinon elle avertit ou bloque.
{
  assert.equal(context.assessBackupReadiness_(null, new Date()).status, 'BLOCKING');
  assert.equal(context.assessBackupReadiness_({ timestamp: isoDaysAgo(10), entityId: 'ancien.json' }, new Date()).status, 'WARNING');
  assert.equal(context.assessBackupReadiness_({ timestamp: isoDaysAgo(20), entityId: 'trop-ancien.json' }, new Date()).status, 'BLOCKING');
  assert.equal(context.assessBackupReadiness_({ timestamp: isoDaysAgo(2), entityId: 'recent.json' }, new Date()).status, 'PASS');
  assertions += 4;
}

// 4. Les erreurs serveur répétées doivent bloquer, l’absence de mesure doit avertir.
{
  assert.equal(context.assessPerformanceReadiness_({ totals: { calls: 0, errors: 0, slowCalls: 0 }, operations: [] }).status, 'WARNING');
  assert.equal(context.assessPerformanceReadiness_({ totals: { calls: 10, errors: 3, slowCalls: 0 }, operations: [] }).status, 'BLOCKING');
  assert.equal(context.assessPerformanceReadiness_(performanceReport).status, 'PASS');
  assertions += 3;
}

// 5. Une recette absente ou en échec bloque ; une recette récente réussie passe.
{
  assert.equal(context.assessAcceptanceReadiness_(null, new Date()).status, 'BLOCKING');
  assert.equal(context.assessAcceptanceReadiness_({ timestamp: isoDaysAgo(1), details: { success: false, blockingFailed: 1 } }, new Date()).status, 'BLOCKING');
  assert.equal(context.assessAcceptanceReadiness_(acceptanceEvent, new Date()).status, 'PASS');
  assertions += 3;
}

// 6. Le rapport global favorable doit atteindre 100 et être prêt.
{
  const report = context.buildReleaseReadinessReport_();
  assert.equal(report.status, 'READY');
  assert.equal(report.score, 100);
  assert.equal(report.counts.blocking, 0);
  assertions += 3;
}

// 7. Une anomalie d’intégrité doit faire basculer le rapport en blocage.
{
  integrityReport = { ok: false, counts: { issues: 1 }, issues: [{ severity: 'ERREUR', code: 'TEST', message: 'Anomalie', details: {} }] };
  const report = context.buildReleaseReadinessReport_();
  assert.equal(report.status, 'BLOCKED');
  check(report.recommendations.some(item => item.checkId === 'integrity'), 'La recommandation d’intégrité est absente.');
  integrityReport = { ok: true, counts: { issues: 0 }, issues: [] };
}

// 8. Une session de recette doit refuser un identifiant ou une étape obsolète.
{
  const session = context.startReleaseAcceptance();
  assert.equal(session.status, 'IN_PROGRESS');
  assert.equal(session.currentStepId, 'installation');
  assert.throws(() => context.runReleaseAcceptanceStep('mauvaise-session', 'installation'), /session de recette a changé/i);
  assert.throws(() => context.runReleaseAcceptanceStep(session.id, 'backup'), /étape attendue/i);
  assertions += 4;
}

// 9. Les six étapes doivent pouvoir aller jusqu’à une décision READY.
{
  let session = context.getReleaseAcceptanceSession();
  for (const step of ['installation', 'integrity', 'backup', 'performance', 'acceptance', 'final']) {
    session = context.runReleaseAcceptanceStep(session.id, step);
  }
  assert.equal(session.status, 'COMPLETED');
  assert.equal(session.results.length, 6);
  assert.equal(session.finalReport.status, 'READY');
  assert.equal(session.currentStepId, '');
  check(auditActions.some(item => item.action === 'RECETTE_DEPLOIEMENT_TERMINEE'), 'La fin de recette n’est pas auditée.');
  const raw = [...properties.values()][0] || '';
  check(raw.length < 9000, 'La session persistée dépasse la limite de sécurité des propriétés Apps Script.');
  assertions += 4;
}

// 10. Le rapport de recette doit être exportable en JSON.
{
  const session = context.getReleaseAcceptanceSession();
  const exported = context.exportReleaseAcceptanceReport(session.id);
  const payload = JSON.parse(exported.content);
  assert.equal(payload.product, 'CoordoDiscours');
  assert.equal(payload.session.id, session.id);
  assert.match(exported.fileName, /CoordoDiscours-recette-/);
  assertions += 3;
}

// 11. Les incidents client doivent être référencés sans conserver de structure sensible.
{
  const result = context.registerClientIncident({
    reference: 'CD-ERR-TEST-123456',
    operation: 'savePlanning',
    view: 'planning',
    message: 'Erreur\navec\tbeaucoup   d’espaces ' + 'x'.repeat(400),
    transient: true,
    readOnly: false,
    secret: { token: 'interdit' }
  });
  assert.equal(result.reference, 'CD-ERR-TEST-123456');
  const incident = auditActions.find(item => item.action === 'INCIDENT_CLIENT');
  assert.ok(incident);
  assert.ok(incident.details.message.length <= 240);
  assert.equal(Object.prototype.hasOwnProperty.call(incident.details, 'secret'), false);
  assertions += 4;
}

// 12. Les rapports et sessions sont réservés aux administrateurs.
{
  currentRole = 'CONSULTATION';
  assert.throws(() => context.getReleaseReadinessBootstrap(), /Accès insuffisant/);
  assert.throws(() => context.startReleaseAcceptance(), /Accès insuffisant/);
  assert.doesNotThrow(() => context.registerClientIncident({ message: 'Erreur utilisateur' }));
  assertions += 3;
}

console.log(`Tests de préparation à la mise en production réussis : ${assertions} contrôles exécutés.`);
