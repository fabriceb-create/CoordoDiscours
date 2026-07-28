# CoordoDiscours

Application Google Apps Script de coordination des discours publics.

## État du projet

Version en préparation de recette : **1.11 Stable**

Le dépôt contient le code Apps Script, la base Google Sheets auto-installable, les modules métier, les migrations, les tests automatiques et la documentation d’installation et de recette.

## Modules disponibles

- Tableau de bord et alertes prioritaires.
- Programmation des discours.
- Recommandation automatique des orateurs.
- Assistant de résolution des conflits métier.
- Planification automatique de 1 à 6 mois avec comparaison de trois scénarios.
- Gestion des disponibilités, indisponibilités, dates préférées et dates à éviter.
- Fusion intelligente des modifications concurrentes.
- Historique navigable des versions par fiche, avec chargement progressif.
- Comparaison et restauration contrôlée des versions.
- Répertoire des orateurs et des assemblées.
- Référentiel des discours et discours déclarés par orateur extérieur.
- Invitations et hospitalité.
- Planning imprimable sur 3 ou 6 mois.
- Historique détaillé avant/après.
- Contrôle d’intégrité, sauvegarde et restauration sécurisées.
- Gestion des rôles et des accès.
- Interface Français / Kréyòl Gwadloup.

## Ergonomie mobile et accessibilité

La version 1.11 remplace la navigation mobile statique par un tiroir adapté aux téléphones et tablettes. Le menu :

- s’ouvre depuis l’en-tête ;
- se ferme avec son bouton, le voile de fond ou la touche Échap ;
- maintient le focus clavier à l’intérieur lorsqu’il est ouvert ;
- restitue le focus au bouton d’ouverture après fermeture ;
- retire du parcours clavier la navigation placée hors écran.

L’interface ajoute également :

- un lien d’évitement vers le contenu principal ;
- un focus clavier visible ;
- `aria-current` sur la section active ;
- des libellés accessibles sur les boutons icônes ;
- des annonces adaptées pour les confirmations et les erreurs ;
- le respect de la préférence système de réduction des animations ;
- une navigation par ancre permettant d’ouvrir directement une section.

## Réduction des chargements inutiles

Les données partagées entre plusieurs écrans utilisent maintenant un cache client court de 60 secondes :

- options de programmation : orateurs, discours et assemblées ;
- programmations proposées dans les formulaires d’invitation et d’hospitalité.

Les demandes simultanées sont mutualisées. Les caches sont invalidés après toute modification susceptible de les rendre obsolètes, notamment après une programmation, une modification de référentiel, une planification automatique, un changement de paramètres ou une restauration complète.

Les listes sensibles aux recherches utilisent des identifiants de requête afin qu’une réponse ancienne ne remplace pas une recherche plus récente.

## Historique des versions

Le module **Versions** reconstruit une chronologie métier à partir des instantanés `before` et `after` déjà enregistrés dans la feuille `HISTORIQUE`.

Les fiches sont chargées par pages de 40 afin de limiter les calculs et les transferts. Pour chaque fiche, le module permet de :

- parcourir les versions numérotées ;
- identifier l’état actuel ;
- sélectionner exactement deux versions ;
- comparer leurs champs avec des libellés lisibles ;
- restaurer une ancienne version lorsque le rôle de l’utilisateur l’autorise.

La restauration repasse par les fonctions d’écriture métier existantes. Elle conserve donc les contrôles d’accès, les verrous, les validations, les règles de disponibilité et l’audit. Une restauration réussie crée une nouvelle version au lieu d’effacer l’historique.

## Fusion intelligente

Lorsqu’une fiche change entre son ouverture et son enregistrement, CoordoDiscours compare :

1. la valeur au moment de l’ouverture ;
2. la modification locale ;
3. la dernière valeur enregistrée.

Les champs modifiés d’un seul côté sont fusionnés automatiquement. Lorsque le même champ contient deux modifications différentes, l’utilisateur choisit explicitement la valeur à conserver.

## Principes métier validés

- Un orateur local peut présenter tout discours public actif.
- Un orateur extérieur est limité aux discours déclarés dans sa fiche.
- Les discours 59, 82, 122 et 123 sont inactifs.
- Une répétition dans la période configurée déclenche une alerte non bloquante.
- Une indisponibilité ou une date hors des fenêtres « Disponible seulement » bloque la programmation.
- Une date préférée augmente le classement ; une date à éviter produit un avertissement et diminue le score.
- Une programmation impossible n’est jamais enregistrée automatiquement.
- Les créneaux existants sont conservés par la planification automatique.
- Un brouillon devenu obsolète est refusé.
- Une fiche périmée ne peut pas écraser silencieusement une version plus récente.
- Une ancienne version n’est restaurée qu’après contrôle des droits, de la version actuelle et des règles métier.
- Les modifications importantes sont historisées.

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
  test-automatic-planning.mjs
  test-speaker-availability.mjs
  test-merge-engine.mjs
  test-version-history.mjs
  test-responsive-accessibility.mjs
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

La commande `npm run check` exécute huit niveaux de contrôle :

1. structure Apps Script et droits d’accès ;
2. contrats statiques des règles métier ;
3. résolution des conflits ;
4. planification automatique ;
5. disponibilités des orateurs ;
6. fusion intelligente ;
7. reconstruction, comparaison et restauration des versions ;
8. responsive, accessibilité, syntaxe JavaScript et caches client.

La version ne doit pas être considérée comme définitivement validée avant son exécution réelle dans Google Apps Script et la réussite de la recette fonctionnelle.
