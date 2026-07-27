import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('apps-script');
const required = [
  'appsscript.json','Config.gs','Database.gs','Installation.gs','Code.gs','Index.html',
  'Styles.html','Scripts.html','Planning.gs','PlanningScripts.html','Dashboard.gs',
  'DashboardScripts.html','Speakers.gs','Talks.gs','Congregations.gs','History.gs',
  'HistoryScripts.html','Settings.gs','SettingsScripts.html','I18n.gs','I18nScripts.html',
  'Backup.gs','BackupScripts.html','BackupStyles.html','Access.gs','AccessScripts.html',
  'HospitalityInvitations.gs','CommunicationScripts.html'
];

const errors = [];
for (const file of required) {
  if (!fs.existsSync(path.join(root, file))) errors.push(`Fichier obligatoire manquant : ${file}`);
}

const manifestPath = path.join(root, 'appsscript.json');
if (fs.existsSync(manifestPath)) {
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    if (manifest.runtimeVersion !== 'V8') errors.push('Le runtime Apps Script doit être V8.');
    if (!manifest.timeZone) errors.push('Le fuseau horaire est absent du manifeste.');
  } catch (error) {
    errors.push(`appsscript.json invalide : ${error.message}`);
  }
}

const indexPath = path.join(root, 'Index.html');
if (fs.existsSync(indexPath)) {
  const index = fs.readFileSync(indexPath, 'utf8');
  const includes = [...index.matchAll(/include\('([^']+)'\)/g)].map(match => match[1]);
  for (const include of includes) {
    if (!fs.existsSync(path.join(root, `${include}.html`))) {
      errors.push(`Include HTML introuvable : ${include}.html`);
    }
  }
  if (!index.includes('SettingsScripts')) errors.push('Le script des paramètres n’est pas inclus.');
}

const codePath = path.join(root, 'Code.gs');
if (fs.existsSync(codePath)) {
  const code = fs.readFileSync(codePath, 'utf8');
  const index = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : '';
  const i18nLoaded = index.includes('I18nScripts') || code.includes("createHtmlOutputFromFile('I18nScripts')");
  const accessLoaded = index.includes('AccessScripts') || code.includes("createHtmlOutputFromFile('AccessScripts')");
  if (!i18nLoaded) errors.push('Le moteur multilingue n’est pas chargé par l’interface.');
  if (!accessLoaded) errors.push('Le contrôle des droits d’accès n’est pas chargé par l’interface.');
}

const configPath = path.join(root, 'Config.gs');
if (fs.existsSync(configPath)) {
  const config = fs.readFileSync(configPath, 'utf8');
  if (!config.includes("users: 'UTILISATEURS'")) errors.push('La feuille UTILISATEURS n’est pas déclarée dans Config.gs.');
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
  ['Planning.gs', 'savePlanning', 'COORDINATEUR'],
  ['Planning.gs', 'cancelPlanning', 'COORDINATEUR'],
  ['Planning.gs', 'restorePlanning', 'COORDINATEUR'],
  ['HospitalityInvitations.gs', 'saveHospitality', 'COORDINATEUR'],
  ['HospitalityInvitations.gs', 'setHospitalityStatus', 'COORDINATEUR'],
  ['HospitalityInvitations.gs', 'saveInvitation', 'COORDINATEUR'],
  ['HospitalityInvitations.gs', 'setInvitationStatus', 'COORDINATEUR'],
  ['Settings.gs', 'saveApplicationSettings', 'ADMIN'],
  ['Settings.gs', 'resetApplicationSettings', 'ADMIN'],
  ['Backup.gs', 'createApplicationBackup', 'ADMIN'],
  ['Backup.gs', 'restoreApplicationBackup', 'ADMIN']
];

for (const [file, functionName, role] of protectedFunctions) {
  const filePath = path.join(root, file);
  if (!fs.existsSync(filePath)) continue;
  const source = fs.readFileSync(filePath, 'utf8');
  const functionPattern = new RegExp(`function\\s+${functionName}\\s*\\([^)]*\\)\\s*\\{([\\s\\S]*?)(?=\\nfunction\\s+|$)`);
  const match = source.match(functionPattern);
  if (!match) {
    errors.push(`Fonction sensible introuvable : ${functionName} dans ${file}.`);
    continue;
  }
  if (!match[1].includes(`assertAccess_('${role}'`)) {
    errors.push(`${file} : ${functionName} doit exiger le rôle ${role}.`);
  }
}

const allFiles = fs.existsSync(root) ? fs.readdirSync(root) : [];
for (const file of allFiles.filter(name => name.endsWith('.gs'))) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  if (/\bvar\s+SPREADSHEET_ID\b/.test(source)) {
    errors.push(`${file} contient encore une configuration SPREADSHEET_ID héritée.`);
  }
}

if (errors.length) {
  console.error('\nValidation CoordoDiscours : ÉCHEC\n');
  errors.forEach(error => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`Validation CoordoDiscours réussie : ${required.length} fichiers essentiels et ${protectedFunctions.length} fonctions sensibles contrôlés.`);
