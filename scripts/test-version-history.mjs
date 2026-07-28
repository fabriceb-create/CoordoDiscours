import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve('apps-script');
let currentSpeaker = null;
let currentSpeakers = null;
let currentAvailabilityEntries = [];
let historyRows = [];
let writeResult = { result: {} };
let writtenCandidate = null;
const actions = [];

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function digestBytes(text) {
  return Array.from(crypto.createHash('sha256').update(String(text), 'utf8').digest()).map(byte => byte > 127 ? byte - 256 : byte);
}
function formatDate(date, pattern) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  if (pattern === 'yyyy-MM-dd') return `${year}-${month}-${day}`;
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
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
  ACCESS_ROLES: {
    ADMIN: { label: 'Administrateur', level: 30 },
    COORDINATEUR: { label: 'Coordinateur', level: 20 },
    CONSULTATION: { label: 'Consultation seule', level: 10 }
  },
  SETTINGS_DEFINITIONS: [
    { key: 'ASSEMBLEE', label: 'Nom de l’assemblée', type: 'text' },
    { key: 'RECO_POIDS_DISCOURS', label: 'Poids discours', type: 'number' }
  ],
  APP_CONFIG: { sheets: { history: 'HISTORIQUE' } },
  SERVER_CACHE_KEYS: { VERSION_DISPLAY_CONTEXT: 'VERSION_DISPLAY_CONTEXT_V1' },
  SERVER_CACHE_TTL_SECONDS: 60,
  Utilities: {
    DigestAlgorithm: { SHA_256: 'SHA_256' },
    Charset: { UTF_8: 'UTF_8' },
    computeDigest: (_algorithm, text) => digestBytes(text),
    formatDate: (date, _timezone, pattern) => formatDate(date, pattern)
  },
  Session: {
    getScriptTimeZone: () => 'America/Guadeloupe',
    getActiveUser: () => ({ getEmail: () => 'admin@example.test' })
  },
  assertAccess_: () => true,
  measureServerOperation_: (_operation, callback) => callback(),
  getCachedServerValue_: (_key, loader) => loader(),
  getCurrentUserAccess: () => ({ email: 'admin@example.test', role: 'ADMIN', active: true, canEdit: true, canAdminister: true }),
  requiredText_: (value, label) => {
    const text = String(value || '').trim();
    if (!text) throw new Error(`${label} est obligatoire.`);
    return text;
  },
  normalizeAccessEmail_: value => String(value || '').trim().toLowerCase(),
  normalizeText_: value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(),
  getDatabase_: () => { throw new Error('La base ne doit pas être appelée dans ces scénarios.'); },
  sheetRowsAsObjects_: () => [],
  listSpeakers: () => currentSpeakers ? clone(currentSpeakers) : (currentSpeaker ? [clone(currentSpeaker)] : []),
  listSpeakersWithCongregations_: () => currentSpeakers ? clone(currentSpeakers) : (currentSpeaker ? [clone(currentSpeaker)] : []),
  listCongregations: () => [{ id: 'C1', name: 'Basse-Terre', active: true, version: 'c1' }],
  listTalks: () => [{ number: 1, title: 'Premier discours', active: true, version: 't1' }, { number: 2, title: 'Deuxième discours', active: true, version: 't2' }],
  listPlannings: () => [],
  listPlanningsWithResources_: () => [],
  listHospitalities: () => [],
  listInvitations: () => [],
  getApplicationSettings: () => ({ settings: [{ key: 'ASSEMBLEE', value: 'Basse-Terre' }, { key: 'RECO_POIDS_DISCOURS', value: '40' }], settingsVersion: 'settings-v1' }),
  listAccessUsers_: () => [{ email: 'admin@example.test', name: 'Admin', role: 'ADMIN', active: true, version: 'user-v1' }],
  getSpeakerTalkNumbersMap_: () => ({ S1: [1] }),
  getSpeakerAvailabilityMap_: () => ({ S1: currentAvailabilityEntries.filter(item => item.active !== false).map(clone) }),
  listSpeakerAvailability_: () => clone(currentAvailabilityEntries),
  getEntityVersion_: entity => ({ version: `${entity}-v1`, updatedAt: '', updatedBy: '' }),
  logAction_: (action, entity, entityId, details) => actions.push({ action, entity, entityId, details })
};

vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, 'MergeEngine.gs'), 'utf8'), context);
vm.runInContext(fs.readFileSync(path.join(root, 'VersionHistory.gs'), 'utf8'), context);
context.readVersionHistoryRows_ = (entity, entityId) => clone(historyRows).filter(row => {
  if (entity && String(row.entity) !== String(entity)) return false;
  return entityId == null || String(row.entityId) === String(entityId);
});
context.writeConcurrentMergeEntity_ = (_definition, _entityId, candidate) => {
  writtenCandidate = clone(candidate);
  return clone(writeResult);
};

