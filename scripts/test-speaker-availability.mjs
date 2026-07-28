import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve('apps-script');
let uuidCounter = 0;
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
  isNaN,
  Session: { getScriptTimeZone: () => 'America/Guadeloupe' },
  Utilities: {
    formatDate(date, timezone, pattern) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return pattern === 'yyyy-MM-dd' ? `${year}-${month}-${day}` : `${day}/${month}/${year}`;
    }
  },
  getSetting_: key => ({
    ALERTE_REPETITION_MOIS: '12',
    RECO_POIDS_DISCOURS: '40',
    RECO_POIDS_ANCIENNETE: '30',
    RECO_POIDS_MOIS: '15',
    RECO_POIDS_LOCAL: '10',
    RECO_POIDS_EQUILIBRE: '5',
    RECO_BONUS_DATE_PREFEREE: '10',
    RECO_MALUS_DATE_A_EVITER: '18'
  }[key] || ''),
  newId_: () => `AV-${++uuidCounter}`,
  requiredText_: (value, label) => {
    const text = String(value || '').trim();
    if (!text) throw new Error(`${label} est obligatoire.`);
    return text;
  },
  booleanValue_: value => value === true || String(value).toUpperCase() === 'TRUE' || String(value).toUpperCase() === 'OUI',
  sheetRowsAsObjects_: () => [],
  getDatabase_: () => { throw new Error('La base ne doit pas être appelée pendant ces scénarios.'); },
  getSpeaker: speakerId => ({ id: speakerId, fullName: speakerId, active: true }),
  getEntityVersion_: () => ({ version: 'v1', updatedAt: '', updatedBy: '' }),
  assertEntityVersion_: () => true,
  advanceEntityVersion_: () => ({ version: 'v2' }),
  assertEditAccess_: () => true,
  LockService: { getScriptLock: () => ({ waitLock: () => {}, releaseLock: () => {} }) },
  logAction_: () => {},
  buildAuditDetails_: () => ({}),
  listSpeakers: () => [],
  listTalks: () => [],
  listCongregations: () => [],
  listPlannings: () => [],
  getSpeakerTalkNumbersMap_: () => ({})
};
vm.createContext(context);
const source = ['SpeakerAvailability.gs', 'RulesEngine.gs', 'RecommendationEngine.gs']
  .map(file => fs.readFileSync(path.join(root, file), 'utf8'))
  .join('\n');
vm.runInContext(source, context);

const map = {
  blocked: [{ id: 'B1', speakerId: 'blocked', type: 'INDISPONIBLE', startDate: '2026-08-02', endDate: '2026-08-02', reason: 'Déplacement', active: true }],
  only: [{ id: 'O1', speakerId: 'only', type: 'DISPONIBLE_SEULEMENT', startDate: '2026-08-09', endDate: '2026-08-16', reason: '', active: true }],
  flexible: [
    { id: 'P1', speakerId: 'flexible', type: 'PREFEREE', startDate: '2026-08-09', endDate: '2026-08-09', reason: 'Date idéale', active: true },
    { id: 'A1', speakerId: 'flexible', type: 'A_EVITER', startDate: '2026-08-16', endDate: '2026-08-16', reason: 'Retour tardif', active: true }
  ]
};

const blocked = context.evaluateSpeakerAvailability_('blocked', '2026-08-02', map);
assert.equal(blocked.blocked, true, 'Une période INDISPONIBLE doit bloquer.');
assert.equal(blocked.status, 'INDISPONIBLE');
assert.match(blocked.message, /indisponible/);

const outsideOnly = context.evaluateSpeakerAvailability_('only', '2026-08-02', map);
assert.equal(outsideOnly.blocked, true, 'Une date hors des fenêtres DISPONIBLE_SEULEMENT doit bloquer.');
assert.equal(outsideOnly.status, 'HORS_PERIODE_AUTORISEE');

const insideOnly = context.evaluateSpeakerAvailability_('only', '2026-08-09', map);
assert.equal(insideOnly.blocked, false, 'Une date comprise dans une fenêtre autorisée doit rester possible.');
assert.equal(insideOnly.status, 'DISPONIBLE_SEULEMENT');

const preferred = context.evaluateSpeakerAvailability_('flexible', '2026-08-09', map);
assert.equal(preferred.preferred, true, 'Une période PREFEREE doit être détectée.');
assert.equal(preferred.blocked, false);

const avoid = context.evaluateSpeakerAvailability_('flexible', '2026-08-16', map);
assert.equal(avoid.avoid, true, 'Une période A_EVITER doit être détectée.');
assert.equal(avoid.blocked, false);

