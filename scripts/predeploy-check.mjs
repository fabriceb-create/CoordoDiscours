import fs from 'node:fs';
import path from 'node:path';

const errors = [];
const warnings = [];
const root = process.cwd();
const claspPath = path.join(root, '.clasp.json');
const examplePath = path.join(root, '.clasp.json.example');
const manifestPath = path.join(root, 'apps-script', 'appsscript.json');

if (!fs.existsSync(examplePath)) {
  errors.push('Le fichier .clasp.json.example est absent.');
}

if (!fs.existsSync(claspPath)) {
  warnings.push('Le fichier local .clasp.json est absent. Copie .clasp.json.example puis renseigne le scriptId avant un push réel.');
} else {
  try {
    const clasp = JSON.parse(fs.readFileSync(claspPath, 'utf8'));
    if (!clasp.scriptId || /REMPLACER|PLACEHOLDER/i.test(String(clasp.scriptId))) {
      errors.push('Le scriptId de .clasp.json n’est pas renseigné.');
    }
    if (clasp.rootDir !== 'apps-script') {
      errors.push('Le rootDir de .clasp.json doit être apps-script.');
    }
  } catch (error) {
    errors.push(`.clasp.json invalide : ${error.message}`);
  }
}

if (!fs.existsSync(manifestPath)) {
  errors.push('Le manifeste apps-script/appsscript.json est absent.');
} else {
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    if (manifest.runtimeVersion !== 'V8') errors.push('Le runtime Apps Script doit être V8.');
    if (manifest.timeZone !== 'America/Guadeloupe') warnings.push('Le fuseau horaire n’est pas America/Guadeloupe.');
    if (!manifest.webapp) {
      errors.push('La configuration webapp est absente du manifeste.');
    } else {
      if (manifest.webapp.executeAs !== 'USER_DEPLOYING') {
        warnings.push('L’application ne s’exécute pas avec le compte du propriétaire. Vérifier les conséquences sur les accès aux données.');
      }
      if (manifest.webapp.access === 'MYSELF') {
        warnings.push('Le déploiement est limité au propriétaire. Les autres utilisateurs ne pourront pas ouvrir l’application tant que ce réglage n’est pas modifié.');
      }
    }
  } catch (error) {
    errors.push(`appsscript.json invalide : ${error.message}`);
  }
}

console.log('\nPréparation au déploiement CoordoDiscours\n');
warnings.forEach(message => console.warn(`AVERTISSEMENT - ${message}`));
if (errors.length) {
  errors.forEach(message => console.error(`ERREUR - ${message}`));
  process.exit(1);
}
console.log('Contrôles avant déploiement terminés sans erreur bloquante.');
