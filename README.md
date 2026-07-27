# CoordoDiscours

Application Google Apps Script de coordination des discours publics.

## État du projet

Version en préparation de recette : **1.4 Stable**

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
- Répertoire des orateurs.
- Répertoire des assemblées.
- Référentiel des discours.
- Discours déclarés par orateur extérieur.
- Invitations.
- Hospitalité.
- Planning imprimable sur 3 ou 6 mois.
- Historique des opérations.
- Paramètres généraux.
- Choix de la langue de l’interface.

## Principes métier validés

- Un orateur local peut présenter tout discours public actif.
- Un orateur extérieur est limité aux discours déclarés dans sa fiche.
- Les discours 59, 82, 122 et 123 sont inactifs.
- Une répétition d’un même discours dans les 12 mois déclenche une alerte non bloquante.
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
  Speakers.gs
  Congregations.gs
  Talks.gs
  HospitalityInvitations.gs
  PrintPlanning.gs
  History.gs
  Settings.gs
  I18n.gs
  Utils.gs
  Index.html
  appsscript.json

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

Le plan complet de vérification fonctionnelle se trouve dans `docs/PLAN_TESTS.md`.

La version ne doit pas encore être considérée comme définitivement stable avant son exécution réelle dans Google Apps Script et la réussite de la recette fonctionnelle.