function speaker(values = {}) {
  return Object.assign({
    lastName: 'DUPONT', firstName: 'Jean', type: 'LOCAL', congregationId: 'C1',
    phone: '0590000000', email: 'jean@example.test', active: true, notes: ''
  }, values);
}
function row(rowNumber, timestamp, action, details) {
  return { rowNumber, timestamp, user: 'coordo@example.test', action, entity: 'ORATEUR', entityId: 'S1', details };
}
function currentRecord(definition, data, version = 'v-current') {
  return context.versionHistoryCurrentRecord_(definition, 'S1', 'Jean DUPONT', data, version);
}

const speakerDefinition = context.getConcurrentMergeDefinition_('ORATEUR');

// 1. Une création contenant uniquement l’état après doit produire une version actuelle unique.
{
  const state = speaker();
  const timeline = context.buildEntityVersionTimeline_(speakerDefinition, 'S1', [row(2, 1000, 'CREATION', { after: state, changedFields: Object.keys(state) })], currentRecord(speakerDefinition, state));
  assert.equal(timeline.versions.length, 1);
  assert.equal(timeline.versions[0].isCurrent, true);
  assert.equal(timeline.versions[0].number, 1);
}

// 2. Une modification avant/après doit créer deux versions ordonnées.
{
  const before = speaker();
  const after = speaker({ phone: '0590999999' });
  const timeline = context.buildEntityVersionTimeline_(speakerDefinition, 'S1', [row(3, 2000, 'MODIFICATION', { before, after, changedFields: ['phone'] })], currentRecord(speakerDefinition, after));
  assert.equal(timeline.versions.length, 2);
  assert.equal(timeline.versions[0].snapshot.phone, '0590000000');
  assert.equal(timeline.versions[1].snapshot.phone, '0590999999');
  assert.equal(timeline.currentVersionNumber, 2);
  assert.equal((timeline.versions[0].changedFields || []).join(','), '');
  assert.equal((timeline.versions[1].changedFields || []).join(','), 'phone');
}

// 3. Les instantanés consécutifs identiques doivent être dédupliqués.
{
  const first = speaker();
  const second = speaker({ phone: '0590111111' });
  const rows = [
    row(2, 1000, 'CREATION', { after: first, changedFields: ['lastName'] }),
    row(3, 2000, 'MODIFICATION', { before: first, after: second, changedFields: ['phone'] }),
    row(4, 3000, 'ARCHIVAGE', { before: second, after: second, changedFields: [] })
  ];
  const timeline = context.buildEntityVersionTimeline_(speakerDefinition, 'S1', rows, currentRecord(speakerDefinition, second));
  assert.equal(timeline.versions.length, 2);
}

// 4. Un retour ultérieur à une ancienne valeur doit constituer une nouvelle version.
{
  const first = speaker();
  const second = speaker({ notes: 'Version B' });
  const rows = [
    row(2, 1000, 'CREATION', { after: first, changedFields: [] }),
    row(3, 2000, 'MODIFICATION', { before: first, after: second, changedFields: ['notes'] }),
    row(4, 3000, 'RESTAURATION_VERSION', { before: second, after: first, changedFields: ['notes'] })
  ];
  const timeline = context.buildEntityVersionTimeline_(speakerDefinition, 'S1', rows, currentRecord(speakerDefinition, first));
  assert.equal(timeline.versions.length, 3);
  assert.equal(timeline.versions[2].snapshot.notes, '');
  assert.equal(timeline.versions[2].isCurrent, true);
}

// 5. L’état actuel doit être ajouté lorsqu’il diffère du dernier audit.
{
  const audited = speaker({ notes: 'Audité' });
  const current = speaker({ notes: 'Actuel hors audit' });
  const timeline = context.buildEntityVersionTimeline_(speakerDefinition, 'S1', [row(2, 1000, 'CREATION', { after: audited, changedFields: ['notes'] })], currentRecord(speakerDefinition, current));
  assert.equal(timeline.versions.length, 2);
  assert.equal(timeline.versions[1].source, 'CURRENT');
  assert.equal(timeline.versions[1].snapshot.notes, 'Actuel hors audit');
}

// 6. L’état actuel identique au dernier audit doit simplement marquer la dernière version.
{
  const audited = speaker({ notes: 'Identique' });
  const timeline = context.buildEntityVersionTimeline_(speakerDefinition, 'S1', [row(2, 1000, 'CREATION', { after: audited, changedFields: ['notes'] })], currentRecord(speakerDefinition, audited, 'v-identique'));
  assert.equal(timeline.versions.length, 1);
  assert.equal(timeline.versions[0].technicalVersion, 'v-identique');
}

