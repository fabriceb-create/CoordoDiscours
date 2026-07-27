import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('apps-script');
const required = [
  'appsscript.json','Config.gs','Database.gs','Installation.gs','Code.gs','Index.html',
  'Styles.html','Scripts.html','Planning.gs','PlanningScripts.html','Dashboard.gs',
  'DashboardScripts.html','Speakers.gs','Talks.gs','Congregations.gs','History.gs',
  'HistoryScripts.html','Settings.gs','SettingsScripts.html','I18n.gs','I18nScripts.html',
  'Backup.gs','BackupScripts.html','BackupStyles.html'
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
  if (!index.includes('BackupScripts')) errors.push('Le script de sauvegarde n’est pas inclus.');
  if (!index.includes('view-backup')) errors.push('La page de sauvegarde est absente de l’interface.');
}

const codePath = path.join(root, 'Code.gs');
if (fs.existsSync(codePath)) {
  const code = fs.readFileSync(codePath, 'utf8');
  const directInclude = fs.readFileSync(indexPath, 'utf8').includes('I18nScripts');
  const bundledInclude = code.includes("createHtmlOutputFromFile('I18nScripts')");
  if (!directInclude && !bundledInclude) errors.push('Le moteur multilingue n’est pas chargé par l’interface.');
}

const backupPath = path.join(root, 'Backup.gs');
if (fs.existsSync(backupPath)) {
  const backup = fs.readFileSync(backupPath, 'utf8');
  if (!backup.includes('LockService.getScriptLock')) errors.push('La restauration doit utiliser un verrou Apps Script.');
  if (!backup.includes("confirmation || '').trim().toUpperCase() !== 'RESTAURER'")) errors.push('La confirmation de restauration est absente.');
  if (!backup.includes('createDriveSafetyBackup_')) errors.push('La copie de sécurité avant restauration est absente.');
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

console.log(`Validation CoordoDiscours réussie : ${required.length} fichiers essentiels contrôlés.`);