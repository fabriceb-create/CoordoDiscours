import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve('apps-script');
let remoteSpeaker = null;
let savedSpeaker = null;
const audit = [];

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
  SETTINGS_DEFINITIONS: [
    { key: 'ASSEMBLEE', label: 'Nom de l’assemblée', type: 'text' },
    { key: 'RECO_POIDS_DISCOURS', label: 'Poids discours', type: 'number' }
  ],
  assertAccess_: () => true,
  requiredText_: (value, label) => {
    const text = String(value || '').trim();
    if (!text) throw new Error(`${label} est obligatoire.`);
    return text;
  },
  normalizeAccessEmail_: value => String(value || '').trim().toLowerCase(),
  getSpeaker: () => JSON.parse(JSON.stringify(remoteSpeaker)),
  saveSpeaker: payload => {
    savedSpeaker = JSON.parse(JSON.stringify(payload));
    remoteSpeaker = Object.assign({}, remoteSpeaker, payload, { version: 'v3' });
    return JSON.parse(JSON.stringify(remoteSpeaker));
  },
  getCongregation: () => { throw new Error('Non utilisé.'); },
  getTalk: () => { throw new Error('Non utilisé.'); },
  listPlannings: () => [],
  listHospitalities: () => [],
  listInvitations: () => [],
  getApplicationSettings: () => ({ settings: [], settingsVersion: 'settings-v1' }),
  listAccessUsers_: () => [],
  getSpeakerTalkSelection: () => ({ talks: [], version: 'talks-v1' }),
  getSpeakerAvailabilitySchedule: () => ({ entries: [], version: 'availability-v1' }),
  saveCongregation: () => {},
  saveTalk: () => {},
  savePlanning: () => ({ saved: true }),
  setPlanningStatus_: () => {},
  saveHospitality: () => {},
  saveInvitation: () => {},
  saveApplicationSettings: () => {},
  saveAccessUser: () => {},
  saveSpeakerTalkSelection: () => {},
  saveSpeakerAvailabilitySchedule: () => {},
  logAction_: (action, entity, entityId, details) => audit.push({ action, entity, entityId, details })
};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, 'MergeEngine.gs'), 'utf8'), context);

function speaker(values = {}) {
  return Object.assign({
    lastName: 'DUPONT', firstName: 'Jean', type: 'LOCAL', congregationId: 'C1',
    phone: '0590000000', email: 'jean@example.test', active: true, notes: ''
  }, values);
}

const speakerDefinition = context.getConcurrentMergeDefinition_('ORATEUR');

// 1. Deux champs différents doivent être fusionnés automatiquement.
{
  const base = context.canonicalizeConcurrentMergeData_(speakerDefinition, speaker());
  const local = context.canonicalizeConcurrentMergeData_(speakerDefinition, speaker({ firstName: 'Jonathan' }));
  const remote = context.canonicalizeConcurrentMergeData_(speakerDefinition, speaker({ phone: '0590999999' }));
  const plan = context.buildConcurrentMergePlan_(speakerDefinition, base, local, remote);
  assert.equal(plan.conflicts.length, 0);
  assert.equal(plan.merged.firstName, 'Jonathan');
  assert.equal(plan.merged.phone, '0590999999');
}

// 2. Une modification identique des deux côtés ne doit pas devenir un conflit.
{
  const base = context.canonicalizeConcurrentMergeData_(speakerDefinition, speaker());
  const local = context.canonicalizeConcurrentMergeData_(speakerDefinition, speaker({ notes: 'Même note' }));
  const remote = context.canonicalizeConcurrentMergeData_(speakerDefinition, speaker({ notes: 'Même note' }));
  const plan = context.buildConcurrentMergePlan_(speakerDefinition, base, local, remote);
  assert.equal(plan.conflicts.length, 0);
  assert.equal(plan.merged.notes, 'Même note');
}

