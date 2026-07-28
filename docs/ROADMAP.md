# Feuille de route CoordoDiscours

## Objectif principal

Construire un assistant intelligent et fiable permettant au coordinateur des discours publics de gérer l’ensemble du processus dans un seul outil, avec des propositions automatiques contrôlées par des règles métier explicites.

## Version 1.7 Stable — en préparation de recette

### Fondations et sécurité

- Structure modulaire Google Apps Script.
- Installation automatique de la base Google Sheets.
- Paramètres généraux et diagnostics.
- Rôles Administrateur, Coordinateur et Consultation.
- Sauvegarde et restauration avec copie de sécurité Drive.
- Contrôle d’intégrité.
- Historique détaillé avant/après.
- Verrouillage optimiste de toutes les fiches collaboratives.

### Référentiels et communication

- Discours publics.
- Orateurs et discours déclarés.
- Disponibilités, indisponibilités, périodes préférées et dates à éviter des orateurs.
- Assemblées.
- Invitations.
- Hospitalité.

### Programmation intelligente

- Création, modification, annulation et restauration.
- Moteur central de règles PLAN_001 à PLAN_010.
- Alerte de répétition configurable.
- Recommandation pondérée des orateurs.
- Exclusion automatique des orateurs indisponibles.
- Bonus configurable pour les dates préférées et malus configurable pour les dates à éviter.
- Assistant de résolution des conflits.
- Propositions d’un autre orateur, d’une autre date, d’un autre discours ou d’une autre assemblée.
- Solutions combinées lorsque plusieurs blocages doivent être corrigés ensemble.
- Revalidation systématique de chaque proposition par le moteur de règles.
- Planification automatique de 1 à 6 mois.
- Comparaison des scénarios Équilibré, Renouvellement des discours et Rotation des orateurs.
- Brouillons protégés contre les modifications concurrentes du planning, des référentiels et des disponibilités.
- Validation humaine obligatoire avant toute écriture automatique.

### Consultation

- Tableau de bord et priorités.
- Planning imprimable sur 3 ou 6 mois.
- Recherche dans les principaux modules.
- Interface Français / Kréyòl Gwadloup.

## Prochain lot — 1.8

- Fusion intelligente lorsque deux utilisateurs modifient des champs différents d’une même fiche.
- Comparaison champ par champ en cas de conflit de version.
- Arbitrage guidé lorsque le même champ a été modifié des deux côtés.
- Préparation de l’historique navigable des versions.
- Consolidation des messages d’assistance sur l’ensemble du planning.

## Version 2

- Historique navigable complet et comparaison de deux versions.
- Portail orateur et demandes de modification.
- Indisponibilités déclarées directement par les orateurs avec validation du coordinateur.
- Optimisations avancées de l’interface, du responsive et des performances.
- Préparation annuelle et analyses d’équilibre approfondies.
- Envoi automatisé des invitations et des rappels selon les droits accordés.
