import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve('apps-script');
const source = ['RulesEngine.gs', 'RecommendationEngine.gs', 'ConflictResolution.gs']
  .map(file => fs.readFileSync(path.join(root, file), 'utf8'))
  .join('\n');

const context = {
  console,
  Session: { getScriptTimeZone: () => 'America/Guadeloupe' },
  Utilities: {
    formatDate(date, timezone, pattern) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return pattern === 'yyyy-MM-dd' ? `${year}-${month}-${day}` : `${day}/${month}/${year}`;
    }
  },
  getSetting_: key => key === 'ALERTE_REPETITION_MOIS' ? '12' : ({
    RECO_POIDS_DISCOURS: '40',
    RECO_POIDS_ANCIENNETE: '30',
    RECO_POIDS_MOIS: '15',
    RECO_POIDS_LOCAL: '10',
    RECO_POIDS_EQUILIBRE: '5'
  }[key] || ''),
  getSpeakerTalkNumbers_: (speakerId, map) => (map && map[speakerId]) || [],
  getSpeakerTalkNumbersMap_: () => ({}),
  listSpeakers: () => [],
  listTalks: () => [],
  listCongregations: () => [],
  listPlannings: () => [],
  assertEditAccess_: () => true,
  normalizePlanningPayload_: value => value
};
vm.createContext(context);
vm.runInContext(source, context);

const dataset = {
  speakers: [
    { id: 's1', fullName: 'Jean Local', lastName: 'Local', type: 'LOCAL', active: true, congregationId: 'c1', congregationName: 'Basse-Terre' },
    { id: 's2', fullName: 'Paul Extérieur', lastName: 'Extérieur', type: 'EXTERIEUR', active: true, congregationId: 'c2', congregationName: 'Gourbeyre' },
    { id: 's3', fullName: 'Marc Local', lastName: 'Local', type: 'LOCAL', active: true, congregationId: 'c1', congregationName: 'Basse-Terre' },
    { id: 'archived', fullName: 'Ancien Orateur', lastName: 'Orateur', type: 'LOCAL', active: false, congregationId: 'c1', congregationName: 'Basse-Terre' }
  ],
  talks: [
    { number: 1, title: 'La confiance', active: true },
    { number: 2, title: 'Le courage', active: true },
    { number: 3, title: 'La paix', active: true },
    { number: 59, title: 'Inactif', active: false }
  ],
  congregations: [
    { id: 'c1', name: 'Basse-Terre', coordinator: 'A', active: true },
    { id: 'c2', name: 'Gourbeyre', coordinator: 'B', active: true },
    { id: 'old', name: 'Ancienne', coordinator: '', active: false }
  ],
  plannings: [
    { id: 'p1', date: '2099-08-02', displayDate: '02/08/2099', time: '10:00', speakerId: 's1', speakerName: 'Jean Local', talkNumber: 1, status: 'PROGRAMME' },
    { id: 'p2', date: '2098-01-05', displayDate: '05/01/2098', time: '10:00', speakerId: 's2', speakerName: 'Paul Extérieur', talkNumber: 2, status: 'PROGRAMME' }
  ],
  speakerTalks: { s2: [2, 3] },
  repetitionMonths: 12
};

function resolve(planning) {
  const evaluation = context.evaluatePlanningRules_(planning, dataset);
  return context.buildPlanningConflictResolution_(planning, evaluation, dataset);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const slot = resolve({ id: '', date: '2099-08-02', time: '10:00', speakerId: 's3', talkNumber: 2, originCongregationId: '', status: 'PROGRAMME' });
assert(slot.blocked, 'Le conflit de créneau doit bloquer.');
assert(slot.suggestions.some(item => item.type === 'DATE'), 'Une autre date doit être proposée.');
assert(!slot.suggestions.some(item => item.type === 'SPEAKER'), 'Changer uniquement l’orateur ne doit pas résoudre un créneau occupé.');

const externalTalk = resolve({ id: '', date: '2099-08-09', time: '10:00', speakerId: 's2', talkNumber: 1, originCongregationId: 'c2', status: 'PROGRAMME' });
assert(externalTalk.blocked, 'Le discours non déclaré doit bloquer.');
assert(externalTalk.suggestions.some(item => item.type === 'SPEAKER'), 'Un autre orateur doit être proposé.');
assert(externalTalk.suggestions.some(item => item.type === 'TALK'), 'Un autre discours déclaré doit être proposé.');

const multiple = resolve({ id: '', date: '2099-08-02', time: '10:00', speakerId: 'archived', talkNumber: 2, originCongregationId: '', status: 'PROGRAMME' });
assert(multiple.blocked, 'Les erreurs cumulées doivent bloquer.');
assert(multiple.suggestions.some(item => item.type === 'COMBINATION' && item.changes.date && item.changes.speakerId), 'Une solution date + orateur doit être trouvée.');

const congregation = resolve({ id: '', date: '2099-08-09', time: '10:00', speakerId: 's1', talkNumber: 2, originCongregationId: 'old', status: 'PROGRAMME' });
assert(congregation.suggestions.some(item => item.type === 'CONGREGATION'), 'Une assemblée active ou la suppression de la valeur doit être proposée.');

const fourWay = resolve({ id: '', date: '2099-08-02', time: '10:00', speakerId: 'archived', talkNumber: 59, originCongregationId: 'old', status: 'PROGRAMME' });
assert(fourWay.suggestions.some(item => item.type === 'COMBINATION' && item.changeCount === 4), 'Une combinaison à quatre ajustements doit résoudre quatre blocages indépendants.');

const valid = resolve({ id: '', date: '2099-08-09', time: '10:00', speakerId: 's1', talkNumber: 2, originCongregationId: 'c1', status: 'PROGRAMME' });
assert(!valid.blocked && valid.suggestions.length === 0, 'Une programmation valide ne doit pas déclencher de correction.');

console.log('Tests de résolution des conflits réussis : 6 scénarios exécutés.');
