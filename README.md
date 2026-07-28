# CoordoDiscours

Application Google Apps Script de coordination des discours publics.

## État du projet

Version en préparation de recette réelle : **1.14 Stable**

Le dépôt contient le code Apps Script, une base Google Sheets auto-installable, les modules métier, les migrations, les contrôles automatiques, l’aide intégrée et la documentation d’installation, d’administration, de recette et de mise en production.

La branche principale est destinée à rester déployable. Une publication réelle dans Google Apps Script exige toutefois une sauvegarde récente, un rapport de santé `READY` à `100/100`, une recette multi-écrans complète et une décision administrative enregistrée.

## Modules disponibles

- Tableau de bord et alertes prioritaires.
- Programmation manuelle des discours.
- Recommandation automatique des orateurs.
- Assistant de résolution des conflits métier.
- Planification automatique de 1 à 6 mois avec trois scénarios.
- Disponibilités, indisponibilités, périodes préférées et dates à éviter.
- Fusion intelligente des modifications concurrentes.
- Historique navigable, comparaison et restauration contrôlée des versions.
- Répertoire des orateurs et des assemblées.
- Référentiel des discours et discours déclarés par orateur extérieur.
- Invitations et hospitalité.
- Planning imprimable sur 3 ou 6 mois.
- Audit détaillé avant/après.
- Contrôle d’intégrité, sauvegarde et restauration sécurisées.
- Gestion des rôles et des accès.
- Guide utilisateur intégré et aide contextuelle.
- Cache serveur court, diagnostic de performance et références de support.
- Rapport de santé avant déploiement et recette guidée exportable.
- Plan d’actions correctives issu du rapport de santé.
- Recette réelle sur ordinateur, tablette et téléphone.
- Registre des décisions de mise en production et manifestes SHA-256.
- Rapport annuel de capacité, d’équilibre et de couverture.
- Archivage contrôlé de l’historique avec copie préalable dans Google Drive.
- Interface Français / Kréyòl Gwadloup.

## Gouvernance de mise en production

La version 1.14 complète le module administrateur **Mise en production**.

### Rapport de santé

Le rapport consolide six contrôles pondérés :

1. installation, schéma, version et fuseau horaire ;
2. intégrité des relations et référentiels ;
3. présence d’une sauvegarde récente ;
4. erreurs et lenteurs observées côté serveur ;
5. résultat et ancienneté de la recette interne ;
6. recette réelle sur ordinateur, tablette et téléphone.

Le résultat est un score sur 100 et un état :

- `READY` : tous les contrôles sont conformes ;
- `ATTENTION` : une vérification ou une décision reste nécessaire ;
- `BLOCKED` : au moins un contrôle interdit la proposition de déploiement.

La recette guidée comporte désormais sept étapes, la dernière consolidant la décision finale.

### Actions correctives

Les recommandations du rapport peuvent être synchronisées vers un plan d’action persistant. Chaque action possède notamment :

- une priorité `BLOQUANTE`, `HAUTE` ou `NORMALE` ;
- un statut ;
- un responsable ;
- une échéance ;
- des notes ;
- une version technique empêchant l’écrasement silencieux.

Une action bloquante ouverte empêche l’approbation du déploiement.

### Recette multi-écrans

Cinq scénarios doivent être exécutés sur chacun des trois formats :

- navigation ;
- programmation ;
- formulaires ;
- recherche et filtres ;
- impression ou export.

La matrice comprend donc 15 résultats. Un seul échec bloque le rapport de santé. Un scénario non testé maintient le rapport hors de l’état `READY`.

### Décisions humaines

Le registre conserve quatre décisions :

- `APPROVED` : déploiement approuvé ;
- `POSTPONED` : déploiement reporté ;
- `DEPLOYED` : version réellement déployée ;
- `ROLLED_BACK` : retour arrière enregistré.

CoordoDiscours ne publie jamais automatiquement le projet Apps Script. L’approbation exige un rapport `READY` à `100/100`, aucune action bloquante et une confirmation explicite. La confirmation du déploiement exige l’identifiant réel du déploiement Apps Script.

Chaque décision peut produire un manifeste JSON accompagné d’un checksum SHA-256.

## Capacité annuelle et équilibre

Le rapport annuel calcule notamment :

- le nombre de programmations actives ;
- le taux d’occupation des créneaux hebdomadaires théoriques ;
- le nombre d’orateurs utilisés et sans affectation ;
- un indice d’équilibre fondé sur le coefficient de variation ;
- la concentration des affectations sur les 20 % d’orateurs les plus sollicités ;
- la couverture des discours actifs ;
- la part d’orateurs extérieurs ;
- la répartition mensuelle.

Les noms des orateurs restent visibles uniquement dans le rapport administrateur. Ils sont retirés du dossier de support exportable.

