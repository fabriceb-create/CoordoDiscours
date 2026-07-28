import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import vm from 'node:vm';

let uuidCounter = 0;
let lockReleased = false;
const availabilityMap = {
  S1: [{ id: 'A1', speakerId: 'S1', type: 'INDISPONIBLE', startDate: '2026-08-16', endDate: '2026-08-16', reason: 'Déplacement', active: true }]
};
const baseDataset = {
  speakers: [
    { id: 'S1', fullName: 'Alice Local', lastName: 'Local', type: 'LOCAL', active: true, congregationId: 'C1', version: 's1' },
    { id: 'S2', fullName: 'Bruno Extérieur', lastName: 'Extérieur', type: 'EXTERIEUR', active: true, congregationId: 'C2', email: 'bruno@example.test', version: 's2' },
    { id: 'S3', fullName: 'Charles Local', lastName: 'Local', type: 'LOCAL', active: true, congregationId: 'C1', version: 's3' }
  ],
  talks: [
    { number: 1, title: 'Premier discours', active: true, version: 't1' },
    { number: 2, title: 'Deuxième discours', active: true, version: 't2' },
    { number: 3, title: 'Troisième discours', active: true, version: 't3' },
    { number: 4, title: 'Quatrième discours', active: true, version: 't4' }
  ],
  congregations: [
    { id: 'C1', name: 'Basse-Terre', active: true, version: 'c1' },
    { id: 'C2', name: 'Pointe-à-Pitre', active: true, version: 'c2' }
  ],
  plannings: [
    { id: 'P0', date: '2026-08-09', displayDate: '09/08/2026', time: '10:00', speakerId: 'S1', speakerName: 'Alice Local', talkNumber: 1, status: 'PROGRAMME', version: 'p0' },
    { id: 'P-OLD', date: '2025-01-05', displayDate: '05/01/2025', time: '10:00', speakerId: 'S3', speakerName: 'Charles Local', talkNumber: 2, status: 'PROGRAMME', version: 'pold' }
  ],
  speakerTalks: { S2: [2, 4] },
  speakerAvailability: availabilityMap,
  repetitionMonths: 12,
  recommendationWeights: {
    talk: 40, recency: 30, month: 15, local: 10, balance: 5, total: 100,
    _speakerAvailability: availabilityMap,
    _availabilityAdjustments: { preferredBonus: 10, avoidPenalty: 18 }
  },
  hospitalities: [],
  invitations: []
};

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function formatIso(date) { return date.toISOString().slice(0, 10); }
function availabilityEntries(dataset, speakerId) {
  const map = dataset.speakerAvailability || (dataset.recommendationWeights && dataset.recommendationWeights._speakerAvailability) || {};
  return map[speakerId] || [];
}
function isBlocked(dataset, speakerId, date) {
  const entries = availabilityEntries(dataset, speakerId).filter(entry => entry.active !== false);
  if (entries.some(entry => entry.type === 'INDISPONIBLE' && entry.startDate <= date && entry.endDate >= date)) return true;
  const only = entries.filter(entry => entry.type === 'DISPONIBLE_SEULEMENT');
  return Boolean(only.length && !only.some(entry => entry.startDate <= date && entry.endDate >= date));
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
  isNaN,
  Session: { getScriptTimeZone: () => 'America/Guadeloupe' },
  Utilities: {
    DigestAlgorithm: { SHA_256: 'sha256' },
    Charset: { UTF_8: 'utf8' },
    formatDate: date => formatIso(date),
    computeDigest: (_algorithm, text) => Array.from(crypto.createHash('sha256').update(String(text), 'utf8').digest()).map(byte => byte > 127 ? byte - 256 : byte),
    getUuid: () => `UUID-${++uuidCounter}`
  },
  LockService: {
    getScriptLock: () => ({
      waitLock: () => {},
      releaseLock: () => { lockReleased = true; }
    })
  },
  APP_CONFIG: { sheets: { events: 'PROGRAMMATIONS', invitations: 'INVITATIONS', hospitality: 'HOSPITALITE' } },
  assertEditAccess_: () => true,
  requiredText_: (value, label) => {
    const text = String(value || '').trim();
    if (!text) throw new Error(`${label} est obligatoire.`);
    return text;
  },
  getSetting_: key => ({ AUTO_PLAN_MOIS: '4', AUTO_PLAN_SUIVIS: 'OUI', HEURE_REUNION_DEFAUT: '10:00' }[key] || ''),
  getRecommendationWeights_: () => clone(baseDataset.recommendationWeights),
  buildPlanningRuleDataset_: () => clone(baseDataset),
  listHospitalities: () => clone(baseDataset.hospitalities),
  listInvitations: () => clone(baseDataset.invitations),
  normalizeText_: value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(),
  normalizePlanningPayload_: payload => {
    const talkNumber = Number(payload.talkNumber);
    if (!payload.date || !payload.time || !payload.speakerId || !Number.isFinite(talkNumber)) throw new Error('Programmation invalide.');
    return {
      id: String(payload.id || ''), version: String(payload.version || ''), date: String(payload.date), time: String(payload.time),
      speakerId: String(payload.speakerId), talkNumber, status: String(payload.status || 'PROGRAMME'),
      originCongregationId: String(payload.originCongregationId || ''), notes: String(payload.notes || '')
    };
  },
  ruleMessages_: items => (items || []).map(item => item.message),
  evaluatePlanningRules_: (planning, dataset) => {
    const errors = [];
    const warnings = [];
    const speaker = dataset.speakers.find(item => item.id === planning.speakerId);
    const talk = dataset.talks.find(item => Number(item.number) === Number(planning.talkNumber));
    if (!speaker || !speaker.active) errors.push({ id: 'PLAN_001', message: 'Orateur indisponible.' });
    if (speaker && isBlocked(dataset, speaker.id, planning.date)) errors.push({ id: 'PLAN_008', message: 'Orateur indisponible à cette date.' });
    if (!talk || !talk.active) errors.push({ id: 'PLAN_002', message: 'Discours indisponible.' });
    if (speaker && speaker.type === 'EXTERIEUR' && !(dataset.speakerTalks[speaker.id] || []).includes(Number(planning.talkNumber))) {
      errors.push({ id: 'PLAN_003', message: 'Discours non déclaré.' });
    }
    if (dataset.plannings.some(item => item.status !== 'ANNULE' && item.date === planning.date && item.time === planning.time && item.id !== planning.id)) {
      errors.push({ id: 'PLAN_005', message: 'Créneau occupé.' });
    }
    const eventDate = new Date(`${planning.date}T12:00:00Z`);
    const repeated = dataset.plannings.some(item => item.status !== 'ANNULE' && Number(item.talkNumber) === Number(planning.talkNumber) && item.date && (eventDate - new Date(`${item.date}T12:00:00Z`)) >= 0 && (eventDate - new Date(`${item.date}T12:00:00Z`)) < 365 * 86400000);
    if (repeated) warnings.push({ id: 'PLAN_007', message: 'Discours répété récemment.' });
    return { valid: errors.length === 0, errors, warnings, infos: [], rules: errors.concat(warnings) };
  },
  getSpeakerRecommendationsWithData_: (payload, dataset) => {
    const eventDate = new Date(`${payload.date}T12:00:00Z`);
    const counts = dataset.plannings.reduce((map, item) => { map[item.speakerId] = (map[item.speakerId] || 0) + 1; return map; }, {});
    const recommendations = dataset.speakers.filter(speaker => speaker.active)
      .filter(speaker => !isBlocked(dataset, speaker.id, payload.date))
      .filter(speaker => speaker.type !== 'EXTERIEUR' || (dataset.speakerTalks[speaker.id] || []).includes(Number(payload.talkNumber)))
      .map(speaker => {
        const previousDates = dataset.plannings.filter(item => item.speakerId === speaker.id && item.date).map(item => new Date(`${item.date}T12:00:00Z`)).filter(date => date <= eventDate).sort((a, b) => b - a);
        const months = previousDates.length ? Math.floor((eventDate - previousDates[0]) / 2629800000) : 24;
        const score = Math.max(45, Math.min(100, 96 - (counts[speaker.id] || 0) * 8 + Math.min(12, months)));
        return { speakerId: speaker.id, speakerName: speaker.fullName, type: speaker.type, congregationName: speaker.congregationId, score, reasons: ['Orateur compatible et disponible.'], cautions: [], eligible: true };
      }).sort((a, b) => b.score - a.score);
    return { ready: true, recommendations };
  },
  getDatabase_: () => { throw new Error('La base ne doit pas être appelée pendant le test de brouillon obsolète.'); },
  removeEntityVersion_: () => {},
  advanceEntityVersion_: () => ({ version: 'v' }),
  logAction_: () => {},
  buildAuditDetails_: () => ({})
};
vm.createContext(context);
vm.runInContext(fs.readFileSync(new URL('../apps-script/AutomaticPlanning.gs', import.meta.url), 'utf8'), context);

