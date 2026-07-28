# Architecture technique

## Plateforme

- Google Apps Script.
- Google Sheets comme stockage principal.
- Application web HTML Service.
- Déploiement exécuté sous le compte du coordinateur.
- GitHub Actions pour la validation automatique.

## Structure principale

```text
apps-script/
  Code.gs
  Config.gs
  Database.gs
  Installation.gs

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

  Dashboard.gs
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
  PlanningScripts.html
  ConflictResolutionScripts.html
  ConflictResolutionStyles.html
  appsscript.json
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
9. Les écritures collaboratives utilisent un verrou serveur et un numéro de version optimiste.
10. Les assistants ne contournent jamais les règles métier : chaque proposition est revalidée par `RulesEngine`.

## Pipeline de programmation

```text
Formulaire
   ↓
normalisation de la demande
   ↓
chargement d’un jeu de données partagé
   ↓
RulesEngine
   ├─ valide → confirmation éventuelle des avertissements → écriture
   └─ bloqué → ConflictResolution
                    ↓
             génération d’hypothèses
                    ↓
             revalidation par RulesEngine
                    ↓
             classement et affichage
```

`buildPlanningRuleDataset_()` charge une seule fois les orateurs, discours, assemblées, programmations et discours déclarés. Le même jeu de données est ensuite réutilisé pour évaluer plusieurs hypothèses sans relire Google Sheets à chaque proposition.

## Résolution des conflits

`ConflictResolution.gs` teste d’abord les changements portant sur un seul champ :

- orateur ;
- date ;
- discours ;
- assemblée d’origine.

Lorsque plusieurs blocages sont indépendants, le moteur évalue des combinaisons de deux, trois ou quatre changements. Une proposition n’est conservée que lorsqu’elle ne génère plus aucune règle de niveau `ERROR`. Les avertissements restent visibles et diminuent le score.

L’interface applique uniquement les valeurs dans le formulaire. L’enregistrement final reste une action explicite du coordinateur.

## Concurrence

`Concurrency.gs` conserve les versions dans les propriétés du script. Pour une modification :

1. l’interface transmet la version lue ;
2. le serveur prend un `ScriptLock` ;
3. la version attendue est comparée à la version courante ;
4. l’écriture est refusée en cas d’écart ;
5. une nouvelle version est générée après succès.

## Installation

La fonction d’installation crée ou vérifie automatiquement les feuilles nécessaires sans demander à l’utilisateur de modifier un identifiant dans le code.

## Évolutivité

L’architecture prépare :

- la planification automatique de plusieurs mois ;
- la comparaison de scénarios ;
- les indisponibilités ;
- la fusion intelligente des champs ;
- l’historique navigable des versions ;
- un portail orateur ;
- l’envoi de courriels ;
- la génération de PDF ;
- une migration future vers une base de données externe.