// 7. La comparaison de champs simples doit exposer les libellés et valeurs formatées.
{
  const differences = context.compareVersionSnapshots_(speakerDefinition, speaker(), speaker({ phone: '0590222222', active: false }));
  assert.equal(differences.length, 2);
  assert.ok(differences.some(item => item.field === 'phone' && item.rightDisplay === '0590222222'));
  assert.ok(differences.some(item => item.field === 'active' && item.rightDisplay === 'Non'));
}

// 8. Les ensembles et collections doivent être lisibles dans la comparaison.
{
  const talksDefinition = context.getConcurrentMergeDefinition_('ORATEUR_DISCOURS');
  const talkDifferences = context.compareVersionSnapshots_(talksDefinition, { talkNumbers: [1] }, { talkNumbers: [1, 2] });
  assert.match(talkDifferences[0].rightDisplay, /N° 2 - Deuxième discours/);

  const availabilityDefinition = context.getConcurrentMergeDefinition_('ORATEUR_DISPONIBILITES');
  const availabilityDifferences = context.compareVersionSnapshots_(availabilityDefinition, { entries: [] }, {
    entries: [{ id: 'A1', type: 'PREFEREE', startDate: '2026-09-06', endDate: '2026-09-06', reason: 'Date idéale', active: true }]
  });
  assert.match(availabilityDifferences[0].rightDisplay, /PREFEREE - 06\/09\/2026 - Date idéale - Active/);
}

// 9. Les rôles de consultation et de restauration doivent être évalués correctement.
{
  assert.equal(context.versionHistoryRoleAllowed_('ADMIN', 'COORDINATEUR'), true);
  assert.equal(context.versionHistoryRoleAllowed_('CONSULTATION', 'COORDINATEUR'), false);
  assert.equal(context.versionHistoryViewRole_(speakerDefinition), 'CONSULTATION');
  assert.equal(context.versionHistoryViewRole_(context.getConcurrentMergeDefinition_('PARAMETRES')), 'ADMIN');
}

// 10. Une restauration fondée sur une version technique périmée doit être refusée sans écriture.
{
  const oldState = speaker({ notes: 'Ancienne version' });
  const currentState = speaker({ notes: 'Version actuelle' });
  currentSpeaker = Object.assign({ id: 'S1', fullName: 'Jean DUPONT', version: 'v-current' }, currentState);
  historyRows = [row(2, 1000, 'CREATION', { after: oldState, changedFields: ['notes'] }), row(3, 2000, 'MODIFICATION', { before: oldState, after: currentState, changedFields: ['notes'] })];
  writtenCandidate = null;
  const timeline = context.getEntityVersionTimeline('ORATEUR', 'S1');
  const target = timeline.versions.find(item => !item.isCurrent);
  const result = context.restoreEntityVersion({ entity: 'ORATEUR', entityId: 'S1', versionId: target.id, expectedCurrentVersion: 'v-obsolete' });
  assert.equal(result.stale, true);
  assert.equal(writtenCandidate, null);
}

// 11. Une restauration valide doit réutiliser l’écriture métier et créer une entrée d’audit.
{
  const oldState = speaker({ notes: 'Version restaurée' });
  const currentState = speaker({ notes: 'Version actuelle' });
  currentSpeaker = Object.assign({ id: 'S1', fullName: 'Jean DUPONT', version: 'v-current' }, currentState);
  historyRows = [row(2, 1000, 'CREATION', { after: oldState, changedFields: ['notes'] }), row(3, 2000, 'MODIFICATION', { before: oldState, after: currentState, changedFields: ['notes'] })];
  writeResult = { result: { id: 'S1', version: 'v-new' } };
  writtenCandidate = null;
  actions.length = 0;
  const timeline = context.getEntityVersionTimeline('ORATEUR', 'S1');
  const target = timeline.versions.find(item => !item.isCurrent);
  const result = context.restoreEntityVersion({ entity: 'ORATEUR', entityId: 'S1', versionId: target.id, expectedCurrentVersion: 'v-current' });
  assert.equal(result.saved, true);
  assert.equal(writtenCandidate.notes, 'Version restaurée');
  assert.ok(actions.some(item => item.action === 'RESTAURATION_VERSION'));
}