const dates = context.buildAutomaticPlanningDates_('2026-08-02', 1);
assert.equal(dates.length, 5, 'Un mois doit produire cinq dimanches dans ce scénario.');
assert.equal((new Date(`${dates[1]}T12:00:00Z`) - new Date(`${dates[0]}T12:00:00Z`)) / 86400000, 7, 'Les dates doivent être espacées de sept jours.');

const draft = context.generateAutomaticPlanningDraft({ startDate: '2026-08-02', time: '10:00', months: 1, createFollowUps: true });
assert.equal(draft.scenarios.length, 3, 'Trois scénarios doivent être générés.');
assert.ok(draft.sourceSignature.length === 64, 'La signature doit être un SHA-256 hexadécimal.');
assert.ok(draft.recommendedScenario, 'Un scénario doit être recommandé.');
for (const scenario of draft.scenarios) {
  assert.equal(scenario.skipped.length, 1, 'Le créneau déjà occupé doit être conservé et signalé.');
  assert.equal(scenario.items.length, 4, 'Les quatre autres créneaux doivent recevoir une proposition.');
  const slots = new Set(scenario.items.map(item => `${item.date}|${item.time}`));
  assert.equal(slots.size, scenario.items.length, 'Un scénario ne doit contenir aucun doublon de créneau.');
  for (const item of scenario.items) {
    if (item.speakerId === 'S2') assert.ok(baseDataset.speakerTalks.S2.includes(item.talkNumber), 'Un orateur extérieur doit recevoir uniquement un discours déclaré.');
    assert.ok(!(item.date === '2026-08-16' && item.speakerId === 'S1'), 'La planification automatique ne doit jamais retenir un orateur indisponible.');
  }
}