## Archivage contrôlé de l’historique

L’archivage :

- refuse les lignes de moins de 180 jours ;
- conserve au minimum les 500 lignes les plus récentes ;
- limite une opération à 25 000 lignes ;
- recalcule le nombre de lignes juste avant l’écriture ;
- crée un fichier JSON dans Google Drive avant toute suppression ;
- exige la confirmation `ARCHIVER` ;
- journalise l’opération.

L’archive n’est pas une restauration automatique. Elle doit être conservée selon la politique documentaire de l’assemblée.

## Aide, fiabilité réseau et observabilité

Le module **Aide** est filtré selon le rôle et peut être ouvert depuis le menu, le bouton `?` ou le raccourci clavier `?` hors champ de saisie.

Les appels serveur sont distingués entre lectures et écritures :

- une lecture interrompue de manière transitoire peut être relancée une seule fois ;
- une écriture n’est jamais répétée automatiquement ;
- l’utilisateur est invité à vérifier l’état enregistré avant de recommencer.

Un cache serveur de 60 secondes limite certaines lectures Google Sheets répétitives. Les principales opérations sont mesurées de manière agrégée et temporaire. Les erreurs visibles reçoivent une référence de support non sensible.

## Ergonomie mobile et accessibilité

La navigation mobile utilise un tiroir adapté aux téléphones et tablettes. L’interface comprend notamment :

- un lien d’évitement ;
- un focus clavier visible ;
- une gestion du focus dans le tiroir ;
- `aria-current` sur la section active ;
- des annonces accessibles pour les messages ;
- le respect de la réduction des animations ;
- des liens directs vers les différentes vues.

## Principes métier validés

- Un orateur local peut présenter tout discours public actif.
- Un orateur extérieur est limité aux discours déclarés dans sa fiche.
- Les discours 59, 82, 122 et 123 sont officiellement inactifs.
- Une répétition dans la période configurée déclenche une alerte non bloquante.
- Une indisponibilité ou une date hors des fenêtres « Disponible seulement » bloque la programmation.
- Une date préférée augmente le classement ; une date à éviter produit un avertissement et diminue le score.
- Une programmation impossible n’est jamais enregistrée automatiquement.
- Les créneaux existants sont conservés par la planification automatique.
- Un brouillon devenu obsolète est refusé.
- Une fiche périmée ne peut pas écraser silencieusement une version plus récente.
- Une ancienne version n’est restaurée qu’après contrôle des droits, de la version actuelle et des règles métier.
- Une écriture incertaine après coupure réseau n’est jamais répétée automatiquement.
- Une mise en production ne peut être approuvée avec une action corrective bloquante ouverte.
- Une archive d’historique est créée avant la suppression des lignes correspondantes.
- Les modifications importantes sont auditées.

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
  ReleaseGovernance.gs
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
  test-release-readiness.mjs
  test-release-governance.mjs
  predeploy-check.mjs
```

## Installation rapide

1. Créer ou sélectionner le projet Google Apps Script.
2. Copier tous les fichiers du dossier `apps-script/` ou utiliser `clasp` après contrôle du projet ciblé.
3. Exécuter `installCoordoDiscours`.
4. Vérifier que le résultat contient `success: true` et le schéma `1.9.0`.
5. Exécuter `runAcceptanceTests`.
6. Créer une sauvegarde.
7. Ouvrir **Mise en production**, traiter les actions et compléter la recette multi-écrans.
8. Approuver le rapport uniquement lorsqu’il est `READY` à `100/100`.
9. Créer ou mettre à jour le déploiement Web Apps Script.
10. Enregistrer ensuite l’identifiant réel du déploiement dans le registre.

La procédure détaillée se trouve dans `docs/INSTALLATION.md` et `docs/DEPLOIEMENT.md`. Les guides complets se trouvent dans `docs/GUIDE_UTILISATEUR.md` et `docs/GUIDE_ADMINISTRATEUR.md`.

## Validation

La commande `npm run check` exécute onze niveaux de contrôle :

1. structure Apps Script, syntaxe et droits d’accès ;
2. contrats statiques des règles métier ;
3. résolution des conflits ;
4. planification automatique ;
5. disponibilités des orateurs ;
6. fusion intelligente ;
7. reconstruction, comparaison et restauration des versions ;
8. responsive, accessibilité, syntaxe JavaScript et caches client ;
9. guide intégré, cache serveur et observabilité ;
10. préparation à la mise en production, recette guidée et références de support ;
11. actions correctives, recette multi-écrans, décisions, capacité annuelle et archivage.

Le contrôle `npm run predeploy:check` vérifie en plus les conditions locales de pré-déploiement. La validation automatique ne remplace pas la recette réelle dans Google Apps Script ni le contrôle des droits du futur déploiement Web.