// 12. Une restauration de programmation nécessitant une confirmation doit retourner la validation métier.
{
  const oldState = speaker({ notes: 'Cible' });
  const currentState = speaker({ notes: 'Actuel' });
  currentSpeaker = Object.assign({ id: 'S1', fullName: 'Jean DUPONT', version: 'v-current' }, currentState);
  historyRows = [row(2, 1000, 'CREATION', { after: oldState, changedFields: ['notes'] }), row(3, 2000, 'MODIFICATION', { before: oldState, after: currentState, changedFields: ['notes'] })];
  writeResult = { validation: { saved: false, requiresConfirmation: true, warnings: ['Avertissement métier'] } };
  const timeline = context.getEntityVersionTimeline('ORATEUR', 'S1');
  const target = timeline.versions.find(item => !item.isCurrent);
  const result = context.restoreEntityVersion({ entity: 'ORATEUR', entityId: 'S1', versionId: target.id, expectedCurrentVersion: 'v-current' });
  assert.equal(result.saved, false);
  assert.equal(result.validation.requiresConfirmation, true);
}

// 13. Un administrateur ne peut pas restaurer une version qui désactive son propre accès.
{
  const userDefinition = context.getConcurrentMergeDefinition_('UTILISATEUR');
  const oldUser = { name: 'Admin', role: 'ADMIN', active: false };
  const currentUser = { name: 'Admin', role: 'ADMIN', active: true };
  context.listAccessUsers_ = () => [{ email: 'admin@example.test', name: 'Admin', role: 'ADMIN', active: true, version: 'user-v1' }];
  historyRows = [{ rowNumber: 2, timestamp: 1000, user: 'admin@example.test', action: 'CREATION', entity: 'UTILISATEUR', entityId: 'admin@example.test', details: { after: oldUser, changedFields: ['active'] } }, { rowNumber: 3, timestamp: 2000, user: 'admin@example.test', action: 'MODIFICATION', entity: 'UTILISATEUR', entityId: 'admin@example.test', details: { before: oldUser, after: currentUser, changedFields: ['active'] } }];
  const timeline = context.buildEntityVersionTimeline_(userDefinition, 'admin@example.test', historyRows, context.versionHistoryCurrentRecord_(userDefinition, 'admin@example.test', 'Admin', currentUser, 'user-v1'));
  const target = timeline.versions.find(item => item.snapshot.active === false);
  assert.throws(() => context.restoreEntityVersion({ entity: 'UTILISATEUR', entityId: 'admin@example.test', versionId: target.id, expectedCurrentVersion: 'user-v1' }), /propre accès administrateur/);
}


// 14. L’état courant des disponibilités doit conserver aussi les périodes désactivées.
{
  currentSpeaker = null;
  currentSpeakers = [{
    id: 'S1', fullName: 'Jean DUPONT', lastName: 'DUPONT', firstName: 'Jean',
    type: 'LOCAL', congregationId: 'C1', active: true, version: 'speaker-v1'
  }];
  currentAvailabilityEntries = [{
    id: 'A1', speakerId: 'S1', type: 'A_EVITER', startDate: '2026-10-04', endDate: '2026-10-04',
    reason: 'Ancienne préférence', active: false
  }];
  const definition = context.getConcurrentMergeDefinition_('ORATEUR_DISPONIBILITES');
  const records = context.listCurrentVersionHistoryRecords_(definition);
  assert.equal(records.length, 1);
  assert.equal(records[0].data.entries.length, 1);
  assert.equal(records[0].data.entries[0].active, false);
}

// 15. La liste paginée doit construire les chronologies uniquement pour la page demandée.
{
  currentAvailabilityEntries = [];
  currentSpeakers = Array.from({ length: 5 }, (_value, index) => ({
    id: 'S' + (index + 1),
    fullName: 'Orateur ' + (index + 1),
    lastName: 'ORATEUR ' + (index + 1),
    firstName: '', type: 'LOCAL', congregationId: 'C1', phone: '', email: '', active: true, notes: '',
    version: 'speaker-v' + (index + 1)
  }));
  historyRows = [];
  const originalBuild = context.buildEntityVersionTimeline_;
  let buildCount = 0;
  context.buildEntityVersionTimeline_ = function () {
    buildCount += 1;
    return originalBuild.apply(null, arguments);
  };
  const page = context.listVersionHistoryRecords('ORATEUR', '', { offset: 1, limit: 2 });
  assert.equal(page.records.length, 2);
  assert.equal(page.totalCount, 5);
  assert.equal(page.offset, 1);
  assert.equal(page.nextOffset, 3);
  assert.equal(page.hasMore, true);
  assert.equal(buildCount, 2);
  const legacy = context.listVersionHistoryRecords('ORATEUR', '');
  assert.equal(Array.isArray(legacy), true);
  assert.equal(legacy.length, 5);
  context.buildEntityVersionTimeline_ = originalBuild;
}

// 16. Les paramètres de pagination doivent être bornés côté serveur.
{
  const request = context.normalizeVersionHistoryListRequest_({ offset: -8, limit: 1000 });
  assert.equal(request.offset, 0);
  assert.equal(request.limit, 100);
  assert.equal(request.paged, true);
}

console.log('Tests de l’historique des versions réussis : 16 scénarios contrôlés.');
