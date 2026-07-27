# CoordoDiscours

Application de coordination des discours publics pour l'assemblée de Basse-Terre.

## État du projet

Version en développement : **1.4 Stable**

Cette première base GitHub rassemble :

- la documentation fonctionnelle ;
- l'architecture Apps Script ;
- le modèle de données ;
- la feuille de route ;
- le code source de l'application.

## Principes métier déjà validés

- Un orateur local peut présenter tout discours public actif.
- Un orateur extérieur est limité aux discours déclarés dans sa fiche.
- Les discours 59, 82, 122 et 123 sont inactifs.
- Une répétition d'un même discours dans les 12 mois déclenche une alerte non bloquante.
- Les déplacements, échanges et remplacements doivent conserver un historique complet.
- L'hospitalité concerne les orateurs extérieurs.
- L'assistant dispose d'un accès en lecture seule.

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

docs/
  ARCHITECTURE.md
  MODELE_DONNEES.md
  REGLES_METIER.md
  ROADMAP.md
  CHANGELOG.md
```

## Installation

La procédure d'installation sera ajoutée lorsque la version 1.4 Stable sera prête à être testée.
