import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('apps-script');
const required = [
  'appsscript.json', 'Config.gs', 'Database.gs', 'Installation.gs', 'Code.gs', 'Utils.gs', 'Tests.gs',
  'Access.gs', 'Concurrency.gs', 'ServerCache.gs', 'Performance.gs', 'SupportDiagnostics.gs', 'Help.gs', 'ReleaseReadiness.gs', 'ReleaseGovernance.gs',
  'Planning.gs', 'RulesEngine.gs', 'RecommendationEngine.gs', 'ConflictResolution.gs', 'AutomaticPlanning.gs',
  'MergeEngine.gs', 'VersionHistory.gs', 'Speakers.gs', 'SpeakerTalks.gs', 'SpeakerAvailability.gs',
  'Congregations.gs', 'Talks.gs', 'HospitalityInvitations.gs', 'Dashboard.gs', 'PrintPlanning.gs',
  'History.gs', 'Integrity.gs', 'Backup.gs', 'Settings.gs', 'I18n.gs',
  'Index.html', 'Styles.html', 'Scripts.html', 'AccessScripts.html', 'I18nScripts.html',
  'DashboardStyles.html', 'DashboardScripts.html', 'PlanningScripts.html',
  'ConflictResolutionStyles.html', 'ConflictResolutionScripts.html',
  'AutomaticPlanningStyles.html', 'AutomaticPlanningScripts.html',
  'MergeStyles.html', 'MergeScripts.html', 'VersionHistoryStyles.html', 'VersionHistoryScripts.html',
  'SpeakerTalkStyles.html', 'SpeakerTalkUI.html', 'SpeakerAvailabilityStyles.html', 'SpeakerAvailabilityUI.html',
  'CommunicationStyles.html', 'CommunicationScripts.html', 'PrintPlanningStyles.html', 'PrintPlanningScripts.html',
  'HistoryStyles.html', 'HistoryScripts.html', 'BackupStyles.html', 'BackupScripts.html',
  'SettingsStyles.html', 'SettingsScripts.html', 'HelpStyles.html', 'HelpScripts.html',
  'ReleaseReadinessStyles.html', 'ReleaseReadinessScripts.html', 'ReleaseGovernanceStyles.html', 'ReleaseGovernanceScripts.html'
];

const errors = [];
const read = file => {
  const filePath = path.join(root, file);
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
};
const requireText = (source, pattern, message) => {
  const ok = pattern instanceof RegExp ? pattern.test(source) : source.includes(pattern);
  if (!ok) errors.push(message);
};

for (const file of required) {
  if (!fs.existsSync(path.join(root, file))) errors.push(`Fichier obligatoire manquant : ${file}`);
}

const manifestPath = path.join(root, 'appsscript.json');
if (fs.existsSync(manifestPath)) {
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    if (manifest.runtimeVersion !== 'V8') errors.push('Le runtime Apps Script doit être V8.');
    if (!manifest.timeZone) errors.push('Le fuseau horaire est absent du manifeste.');
    if (!manifest.webapp) errors.push('La configuration webapp est absente du manifeste.');
  } catch (error) {
    errors.push(`appsscript.json invalide : ${error.message}`);
  }
}

