# Architecture technique

## Plateforme

- Google Apps Script
- Google Sheets comme stockage initial
- Application web HTML Service
- Déploiement exécuté sous le compte du coordinateur

## Structure cible

```text
apps-script/
  Code.gs
  Config.gs
  Database.gs
  Dashboard.gs
  Planning.gs
  Speakers.gs
  Congregations.gs
  Talks.gs
  History.gs
  Utils.gs
  Index.html
  Styles.html
  Scripts.html
  appsscript.json
```

## Principes

1. La configuration est centralisée dans `Config.gs`.
2. L'accès aux feuilles est centralisé dans `Database.gs`.
3. Chaque domaine métier possède son propre module.
4. L'interface appelle les fonctions serveur avec `google.script.run`.
5. Les données sont validées côté serveur avant toute écriture.
6. Les identifiants techniques sont stables et indépendants des numéros de ligne.
7. Chaque modification sensible écrit une entrée dans l'historique.

## Installation

La version stable sera conçue comme un projet Apps Script lié directement au Google Sheets de données. La fonction d'installation créera ou vérifiera automatiquement les feuilles nécessaires, sans demander à l'utilisateur de modifier un identifiant dans le code.

## Évolutivité

L'architecture doit permettre à terme :

- l'ajout d'un portail orateur ;
- la gestion de plusieurs assemblées ;
- l'envoi de courriels ;
- la génération de PDF ;
- une migration future vers une base de données externe.