const modifiedDataset = clone(baseDataset);
modifiedDataset.plannings[0].version = 'p0-modified';
assert.notEqual(context.automaticPlanningDatasetSignature_(baseDataset), context.automaticPlanningDatasetSignature_(modifiedDataset), 'Une modification du planning doit invalider la signature.');
const modifiedAvailability = clone(baseDataset);
modifiedAvailability.recommendationWeights._speakerAvailability.S1[0].endDate = '2026-08-23';
assert.notEqual(context.automaticPlanningDatasetSignature_(baseDataset), context.automaticPlanningDatasetSignature_(modifiedAvailability), 'Une modification des disponibilités doit invalider le brouillon.');
const modifiedAdjustment = clone(baseDataset);
modifiedAdjustment.recommendationWeights._availabilityAdjustments.preferredBonus = 12;
assert.notEqual(context.automaticPlanningDatasetSignature_(baseDataset), context.automaticPlanningDatasetSignature_(modifiedAdjustment), 'Une modification du bonus de disponibilité doit invalider le brouillon.');

const followUps = context.buildAutomaticPlanningFollowUps_([
  { id: 'P1', item: { date: '2026-08-02' }, speaker: baseDataset.speakers[0] },
  { id: 'P2', item: { date: '2026-08-16' }, speaker: baseDataset.speakers[1] }
]);
assert.equal(followUps.invitations.length, 1, 'Seul l’orateur extérieur doit recevoir une invitation automatique.');
assert.equal(followUps.hospitalities.length, 1, 'Seul l’orateur extérieur doit recevoir une hospitalité automatique.');

assert.throws(() => context.assertAutomaticPlanningUniqueSlots_([
  { date: '2026-08-02', time: '10:00' },
  { date: '2026-08-02', time: '10:00' }
]), /deux propositions/, 'Les doublons de créneau doivent être bloqués.');

lockReleased = false;
assert.throws(() => context.commitAutomaticPlanningDraft({
  sourceSignature: 'signature-obsolete',
  scenario: 'BALANCED',
  createFollowUps: false,
  items: [{ date: '2026-08-02', time: '10:00', speakerId: 'S1', talkNumber: 2 }]
}, false), /AUTO_PLAN_OBSOLETE/, 'Un brouillon obsolète doit être refusé.');
assert.equal(lockReleased, true, 'Le verrou doit toujours être libéré après un refus.');

console.log('Tests de planification automatique réussis : 10 scénarios contrôlés.');
