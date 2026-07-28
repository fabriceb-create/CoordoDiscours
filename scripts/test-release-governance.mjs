import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve('apps-script');
let assertions = 0;
const now = new Date('2026-07-28T12:00:00.000Z');

function signedDigest(text) {
  return Array.from(crypto.createHash('sha256').update(String(text)).digest()).map(value => value > 127 ? value - 256 : value);
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
  APP_CONFIG: { name: 'CoordoDiscours', version: '1.14 Stable', sheets: {} },
  Utilities: {
    DigestAlgorithm: { SHA_256: 'SHA_256' },
    Charset: { UTF_8: 'UTF_8' },
    computeDigest: (_algorithm, text) => signedDigest(text),
    formatDate: date => new Date(date).toISOString().slice(0, 10)
  },
  Session: { getScriptTimeZone: () => 'America/Guadeloupe' },
  sanitizeSupportText_: (value, max) => String(value || '').replace(/\s+/g, ' ').trim().slice(0, max || 120),
  requiredText_: (value, label) => {
    const text = String(value || '').trim();
    if (!text) throw new Error(`${label} est obligatoire.`);
    return text;
  }
};
vm.createContext(context);
const governanceSource = fs.readFileSync(path.join(root, 'ReleaseGovernance.gs'), 'utf8') + `
this.__governanceConstants = { RELEASE_ACTION_SOURCES, RELEASE_ACTION_STATUSES, RELEASE_ENVIRONMENTS, RELEASE_DECISION_TYPES, RELEASE_DEVICE_TYPES, RELEASE_DEVICE_STATUSES, RELEASE_DEVICE_TESTS };`;
vm.runInContext(governanceSource, context, { filename: 'ReleaseGovernance.gs' });
const governance = context.__governanceConstants;

function check(condition, message) {
  assertions += 1;
  assert.ok(condition, message);
}

// 1. Les dictionnaires de gouvernance doivent rester complets.
{
  assert.deepEqual(Object.keys(governance.RELEASE_ACTION_SOURCES), ['RAPPORT', 'MANUEL']);
  assert.deepEqual(Object.keys(governance.RELEASE_ACTION_STATUSES), ['A_FAIRE', 'EN_COURS', 'TERMINEE', 'RISQUE_ACCEPTE', 'ANNULEE']);
  assert.deepEqual(Object.keys(governance.RELEASE_ENVIRONMENTS), ['RECETTE', 'PRODUCTION']);
  assert.deepEqual(Object.keys(governance.RELEASE_DECISION_TYPES), ['APPROVED', 'POSTPONED', 'DEPLOYED', 'ROLLED_BACK']);
  assert.equal(governance.RELEASE_DEVICE_TESTS.length, 5);
  assertions += 5;
}

// 2. La recette multi-écrans ne passe que si les 15 contrôles réussissent.
{
  const entries = [];
  for (const device of Object.keys(governance.RELEASE_DEVICE_TYPES)) {
    for (const test of governance.RELEASE_DEVICE_TESTS) entries.push({ device, testId: test.id, status: 'REUSSI' });
  }
  const complete = context.releaseDeviceAcceptanceSummary_(entries);
  assert.equal(complete.total, 15);
  assert.equal(complete.complete, true);
  assert.equal(complete.status, 'PASS');
  entries[0].status = 'A_TESTER';
  assert.equal(context.releaseDeviceAcceptanceSummary_(entries).status, 'WARNING');
  entries[0].status = 'ECHEC';
  assert.equal(context.releaseDeviceAcceptanceSummary_(entries).status, 'BLOCKING');
  assertions += 5;
}

