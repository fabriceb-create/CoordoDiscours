# Feuille de route CoordoDiscours

## Objectif principal

Construire un assistant fiable permettant au coordinateur des discours publics de gérer l’ensemble du processus dans un seul outil, avec des propositions automatiques contrôlées par des règles métier explicites et une mise en production traçable.

## Version 1.14 Stable — en préparation de recette réelle

### Fondations et sécurité

- Structure modulaire Google Apps Script.
- Installation automatique de la base Google Sheets.
- Rôles Administrateur, Coordinateur et Consultation.
- Sauvegarde et restauration avec copie de sécurité Drive.
- Contrôle d’intégrité et audit détaillé avant/après.
- Verrouillage optimiste et fusion intelligente des modifications concurrentes.

### Assistant de programmation

- Moteur central de règles `PLAN_001` à `PLAN_010`.
- Recommandation pondérée des orateurs.
- Assistant de résolution des conflits.
- Planification automatique de 1 à 6 mois.
- Disponibilités, périodes préférées et dates à éviter.
- Historique navigable, comparaison et restauration des versions.

### Guide, accessibilité et fiabilité

- Guide intégré filtré selon les droits.
- Aide contextuelle et raccourci `?`.
- Navigation mobile en tiroir et focus clavier contrôlé.
- Une seule reprise automatique pour les lectures transitoires.
- Aucune répétition automatique d’une écriture incertaine.
- Cache serveur court et invalidation ciblée.
- Mesures temporaires des durées, erreurs et appels lents.
- Références de support non sensibles.

### Préparation et gouvernance de production

- Rapport global de santé avant déploiement.
- Score pondéré sur 100 et états `READY`, `ATTENTION`, `BLOCKED`.
- Contrôle de l’installation, de l’intégrité, des sauvegardes, des performances, de la recette interne et de la recette multi-écrans.
- Recette guidée en sept étapes avec progression persistée.
- Export JSON du rapport de recette.
- Plan d’actions correctives avec priorité, responsable, échéance et version technique.
- Matrice de 15 tests sur ordinateur, tablette et téléphone.
- Registre des approbations, reports, déploiements et retours arrière.
- Manifestes de déploiement avec checksum SHA-256.
- Dossier de support expurgé.
- Rapport annuel de capacité et d’équilibre.
- Archivage contrôlé de l’historique avec copie Drive préalable.

## Prochain lot — 1.15

- Exécuter et documenter la première recette réelle dans le projet Apps Script ciblé.
- Conserver les preuves réelles : captures d’écran, identifiant du déploiement Web, manifeste et rapport de recette.
- Ajouter des seuils administrables pour les indicateurs annuels de capacité.
- Ajouter une exportation PDF lisible du rapport de gouvernance, en complément du JSON.
- Étendre l’historique navigable aux actions correctives et aux décisions de mise en production.
- Ajouter un tableau de suivi post-déploiement sur 24 heures, 7 jours et 30 jours.
- Étudier un archivage planifié, désactivé par défaut et soumis à une politique de conservation explicite.

## Version 2

- Portail orateur et demandes de modification.
- Indisponibilités déclarées directement par les orateurs avec validation du coordinateur.
- Envoi automatisé des invitations et rappels selon les droits accordés.
- Préparation annuelle et analyses d’équilibre approfondies.
- Migration optionnelle vers une base de données externe.
