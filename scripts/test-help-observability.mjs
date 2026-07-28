import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve('apps-script');
let assertions = 0;
let currentRole = 'ADMIN';
let currentLanguage = 'fr';
let settingsReads = 0;
const auditActions = [];

class MemoryCache {
  constructor() { this.values = new Map(); }
  get(key) { return this.values.has(key) ? this.values.get(key) : null; }
  put(key, value) { this.values.set(key, String(value)); }
  remove(key) { this.values.delete(key); }
  removeAll(keys) { (keys || []).forEach(key => this.values.delete(key)); }
  clear() { this.values.clear(); }
}

const cache = new MemoryCache();
const settingsSheet = {
  getLastRow: () => 4,
  getRange: () => ({
    getValues: () => {
      settingsReads += 1;
      return [
        ['ASSEMBLEE', 'Basse-Terre'],
        ['LANGUE_INTERFACE', currentLanguage],
        ['HORIZON_ACTIONS_JOURS', '14']
      ];
    }
  })
};

const roleDefinitions = {
  ADMIN: { label: 'Administrateur', level: 30 },
  COORDINATEUR: { label: 'Coordinateur', level: 20 },
  CONSULTATION: { label: 'Consultation seule', level: 10 }
};

function accessSnapshot() {
  return {
    email: currentRole === 'ADMIN' ? 'admin@example.test' : currentRole.toLowerCase() + '@example.test',
    role: currentRole,
    roleLabel: roleDefinitions[currentRole].label,
    active: true,
    canEdit: currentRole !== 'CONSULTATION',
    canAdminister: currentRole === 'ADMIN'
  };
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
  ACCESS_ROLES: roleDefinitions,
  APP_CONFIG: { name: 'CoordoDiscours', version: '1.12 Stable', sheets: { settings: 'PARAMETRES' } },
  CacheService: { getScriptCache: () => cache },
  getDatabase_: () => ({ getSheetByName: name => name === 'PARAMETRES' ? settingsSheet : null }),
  getCurrentUserAccess: () => accessSnapshot(),
  assertAccess_: minimumRole => {
    const actual = roleDefinitions[currentRole] || roleDefinitions.CONSULTATION;
    const expected = roleDefinitions[minimumRole] || roleDefinitions.CONSULTATION;
    if (actual.level < expected.level) throw new Error('Accès insuffisant');
    return accessSnapshot();
  },
  assertAdminAccess_: () => {
    if (currentRole !== 'ADMIN') throw new Error('Accès insuffisant');
    return accessSnapshot();
  },
  getInterfaceLanguage: () => currentLanguage,
  logAction_: (action, entity, entityId, details) => auditActions.push({ action, entity, entityId, details })
};

vm.createContext(context);
['ServerCache.gs', 'Performance.gs', 'Help.gs'].forEach(file => {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
});

function check(condition, message) {
  assertions += 1;
  assert.ok(condition, message);
}

// 1. Un même chargement doit être servi par le cache jusqu’à invalidation.
{
  cache.clear();
  let loads = 0;
  const first = context.getCachedServerValue_('TEST', () => ({ value: ++loads }), 60);
  const second = context.getCachedServerValue_('TEST', () => ({ value: ++loads }), 60);
  assert.equal(first.value, 1);
  assert.equal(second.value, 1);
  assert.equal(loads, 1);
  assertions += 3;
  context.invalidateServerCache_('TEST');
  const third = context.getCachedServerValue_('TEST', () => ({ value: ++loads }), 60);
  assert.equal(third.value, 2);
  assertions += 1;
}

// 2. L’instantané des paramètres doit éviter les lectures Google Sheets répétées.
{
  cache.clear();
  settingsReads = 0;
  const first = context.getSettingsSnapshot_();
  const second = context.getSettingsSnapshot_();
  assert.equal(first.ASSEMBLEE, 'Basse-Terre');
  assert.equal(second.HORIZON_ACTIONS_JOURS, '14');
  assert.equal(settingsReads, 1);
  assertions += 3;
  context.invalidateSettingsCache_();
  context.getSettingsSnapshot_();
  assert.equal(settingsReads, 2);
  assertions += 1;
}

// 3. Les invalidations de référentiels et de planning doivent viser les caches dépendants.
{
  cache.clear();
  ['PLANNING_OPTIONS', 'COMMUNICATION_OPTIONS', 'VERSION_DISPLAY_CONTEXT'].forEach(key => {
    context.getCachedServerValue_(context.SERVER_CACHE_KEYS ? context.SERVER_CACHE_KEYS[key] : key, () => key, 60);
  });
  // Les constantes lexicales ne sont pas exposées par vm ; utiliser les mêmes clés publiques.
  context.getCachedServerValue_('PLANNING_OPTIONS_V1', () => 'planning', 60);
  context.getCachedServerValue_('COMMUNICATION_OPTIONS_V1', () => 'communication', 60);
  context.getCachedServerValue_('VERSION_DISPLAY_CONTEXT_V1', () => 'versions', 60);
  context.invalidateReferenceServerCaches_();
  const prefix = 'CoordoDiscours:1.12 Stable:';
  assert.equal(cache.get(prefix + 'PLANNING_OPTIONS_V1'), null);
  assert.equal(cache.get(prefix + 'COMMUNICATION_OPTIONS_V1'), null);
  assert.equal(cache.get(prefix + 'VERSION_DISPLAY_CONTEXT_V1'), null);
  assertions += 3;
}