// 3. La normalisation de la matrice refuse les contrôles manquants, dupliqués ou inconnus.
{
  const valid = [];
  for (const device of Object.keys(governance.RELEASE_DEVICE_TYPES)) {
    for (const test of governance.RELEASE_DEVICE_TESTS) valid.push({ device, testId: test.id, status: 'A_TESTER', comment: '' });
  }
  assert.equal(context.normalizeReleaseDeviceAcceptanceEntries_(valid).length, 15);
  assert.throws(() => context.normalizeReleaseDeviceAcceptanceEntries_(valid.slice(1)), /exactement 15/i);
  const duplicate = valid.map(item => ({ ...item }));
  duplicate[14] = { ...duplicate[0] };
  assert.throws(() => context.normalizeReleaseDeviceAcceptanceEntries_(duplicate), /dupliqué/i);
  const unknown = valid.map(item => ({ ...item }));
  unknown[0].status = 'INCONNU';
  assert.throws(() => context.normalizeReleaseDeviceAcceptanceEntries_(unknown), /résultat du test/i);
  assertions += 4;
}

// 4. Le classement des priorités doit placer une action bloquante avant les autres.
{
  assert.equal(context.releaseCorrectiveActionPriorityRank_('BLOQUANTE'), 0);
  assert.equal(context.releaseCorrectiveActionPriorityRank_('HAUTE'), 1);
  assert.equal(context.releaseCorrectiveActionPriorityRank_('NORMALE'), 2);
  assert.equal(context.releaseCorrectiveActionPriorityRank_('INCONNUE'), 9);
  assert.equal(context.releaseCorrectiveActionSuppressesResync_('RISQUE_ACCEPTE'), true);
  assert.equal(context.releaseCorrectiveActionSuppressesResync_('TERMINEE'), false);
  assertions += 6;
}

// 6. Le résumé des actions doit isoler les actions bloquantes et échues.
{
  const actions = [
    { priority: 'BLOQUANTE', status: 'A_FAIRE', dueDate: '2020-01-01' },
    { priority: 'HAUTE', status: 'EN_COURS', dueDate: '' },
    { priority: 'NORMALE', status: 'TERMINEE', dueDate: '2020-01-01' },
    { priority: 'BLOQUANTE', status: 'RISQUE_ACCEPTE', dueDate: '2020-01-01' }
  ];
  const summary = context.releaseCorrectiveActionSummary_(actions);
  assert.equal(summary.active, 2);
  assert.equal(summary.blockingOpen, 1);
  assert.equal(summary.highOpen, 1);
  assert.equal(summary.overdue, 1);
  assert.equal(summary.completed, 1);
  assert.equal(summary.riskAccepted, 1);
  assertions += 6;
}

// 6. Une approbation exige un rapport READY à 100/100, le bon mot et aucune action bloquante.
{
  const base = {
    request: { decision: 'APPROVED', confirmation: 'AUTORISER', reportFingerprint: 'abc' },
    decision: 'APPROVED',
    report: { status: 'READY', score: 100 },
    fingerprint: 'abc',
    actionSummary: { blockingOpen: 0 },
    decisions: []
  };
  assert.equal(context.validateReleaseDecisionRequest_(base), true);
  assert.throws(() => context.validateReleaseDecisionRequest_({ ...base, request: { ...base.request, reportFingerprint: '' } }), /empreinte du rapport/i);
  assert.throws(() => context.validateReleaseDecisionRequest_({ ...base, request: { ...base.request, confirmation: 'oui' } }), /AUTORISER/);
  assert.throws(() => context.validateReleaseDecisionRequest_({ ...base, report: { status: 'ATTENTION', score: 95 } }), /READY/);
  assert.throws(() => context.validateReleaseDecisionRequest_({ ...base, actionSummary: { blockingOpen: 1 } }), /bloquantes/);
  assert.throws(() => context.validateReleaseDecisionRequest_({ ...base, request: { ...base.request, reportFingerprint: 'ancien' } }), /rapport de santé a changé/i);
  assert.throws(() => context.validateReleaseDecisionRequest_({ ...base, decisions: [{ appVersion: '1.14 Stable', reportFingerprint: 'abc', environment: 'PRODUCTION', decision: 'APPROVED' }] }), /déjà été approuvé/i);
  assertions += 7;
}

