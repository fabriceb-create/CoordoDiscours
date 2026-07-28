# Architecture technique

## Plateforme

- Google Apps Script V8.
- Google Sheets comme stockage principal.
- Application web HTML Service.
- Déploiement exécuté sous le compte du propriétaire du projet.
- GitHub Actions pour la validation automatique.

## Structure principale

```text
apps-script/
  Code.gs
  Config.gs
  Database.gs
  Installation.gs
  ServerCache.gs
  Performance.gs
  SupportDiagnostics.gs
  Help.gs
  ReleaseReadiness.gs

  Planning.gs
  RulesEngine.gs
  RecommendationEngine.gs
  ConflictResolution.gs
  AutomaticPlanning.gs
  MergeEngine.gs
  VersionHistory.gs
  Concurrency.gs

  Speakers.gs
  SpeakerTalks.gs
  SpeakerAvailability.gs
  Congregations.gs
  Talks.gs
  HospitalityInvitations.gs

  Dashboard.gs
  PrintPlanning.gs
  History.gs
  Integrity.gs
  Backup.gs
  Access.gs
  Settings.gs
  I18n.gs
  Utils.gs

  Index.html
  Styles.html
  Scripts.html
  HelpScripts.html
  HelpStyles.html
  ReleaseReadinessScripts.html
  ReleaseReadinessStyles.html
  ...
```

## Principes

1. La configuration est centralisée dans `Config.gs`.
2. L’accès aux feuilles est centralisé dans `Database.gs`.
3. Chaque domaine métier possède son propre module.
4. L’interface appelle les fonctions serveur avec `google.script.run`.
5. Les données sont validées côté serveur avant toute écriture.
6. Les identifiants techniques sont stables et indépendants des numéros de ligne.
7. Chaque modification sensible écrit une entrée structurée dans l’historique.
8. Les droits sont contrôlés côté serveur, sans dépendre uniquement de l’affichage des boutons.
9. Les écritures collaboratives utilisent un verrou serveur et une version optimiste.
10. Les assistants ne contournent jamais les règles métier.
11. Les calculs composites réutilisent des jeux de données préchargés.
12. Une écriture groupée doit pouvoir revenir à l’état précédent lorsqu’une étape échoue.
13. Un cache est toujours une optimisation facultative, jamais la source de vérité.
14. Une écriture au résultat réseau incertain ne doit pas être répétée automatiquement.
15. Une décision de mise en production doit agréger des contrôles explicites et exportables.
16. Les références de support ne doivent contenir aucune donnée métier sensible.

## Pipeline de programmation

```text
Formulaire
   ↓
normalisation de la demande
   ↓
chargement d’un jeu de données partagé
   ├─ orateurs et assemblées
   ├─ discours et discours déclarés
   ├─ programmations existantes
   ├─ disponibilités des orateurs
   └─ paramètres et pondérations
   ↓
RulesEngine
   ├─ valide → confirmation éventuelle → écriture
   └─ bloqué → ConflictResolution
                     ↓
              génération d’hypothèses
                     ↓
              revalidation par RulesEngine
                     ↓
              classement et affichage
```

`buildPlanningRuleDataset_()` charge les référentiels une seule fois. `listPlanningsWithResources_()`, `listHospitalitiesWithPlannings_()` et `listInvitationsWithPlannings_()` permettent aux modules composites de réutiliser ces données sans relancer les mêmes lectures.

## Cache serveur court

`ServerCache.gs` utilise `CacheService.getScriptCache()` avec une durée par défaut de 60 secondes.

Les entrées actuellement mises en cache sont :

```text
SETTINGS_SNAPSHOT_V1
PLANNING_OPTIONS_V1
COMMUNICATION_OPTIONS_V1
VERSION_DISPLAY_CONTEXT_V1
```

Chaque clé finale comprend le nom et la version de l’application. Une nouvelle version ne réutilise donc pas automatiquement les valeurs d’une version précédente.

### Stratégie de cohérence

- une lecture vérifie d’abord le cache ;
- en absence de valeur valide, la source Google Sheets est lue ;
- l’échec du cache est journalisé dans la console mais ne bloque pas la lecture directe ;
- une écriture invalide uniquement les caches qui dépendent de la donnée modifiée ;
- une installation ou une restauration complète invalide tous les caches.

Les paramètres, options de programmation et options de communication tolèrent une cohérence de quelques secondes. Les validations métier et les écritures continuent, elles, à relire les données nécessaires sous verrou lorsqu’une décision définitive est prise.

## Observabilité serveur

`Performance.gs` fournit `measureServerOperation_(operation, callback, context)`.

Le moteur enregistre temporairement :

- le nombre d’appels ;
- le cumul, la moyenne, le minimum, le maximum et la dernière durée ;
- le nombre d’appels atteignant 1 500 ms ;
- le nombre d’erreurs ;
- la dernière date d’appel ;
- un contexte simple et borné.

