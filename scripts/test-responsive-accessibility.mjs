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

function assertNotContains(source, pattern, message) {
  assertions += 1;
  const found = pattern instanceof RegExp ? pattern.test(source) : source.includes(pattern);
  if (found) failures.push(message);
}

const index = read('Index.html');
const styles = read('Styles.html');
const scripts = read('Scripts.html');
const planning = read('PlanningScripts.html');
const communication = read('CommunicationScripts.html');
const automatic = read('AutomaticPlanningScripts.html');
const dashboard = read('DashboardScripts.html');
const versions = read('VersionHistoryScripts.html');
const printable = read('PrintPlanningScripts.html');
const history = read('HistoryScripts.html');
const backup = read('BackupScripts.html');
const settings = read('SettingsScripts.html');
const access = read('AccessScripts.html');
const i18n = read('I18nScripts.html');

assertContains(index, /class="skip-link"\s+href="#main-content"/, 'Accessibilité : le lien d’évitement vers le contenu principal est absent.');
assertContains(index, /id="app-sidebar"[\s\S]*aria-label="Navigation principale"/, 'Accessibilité : la navigation principale n’est pas nommée.');
assertContains(index, /id="mobile-menu-toggle"[\s\S]*aria-controls="app-sidebar"[\s\S]*aria-expanded="false"/, 'Mobile : le bouton d’ouverture ne contrôle pas correctement le tiroir.');
assertContains(index, /id="mobile-menu-close"[\s\S]*aria-label="Fermer le menu"/, 'Mobile : le bouton de fermeture du tiroir est absent.');
assertContains(index, /id="sidebar-backdrop"[\s\S]*aria-label="Fermer le menu"/, 'Mobile : l’arrière-plan permettant de fermer le tiroir est absent.');
assertContains(index, /id="main-content"[\s\S]*tabindex="-1"/, 'Accessibilité : le contenu principal ne peut pas recevoir le focus.');
assertContains(index, /id="toast"[\s\S]*role="status"[\s\S]*aria-live="polite"/, 'Accessibilité : les messages utilisateur ne sont pas annoncés.');
assertContains(index, /id="status"[\s\S]*role="status"[\s\S]*aria-live="polite"/, 'Accessibilité : l’état de l’application n’est pas annoncé.');
assertContains(index, /data-close="planning-dialog"[\s\S]*aria-label="Fermer la fenêtre"/, 'Accessibilité : les boutons de fermeture des fenêtres ne sont pas nommés.');

assertContains(styles, /:focus-visible/, 'Accessibilité : aucun style de focus clavier visible n’est défini.');
assertContains(styles, /body\.navigation-open \.sidebar/, 'Mobile : le tiroir ne possède pas d’état ouvert.');
assertContains(styles, /\.sidebar-backdrop/, 'Mobile : le voile de fond du tiroir n’est pas stylé.');
assertContains(styles, /100dvh/, 'Mobile : la hauteur dynamique de la fenêtre n’est pas prise en compte.');
assertContains(styles, /@media \(max-width: 820px\)/, 'Mobile : le point de rupture principal est absent.');
assertContains(styles, /@media \(prefers-reduced-motion: reduce\)/, 'Accessibilité : la préférence de réduction des animations n’est pas respectée.');

