# CoordoDiscours

Application Google Apps Script de coordination des discours publics.

## État du projet

Version en préparation de recette : **1.5 Stable**

Le dépôt contient désormais :

- le code source Apps Script ;
- la base de données Google Sheets auto-installable ;
- les modules fonctionnels ;
- la gestion Français / Kréyòl Gwadloup ;
- les migrations de structure ;
- les tests automatiques ;
- la documentation d’installation et de recette.

## Modules disponibles

- Tableau de bord et alertes prioritaires.
- Programmation des discours.
- Recommandation automatique des orateurs.
- Assistant de résolution des conflits avec propositions d’un autre orateur, d’une autre date, d’un autre discours, d’une autre assemblée ou d’une combinaison de changements.
- Répertoire des orateurs.
- Répertoire des assemblées.
- Référentiel des discours.
- Discours déclarés par orateur extérieur.
- Invitations.
- Hospitalité.
- Planning imprimable sur 3 ou 6 mois.
- Historique détaillé avant/après.
- Contrôle d’intégrité et diagnostics.
- Sauvegarde et restauration sécurisées.
- Gestion des rôles et des accès.
- Verrouillage optimiste des fiches collaboratives.
- Paramètres généraux et pondérations du moteur de recommandation.
- Choix de la langue de l’interface.

## Principes métier validés

- Un orateur local peut présenter tout discours public actif.
- Un orateur extérieur est limité aux discours déclarés dans sa fiche.
- Les discours 59, 82, 122 et 123 sont inactifs.
- Une répétition d’un même discours dans la période configurée déclenche une alerte non bloquante.
- Une programmation impossible n’est pas enregistrée : l’assistant classe uniquement des propositions qui repassent avec succès dans le moteur central de règles.
- Les conflits multiples peuvent produire une solution combinée portant sur plusieurs champs.
- Une fiche périmée ne peut pas écraser silencieusement la modification d’un autre utilisateur.
- Les modifications importantes sont historisées.
- L’hospitalité concerne en priorité les orateurs extérieurs.

## Structure principale

```text
apps-script/
  Code.gs
  Config.gs
  Database.gs
  Installation.gs
  Dashboard.gs
  Planning.gs
  RulesEngine.gs
  RecommendationEngine.gs
  ConflictResolution.gs
  Concurrency.gs
  Speakers.gs
  SpeakerTalks.gs
  Congregations.gs
  Talks.gs
  HospitalityInvitations.gs
  PrintPlanning.gs
  History.gs
  Integrity.gs
  Backup.gs
  Access.gs
  Settings.gs
  I18n.gs
  Utils.gs
  Index.html
  appsscript.json

scripts/
  validate-apps-script.mjs
  test-business-rules.mjs
  test-conflict-resolution.mjs

docs/
  INSTALLATION.md
  PLAN_TESTS.md
  ARCHITECTURE.md
  MODELE_DONNEES.md
  REGLES_METIER.md
  ROADMAP.md
```

## Installation rapide

1. Créer un projet Google Apps Script.
2. Copier tous les fichiers du dossier `apps-script/`.
3. Exécuter `installCoordoDiscours`.
4. Vérifier que le résultat contient `success: true`.
5. Exécuter `runAcceptanceTests`.
6. Déployer le projet comme application web en accès restreint pour la recette.

La procédure détaillée se trouve dans `docs/INSTALLATION.md`.

## Validation

La commande `npm run check` exécute :

1. la validation de la structure Apps Script et des contrôles d’accès ;
2. les tests des règles métier ;
3. six scénarios exécutables de résolution des conflits.

Le plan complet de vérification fonctionnelle se trouve dans `docs/PLAN_TESTS.md`.

La version ne doit pas encore être considérée comme définitivement validée avant son exécution réelle dans Google Apps Script et la réussite de la recette fonctionnelle.
