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
  AutomaticPlanning.gs
  Concurrency.gs

  Speakers.gs
  SpeakerTalks.gs
  SpeakerAvailability.gs
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
  AutomaticPlanningScripts.html
  AutomaticPlanningStyles.html
  SpeakerTalkUI.html
  SpeakerTalkStyles.html
  SpeakerAvailabilityUI.html
  SpeakerAvailabilityStyles.html
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
11. Les moteurs travaillant sur plusieurs hypothèses réutilisent un jeu de données préchargé afin de limiter les lectures Google Sheets.
12. Une écriture groupée doit pouvoir revenir à l’état précédent lorsqu’une étape échoue.

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
   ├─ valide → confirmation éventuelle des avertissements → écriture
   └─ bloqué → ConflictResolution
                     ↓
              génération d’hypothèses
                     ↓
              revalidation par RulesEngine
                     ↓
              classement et affichage
```

`buildPlanningRuleDataset_()` charge une seule fois les orateurs, discours, assemblées, programmations, discours déclarés et disponibilités. Le même jeu de données est ensuite réutilisé pour évaluer plusieurs hypothèses sans relire Google Sheets à chaque proposition.

## Disponibilités des orateurs

`SpeakerAvailability.gs` gère quatre types de période :

- `INDISPONIBLE` : bloque les dates comprises dans la période ;
- `DISPONIBLE_SEULEMENT` : lorsqu’au moins une fenêtre existe, les dates extérieures à toutes les fenêtres sont bloquées ;
- `PREFEREE` : ajoute une information positive et un bonus configurable au classement ;
- `A_EVITER` : produit un avertissement et un malus configurable.

Les périodes d’un orateur sont enregistrées comme une fiche collaborative unique, identifiée par l’orateur. L’interface transmet la version de l’ensemble de ses périodes. Le serveur prend un verrou, compare la version, remplace les lignes de cet orateur et restaure un instantané de la feuille si l’écriture échoue.

Les disponibilités sont consommées par :

- `RulesEngine` pour les règles `PLAN_008`, `PLAN_009` et `PLAN_010` ;
- `RecommendationEngine` pour exclure, favoriser ou pénaliser un orateur ;
- `ConflictResolution` par la revalidation systématique des hypothèses ;
- `AutomaticPlanning` par le jeu de données et les pondérations préchargés ;
- `Integrity` pour les relations cassées, doublons, dates invalides et contradictions.

## Résolution des conflits

`ConflictResolution.gs` teste d’abord les changements portant sur un seul champ :

- orateur ;
- date ;
- discours ;
- assemblée d’origine.

Lorsque plusieurs blocages sont indépendants, le moteur évalue des combinaisons de deux, trois ou quatre changements. Une proposition n’est conservée que lorsqu’elle ne génère plus aucune règle de niveau `ERROR`. Les avertissements restent visibles et diminuent le score.

L’interface applique uniquement les valeurs dans le formulaire. L’enregistrement final reste une action explicite du coordinateur.

## Planification automatique

`AutomaticPlanning.gs` prépare trois scénarios sur une période de 1 à 6 mois :

- Équilibré ;
- Renouvellement des discours ;
- Rotation des orateurs.

Le moteur crée un planning virtuel au fur et à mesure de la génération, de sorte que chaque nouvelle proposition tient compte des précédentes. Les créneaux existants sont conservés. Les orateurs indisponibles sont exclus par `RecommendationEngine` et `RulesEngine`.

Le brouillon porte une signature SHA-256 calculée à partir du planning, des référentiels, des versions, des discours déclarés, des disponibilités, des réglages de classement et des suivis de communication. Toute modification de ces éléments impose de générer un nouveau brouillon avant validation.

## Concurrence

`Concurrency.gs` conserve les versions dans les propriétés du script. Pour une modification :

1. l’interface transmet la version lue ;
2. le serveur prend un `ScriptLock` ;
3. la version attendue est comparée à la version courante ;
4. l’écriture est refusée en cas d’écart ;
5. une nouvelle version est générée après succès.

## Installation

La fonction d’installation crée ou vérifie automatiquement les feuilles nécessaires sans demander à l’utilisateur de modifier un identifiant dans le code. La migration `1.8.0` crée notamment `ORATEUR_DISPONIBILITES` et ajoute les réglages de bonus et de malus.

## Évolutivité

L’architecture prépare :

- la fusion intelligente des champs ;
- l’historique navigable des versions ;
- un portail orateur ;
- la déclaration d’indisponibilités avec validation du coordinateur ;
- l’envoi de courriels ;
- la génération de PDF ;
- une migration future vers une base de données externe.

## Navigation et performance client — version 1.11

### Changement central de vue

`Scripts.html` reste le seul module autorisé à activer une vue. Après chaque navigation, il émet :

```text
coordodiscours:viewchange
```

Les modules Tableau de bord, Programmation, Invitations, Hospitalité, Impression, Historique, Versions, Sauvegarde et Paramètres chargent leurs données en réaction à cet événement. Cette organisation prend également en charge les ancres d’URL et évite que plusieurs gestionnaires remplacent directement `showView`.

### Navigation mobile

Sous 820 pixels, la barre latérale devient un tiroir :

- l’état est porté par la classe `navigation-open` du document ;
- `aria-expanded` expose l’état du bouton d’ouverture ;
- le menu fermé devient `inert` afin de quitter le parcours clavier ;
- le focus est contenu dans le tiroir ouvert ;
- Échap, le voile de fond ou le bouton de fermeture referment le tiroir.

### Caches client courts

Deux caches de 60 secondes limitent les appels Google Apps Script répétés :

```text
getPlanningOptions
getCommunicationOptions
```

Chaque cache conserve :

- les dernières données ;
- l’heure de chargement ;
- la promesse de la demande actuellement en cours.

Une seconde demande identique réutilise donc la même promesse. `invalidatePlanningDependentCaches_()` invalide les données après toute écriture susceptible de modifier les listes proposées.

### Réponses devenues obsolètes

Les recherches de programmations, invitations et hospitalités utilisent un identifiant croissant. Une réponse n’est rendue que si son identifiant correspond encore à la demande la plus récente. Une requête lente ne peut donc plus remplacer les résultats d’une saisie plus récente.

### Protection contre les doubles actions

`withBusyElement_()` place l’élément déclencheur en état `aria-busy`, le désactive pendant la promesse, puis rétablit son état initial. Les principales écritures et actions rapides utilisent ce garde-fou sans remplacer les verrous serveur, qui restent la protection définitive.