// 7. Le report, le déploiement et le retour arrière ont des préconditions distinctes.
{
  const common = { report: { status: 'READY', score: 100 }, fingerprint: 'abc', actionSummary: { blockingOpen: 0 }, decisions: [] };
  assert.throws(() => context.validateReleaseDecisionRequest_({ ...common, decision: 'POSTPONED', request: { decision: 'POSTPONED', reason: '' } }), /motif du report/i);
  assert.throws(() => context.validateReleaseDecisionRequest_({ ...common, decision: 'DEPLOYED', request: { decision: 'DEPLOYED', confirmation: 'DEPLOYE', deploymentId: 'dep-1', reportFingerprint: 'abc' } }), /Aucune approbation/i);
  assert.throws(() => context.validateReleaseDecisionRequest_({ ...common, decision: 'DEPLOYED', request: { decision: 'DEPLOYED', confirmation: 'DEPLOYE', deploymentId: 'dep-1', reportFingerprint: 'abc', environment: 'PRODUCTION' }, decisions: [{ appVersion: '1.14 Stable', reportFingerprint: 'abc', environment: 'RECETTE', decision: 'APPROVED' }] }), /Aucune approbation/i);
  assert.equal(context.validateReleaseDecisionRequest_({ ...common, decision: 'DEPLOYED', request: { decision: 'DEPLOYED', confirmation: 'DEPLOYE', deploymentId: 'dep-1', reportFingerprint: 'abc' }, decisions: [{ appVersion: '1.14 Stable', reportFingerprint: 'abc', environment: 'PRODUCTION', decision: 'APPROVED' }] }), true);
  assert.throws(() => context.validateReleaseDecisionRequest_({ ...common, decision: 'ROLLED_BACK', request: { decision: 'ROLLED_BACK', confirmation: 'RETOUR', reason: 'Incident' } }), /Aucun déploiement antérieur/i);
  assert.equal(context.validateReleaseDecisionRequest_({ ...common, decision: 'ROLLED_BACK', request: { decision: 'ROLLED_BACK', confirmation: 'RETOUR', reason: 'Incident' }, decisions: [{ environment: 'PRODUCTION', decision: 'DEPLOYED' }] }), true);
  assertions += 6;
}

// 8. Le manifeste doit être déterministe et produire une empreinte SHA-256.
{
  const decision = {
    id: 'CD-DEPLOI-1', appVersion: '1.14 Stable', decision: 'APPROVED', reportReference: 'CD-SANTE-1', reportFingerprint: 'abc',
    reportStatus: 'READY', score: 100, environment: 'PRODUCTION', deploymentId: '', backupReference: 'backup.json', reason: '',
    decidedAt: '2026-07-28T12:00:00.000Z', decidedBy: 'admin@example.test'
  };
  const core = context.releaseDecisionManifestCore_(decision);
  const first = context.releaseGovernanceSha256_(JSON.stringify(core));
  const second = context.releaseGovernanceSha256_(JSON.stringify(core));
  assert.equal(first, second);
  assert.match(first, /^[a-f0-9]{64}$/);
  assertions += 2;
}

// 9. Le rapport annuel doit calculer occupation, équilibre, couverture et concentration.
{
  const speakers = [
    { id: 'S1', fullName: 'A', active: true, type: 'LOCAL' },
    { id: 'S2', fullName: 'B', active: true, type: 'LOCAL' },
    { id: 'S3', fullName: 'C', active: true, type: 'EXTERIEUR' },
    { id: 'S4', fullName: 'D', active: true, type: 'LOCAL' }
  ];
  const talks = Array.from({ length: 10 }, (_, index) => ({ number: index + 1, active: true }));
  const plannings = [
    ['2026-01-04','S1',1], ['2026-01-11','S1',2], ['2026-01-18','S1',3], ['2026-01-25','S1',4],
    ['2026-02-01','S2',1], ['2026-02-08','S2',5], ['2026-02-15','S3',6], ['2026-02-22','S4',7]
  ].map((row, index) => ({ id: `P${index}`, date: row[0], speakerId: row[1], talkNumber: row[2], status: 'PROGRAMME' }));
  const report = context.releaseGovernanceCapacityFromData_(2026, plannings, speakers, talks);
  assert.equal(report.metrics.planned, 8);
  assert.equal(report.metrics.usedSpeakers, 4);
  assert.equal(report.metrics.usedActiveTalks, 7);
  assert.equal(report.metrics.repeatedTalkAssignments, 1);
  assert.equal(report.meetingWeekday.label, 'Dimanche');
  check(report.metrics.balanceScore > 0 && report.metrics.balanceScore < 100, 'L’indice d’équilibre doit refléter la dispersion.');
  check(report.metrics.top20Share >= 0.5, 'La concentration du premier orateur doit être détectée.');
  assertions += 5;
}

