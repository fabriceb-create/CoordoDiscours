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
assertContains(planning, /sameSlot[\s\S]*créneau est déjà occupé/, 'Planning : le blocage d’un créneau déjà occupé est absent.');
assertContains(planning, /speaker\.type\s*===\s*['"]EXTERIEUR['"][\s\S]*getSpeakerTalkNumbers_/, 'Planning : le contrôle des discours autorisés pour un orateur extérieur est absent.');
assertContains(planning, /ALERTE_REPETITION_MOIS[\s\S]*warnings\.push/, 'Planning : l’alerte de répétition d’un discours est absente.');
assertContains(planning, /validation\.warnings\.length\s*&&\s*!confirmWarnings/, 'Planning : la confirmation des avertissements avant enregistrement est absente.');
assertContains(planning, /status\s*!==\s*['"]ANNULE['"]/, 'Planning : les programmations annulées ne sont pas exclues des contrôles.');

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
