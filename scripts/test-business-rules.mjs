import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('apps-script');
const failures = [];
let assertions = 0;
function read(file) { const filePath = path.join(root, file); if (!fs.existsSync(filePath)) { failures.push(`Fichier introuvable : ${file}`); return ''; } return fs.readFileSync(filePath, 'utf8'); }
function assertContains(source, pattern, message) { assertions += 1; const ok = pattern instanceof RegExp ? pattern.test(source) : source.includes(pattern); if (!ok) failures.push(message); }

const planning = read('Planning.gs');
const rules = read('RulesEngine.gs');
assertContains(planning, /evaluatePlanningRules_\(data(?:,\s*dataset)?\)/, 'Planning : le moteur central de règles n’est pas utilisé.');
assertContains(planning, /validation\.warnings\.length\s*&&\s*!confirmWarnings/, 'Planning : la confirmation des avertissements est absente.');
assertContains(planning, /status\s*!==\s*['"]ANNULE['"]/, 'Planning : les programmations annulées ne sont pas exclues.');
['PLAN_001','PLAN_002','PLAN_003','PLAN_004','PLAN_005','PLAN_006','PLAN_007','PLAN_008','PLAN_009','PLAN_010'].forEach(code => assertContains(rules, code, `Règles : ${code} est absente.`));
assertContains(rules, /RULE_SEVERITY[\s\S]*ERROR[\s\S]*WARNING[\s\S]*INFO/, 'Règles : les niveaux de sévérité sont absents.');
assertContains(rules, /speakerAvailability:\s*speakerAvailability/, 'Règles : les disponibilités ne sont pas préchargées.');
assertContains(rules, /evaluateSpeakerAvailability_\(planning\.speakerId, planning\.date/, 'Règles : la disponibilité de l’orateur n’est pas évaluée.');
assertContains(rules, /_speakerAvailability/, 'Règles : les disponibilités ne sont pas conservées dans les brouillons automatiques.');
assertContains(rules, /_availabilityAdjustments/, 'Règles : les réglages de disponibilité ne participent pas à la signature des brouillons.');

const concurrency = read('Concurrency.gs');
const planningUi = read('PlanningScripts.html');
const scriptsUi = read('Scripts.html');
const communicationUi = read('CommunicationScripts.html');
const settingsUi = read('SettingsScripts.html');
const accessUi = read('AccessScripts.html');
const speakerTalkUi = read('SpeakerTalkUI.html');
const availabilityUi = read('SpeakerAvailabilityUI.html');
assertContains(concurrency, /function\s+assertEntityVersion_\s*\(/, 'Concurrence : le contrôle de version est absent.');
assertContains(concurrency, /CONFLIT_VERSION/, 'Concurrence : le code de conflit explicite est absent.');
assertContains(concurrency, /function\s+advanceEntityVersion_\s*\(/, 'Concurrence : le renouvellement de version est absent.');
assertContains(planning, /assertEntityVersion_\(['"]PROGRAMMATION['"]/, 'Planning : la version attendue n’est pas contrôlée.');
assertContains(planning, /LockService\.getScriptLock\(\)/, 'Planning : la vérification et l’écriture ne sont pas protégées par un verrou.');
assertContains(planning, /version:\s*String\(data\.version/, 'Planning : la version du formulaire n’est pas normalisée.');
assertContains(planningUi, /ensurePlanningVersionField_/, 'Interface : le champ de version de la programmation est absent.');
assertContains(planningUi, /handlePlanningVersionConflict_/, 'Interface : aucun traitement du conflit de version n’est prévu.');
assertContains(planningUi, /data-version=/, 'Interface : les changements de statut ne transmettent pas la version.');

const conflictResolver = read('ConflictResolution.gs');
const conflictUi = read('ConflictResolutionScripts.html');
const indexUi = read('Index.html');
assertContains(conflictResolver, /function\s+getPlanningConflictResolutions\s*\(/, 'Résolution : le point d’entrée de l’assistant est absent.');
assertContains(conflictResolver, /buildPlanningConflictResolution_\(/, 'Résolution : la construction des solutions est absente.');
['SPEAKER','DATE','TALK','CONGREGATION','COMBINATION'].forEach(type => assertContains(conflictResolver, type, `Résolution : le type ${type} est absent.`));
assertContains(conflictResolver, /evaluatePlanningRules_\(candidate, dataset\)/, 'Résolution : les propositions ne sont pas revalidées par le moteur central.');
assertContains(conflictResolver, /buildConflictCombinationSuggestions_/, 'Résolution : les solutions combinées sont absentes.');
assertContains(conflictResolver, /selectDiverseConflictSuggestions_/, 'Résolution : le classement diversifié des solutions est absent.');
assertContains(planning, /blocked:\s*true[\s\S]*buildPlanningConflictResolution_/, 'Planning : une programmation bloquée ne retourne pas les solutions proposées.');
assertContains(planning, /LockService\.getScriptLock\(\)[\s\S]*buildPlanningRuleDataset_\(\)/, 'Planning : la structure de validation sous verrou est absente.');
assertContains(rules, /function\s+buildPlanningRuleDataset_\s*\(/, 'Règles : le jeu de données partagé est absent.');
assertContains(conflictUi, /data-apply-conflict-suggestion/, 'Interface : les solutions ne peuvent pas être appliquées.');
assertContains(conflictUi, /renderPlanningConflictResolution_/, 'Interface : le panneau de résolution est absent.');
assertContains(planningUi, /result\.blocked[\s\S]*renderPlanningConflictResolution_/, 'Interface : les blocages ne déclenchent pas l’assistant.');
assertContains(indexUi, /name="originCongregationId"/, 'Interface : l’assemblée d’origine n’est pas modifiable dans la programmation.');
assertContains(indexUi, /ConflictResolutionStyles[\s\S]*ConflictResolutionScripts/, 'Interface : le module de résolution n’est pas chargé.');

const automatic = read('AutomaticPlanning.gs');
const automaticUi = read('AutomaticPlanningScripts.html');
assertContains(automatic, /function\s+generateAutomaticPlanningDraft\s*\(/, 'Planification automatique : la génération du brouillon est absente.');
assertContains(automatic, /function\s+commitAutomaticPlanningDraft\s*\(/, 'Planification automatique : la validation du brouillon est absente.');
['BALANCED','TALK_RENEWAL','SPEAKER_ROTATION'].forEach(type => assertContains(automatic, type, `Planification automatique : le scénario ${type} est absent.`));
assertContains(automatic, /getSpeakerRecommendationsWithData_\(/, 'Planification automatique : RecommendationEngine n’est pas utilisé.');
assertContains(automatic, /evaluatePlanningRules_\(/, 'Planification automatique : RulesEngine n’est pas utilisé.');
assertContains(automatic, /automaticPlanningDatasetSignature_/, 'Planification automatique : la signature du brouillon est absente.');
assertContains(automatic, /recommendationWeights:\s*resources\.recommendationWeights/, 'Planification automatique : les réglages de recommandation ne participent pas à la signature.');
assertContains(automatic, /AUTO_PLAN_OBSOLETE\|/, 'Planification automatique : le code de brouillon obsolète est absent.');
assertContains(automatic, /LockService\.getScriptLock\(\)/, 'Planification automatique : la validation groupée n’est pas verrouillée.');
assertContains(automatic, /setValues\(/, 'Planification automatique : l’écriture groupée est absente.');
assertContains(automatic, /rollbackAutomaticPlanningWrites_/, 'Planification automatique : le retour arrière est absent.');
assertContains(automatic, /buildAutomaticPlanningFollowUps_/, 'Planification automatique : la préparation des invitations et hospitalités est absente.');
assertContains(automatic, /listHospitalities\(''\)[\s\S]*listInvitations\(''\)/, 'Planification automatique : la charge de communication existante n’est pas analysée.');
assertContains(automaticUi, /renderAutomaticPlanningDraft_/, 'Interface : la comparaison des scénarios est absente.');
assertContains(automaticUi, /data-auto-item-index/, 'Interface : les dates du brouillon ne peuvent pas être désélectionnées.');
assertContains(automaticUi, /commitAutomaticPlanningDraft/, 'Interface : la validation explicite du brouillon est absente.');
assertContains(indexUi, /id="automatic-planning"[\s\S]*id="automatic-planning-dialog"/, 'Interface : l’assistant de planification automatique n’est pas accessible.');
assertContains(indexUi, /AutomaticPlanningStyles[\s\S]*AutomaticPlanningScripts/, 'Interface : le module de planification automatique n’est pas chargé.');

const availability = read('SpeakerAvailability.gs');
['INDISPONIBLE','DISPONIBLE_SEULEMENT','PREFEREE','A_EVITER'].forEach(type => assertContains(availability, type, `Disponibilités : le type ${type} est absent.`));
assertContains(availability, /function\s+getSpeakerAvailabilitySchedule\s*\(/, 'Disponibilités : le chargement de la fiche est absent.');
assertContains(availability, /function\s+saveSpeakerAvailabilitySchedule\s*\(/, 'Disponibilités : l’enregistrement est absent.');
assertContains(availability, /function\s+evaluateSpeakerAvailability_\s*\(/, 'Disponibilités : le moteur d’évaluation est absent.');
assertContains(availability, /assertEntityVersion_\(['"]ORATEUR_DISPONIBILITES['"]/, 'Disponibilités : la version attendue n’est pas contrôlée.');
assertContains(availability, /advanceEntityVersion_\(['"]ORATEUR_DISPONIBILITES['"]/, 'Disponibilités : la version n’est pas renouvelée.');
assertContains(availability, /LockService\.getScriptLock\(\)/, 'Disponibilités : l’écriture n’est pas verrouillée.');
assertContains(availability, /restoreSpeakerAvailabilitySnapshot_/, 'Disponibilités : le retour arrière est absent.');
assertContains(availability, /buildAuditDetails_\(/, 'Disponibilités : le format d’audit avant/après est absent.');
assertContains(availabilityUi, /name="version"/, 'Interface : les disponibilités ne conservent pas leur version.');
assertContains(availabilityUi, /saveSpeakerAvailabilitySchedule[\s\S]*elements\.version\.value/, 'Interface : la version des disponibilités n’est pas envoyée.');
assertContains(availabilityUi, /CONFLIT_VERSION\|[\s\S]*openSpeakerAvailability_/, 'Interface : un conflit de disponibilité ne déclenche pas le rechargement.');
assertContains(availabilityUi, /manage-speaker-availability/, 'Interface : l’accès aux disponibilités depuis la fiche orateur est absent.');
assertContains(indexUi, /SpeakerAvailabilityStyles[\s\S]*SpeakerAvailabilityUI/, 'Interface : le module de disponibilité n’est pas chargé.');

[
  ['Speakers.gs', 'ORATEUR'],
  ['Congregations.gs', 'ASSEMBLEE'],
  ['HospitalityInvitations.gs', 'HOSPITALITE'],
  ['HospitalityInvitations.gs', 'INVITATION'],
  ['Talks.gs', 'DISCOURS'],
  ['Settings.gs', 'PARAMETRES'],
  ['Access.gs', 'UTILISATEUR'],
  ['SpeakerTalks.gs', 'ORATEUR_DISCOURS'],
  ['SpeakerAvailability.gs', 'ORATEUR_DISPONIBILITES']
].forEach(([file, entity]) => {
  const source = read(file);
  assertContains(source, new RegExp(`assertEntityVersion_\\(['"]${entity}['"]`), `Concurrence : ${entity} ne vérifie pas la version attendue.`);
  assertContains(source, new RegExp(`advanceEntityVersion_\\(['"]${entity}['"]`), `Concurrence : ${entity} ne renouvelle pas sa version.`);
  assertContains(source, /LockService\.getScriptLock\(\)/, `Concurrence : ${file} n’utilise pas de verrou pendant l’écriture.`);
});
assertContains(scriptsUi, /ensureVersionField_/, 'Interface : les formulaires du répertoire ne transmettent pas la version.');
assertContains(scriptsUi, /data-toggle-talk=[\s\S]*data-version=/, 'Interface : les actions rapides des discours ne transmettent pas la version.');
assertContains(scriptsUi, /setTalkActive[\s\S]*dataset\.version/, 'Interface : la version du discours n’est pas envoyée au serveur.');
assertContains(communicationUi, /data-version=/, 'Interface : les actions rapides de communication ne transmettent pas la version.');
assertContains(communicationUi, /CONFLIT_VERSION\|/, 'Interface : les conflits de communication ne déclenchent pas le rechargement.');
assertContains(settingsUi, /name="version"[\s\S]*settingsVersion/, 'Interface : les paramètres ne conservent pas leur version.');
assertContains(settingsUi, /resetApplicationSettings[\s\S]*expectedVersion/, 'Interface : la réinitialisation des paramètres ne transmet pas la version.');
assertContains(settingsUi, /CONFLIT_VERSION\|[\s\S]*loadSettings/, 'Interface : les conflits de paramètres ne déclenchent pas le rechargement.');
assertContains(accessUi, /data-access-toggle=[\s\S]*data-version=/, 'Interface : les actions utilisateur ne transmettent pas la version.');
assertContains(accessUi, /setAccessUserActive[\s\S]*dataset\.version/, 'Interface : la version utilisateur n’est pas envoyée au serveur.');
assertContains(accessUi, /CONFLIT_VERSION\|[\s\S]*renderAccessManagement_/, 'Interface : les conflits utilisateur ne déclenchent pas le rechargement.');
assertContains(speakerTalkUi, /name="version"/, 'Interface : la sélection des discours ne conserve pas sa version.');
assertContains(speakerTalkUi, /saveSpeakerTalkSelection[\s\S]*elements\.version\.value/, 'Interface : la version de la sélection des discours n’est pas envoyée.');
assertContains(speakerTalkUi, /CONFLIT_VERSION\|[\s\S]*openSpeakerTalks/, 'Interface : les conflits de sélection des discours ne déclenchent pas le rechargement.');

const recommendations = read('RecommendationEngine.gs');
assertContains(recommendations, /function\s+getSpeakerRecommendations\s*\(/, 'Recommandations : le point d’entrée est absent.');
assertContains(recommendations, /scoreSpeakerRecommendation_\(/, 'Recommandations : le calcul du score est absent.');
assertContains(recommendations, /sameMonthCount/, 'Recommandations : la fréquence mensuelle est absente.');
assertContains(recommendations, /Math\.min\(100/, 'Recommandations : le score n’est pas plafonné.');
assertContains(recommendations, /function\s+getRecommendationWeights_\s*\(/, 'Recommandations : les pondérations sont absentes.');
assertContains(recommendations, /rawScore\s*\/\s*weights\.total/, 'Recommandations : le score n’est pas normalisé.');
assertContains(recommendations, /function\s+getSpeakerRecommendationsWithData_\s*\(/, 'Recommandations : le calcul avec données préchargées est absent.');
assertContains(recommendations, /resources\.speakerTalks/, 'Recommandations : les discours déclarés préchargés ne sont pas réutilisés.');
assertContains(recommendations, /resources\.recommendationWeights/, 'Recommandations : les pondérations préchargées ne sont pas réutilisées.');
assertContains(recommendations, /evaluateSpeakerAvailability_/, 'Recommandations : les disponibilités ne sont pas évaluées.');
assertContains(recommendations, /availability\.blocked[\s\S]*eligible\s*=\s*false/, 'Recommandations : un orateur indisponible n’est pas exclu.');
assertContains(recommendations, /preferredBonus/, 'Recommandations : le bonus de date préférée est absent.');
assertContains(recommendations, /avoidPenalty/, 'Recommandations : le malus de date à éviter est absent.');

const settings = read('Settings.gs');
['RECO_POIDS_DISCOURS','RECO_POIDS_ANCIENNETE','RECO_POIDS_MOIS','RECO_POIDS_LOCAL','RECO_POIDS_EQUILIBRE','AUTO_PLAN_MOIS','AUTO_PLAN_SUIVIS','RECO_BONUS_DATE_PREFEREE','RECO_MALUS_DATE_A_EVITER'].forEach(key => assertContains(settings, key, `Paramètres : ${key} est absent.`));
assertContains(settings, /validateRecommendationWeights_/, 'Paramètres : la validation des pondérations est absente.');

const dashboard = read('Dashboard.gs');
const dashboardUi = read('DashboardScripts.html');
assertContains(dashboard, /HORIZON_ACTIONS_JOURS/, 'Tableau de bord : l’horizon configurable est absent.');
assertContains(dashboard, /Conflit de créneau/, 'Tableau de bord : les conflits ne sont pas détectés.');
assertContains(dashboard, /topPriority/, 'Tableau de bord : l’action prioritaire est absente.');
assertContains(dashboardUi, /Action recommandée/, 'Interface : la carte d’action recommandée est absente.');

const utils = read('Utils.gs');
const history = read('History.gs');
const historyUi = read('HistoryScripts.html');
assertContains(utils, /function\s+buildAuditDetails_\s*\(/, 'Audit : le générateur avant-après est absent.');
assertContains(utils, /changedFields/, 'Audit : la liste des champs modifiés est absente.');
assertContains(history, /function\s+historyChanges_\s*\(/, 'Audit : les changements ne sont pas exposés.');
assertContains(historyUi, /history-change-head/, 'Audit : le tableau avant/après est absent de l’interface.');
[
  ['Planning.gs', 'PROGRAMMATION'], ['Speakers.gs', 'ORATEUR'], ['Congregations.gs', 'ASSEMBLEE'],
  ['Talks.gs', 'DISCOURS'], ['HospitalityInvitations.gs', 'HOSPITALITE'],
  ['HospitalityInvitations.gs', 'INVITATION'], ['Settings.gs', 'PARAMETRES'], ['Access.gs', 'UTILISATEUR'],
  ['SpeakerTalks.gs', 'ORATEUR_DISCOURS'], ['SpeakerAvailability.gs', 'ORATEUR_DISPONIBILITES']
].forEach(([file, entity]) => {
  const source = read(file);
  assertContains(source, /buildAuditDetails_\(/, `Audit : ${file} n’utilise pas le format avant-après.`);
  assertContains(source, entity, `Audit : ${entity} n’est pas journalisée.`);
});
assertContains(automatic, /safeAutomaticPlanningAudit_/, 'Audit : la planification automatique n’est pas journalisée.');

const communication = read('HospitalityInvitations.gs');
assertContains(communication, /Une hospitalité existe déjà pour cette programmation/, 'Hospitalité : le contrôle des doublons est absent.');
assertContains(communication, /Une invitation existe déjà pour cette programmation/, 'Invitations : le contrôle des doublons est absent.');
assertContains(communication, /status\s*===\s*['"]ENVOYEE['"][\s\S]*sentDate/, 'Invitations : la date d’envoi automatique est absente.');

const integrity = read('Integrity.gs');
['ORATEUR_ASSEMBLEE_INTRouvable','PROGRAMMATION_ORATEUR_INTRouvable','PROGRAMMATION_DISCOURS_INTRouvable','CRENEAU_DUPLIQUE','HOSPITALITE_PROGRAMMATION_INTRouvable','INVITATION_PROGRAMMATION_INTRouvable','DISCOURS_OFFICIEL_INACTIF','DISPONIBILITE_ORATEUR_INTROUVABLE','DISPONIBILITE_TYPE_INVALIDE','DISPONIBILITE_DATES_INVALIDES','DISPONIBILITE_DUPLIQUEE','DISPONIBILITE_CONTRADICTOIRE'].forEach(code => assertContains(integrity, code, `Intégrité : ${code} est absent.`));
assertContains(integrity, /assertAccess_\(\s*['"]ADMIN['"]/, 'Intégrité : le rapport n’est pas réservé aux administrateurs.');

const talks = read('Talks.gs');
assertContains(talks, /APP_CONFIG\.inactiveTalks\.includes\(Number\(number\)\)/, 'Discours : la réactivation d’un discours inactif n’est pas bloquée.');
assertContains(talks, /version:\s*existing\s*\?\s*existing\.version/, 'Discours : l’import ne transmet pas la version des discours existants.');
const backup = read('Backup.gs');
assertContains(backup, /LockService\.getScriptLock\(\)/, 'Sauvegarde : le verrou est absent.');
assertContains(backup, /createDriveSafetyBackup_\(\)/, 'Sauvegarde : la copie de sécurité est absente.');
assertContains(backup, /500000/, 'Sauvegarde : la limite de cellules est absente.');
assertContains(backup, /Object\.values\(APP_CONFIG\.sheets\)/, 'Sauvegarde : toutes les feuilles configurées ne sont pas incluses.');

if (failures.length) {
  console.error('\nTests des règles métier : ÉCHEC\n');
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}
console.log(`Tests des règles métier réussis : ${assertions} contrôles exécutés.`);