// 3. Un même champ modifié différemment doit demander un arbitrage.
let scalarConflictPlan;
{
  const base = context.canonicalizeConcurrentMergeData_(speakerDefinition, speaker());
  const local = context.canonicalizeConcurrentMergeData_(speakerDefinition, speaker({ notes: 'Ma note' }));
  const remote = context.canonicalizeConcurrentMergeData_(speakerDefinition, speaker({ notes: 'Note distante' }));
  scalarConflictPlan = context.buildConcurrentMergePlan_(speakerDefinition, base, local, remote);
  assert.equal(scalarConflictPlan.conflicts.length, 1);
  assert.equal(scalarConflictPlan.conflicts[0].field, 'notes');
  const localChoice = context.applyConcurrentMergeChoices_(speakerDefinition, scalarConflictPlan, { 'FIELD::notes': 'LOCAL' });
  const remoteChoice = context.applyConcurrentMergeChoices_(speakerDefinition, scalarConflictPlan, { 'FIELD::notes': 'REMOTE' });
  assert.equal(localChoice.notes, 'Ma note');
  assert.equal(remoteChoice.notes, 'Note distante');
}

// 4. Les listes de discours se fusionnent comme des ensembles.
{
  const definition = context.getConcurrentMergeDefinition_('ORATEUR_DISCOURS');
  const base = context.canonicalizeConcurrentMergeData_(definition, { talkNumbers: [1, 2] });
  const local = context.canonicalizeConcurrentMergeData_(definition, { talkNumbers: [1, 2, 3] });
  const remote = context.canonicalizeConcurrentMergeData_(definition, { talkNumbers: [2, 4] });
  const plan = context.buildConcurrentMergePlan_(definition, base, local, remote);
  assert.equal(plan.conflicts.length, 0);
  assert.deepEqual(Array.from(plan.merged.talkNumbers), [2, 3, 4]);
}

const availabilityDefinition = context.getConcurrentMergeDefinition_('ORATEUR_DISPONIBILITES');
const baseEntry = {
  id: 'A1', type: 'INDISPONIBLE', startDate: '2026-09-01', endDate: '2026-09-03', reason: 'Voyage', active: true
};

// 5. Deux sous-champs différents de la même période doivent être fusionnés.
{
  const base = context.canonicalizeConcurrentMergeData_(availabilityDefinition, { entries: [baseEntry] });
  const local = context.canonicalizeConcurrentMergeData_(availabilityDefinition, { entries: [Object.assign({}, baseEntry, { reason: 'Voyage professionnel' })] });
  const remote = context.canonicalizeConcurrentMergeData_(availabilityDefinition, { entries: [Object.assign({}, baseEntry, { active: false })] });
  const plan = context.buildConcurrentMergePlan_(availabilityDefinition, base, local, remote);
  assert.equal(plan.conflicts.length, 0);
  assert.equal(plan.merged.entries[0].reason, 'Voyage professionnel');
  assert.equal(plan.merged.entries[0].active, false);
}

// 6. Le même sous-champ d’une période modifié différemment doit être arbitré.
let collectionFieldPlan;
{
  const base = context.canonicalizeConcurrentMergeData_(availabilityDefinition, { entries: [baseEntry] });
  const local = context.canonicalizeConcurrentMergeData_(availabilityDefinition, { entries: [Object.assign({}, baseEntry, { reason: 'Motif local' })] });
  const remote = context.canonicalizeConcurrentMergeData_(availabilityDefinition, { entries: [Object.assign({}, baseEntry, { reason: 'Motif distant' })] });
  collectionFieldPlan = context.buildConcurrentMergePlan_(availabilityDefinition, base, local, remote);
  assert.equal(collectionFieldPlan.conflicts.length, 1);
  assert.equal(collectionFieldPlan.conflicts[0].strategy, 'COLLECTION_FIELD');
  const conflictId = collectionFieldPlan.conflicts[0].id;
  const resolved = context.applyConcurrentMergeChoices_(availabilityDefinition, collectionFieldPlan, { [conflictId]: 'LOCAL' });
  assert.equal(resolved.entries[0].reason, 'Motif local');
}

// 7. Une suppression concurrente à une modification doit être un conflit d’élément.
{
  const base = context.canonicalizeConcurrentMergeData_(availabilityDefinition, { entries: [baseEntry] });
  const local = context.canonicalizeConcurrentMergeData_(availabilityDefinition, { entries: [] });
  const remote = context.canonicalizeConcurrentMergeData_(availabilityDefinition, { entries: [Object.assign({}, baseEntry, { reason: 'Motif distant' })] });
  const plan = context.buildConcurrentMergePlan_(availabilityDefinition, base, local, remote);
  assert.equal(plan.conflicts.length, 1);
  assert.equal(plan.conflicts[0].strategy, 'COLLECTION_ITEM');
  const conflictId = plan.conflicts[0].id;
  const keepDeletion = context.applyConcurrentMergeChoices_(availabilityDefinition, plan, { [conflictId]: 'LOCAL' });
  const keepRemote = context.applyConcurrentMergeChoices_(availabilityDefinition, plan, { [conflictId]: 'REMOTE' });
  assert.equal(keepDeletion.entries.length, 0);
  assert.equal(keepRemote.entries[0].reason, 'Motif distant');
}