// 4. Une opération mesurée doit alimenter le rapport.
{
  cache.clear();
  const result = context.measureServerOperation_('lecture-test', () => 42, { module: 'test' });
  assert.equal(result, 42);
  context.recordServerPerformance_('lecture-lente', 1800, false, { source: 'test' });
  try { context.measureServerOperation_('lecture-erreur', () => { throw new Error('échec attendu'); }); }
  catch (error) { assert.match(error.message, /échec attendu/); assertions += 1; }
  const report = context.getServerPerformanceReport();
  check(report.operations.some(item => item.operation === 'lecture-test' && item.count === 1), 'La lecture mesurée est absente du rapport.');
  check(report.operations.some(item => item.operation === 'lecture-lente' && item.slowCount === 1), 'L’appel lent n’est pas détecté.');
  check(report.operations.some(item => item.operation === 'lecture-erreur' && item.errorCount === 1), 'L’erreur n’est pas comptabilisée.');
  check(report.totals.calls >= 3, 'Le total des appels est incorrect.');
}

// 5. Le contexte de performance ne doit conserver que des valeurs simples et bornées.
{
  cache.clear();
  context.recordServerPerformance_('contexte', 10, false, { safe: 'x'.repeat(200), secret: { nested: true }, count: 3 });
  const item = context.getServerPerformanceReport().operations.find(operation => operation.operation === 'contexte');
  assert.equal(item.lastContext.safe.length, 120);
  assert.equal(item.lastContext.count, 3);
  assert.equal(Object.prototype.hasOwnProperty.call(item.lastContext, 'secret'), false);
  assertions += 3;
}

// 6. La réinitialisation doit supprimer les mesures et écrire une trace d’audit.
{
  auditActions.length = 0;
  const report = context.resetServerPerformanceReport();
  assert.equal(report.totals.calls, 0);
  check(auditActions.some(item => item.action === 'REINITIALISATION_PERFORMANCE'), 'La réinitialisation des performances n’est pas auditée.');
  assertions += 1;
}

// 7. Un rôle Consultation ne doit voir que les sujets autorisés.
{
  cache.clear();
  currentRole = 'CONSULTATION';
  currentLanguage = 'fr';
  const help = context.getHelpBootstrap();
  check(help.topics.some(topic => topic.id === 'dashboard'), 'Le tableau de bord doit être documenté pour Consultation.');
  check(help.topics.some(topic => topic.id === 'versions'), 'Les versions doivent être documentées pour Consultation.');
  assert.equal(help.topics.some(topic => topic.minimumRole === 'ADMIN'), false);
  assert.equal(help.topics.some(topic => topic.minimumRole === 'COORDINATEUR'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(help.viewTopics, 'backup'), false);
  assertions += 3;
}

// 8. Un coordinateur doit voir l’aide métier, sans l’administration.
{
  currentRole = 'COORDINATEUR';
  const help = context.getHelpBootstrap();
  check(help.topics.some(topic => topic.id === 'planning'), 'Le guide de programmation manque pour le coordinateur.');
  check(help.topics.some(topic => topic.id === 'communication'), 'Le guide de communication manque pour le coordinateur.');
  assert.equal(help.topics.some(topic => topic.id === 'deploiement'), false);
  assertions += 1;
}

// 9. Un administrateur doit disposer des sujets de déploiement et de performance.
{
  currentRole = 'ADMIN';
  const help = context.getHelpBootstrap();
  check(help.topics.some(topic => topic.id === 'deploiement'), 'Le guide de déploiement manque pour l’administrateur.');
  check(help.topics.some(topic => topic.id === 'diagnostic-performance'), 'Le diagnostic de performance manque pour l’administrateur.');
  assert.equal(help.viewTopics.settings, 'administration');
  assertions += 1;
}

// 10. Une interface créole doit signaler que le guide détaillé reste en français.
{
  currentRole = 'CONSULTATION';
  currentLanguage = 'gcf';
  const help = context.getHelpBootstrap();
  assert.match(help.languageNotice, /français/i);
  assertions += 1;
}

// 11. Un rôle insuffisant ne doit pas pouvoir lire le rapport administrateur.
{
  currentRole = 'CONSULTATION';
  assert.throws(() => context.getServerPerformanceReport(), /Accès insuffisant/);
  assertions += 1;
}

console.log(`Tests de l’aide, des caches et de l’observabilité réussis : ${assertions} contrôles exécutés.`);