assertContains(scripts, /const MOBILE_NAV_BREAKPOINT = 820/, 'Mobile : la largeur de bascule du tiroir n’est pas centralisée.');
assertContains(scripts, /function\s+setMobileNavigationOpen_\s*\(/, 'Mobile : le contrôleur du tiroir est absent.');
assertContains(scripts, /aria-expanded/, 'Mobile : l’état du bouton de menu n’est pas exposé.');
assertContains(scripts, /sidebar\.inert/, 'Accessibilité : la navigation hors écran reste accessible au clavier.');
assertContains(scripts, /event\.key === 'Escape'/, 'Clavier : la touche Échap ne ferme pas la navigation mobile.');
assertContains(scripts, /event\.key !== 'Tab'/, 'Clavier : le focus n’est pas contenu dans le tiroir ouvert.');
assertContains(scripts, /aria-current/, 'Accessibilité : la section active n’est pas exposée dans la navigation.');
assertContains(scripts, /coordodiscours:viewchange/, 'Navigation : l’événement central de changement de vue est absent.');
assertContains(scripts, /function\s+withBusyElement_\s*\(/, 'Fiabilité : la protection contre les doubles actions est absente.');
assertContains(scripts, /function\s+invalidatePlanningDependentCaches_\s*\(/, 'Performance : l’invalidation des caches dépendants du planning est absente.');
assertContains(scripts, /toast\(message, tone\)/, 'Accessibilité : les messages d’erreur ne peuvent pas utiliser un canal assertif.');

assertContains(planning, /PLANNING_OPTIONS_CACHE_TTL_MS = 60000/, 'Performance : le cache court des options de programmation est absent.');
assertContains(planning, /state\.planningOptionsRequest/, 'Performance : les demandes simultanées d’options de programmation ne sont pas mutualisées.');
assertContains(planning, /state\.planningOptionsLoadedAt/, 'Performance : l’ancienneté du cache des options n’est pas suivie.');
assertContains(planning, /coordodiscours:viewchange/, 'Navigation : la programmation ne se charge pas lors d’une navigation par lien ou historique.');
assertContains(planning, /planningListRequestId/, 'Performance : une ancienne recherche de programmation peut encore remplacer une réponse récente.');
assertContains(planning, /invalidatePlanningDependentCaches_\(\)/, 'Performance : les écritures de programmation n’invalident pas les listes partagées.');

assertContains(communication, /COMMUNICATION_OPTIONS_CACHE_TTL_MS = 60000/, 'Performance : le cache court des programmations de communication est absent.');
assertContains(communication, /optionsRequest/, 'Performance : les demandes simultanées de communication ne sont pas mutualisées.');
assertContains(communication, /function\s+invalidateCommunicationOptions_\s*\(/, 'Performance : le cache de communication ne peut pas être invalidé.');
assertContains(communication, /Promise\.all\(/, 'Performance : les options et les listes de communication restent chargées séquentiellement.');
assertContains(communication, /hospitalityRequestId/, 'Performance : les anciennes recherches d’hospitalité ne sont pas ignorées.');
assertContains(communication, /invitationRequestId/, 'Performance : les anciennes recherches d’invitation ne sont pas ignorées.');
assertContains(communication, /coordodiscours:viewchange/, 'Navigation : les modules de communication ne réagissent pas au changement central de vue.');
assertNotContains(communication, /originalShowView/, 'Navigation : CommunicationScripts remplace encore directement la fonction globale showView.');

[dashboard, versions, printable, history, backup, settings].forEach((source, indexFile) => {
  const labels = ['Tableau de bord', 'Versions', 'Impression', 'Historique', 'Sauvegarde', 'Paramètres'];
  assertContains(source, /coordodiscours:viewchange/, `Navigation : ${labels[indexFile]} ne réagit pas au changement central de vue.`);
});
assertContains(automatic, /invalidatePlanningDependentCaches_\(\)/, 'Performance : la planification automatique n’invalide pas les listes dépendantes.');
assertContains(backup, /state\.speakers = \[\][\s\S]*invalidatePlanningDependentCaches_\(\)/, 'Performance : une restauration complète ne vide pas les caches client.');
assertContains(settings, /state\.automaticPlanningDraft/, 'Fiabilité : un changement de paramètres ne rend pas le brouillon automatique obsolète côté interface.');
assertContains(access, /\['view-backup', 'view-settings'\]/, 'Sécurité UI : une vue administrateur ouverte par lien n’est pas refermée pour un rôle insuffisant.');
assertContains(i18n, /\[aria-label\]/, 'Traduction : les libellés accessibles ne sont pas traduits.');

const scriptFiles = fs.readdirSync(root).filter(file => file.endsWith('.html'));
for (const file of scriptFiles) {
  const source = read(file);
  const blocks = [...source.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[1]);
  blocks.forEach((block, indexBlock) => {
    assertions += 1;
    try { new Function(block); }
    catch (error) { failures.push(`Syntaxe JavaScript invalide dans ${file}, bloc ${indexBlock + 1} : ${error.message}`); }
  });
}

if (failures.length) {
  console.error('\nTests responsive, accessibilité et performance : ÉCHEC\n');
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Tests responsive, accessibilité et performance réussis : ${assertions} contrôles exécutés.`);