// 8. Deux nouvelles périodes distinctes doivent être conservées.
{
  const first = { id: '', type: 'PREFEREE', startDate: '2026-10-04', endDate: '2026-10-04', reason: 'Local', active: true };
  const second = { id: 'REMOTE-1', type: 'A_EVITER', startDate: '2026-10-11', endDate: '2026-10-11', reason: 'Distant', active: true };
  const base = context.canonicalizeConcurrentMergeData_(availabilityDefinition, { entries: [] });
  const local = context.canonicalizeConcurrentMergeData_(availabilityDefinition, { entries: [first] });
  const remote = context.canonicalizeConcurrentMergeData_(availabilityDefinition, { entries: [second] });
  const plan = context.buildConcurrentMergePlan_(availabilityDefinition, base, local, remote);
  assert.equal(plan.conflicts.length, 0);
  assert.equal(plan.merged.entries.length, 2);
}

// 9. La même nouvelle période avec deux motifs différents doit être arbitrée sans doublon.
{
  const localEntry = { id: '', type: 'PREFEREE', startDate: '2026-10-18', endDate: '2026-10-18', reason: 'Motif local', active: true };
  const remoteEntry = { id: 'REMOTE-2', type: 'PREFEREE', startDate: '2026-10-18', endDate: '2026-10-18', reason: 'Motif distant', active: true };
  const base = context.canonicalizeConcurrentMergeData_(availabilityDefinition, { entries: [] });
  const local = context.canonicalizeConcurrentMergeData_(availabilityDefinition, { entries: [localEntry] });
  const remote = context.canonicalizeConcurrentMergeData_(availabilityDefinition, { entries: [remoteEntry] });
  const plan = context.buildConcurrentMergePlan_(availabilityDefinition, base, local, remote);
  assert.ok(plan.conflicts.some(item => item.itemField === 'reason'));
  const choices = Object.fromEntries(plan.conflicts.map(item => [item.id, 'LOCAL']));
  const resolved = context.applyConcurrentMergeChoices_(availabilityDefinition, plan, choices);
  assert.equal(resolved.entries.length, 1);
  assert.equal(resolved.entries[0].reason, 'Motif local');
  assert.equal(resolved.entries[0].id, 'REMOTE-2', 'L’identifiant déjà créé sur le serveur doit être conservé.');
}

// 10. Le point d’entrée doit enregistrer automatiquement une fusion sans conflit.
{
  remoteSpeaker = Object.assign({ id: 'S1', version: 'v2' }, speaker({ phone: '0590111111' }));
  savedSpeaker = null;
  audit.length = 0;
  const response = context.prepareConcurrentMerge({
    entity: 'ORATEUR',
    entityId: 'S1',
    base: Object.assign({ id: 'S1', version: 'v1' }, speaker()),
    local: speaker({ firstName: 'Jonathan' })
  });
  assert.equal(response.saved, true);
  assert.equal(response.autoMerged, true);
  assert.equal(savedSpeaker.firstName, 'Jonathan');
  assert.equal(savedSpeaker.phone, '0590111111');
  assert.equal(savedSpeaker.version, 'v2');
  assert.ok(audit.some(item => item.action === 'FUSION_AUTOMATIQUE'));
}

// 11. Le point d’entrée doit retourner les valeurs à arbitrer sans écrire.
{
  remoteSpeaker = Object.assign({ id: 'S1', version: 'v4' }, speaker({ notes: 'Note distante' }));
  savedSpeaker = null;
  const response = context.prepareConcurrentMerge({
    entity: 'ORATEUR',
    entityId: 'S1',
    base: Object.assign({ id: 'S1', version: 'v1' }, speaker()),
    local: speaker({ notes: 'Ma note' })
  });
  assert.equal(response.requiresResolution, true);
  assert.equal(response.conflicts.length, 1);
  assert.equal(savedSpeaker, null);
}

console.log('Tests de fusion intelligente réussis : 11 scénarios contrôlés.');
