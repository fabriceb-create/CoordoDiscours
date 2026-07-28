# CoordoDiscours

Application Google Apps Script de coordination des discours publics.

## État du projet

Version en préparation de recette : **1.12 Stable**

Le dépôt contient le code Apps Script, la base Google Sheets auto-installable, les modules métier, les migrations, les tests automatiques, un guide intégré et la documentation d’installation, d’administration et de recette.

## Modules disponibles

- Tableau de bord et alertes prioritaires.
- Programmation des discours.
- Recommandation automatique des orateurs.
- Assistant de résolution des conflits métier.
- Planification automatique de 1 à 6 mois avec comparaison de trois scénarios.
- Gestion des disponibilités, indisponibilités, dates préférées et dates à éviter.
- Fusion intelligente des modifications concurrentes.
- Historique navigable, comparaison et restauration contrôlée des versions.
- Répertoire des orateurs et des assemblées.
- Référentiel des discours et discours déclarés par orateur extérieur.
- Invitations et hospitalité.
- Planning imprimable sur 3 ou 6 mois.
- Historique détaillé avant/après.
- Contrôle d’intégrité, sauvegarde et restauration sécurisées.
- Gestion des rôles et des accès.
- Guide utilisateur intégré et aide contextuelle.
- Diagnostic temporaire des durées serveur.
- Interface Français / Kréyòl Gwadloup.

## Guide intégré et aide contextuelle

La version 1.12 ajoute un véritable module **Aide**. Son contenu est filtré selon le rôle de l’utilisateur :

- Consultation : démarrage, tableau de bord, impression, historique, versions et dépannage ;
- Coordinateur : programmation, recommandations, planification automatique, orateurs, disponibilités et communication ;
- Administrateur : paramètres, utilisateurs, intégrité, déploiement et diagnostic de performance.

Le guide peut être ouvert de trois façons :

1. depuis le menu **Aide** ;
2. avec le bouton `?` de l’en-tête ou du module affiché ;
3. avec la touche `?`, lorsque le curseur n’est pas dans un champ de saisie.

L’aide contextuelle restitue le focus à l’élément d’origine après fermeture. Lorsque l’interface est en Kréyòl Gwadloup, les commandes restent traduites et un message précise que le guide détaillé est actuellement rédigé en français.

## Fiabilité réseau

Les appels serveur sont maintenant classés entre lectures et écritures.

- Une lecture interrompue par une erreur transitoire est relancée automatiquement une seule fois après 500 ms.
- Une écriture n’est jamais répétée automatiquement, car son résultat peut déjà avoir été enregistré côté serveur.
- Un bandeau de reprise explique l’action adaptée : recharger une lecture ou vérifier l’état d’une écriture avant de la recommencer.

Cette stratégie réduit les erreurs visibles sans risquer de créer silencieusement une programmation, une invitation ou une autre fiche en double.

## Cache et observabilité serveur

Un cache serveur court de 60 secondes limite certaines lectures Google Sheets répétitives :

- paramètres généraux ;
- options de programmation ;
- options d’invitation et d’hospitalité ;
- libellés utilisés dans la comparaison des versions.

Les caches sont invalidés après les écritures qui peuvent rendre les données obsolètes. Une indisponibilité du cache n’empêche jamais l’application de fonctionner : la lecture directe reste la solution de repli.

Les opérations les plus coûteuses sont chronométrées de manière agrégée. Un administrateur peut consulter dans **Paramètres > Performance serveur** :

- le nombre d’appels ;
- la durée moyenne, minimale, maximale et la dernière durée ;
- le nombre d’appels dépassant le seuil de 1 500 ms ;
- le nombre d’erreurs observées.

Ces mesures sont temporaires, conservées dans le cache du script pendant six heures et ne constituent pas un engagement de temps de réponse.

## Ergonomie mobile et accessibilité

La navigation mobile utilise un tiroir adapté aux téléphones et tablettes. Le menu :

- s’ouvre depuis l’en-tête ;
- se ferme avec son bouton, le voile de fond ou la touche Échap ;
- maintient le focus clavier à l’intérieur lorsqu’il est ouvert ;
- restitue le focus au bouton d’ouverture après fermeture ;
- retire du parcours clavier la navigation placée hors écran.

L’interface comporte également un lien d’évitement, un focus visible, `aria-current` sur la section active, des annonces adaptées pour les messages et le respect de la réduction des animations demandée par le système.

## Historique des versions

Le module **Versions** reconstruit une chronologie métier à partir des instantanés `before` et `after` enregistrés dans la feuille `HISTORIQUE`.

Les fiches sont chargées par pages de 40. Pour chaque fiche, le module permet de :

- parcourir les versions numérotées ;
- identifier l’état actuel ;
- sélectionner exactement deux versions ;
- comparer leurs champs avec des libellés lisibles ;
- restaurer une ancienne version lorsque le rôle de l’utilisateur l’autorise.

La restauration repasse par les fonctions d’écriture métier existantes. Elle conserve donc les contrôles d’accès, les verrous, les validations et l’audit. Une restauration réussie crée une nouvelle version au lieu d’effacer l’historique.

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
- Une écriture incertaine après coupure réseau n’est jamais répétée automatiquement.
- Les modifications importantes sont historisées.

## Structure principale

```text
apps-script/
  Code.gs
  Config.gs
  Database.gs
  Installation.gs
  ServerCache.gs
  Performance.gs
  Help.gs
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
  test-help-observability.mjs
```

## Installation rapide

1. Créer un projet Google Apps Script.
2. Copier tous les fichiers du dossier `apps-script/`.
3. Exécuter `installCoordoDiscours`.
4. Vérifier que le résultat contient `success: true`.
5. Exécuter `runAcceptanceTests`.
6. Déployer le projet comme application web en accès restreint pour la recette.

La procédure détaillée se trouve dans `docs/INSTALLATION.md`. Les guides complets se trouvent dans `docs/GUIDE_UTILISATEUR.md` et `docs/GUIDE_ADMINISTRATEUR.md`.

## Validation

La commande `npm run check` exécute neuf niveaux de contrôle :

1. structure Apps Script, syntaxe et droits d’accès ;
2. contrats statiques des règles métier ;
3. résolution des conflits ;
4. planification automatique ;
5. disponibilités des orateurs ;
6. fusion intelligente ;
7. reconstruction, comparaison et restauration des versions ;
8. responsive, accessibilité, syntaxe JavaScript et caches client ;
9. guide intégré, cache serveur et observabilité.

La version ne doit pas être considérée comme définitivement validée avant son exécution réelle dans Google Apps Script et la réussite de la recette fonctionnelle.