const index = read('Index.html');
if (index) {
  const includes = [...index.matchAll(/include\('([^']+)'\)/g)].map(match => match[1]);
  for (const include of includes) {
    if (!fs.existsSync(path.join(root, `${include}.html`))) errors.push(`Include HTML introuvable : ${include}.html`);
  }
  [
    ['SettingsScripts', 'Le script des paramètres n’est pas inclus.'],
    ['ConflictResolutionStyles', 'Les styles de résolution des conflits ne sont pas inclus.'],
    ['ConflictResolutionScripts', 'Le script de résolution des conflits n’est pas inclus.'],
    ['AutomaticPlanningStyles', 'Les styles de planification automatique ne sont pas inclus.'],
    ['AutomaticPlanningScripts', 'Le script de planification automatique n’est pas inclus.'],
    ['SpeakerAvailabilityStyles', 'Les styles de disponibilité des orateurs ne sont pas inclus.'],
    ['SpeakerAvailabilityUI', 'L’interface de disponibilité des orateurs n’est pas incluse.'],
    ['MergeStyles', 'Les styles de fusion intelligente ne sont pas inclus.'],
    ['MergeScripts', 'Le script de fusion intelligente n’est pas inclus.'],
    ['VersionHistoryStyles', 'Les styles d’historique des versions ne sont pas inclus.'],
    ['VersionHistoryScripts', 'Le script d’historique des versions n’est pas inclus.'],
    ['HelpStyles', 'Les styles du guide intégré ne sont pas inclus.'],
    ['HelpScripts', 'Le script du guide intégré n’est pas inclus.'],
    ['ReleaseReadinessStyles', 'Les styles de préparation au déploiement ne sont pas inclus.'],
    ['ReleaseReadinessScripts', 'Le script de préparation au déploiement n’est pas inclus.'],
    ['ReleaseGovernanceStyles', 'Les styles de gouvernance de mise en production ne sont pas inclus.'],
    ['ReleaseGovernanceScripts', 'Le script de gouvernance de mise en production n’est pas inclus.']
  ].forEach(([needle, message]) => requireText(index, needle, message));
  requireText(index, /id="automatic-planning"[\s\S]*id="automatic-planning-dialog"/, 'L’accès à la planification automatique est absent de l’interface.');
  requireText(index, /data-view="versions"[\s\S]*id="view-versions"/, 'L’historique des versions n’est pas accessible depuis la navigation.');
  requireText(index, /data-view="help"[\s\S]*id="view-help"/, 'Le guide intégré n’est pas accessible depuis la navigation.');
  requireText(index, /data-view="release"[\s\S]*id="view-release"/, 'Le rapport de préparation au déploiement n’est pas accessible depuis la navigation.');
  requireText(index, /id="global-help-button"[\s\S]*id="help-dialog"/, 'L’aide contextuelle globale est incomplète.');
  requireText(index, /id="network-recovery"[\s\S]*id="network-retry"/, 'Le panneau de reprise après erreur réseau est absent.');
  ['PROGRAMMATION', 'HOSPITALITE', 'INVITATION', 'ORATEUR', 'ASSEMBLEE', 'DISCOURS'].forEach(entity => {
    requireText(index, `data-merge-entity="${entity}"`, `Interface : le formulaire ${entity} n’est pas déclaré comme fusionnable.`);
  });
}

const code = read('Code.gs');
if (code) {
  const i18nLoaded = index.includes('I18nScripts') || code.includes("createHtmlOutputFromFile('I18nScripts')");
  const accessLoaded = index.includes('AccessScripts') || code.includes("createHtmlOutputFromFile('AccessScripts')");
  if (!i18nLoaded) errors.push('Le moteur multilingue n’est pas chargé par l’interface.');
  if (!accessLoaded) errors.push('Le contrôle des droits d’accès n’est pas chargé par l’interface.');
  requireText(code, /measureServerOperation_\(['"]getAppBootstrap['"]/, 'Le bootstrap principal n’est pas mesuré.');
  requireText(code, /getSettingsSnapshot_\(\)/, 'Le bootstrap principal ne réutilise pas l’instantané des paramètres.');
}

const config = read('Config.gs');
if (config) {
  requireText(config, "users: 'UTILISATEURS'", 'La feuille UTILISATEURS n’est pas déclarée dans Config.gs.');
  requireText(config, "speakerAvailability: 'ORATEUR_DISPONIBILITES'", 'La feuille ORATEUR_DISPONIBILITES n’est pas déclarée dans Config.gs.');
  requireText(config, /version:\s*['"]1\.14 Stable['"]/, 'Config.gs doit déclarer CoordoDiscours 1.14 Stable.');
  requireText(config, "releaseActions: 'ACTIONS_CORRECTIVES'", 'La feuille ACTIONS_CORRECTIVES n’est pas déclarée.');
  requireText(config, "releaseDevices: 'RECETTE_MULTI_ECRANS'", 'La feuille RECETTE_MULTI_ECRANS n’est pas déclarée.');
  requireText(config, "releaseDecisions: 'MISES_EN_PRODUCTION'", 'La feuille MISES_EN_PRODUCTION n’est pas déclarée.');
}

function functionBody(source, functionName) {
  const startPattern = new RegExp(`function\\s+${functionName}\\s*\\([^)]*\\)\\s*\\{`);
  const match = startPattern.exec(source);
  if (!match) return null;
  let depth = 1;
  let quote = null;
  let escaped = false;
  for (let i = match.index + match[0].length; i < source.length; i += 1) {
    const char = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === "'" || char === '"' || char === '`') { quote = char; continue; }
    if (char === '{') depth += 1;
    if (char === '}') depth -= 1;
    if (depth === 0) return source.slice(match.index + match[0].length, i);
  }
  return null;
}

function hasRequiredGuard(body, role) {
  const direct = new RegExp(`assertAccess_\\(\\s*['"]${role}['"](?:\\s*,[\\s\\S]*?)?\\s*\\)`);
  if (direct.test(body)) return true;
  if (role === 'COORDINATEUR' && /assertEditAccess_\s*\(\s*\)/.test(body)) return true;
  if (role === 'ADMIN' && /assertAdminAccess_\s*\(\s*\)/.test(body)) return true;
  return false;
}

const protectedFunctions = [
  ['Speakers.gs', 'saveSpeaker', 'COORDINATEUR'],
  ['Speakers.gs', 'archiveSpeaker', 'COORDINATEUR'],
  ['Speakers.gs', 'restoreSpeaker', 'COORDINATEUR'],
  ['Congregations.gs', 'saveCongregation', 'COORDINATEUR'],
  ['Congregations.gs', 'archiveCongregation', 'COORDINATEUR'],
  ['Congregations.gs', 'restoreCongregation', 'COORDINATEUR'],
  ['Talks.gs', 'saveTalk', 'COORDINATEUR'],
  ['Talks.gs', 'setTalkActive', 'COORDINATEUR'],
  ['Talks.gs', 'importTalkReference', 'ADMIN'],
  ['SpeakerTalks.gs', 'saveSpeakerTalkSelection', 'COORDINATEUR'],
  ['SpeakerAvailability.gs', 'saveSpeakerAvailabilitySchedule', 'COORDINATEUR'],
  ['Planning.gs', 'savePlanning', 'COORDINATEUR'],
  ['Planning.gs', 'cancelPlanning', 'COORDINATEUR'],
  ['Planning.gs', 'restorePlanning', 'COORDINATEUR'],
  ['ConflictResolution.gs', 'getPlanningConflictResolutions', 'COORDINATEUR'],
  ['AutomaticPlanning.gs', 'getAutomaticPlanningDefaults', 'COORDINATEUR'],
  ['AutomaticPlanning.gs', 'generateAutomaticPlanningDraft', 'COORDINATEUR'],
  ['AutomaticPlanning.gs', 'commitAutomaticPlanningDraft', 'COORDINATEUR'],
  ['HospitalityInvitations.gs', 'saveHospitality', 'COORDINATEUR'],
  ['HospitalityInvitations.gs', 'setHospitalityStatus', 'COORDINATEUR'],
  ['HospitalityInvitations.gs', 'saveInvitation', 'COORDINATEUR'],
  ['HospitalityInvitations.gs', 'setInvitationStatus', 'COORDINATEUR'],
  ['Settings.gs', 'getApplicationSettings', 'ADMIN'],
  ['Settings.gs', 'saveApplicationSettings', 'ADMIN'],
  ['Settings.gs', 'resetApplicationSettings', 'ADMIN'],
  ['Access.gs', 'saveAccessUser', 'ADMIN'],
  ['Access.gs', 'setAccessUserActive', 'ADMIN'],
  ['Backup.gs', 'createApplicationBackup', 'ADMIN'],
  ['Backup.gs', 'restoreApplicationBackup', 'ADMIN'],
  ['Integrity.gs', 'getDataIntegrityReport', 'ADMIN'],
  ['Installation.gs', 'runAcceptanceTests', 'ADMIN'],
  ['Help.gs', 'getHelpBootstrap', 'CONSULTATION'],
  ['Performance.gs', 'getServerPerformanceReport', 'ADMIN'],
  ['Performance.gs', 'resetServerPerformanceReport', 'ADMIN'],
  ['SupportDiagnostics.gs', 'registerClientIncident', 'CONSULTATION'],
  ['SupportDiagnostics.gs', 'getRecentSupportIncidents', 'ADMIN'],
  ['ReleaseReadiness.gs', 'getReleaseReadinessBootstrap', 'ADMIN'],
  ['ReleaseReadiness.gs', 'getReleaseReadinessReport', 'ADMIN'],
  ['ReleaseReadiness.gs', 'startReleaseAcceptance', 'ADMIN'],
  ['ReleaseReadiness.gs', 'runReleaseAcceptanceStep', 'ADMIN'],
  ['ReleaseReadiness.gs', 'exportReleaseAcceptanceReport', 'ADMIN'],
  ['ReleaseReadiness.gs', 'resetReleaseAcceptanceSession', 'ADMIN'],
  ['ReleaseGovernance.gs', 'getReleaseGovernanceBootstrap', 'ADMIN'],
  ['ReleaseGovernance.gs', 'listReleaseCorrectiveActions', 'ADMIN'],
  ['ReleaseGovernance.gs', 'syncReleaseCorrectiveActions', 'ADMIN'],
  ['ReleaseGovernance.gs', 'saveReleaseCorrectiveAction', 'ADMIN'],
  ['ReleaseGovernance.gs', 'setReleaseCorrectiveActionStatus', 'ADMIN'],
  ['ReleaseGovernance.gs', 'getReleaseDeviceAcceptance', 'ADMIN'],
  ['ReleaseGovernance.gs', 'saveReleaseDeviceAcceptance', 'ADMIN'],
  ['ReleaseGovernance.gs', 'listReleaseDecisions', 'ADMIN'],
  ['ReleaseGovernance.gs', 'registerReleaseDecision', 'ADMIN'],
  ['ReleaseGovernance.gs', 'exportReleaseManifest', 'ADMIN'],
  ['ReleaseGovernance.gs', 'exportReleaseSupportBundle', 'ADMIN'],
  ['ReleaseGovernance.gs', 'getAnnualCapacityReport', 'ADMIN'],
  ['ReleaseGovernance.gs', 'previewHistoryArchive', 'ADMIN'],
  ['ReleaseGovernance.gs', 'archiveHistoryRows', 'ADMIN'],
  ['VersionHistory.gs', 'getVersionHistoryBootstrap', 'CONSULTATION']
];

for (const [file, functionName, role] of protectedFunctions) {
  const source = read(file);
  if (!source) continue;
  const body = functionBody(source, functionName);
  if (body == null) {
    errors.push(`Fonction sensible introuvable ou incomplète : ${functionName} dans ${file}.`);
    continue;
  }
  if (!hasRequiredGuard(body, role)) errors.push(`${file} : ${functionName} doit exiger le rôle ${role}.`);
}

const merge = read('MergeEngine.gs');
if (merge) {
  ['prepareConcurrentMerge', 'applyConcurrentMergeResolution'].forEach(functionName => {
    const body = functionBody(merge, functionName);
    if (body == null) errors.push(`Fusion : point d’entrée introuvable : ${functionName}.`);
    else requireText(body, /assertAccess_\(\s*definition\.minimumRole/, `Fusion : ${functionName} doit contrôler le rôle requis par l’entité.`);
  });
  ['SCALAR', 'SET', 'COLLECTION'].forEach(strategy => requireText(merge, strategy, `Fusion : la stratégie ${strategy} est absente.`));
  ['ORATEUR', 'ASSEMBLEE', 'DISCOURS', 'PROGRAMMATION', 'HOSPITALITE', 'INVITATION', 'PARAMETRES', 'UTILISATEUR', 'ORATEUR_DISCOURS', 'ORATEUR_DISPONIBILITES'].forEach(entity => {
    requireText(merge, entity, `Fusion : l’entité ${entity} n’est pas prise en charge.`);
  });
  requireText(merge, 'mergeConcurrentScalar_', 'Fusion : la comparaison à trois voies des champs simples est absente.');
  requireText(merge, 'mergeConcurrentSet_', 'Fusion : la fusion des ensembles est absente.');
  requireText(merge, 'mergeConcurrentCollectionItemFields_', 'Fusion : la fusion des collections champ par champ est absente.');
  requireText(merge, 'isConcurrentMergeVersionError_', 'Fusion : une nouvelle course de version n’est pas traitée.');
  requireText(merge, /FUSION_AUTOMATIQUE[\s\S]*FUSION_RESOLUE/, 'Fusion : les opérations ne sont pas auditées.');
}

const versions = read('VersionHistory.gs');
if (versions) {
  ['listVersionHistoryRecords', 'getEntityVersionTimeline', 'compareEntityVersions'].forEach(functionName => {
    const body = functionBody(versions, functionName);
    if (body == null) errors.push(`Versions : point d’entrée introuvable : ${functionName}.`);
    else requireText(body, /assertAccess_\(\s*versionHistoryViewRole_\(definition\)/, `Versions : ${functionName} doit appliquer le rôle de consultation de l’entité.`);
  });
  const restoreBody = functionBody(versions, 'restoreEntityVersion');
  if (restoreBody == null) errors.push('Versions : restoreEntityVersion est absent.');
  else requireText(restoreBody, /assertAccess_\(\s*definition\.minimumRole/, 'Versions : la restauration doit exiger le rôle d’écriture de l’entité.');
  requireText(versions, /details\.before[\s\S]*details\.after/, 'Versions : les instantanés avant/après ne sont pas reconstruits.');
  requireText(versions, 'versionHistorySnapshotHash_', 'Versions : le hachage stable des instantanés est absent.');
  requireText(versions, 'writeConcurrentMergeEntity_', 'Versions : la restauration ne réutilise pas les écritures métier.');
  requireText(versions, 'expectedCurrentVersion', 'Versions : la restauration ne protège pas la version actuelle.');
  requireText(versions, 'RESTAURATION_VERSION', 'Versions : la restauration n’est pas auditée.');
}

const installation = read('Installation.gs');
if (installation) {
  ['LANGUE_INTERFACE', 'AUTO_PLAN_MOIS', 'AUTO_PLAN_SUIVIS', 'RECO_BONUS_DATE_PREFEREE', 'RECO_MALUS_DATE_A_EVITER'].forEach(key => {
    requireText(installation, key, `Installation : le paramètre ${key} n’est pas vérifié.`);
  });
  requireText(installation, 'getSpeakerAvailabilityMap_', 'La recette doit vérifier le module de disponibilité des orateurs.');
  requireText(installation, 'getDataIntegrityReport_()', 'La recette doit exécuter le contrôle d’intégrité.');
  requireText(installation, 'parseAndValidateBackup_', 'La recette doit valider le format de sauvegarde.');
  requireText(installation, 'getHelpBootstrap', 'La recette doit vérifier le guide intégré.');
  requireText(installation, 'measureServerOperation_', 'La recette doit vérifier l’observabilité serveur.');
  requireText(installation, 'getCachedServerValue_', 'La recette doit vérifier le cache serveur.');
  requireText(installation, 'getReleaseGovernanceBootstrap', 'La recette doit vérifier la gouvernance de mise en production.');
}

const planning = read('Planning.gs');
const rules = read('RulesEngine.gs');
if (planning) {
  requireText(planning, 'evaluatePlanningRules_', 'Planning.gs doit utiliser le moteur central de règles.');
  requireText(planning, 'listPlanningsWithResources_', 'Planning.gs doit proposer une lecture réutilisant les référentiels préchargés.');
  requireText(planning, /getCachedServerValue_\(SERVER_CACHE_KEYS\.PLANNING_OPTIONS/, 'Les options de programmation ne sont pas mises en cache côté serveur.');
  requireText(planning, 'invalidatePlanningServerCaches_', 'Les écritures de programmation n’invalident pas les caches dépendants.');
  requireText(planning, /measureServerOperation_\(['"]listPlannings['"]/, 'La liste des programmations n’est pas mesurée.');
}
if (rules) {
  ['PLAN_001', 'PLAN_002', 'PLAN_003', 'PLAN_004', 'PLAN_005', 'PLAN_006', 'PLAN_007', 'PLAN_008', 'PLAN_009', 'PLAN_010'].forEach(code => {
    requireText(rules, code, `Règle métier obligatoire absente : ${code}.`);
  });
  requireText(rules, /getSpeakerAvailabilityMap_[\s\S]*evaluateSpeakerAvailability_/, 'RulesEngine doit exploiter les disponibilités préchargées.');
  requireText(rules, /listCongregations[\s\S]*listSpeakersWithCongregations_[\s\S]*listTalks/, 'RulesEngine doit préparer un jeu de référentiels partagé.');
}

const recommendation = read('RecommendationEngine.gs');
if (recommendation) {
  requireText(recommendation, 'getSpeakerRecommendations', 'Le point d’entrée des recommandations est absent.');
  requireText(recommendation, 'scoreSpeakerRecommendation_', 'Le calcul du score de recommandation est absent.');
  if (!recommendation.includes('resources.speakerTalks') && !recommendation.includes('getSpeakerTalkNumbersMap_')) errors.push('Les recommandations doivent contrôler les discours déclarés des orateurs extérieurs.');
  requireText(recommendation, 'evaluateSpeakerAvailability_', 'Les recommandations doivent exclure les orateurs indisponibles.');
  requireText(recommendation, /RECO_BONUS_DATE_PREFEREE[\s\S]*RECO_MALUS_DATE_A_EVITER/, 'Les recommandations doivent ajuster les dates préférées et à éviter.');
}

const availability = read('SpeakerAvailability.gs');
if (availability) {
  ['INDISPONIBLE', 'DISPONIBLE_SEULEMENT', 'PREFEREE', 'A_EVITER'].forEach(type => requireText(availability, type, `Disponibilités : le type ${type} est absent.`));
  requireText(availability, "assertEntityVersion_('ORATEUR_DISPONIBILITES'", 'Disponibilités : le verrouillage optimiste est absent.');
  requireText(availability, 'LockService.getScriptLock()', 'Disponibilités : l’écriture n’est pas protégée par un verrou.');
  requireText(availability, 'buildAuditDetails_', 'Disponibilités : les changements ne sont pas audités.');
  requireText(availability, 'restoreSpeakerAvailabilitySnapshot_', 'Disponibilités : le retour arrière en cas d’échec est absent.');
}

const automatic = read('AutomaticPlanning.gs');
if (automatic) {
  requireText(automatic, 'AUTOMATIC_PLANNING_SCENARIOS', 'Planification automatique : les scénarios sont absents.');
  requireText(automatic, 'automaticPlanningDatasetSignature_', 'Planification automatique : la protection des brouillons obsolètes est absente.');
  requireText(automatic, 'LockService.getScriptLock()', 'Planification automatique : la validation groupée n’est pas verrouillée.');
  requireText(automatic, 'evaluatePlanningRules_', 'Planification automatique : les propositions ne sont pas validées par RulesEngine.');
  requireText(automatic, 'rollbackAutomaticPlanningWrites_', 'Planification automatique : le retour arrière est absent.');
  requireText(automatic, /listHospitalitiesWithPlannings_[\s\S]*listInvitationsWithPlannings_/, 'Planification automatique : la charge de communication ne réutilise pas le planning préchargé.');
  requireText(automatic, 'invalidatePlanningServerCaches_', 'Planification automatique : les caches serveur ne sont pas invalidés après validation.');
}

const communications = read('HospitalityInvitations.gs');
if (communications) {
  requireText(communications, /getCachedServerValue_\(SERVER_CACHE_KEYS\.COMMUNICATION_OPTIONS/, 'Les options de communication ne sont pas mises en cache côté serveur.');
  requireText(communications, 'listHospitalitiesWithPlannings_', 'Hospitalité : le helper avec planning préchargé est absent.');
  requireText(communications, 'listInvitationsWithPlannings_', 'Invitations : le helper avec planning préchargé est absent.');
}

const cache = read('ServerCache.gs');
if (cache) {
  requireText(cache, /SERVER_CACHE_TTL_SECONDS\s*=\s*60/, 'Cache serveur : la durée courte de 60 secondes est absente.');
  ['SETTINGS', 'PLANNING_OPTIONS', 'COMMUNICATION_OPTIONS', 'VERSION_DISPLAY_CONTEXT'].forEach(key => requireText(cache, key, `Cache serveur : la clé ${key} est absente.`));
  requireText(cache, 'getCachedServerValue_', 'Cache serveur : le chargeur générique est absent.');
  requireText(cache, 'invalidateAllServerCaches_', 'Cache serveur : l’invalidation globale est absente.');
  requireText(cache, 'getSettingsSnapshot_', 'Cache serveur : l’instantané des paramètres est absent.');
}

const performance = read('Performance.gs');
if (performance) {
  requireText(performance, 'measureServerOperation_', 'Observabilité : le chronométrage générique est absent.');
  requireText(performance, 'SERVER_PERFORMANCE_SLOW_THRESHOLD_MS', 'Observabilité : le seuil d’appel lent est absent.');
  requireText(performance, 'sanitizeServerPerformanceContext_', 'Observabilité : le contexte des mesures n’est pas filtré.');
  requireText(performance, 'REINITIALISATION_PERFORMANCE', 'Observabilité : la réinitialisation n’est pas auditée.');
}

const help = read('Help.gs');
if (help) {
  requireText(help, /HELP_TOPICS[\s\S]*HELP_VIEW_TOPICS/, 'Guide : les sujets et correspondances contextuelles sont incomplets.');
  requireText(help, /minimumRole:\s*['"]ADMIN['"]/, 'Guide : aucun sujet administrateur n’est défini.');
  requireText(help, /minimumRole:\s*['"]COORDINATEUR['"]/, 'Guide : aucun sujet coordinateur n’est défini.');
  requireText(help, 'helpRoleAllowed_', 'Guide : le filtrage par rôle est absent.');
  requireText(help, /measureServerOperation_\(['"]getHelpBootstrap['"]/, 'Guide : le chargement du guide n’est pas mesuré.');
}

const scripts = read('Scripts.html');
if (scripts) {
  requireText(scripts, 'READ_ONLY_SERVER_FUNCTIONS', 'Réseau : la distinction entre lectures et écritures est absente.');
  requireText(scripts, /SERVER_READ_RETRY_DELAYS_MS\s*=\s*\[500\]/, 'Réseau : la reprise unique des lectures est absente.');
  requireText(scripts, /readOnly\s*&&\s*error\.coordoTransient/, 'Réseau : les écritures risquent d’être relancées automatiquement.');
  requireText(scripts, 'showNetworkRecovery_', 'Réseau : le panneau de reprise ne peut pas être affiché.');
  requireText(scripts, 'retryAfterNetworkFailure_', 'Réseau : l’action de reprise est absente.');
}

const settingsUi = read('SettingsScripts.html');
if (settingsUi) {
  requireText(settingsUi, 'getServerPerformanceReport', 'Paramètres : le rapport de performance serveur n’est pas chargé.');
  requireText(settingsUi, 'resetServerPerformanceReport', 'Paramètres : les mesures de performance ne peuvent pas être réinitialisées.');
}

const allFiles = fs.existsSync(root) ? fs.readdirSync(root) : [];
for (const file of allFiles.filter(name => name.endsWith('.gs'))) {
  const source = read(file);
  if (/\bvar\s+SPREADSHEET_ID\b/.test(source)) errors.push(`${file} contient encore une configuration SPREADSHEET_ID héritée.`);
  try { new Function(source); }
  catch (error) { errors.push(`Syntaxe Apps Script invalide dans ${file} : ${error.message}`); }
}


const releaseReadiness = read('ReleaseReadiness.gs');
const releaseUi = read('ReleaseReadinessScripts.html');
const supportDiagnostics = read('SupportDiagnostics.gs');
requireText(releaseReadiness, /function\s+buildReleaseReadinessReport_\s*\(/, 'Mise en production : le rapport global de santé est absent.');
requireText(releaseReadiness, /RELEASE_ACCEPTANCE_STEPS[\s\S]*installation[\s\S]*integrity[\s\S]*backup[\s\S]*performance[\s\S]*acceptance[\s\S]*devices[\s\S]*final/, 'Mise en production : les sept étapes de recette sont incomplètes.');
requireText(releaseReadiness, /PropertiesService\.getScriptProperties\(\)/, 'Mise en production : la recette guidée n’est pas persistée.');
requireText(releaseReadiness, /exportReleaseAcceptanceReport/, 'Mise en production : l’export du rapport de recette est absent.');
requireText(releaseUi, /loadReleaseReadiness_/, 'Interface : le chargement du rapport de santé est absent.');
requireText(releaseUi, /runReleaseAcceptanceStep/, 'Interface : la recette guidée ne peut pas exécuter ses étapes.');
requireText(releaseUi, /exportReleaseAcceptanceReport/, 'Interface : le rapport de recette ne peut pas être exporté.');
requireText(supportDiagnostics, /INCIDENT_CLIENT/, 'Support : les incidents client ne sont pas journalisés.');
requireText(supportDiagnostics, /sanitizeSupportText_/, 'Support : les informations d’incident ne sont pas assainies.');


const releaseGovernance = read('ReleaseGovernance.gs');
const releaseGovernanceUi = read('ReleaseGovernanceScripts.html');
requireText(releaseGovernance, /function\s+syncReleaseCorrectiveActions\s*\(/, 'Gouvernance : la synchronisation des actions correctives est absente.');
requireText(releaseGovernance, /assertEntityVersion_\(['"]ACTION_CORRECTIVE['"]/, 'Gouvernance : les actions correctives ne sont pas protégées par version.');
requireText(releaseGovernance, /RELEASE_DEVICE_TYPES[\s\S]*ORDINATEUR[\s\S]*TABLETTE[\s\S]*TELEPHONE/, 'Gouvernance : les trois formats de recette sont incomplets.');
requireText(releaseGovernance, /function\s+registerReleaseDecision\s*\(/, 'Gouvernance : le registre des décisions est absent.');
requireText(releaseGovernance, /AUTORISER[\s\S]*DEPLOYE[\s\S]*RETOUR/, 'Gouvernance : les confirmations fortes des décisions sont absentes.');
requireText(releaseGovernance, /function\s+exportReleaseManifest\s*\(/, 'Gouvernance : le manifeste de déploiement est absent.');
requireText(releaseGovernance, /function\s+getAnnualCapacityReport\s*\(/, 'Gouvernance : le rapport annuel de capacité est absent.');
requireText(releaseGovernance, /DriveApp\.createFile[\s\S]*ARCHIVAGE_HISTORIQUE/, 'Gouvernance : l’archivage contrôlé de l’historique est absent.');
requireText(releaseGovernanceUi, /saveReleaseDeviceAcceptance/, 'Interface : la recette multi-écrans ne peut pas être enregistrée.');
requireText(releaseGovernanceUi, /registerReleaseDecision/, 'Interface : les décisions de mise en production ne peuvent pas être enregistrées.');
requireText(releaseGovernanceUi, /archiveHistoryRows/, 'Interface : l’archivage contrôlé n’est pas accessible.');

if (errors.length) {
  console.error('\nValidation CoordoDiscours : ÉCHEC\n');
  errors.forEach(error => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`Validation CoordoDiscours réussie : ${required.length} fichiers essentiels et ${protectedFunctions.length} fonctions sensibles contrôlés.`);
