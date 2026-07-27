import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('apps-script');
const failures = [];
let assertions = 0;

function read(file) {
  const filePath = path.join(root, file);
  if (!fs.existsSync(filePath)) {
    failures.push(`Fichier introuvable : ${file}`);
    return '';
  }
  return fs.readFileSync(filePath, 'utf8');
}

function assertContains(source, pattern, message) {
  assertions += 1;
  const ok = pattern instanceof RegExp ? pattern.test(source) : source.includes(pattern);
  if (!ok) failures.push(message);
}

const planning = read('Planning.gs');
const rules = read('RulesEngine.gs');
assertContains(planning, /evaluatePlanningRules_\(data\)/, 'Planning : le moteur central de règles n’est pas utilisé.');
assertContains(planning, /validation\.warnings\.length\s*&&\s*!confirmWarnings/, 'Planning : la confirmation des avertissements avant enregistrement est absente.');
assertContains(planning, /status\s*!==\s*['"]ANNULE['"]/, 'Planning : les programmations annulées ne sont pas exclues des contrôles.');
assertContains(rules, /PLAN_001[\s\S]*orateur sélectionné est introuvable ou archivé/, 'Règles : le contrôle de l’orateur actif est absent.');
assertContains(rules, /PLAN_002[\s\S]*discours sélectionné est introuvable ou inactif/, 'Règles : le contrôle du discours actif est absent.');
assertContains(rules, /PLAN_003[\s\S]*orateur extérieur/, 'Règles : le contrôle des discours autorisés pour un orateur extérieur est absent.');
assertContains(rules, /PLAN_004[\s\S]*assemblée d’origine/, 'Règles : le contrôle de l’assemblée d’origine est absent.');
assertContains(rules, /PLAN_005[\s\S]*créneau est déjà occupé/, 'Règles : le blocage d’un créneau déjà occupé est absent.');
assertContains(rules, /PLAN_006[\s\S]*déjà programmé à cette date/, 'Règles : l’avertissement de double programmation d’un orateur est absent.');
assertContains(rules, /PLAN_007[\s\S]*déjà été programmé/, 'Règles : l’alerte de répétition d’un discours est absente.');
assertContains(rules, /RULE_SEVERITY[\s\S]*ERROR[\s\S]*WARNING[\s\S]*INFO/, 'Règles : les niveaux de sévérité ne sont pas définis.');

const recommendations = read('RecommendationEngine.gs');
assertContains(recommendations, /function\s+getSpeakerRecommendations\s*\(/, 'Recommandations : le point d’entrée serveur est absent.');
assertContains(recommendations, /scoreSpeakerRecommendation_\(/, 'Recommandations : le calcul individuel du score est absent.');
assertContains(recommendations, /speaker\.type\s*===\s*['"]EXTERIEUR['"][\s\S]*getSpeakerTalkNumbers_/, 'Recommandations : les discours déclarés des orateurs extérieurs ne sont pas contrôlés.');
assertContains(recommendations, /sameMonthCount/, 'Recommandations : la fréquence mensuelle n’est pas prise en compte.');
assertContains(recommendations, /Math\.min\(100/, 'Recommandations : le score n’est pas plafonné à 100.');
assertContains(recommendations, /slice\(0,\s*12\)/, 'Recommandations : le nombre de résultats serveur n’est pas limité.');
assertContains(recommendations, /function\s+getRecommendationWeights_\s*\(/, 'Recommandations : le chargement des pondérations configurables est absent.');
assertContains(recommendations, /RECO_POIDS_DISCOURS/, 'Recommandations : le poids du discours configuré n’est pas utilisé.');
assertContains(recommendations, /rawScore\s*\/\s*weights\.total/, 'Recommandations : le score n’est pas normalisé selon le total des pondérations.');

const settings = read('Settings.gs');
['RECO_POIDS_DISCOURS','RECO_POIDS_ANCIENNETE','RECO_POIDS_MOIS','RECO_POIDS_LOCAL','RECO_POIDS_EQUILIBRE']
  .forEach(key => assertContains(settings, key, `Paramètres : la pondération ${key} est absente.`));
assertContains(settings, /validateRecommendationWeights_/, 'Paramètres : la validation du total des pondérations est absente.');

const planningUi = read('PlanningScripts.html');
assertContains(planningUi, /getSpeakerRecommendations/, 'Interface : les recommandations ne sont pas chargées depuis le serveur.');
assertContains(planningUi, /data-select-recommended-speaker/, 'Interface : aucun bouton ne permet de choisir un orateur recommandé.');
assertContains(planningUi, /event\.target\.name\s*===\s*['"]date['"]/, 'Interface : les recommandations ne sont pas recalculées après changement de date.');

const dashboard = read('Dashboard.gs');
const dashboardUi = read('DashboardScripts.html');
assertContains(dashboard, /HORIZON_ACTIONS_JOURS/, 'Tableau de bord : l’horizon configurable des actions n’est pas utilisé.');
assertContains(dashboard, /Conflit de créneau/, 'Tableau de bord : la détection des conflits de créneau est absente.');
assertContains(dashboard, /Invitation à traiter/, 'Tableau de bord : les invitations à traiter ne sont pas signalées.');
assertContains(dashboard, /Hospitalité à attribuer/, 'Tableau de bord : les hospitalités à attribuer ne sont pas signalées.');
assertContains(dashboard, /topPriority/, 'Tableau de bord : l’action prioritaire n’est pas calculée.');
assertContains(dashboardUi, /Action recommandée/, 'Interface : la carte d’action recommandée est absente.');
assertContains(dashboardUi, /metrics\.confirmations/, 'Interface : les confirmations en attente ne sont pas affichées.');

const communication = read('HospitalityInvitations.gs');
assertContains(communication, /Une hospitalité existe déjà pour cette programmation/, 'Hospitalité : le contrôle des doublons est absent.');
assertContains(communication, /Une invitation existe déjà pour cette programmation/, 'Invitations : le contrôle des doublons est absent.');
assertContains(communication, /status\s*===\s*['"]ENVOYEE['"][\s\S]*setValue\(new Date\(\)\)/, 'Invitations : la date d’envoi automatique est absente.');
assertContains(communication, /La programmation sélectionnée est introuvable ou annulée/, 'Communication : la validation de la programmation liée est absente.');

const integrity = read('Integrity.gs');
[
  'ORATEUR_ASSEMBLEE_INTRouvable',
  'PROGRAMMATION_ORATEUR_INTRouvable',
  'PROGRAMMATION_DISCOURS_INTRouvable',
  'CRENEAU_DUPLIQUE',
  'HOSPITALITE_PROGRAMMATION_INTRouvable',
  'INVITATION_PROGRAMMATION_INTRouvable',
  'DISCOURS_OFFICIEL_INACTIF'
].forEach(code => assertContains(integrity, code, `Intégrité : le contrôle ${code} est absent.`));
assertContains(integrity, /assertAccess_\(\s*['"]ADMIN['"]/, 'Intégrité : le rapport public doit être réservé aux administrateurs.');
assertContains(integrity, /ok:\s*!issues\.some\(/, 'Intégrité : le calcul de l’état global est absent.');

const talks = read('Talks.gs');
assertContains(talks, /APP_CONFIG\.inactiveTalks\.includes\(Number\(number\)\)/, 'Discours : la réactivation d’un discours officiellement inactif n’est pas bloquée.');

const backup = read('Backup.gs');
assertContains(backup, /LockService\.getScriptLock\(\)/, 'Sauvegarde : la restauration n’utilise pas de verrou applicatif.');
assertContains(backup, /createDriveSafetyBackup_\(\)/, 'Sauvegarde : la copie de sécurité avant restauration est absente.');
assertContains(backup, /500000/, 'Sauvegarde : la limite de sécurité du nombre de cellules est absente.');

if (failures.length) {
  console.error('\nTests des règles métier : ÉCHEC\n');
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Tests des règles métier réussis : ${assertions} contrôles exécutés.`);