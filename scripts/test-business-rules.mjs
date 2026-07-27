import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('apps-script');
const failures = [];
let assertions = 0;
function read(file) { const filePath = path.join(root, file); if (!fs.existsSync(filePath)) { failures.push(`Fichier introuvable : ${file}`); return ''; } return fs.readFileSync(filePath, 'utf8'); }
function assertContains(source, pattern, message) { assertions += 1; const ok = pattern instanceof RegExp ? pattern.test(source) : source.includes(pattern); if (!ok) failures.push(message); }

const planning = read('Planning.gs');
const rules = read('RulesEngine.gs');
assertContains(planning, /evaluatePlanningRules_\(data\)/, 'Planning : le moteur central de règles n’est pas utilisé.');
assertContains(planning, /validation\.warnings\.length\s*&&\s*!confirmWarnings/, 'Planning : la confirmation des avertissements est absente.');
assertContains(planning, /status\s*!==\s*['"]ANNULE['"]/, 'Planning : les programmations annulées ne sont pas exclues.');
['PLAN_001','PLAN_002','PLAN_003','PLAN_004','PLAN_005','PLAN_006','PLAN_007'].forEach(code => assertContains(rules, code, `Règles : ${code} est absente.`));
assertContains(rules, /RULE_SEVERITY[\s\S]*ERROR[\s\S]*WARNING[\s\S]*INFO/, 'Règles : les niveaux de sévérité sont absents.');

const concurrency = read('Concurrency.gs');
const planningUi = read('PlanningScripts.html');
assertContains(concurrency, /function\s+assertEntityVersion_\s*\(/, 'Concurrence : le contrôle de version est absent.');
assertContains(concurrency, /CONFLIT_VERSION/, 'Concurrence : le code de conflit explicite est absent.');
assertContains(concurrency, /function\s+advanceEntityVersion_\s*\(/, 'Concurrence : le renouvellement de version est absent.');
assertContains(planning, /assertEntityVersion_\(['"]PROGRAMMATION['"]/, 'Planning : la version attendue n’est pas contrôlée.');
assertContains(planning, /LockService\.getScriptLock\(\)/, 'Planning : la vérification et l’écriture ne sont pas protégées par un verrou.');
assertContains(planning, /version:\s*String\(data\.version/, 'Planning : la version du formulaire n’est pas normalisée.');
assertContains(planningUi, /ensurePlanningVersionField_/, 'Interface : le champ de version de la programmation est absent.');
assertContains(planningUi, /handlePlanningVersionConflict_/, 'Interface : aucun traitement du conflit de version n’est prévu.');
assertContains(planningUi, /data-version=/, 'Interface : les changements de statut ne transmettent pas la version.');

const recommendations = read('RecommendationEngine.gs');
assertContains(recommendations, /function\s+getSpeakerRecommendations\s*\(/, 'Recommandations : le point d’entrée est absent.');
assertContains(recommendations, /scoreSpeakerRecommendation_\(/, 'Recommandations : le calcul du score est absent.');
assertContains(recommendations, /sameMonthCount/, 'Recommandations : la fréquence mensuelle est absente.');
assertContains(recommendations, /Math\.min\(100/, 'Recommandations : le score n’est pas plafonné.');
assertContains(recommendations, /function\s+getRecommendationWeights_\s*\(/, 'Recommandations : les pondérations sont absentes.');
assertContains(recommendations, /rawScore\s*\/\s*weights\.total/, 'Recommandations : le score n’est pas normalisé.');

const settings = read('Settings.gs');
['RECO_POIDS_DISCOURS','RECO_POIDS_ANCIENNETE','RECO_POIDS_MOIS','RECO_POIDS_LOCAL','RECO_POIDS_EQUILIBRE'].forEach(key => assertContains(settings, key, `Paramètres : ${key} est absent.`));
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
  ['HospitalityInvitations.gs', 'INVITATION'], ['Settings.gs', 'PARAMETRES'], ['Access.gs', 'UTILISATEUR']
].forEach(([file, entity]) => {
  const source = read(file);
  assertContains(source, /buildAuditDetails_\(/, `Audit : ${file} n’utilise pas le format avant-après.`);
  assertContains(source, entity, `Audit : ${entity} n’est pas journalisée.`);
});

const communication = read('HospitalityInvitations.gs');
assertContains(communication, /Une hospitalité existe déjà pour cette programmation/, 'Hospitalité : le contrôle des doublons est absent.');
assertContains(communication, /Une invitation existe déjà pour cette programmation/, 'Invitations : le contrôle des doublons est absent.');
assertContains(communication, /status\s*===\s*['"]ENVOYEE['"][\s\S]*setValue\(new Date\(\)\)/, 'Invitations : la date d’envoi automatique est absente.');

const integrity = read('Integrity.gs');
['ORATEUR_ASSEMBLEE_INTRouvable','PROGRAMMATION_ORATEUR_INTRouvable','PROGRAMMATION_DISCOURS_INTRouvable','CRENEAU_DUPLIQUE','HOSPITALITE_PROGRAMMATION_INTRouvable','INVITATION_PROGRAMMATION_INTRouvable','DISCOURS_OFFICIEL_INACTIF'].forEach(code => assertContains(integrity, code, `Intégrité : ${code} est absent.`));
assertContains(integrity, /assertAccess_\(\s*['"]ADMIN['"]/, 'Intégrité : le rapport n’est pas réservé aux administrateurs.');

const talks = read('Talks.gs');
assertContains(talks, /APP_CONFIG\.inactiveTalks\.includes\(Number\(number\)\)/, 'Discours : la réactivation d’un discours inactif n’est pas bloquée.');
const backup = read('Backup.gs');
assertContains(backup, /LockService\.getScriptLock\(\)/, 'Sauvegarde : le verrou est absent.');
assertContains(backup, /createDriveSafetyBackup_\(\)/, 'Sauvegarde : la copie de sécurité est absente.');
assertContains(backup, /500000/, 'Sauvegarde : la limite de cellules est absente.');

if (failures.length) {
  console.error('\nTests des règles métier : ÉCHEC\n');
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}
console.log(`Tests des règles métier réussis : ${assertions} contrôles exécutés.`);