Les mesures sont agrégées dans le cache du script pendant six heures. Elles sont de type « meilleur effort » : une saturation ou une indisponibilité de `CacheService` ne doit pas faire échouer l’opération métier.

Le rapport et sa réinitialisation exigent le rôle Administrateur. La réinitialisation crée l’action d’audit `REINITIALISATION_PERFORMANCE`.

## Guide intégré

`Help.gs` contient les sujets documentaires sous forme de données structurées :

```text
sujet
  ├─ identifiant
  ├─ catégorie
  ├─ titre et résumé
  ├─ étapes
  ├─ conseils
  ├─ mots-clés
  ├─ vue associée
  └─ rôle minimal
```

`getHelpBootstrap()` filtre les sujets selon le rôle renvoyé par le contrôle serveur. `HelpScripts.html` gère la recherche, l’aide contextuelle, le raccourci `?`, l’ouverture du guide complet et la restitution du focus.

Les correspondances entre vues et sujets sont centralisées dans `HELP_VIEW_TOPICS`. Un module qui n’est pas autorisé pour l’utilisateur ne reçoit pas de sujet contextuel inaccessible.

## Fiabilité des appels client

`Scripts.html` contient une liste explicite des fonctions de lecture. `runServer()` applique la stratégie suivante :

```text
appel serveur
   ↓
succès → retour normal
   ↓ échec
lecture + erreur transitoire + première tentative
   → attendre 500 ms → relancer une fois
sinon
   → retourner l’erreur à l’interface
```

Une écriture n’est jamais relancée automatiquement. Lorsqu’une coupure intervient pendant une écriture, le panneau de reprise demande de recharger et de vérifier l’état actuel avant toute nouvelle tentative.

Cette stratégie complète, sans les remplacer :

- les contrôles de doublons ;
- les verrous serveur ;
- le verrouillage optimiste ;
- la fusion intelligente ;
- l’audit.

## Concurrence et fusion intelligente

`Concurrency.gs` conserve la version technique de chaque fiche. `MergeEngine.gs` compare l’état d’ouverture, la modification locale et la dernière version distante.

- champs modifiés d’un seul côté : fusion automatique ;
- même valeur appliquée des deux côtés : conservation sans arbitrage ;
- même champ modifié différemment : choix explicite ;
- nouvelle modification pendant l’arbitrage : recalcul avant écriture.

Les écritures finales repassent par les fonctions métier existantes.

## Historique des versions

`VersionHistory.gs` reconstruit les instantanés depuis `HISTORIQUE`, déduplique les états consécutifs identiques, ajoute l’état courant lorsqu’il manque, compare deux versions et restaure une ancienne version par les fonctions métier.

La liste des fiches est paginée par défaut à 40 éléments. Le contexte lisible des relations utilise un cache de 30 secondes afin d’éviter de reconstruire immédiatement les mêmes dictionnaires d’orateurs, d’assemblées, de discours et de programmations.

## Disponibilités des orateurs

`SpeakerAvailability.gs` gère :

- `INDISPONIBLE` ;
- `DISPONIBLE_SEULEMENT` ;
- `PREFEREE` ;
- `A_EVITER`.

Les périodes sont consommées par `RulesEngine`, `RecommendationEngine`, `ConflictResolution`, `AutomaticPlanning`, `Integrity`, `MergeEngine` et `VersionHistory`.

## Préparation à la mise en production

`ReleaseReadiness.gs` agrège cinq contrôles pondérés : installation, intégrité, sauvegarde, performance et recette interne. Chaque contrôle renvoie un statut `PASS`, `WARNING` ou `BLOCKING`, un score et une action recommandée.

La recette guidée conserve une seule session courante dans `PropertiesService`. La progression est protégée par `ScriptLock`. Les résultats détaillés sont compactés avant stockage afin de rester sous la limite des propriétés Apps Script. Le rapport exporté contient la version, les étapes, la décision et les recommandations.

`SupportDiagnostics.gs` génère ou valide une référence non sensible. Seuls le module, l’opération, le type de lecture ou d’écriture et un message borné sont journalisés. Les piles, objets imbriqués et données arbitraires sont ignorés.

## Installation et migrations

`installCoordoDiscours()` :

1. crée ou retrouve la base ;
2. crée les feuilles manquantes ;
3. ajoute les paramètres ;
4. migre les anciennes clés ;
5. invalide les caches ;
6. exécute la recette interne ;
7. journalise le résultat.

Le schéma reste en version `1.8.0`, car la version 1.13 n’ajoute aucune feuille obligatoire.

## Validation automatique

`npm run check` exécute dix suites. Le validateur contrôle notamment les fichiers essentiels, les fonctions sensibles, la syntaxe Apps Script, les protections d’accès, le guide, les caches, l’observabilité, la stratégie réseau et la préparation à la mise en production.
