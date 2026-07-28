# Feuille de route CoordoDiscours

## Objectif principal

Construire un assistant fiable permettant au coordinateur des discours publics de gérer l’ensemble du processus dans un seul outil, avec des propositions automatiques contrôlées par des règles métier explicites.

## Version 1.13 Stable — en préparation de recette

### Fondations et sécurité

- Structure modulaire Google Apps Script.
- Installation automatique de la base Google Sheets.
- Rôles Administrateur, Coordinateur et Consultation.
- Sauvegarde et restauration avec copie de sécurité Drive.
- Contrôle d’intégrité et historique détaillé avant/après.
- Verrouillage optimiste et fusion intelligente des modifications concurrentes.

### Assistant de programmation

- Moteur central de règles PLAN_001 à PLAN_010.
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

### Préparation à la mise en production

- Rapport global de santé avant déploiement.
- Score pondéré sur 100.
- États `READY`, `ATTENTION` et `BLOCKED`.
- Contrôle de l’installation, du schéma, de l’intégrité, des sauvegardes, des performances et de la dernière recette.
- Recette guidée en six étapes avec progression persistée.
- Protection de la recette par verrou serveur.
- Export JSON du rapport de recette.
- Références non sensibles pour les erreurs et incidents client.
- Liste administrateur des incidents récents.

## Prochain lot — 1.14

- Recette réelle consolidée sur ordinateur, tablette et téléphone.
- Déploiement Apps Script documenté avec captures et critères de retour arrière.
- Tableau de suivi des actions correctives issues du rapport de santé.
- Rapport de capacité annuel et indicateurs d’équilibre avancés.
- Nettoyage des anciens journaux et stratégie d’archivage contrôlée.

## Version 2

- Portail orateur et demandes de modification.
- Indisponibilités déclarées directement par les orateurs avec validation du coordinateur.
- Envoi automatisé des invitations et rappels selon les droits accordés.
- Préparation annuelle et analyses d’équilibre approfondies.
- Migration optionnelle vers une base de données externe.