// 10. Le plan d’archivage doit respecter le seuil d’âge et conserver les lignes récentes.
{
  const rows = [];
  for (let index = 0; index < 1200; index += 1) {
    const age = index < 200 ? 1000 : 10;
    rows.push([new Date(now.getTime() - age * 86400000), 'u', 'A', 'E', String(index), '{}']);
  }
  const plan = context.releaseHistoryArchivePlanFromRows_(rows, { olderThanDays: 730, keepLatestRows: 1000 }, now);
  assert.equal(plan.eligibleRows, 200);
  assert.equal(plan.physicalRows[0], 2);
  assert.equal(plan.physicalRows.at(-1), 201);
  assert.equal(plan.totalRows, 1200);
  assert.equal(plan.limited, false);
  assertions += 5;
}

// 11. Le dossier de support doit expurger les identifiants de la base et les détails des anomalies.
{
  const sanitized = context.releaseGovernanceSanitizeReport_({ checks: [
    { id: 'installation', details: { databaseId: 'secret', databaseUrl: 'https://secret', databaseName: 'Nom confidentiel', schemaVersion: '1.9.0' } },
    { id: 'integrity', details: { issues: [{ severity: 'ERREUR', code: 'X', message: 'Erreur', details: { secret: true } }] } }
  ] });
  assert.equal('databaseId' in sanitized.checks[0].details, false);
  assert.equal('databaseUrl' in sanitized.checks[0].details, false);
  assert.equal('databaseName' in sanitized.checks[0].details, false);
  assert.equal(JSON.stringify(sanitized.checks[1].details.issues[0]), JSON.stringify({ severity: 'ERREUR', code: 'X', message: 'Erreur' }));
  assertions += 4;
}

// 12. Le rapport de capacité expurgé ne doit contenir ni identifiant ni nom d’orateur.
{
  const sanitized = context.releaseGovernanceSanitizeCapacityReport_({
    year: 2026,
    generatedAt: '2026-07-28T12:00:00.000Z',
    meetingWeekday: { day: 0, label: 'Dimanche', inferredFromPlannings: true, observations: 8 },
    metrics: { planned: 8 },
    monthly: [{ month: 1, label: 'Janvier', count: 4 }],
    speakers: [{ speakerId: 'S1', speakerName: 'Nom confidentiel', count: 8 }],
    recommendations: ['Rééquilibrer'],
    formulas: { balanceScore: 'formule' }
  });
  assert.equal('speakers' in sanitized, false);
  assert.equal(JSON.stringify(sanitized).includes('Nom confidentiel'), false);
  assert.equal(sanitized.metrics.planned, 8);
  assertions += 3;
}

// 13. L’audit d’archivage ne doit pas exposer un identifiant Google Drive brut.
{
  const source = fs.readFileSync(path.join(root, 'ReleaseGovernance.gs'), 'utf8');
  assert.equal(source.includes('driveFileId'), false);
  assert.equal(source.includes('archiveSha256'), true);
  assertions += 2;
}

console.log(`Tests de gouvernance de mise en production réussis : ${assertions} contrôles exécutés.`);