const normalized = context.normalizeSpeakerAvailabilityEntries_('speaker', [
  { type: 'PREFEREE', startDate: '2026-09-01', endDate: '2026-09-03', reason: 'Disponible' }
]);
assert.equal(normalized.length, 1);
assert.equal(normalized[0].id, 'AV-1', 'Le serveur doit attribuer un identifiant stable à une nouvelle période.');
assert.throws(() => context.normalizeSpeakerAvailabilityEntries_('speaker', [
  { type: 'INDISPONIBLE', startDate: '2026-09-04', endDate: '2026-09-01' }
]), /date de fin/, 'Une période inversée doit être refusée.');
assert.throws(() => context.normalizeSpeakerAvailabilityEntries_('speaker', [
  { type: 'PREFEREE', startDate: '2026-09-01', endDate: '2026-09-03' },
  { type: 'PREFEREE', startDate: '2026-09-01', endDate: '2026-09-03' }
]), /identiques/, 'Deux périodes identiques doivent être refusées.');

const speakers = [
  { id: 'blocked', fullName: 'Orateur Bloqué', lastName: 'Bloqué', type: 'LOCAL', active: true, congregationId: 'C1', congregationName: 'Basse-Terre' },
  { id: 'only', fullName: 'Orateur Fenêtre', lastName: 'Fenêtre', type: 'LOCAL', active: true, congregationId: 'C1', congregationName: 'Basse-Terre' },
  { id: 'flexible', fullName: 'Orateur Flexible', lastName: 'Flexible', type: 'LOCAL', active: true, congregationId: 'C1', congregationName: 'Basse-Terre' }
];
const baseDataset = {
  speakers,
  talks: [{ number: 1, title: 'Discours', active: true }],
  congregations: [{ id: 'C1', name: 'Basse-Terre', active: true }],
  plannings: [{ id: 'H1', date: '2026-07-26', displayDate: '26/07/2026', time: '10:00', speakerId: 'flexible', speakerName: 'Orateur Flexible', talkNumber: 1, status: 'PROGRAMME' }],
  speakerTalks: {},
  speakerAvailability: map,
  repetitionMonths: 12,
  recommendationWeights: {
    talk: 40, recency: 30, month: 15, local: 10, balance: 5, total: 100,
    _speakerAvailability: map,
    _availabilityAdjustments: { preferredBonus: 10, avoidPenalty: 18 }
  }
};

function evaluate(speakerId, date) {
  return context.evaluatePlanningRules_({
    id: '', date, time: '10:00', speakerId, talkNumber: 1,
    status: 'PROGRAMME', originCongregationId: '', notes: ''
  }, baseDataset);
}

assert.ok(evaluate('blocked', '2026-08-02').errors.some(item => item.id === 'PLAN_008'), 'PLAN_008 doit bloquer un orateur indisponible.');
assert.ok(evaluate('only', '2026-08-02').errors.some(item => item.id === 'PLAN_008'), 'PLAN_008 doit bloquer une date hors fenêtre autorisée.');
assert.ok(!evaluate('only', '2026-08-09').errors.some(item => item.id === 'PLAN_008'), 'Une date autorisée ne doit pas déclencher PLAN_008.');
assert.ok(evaluate('flexible', '2026-08-09').infos.some(item => item.id === 'PLAN_010'), 'PLAN_010 doit signaler une date préférée.');
assert.ok(evaluate('flexible', '2026-08-16').warnings.some(item => item.id === 'PLAN_009'), 'PLAN_009 doit avertir sur une date à éviter.');

function recommendationFor(date) {
  return context.getSpeakerRecommendationsWithData_({ date, talkNumber: 1 }, baseDataset);
}
const preferredRecommendations = recommendationFor('2026-08-09').recommendations;
const neutralRecommendations = recommendationFor('2026-08-23').recommendations;
const avoidRecommendations = recommendationFor('2026-08-16').recommendations;
assert.ok(!recommendationFor('2026-08-02').recommendations.some(item => item.speakerId === 'blocked'), 'Un orateur indisponible doit être exclu des recommandations.');
const preferredScore = preferredRecommendations.find(item => item.speakerId === 'flexible').score;
const neutralScore = neutralRecommendations.find(item => item.speakerId === 'flexible').score;
const avoidScore = avoidRecommendations.find(item => item.speakerId === 'flexible').score;
assert.ok(preferredScore > neutralScore, 'Une date préférée doit augmenter le score.');
assert.ok(avoidScore < neutralScore, 'Une date à éviter doit diminuer le score.');
assert.ok(!neutralRecommendations.some(item => item.speakerId === 'only'), 'Un orateur hors de sa fenêtre autorisée doit être exclu.');

console.log('Tests des disponibilités des orateurs réussis : 15 scénarios contrôlés.');
