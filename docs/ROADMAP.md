# Feuille de route CoordoDiscours

## Objectif principal

Construire un assistant fiable permettant au coordinateur des discours publics de gérer l’ensemble du processus dans un seul outil, avec des propositions automatiques contrôlées par des règles métier explicites.

## Version 1.10 Stable — en préparation de recette

### Fondations et sécurité

- Structure modulaire Google Apps Script.
- Installation automatique de la base Google Sheets.
- Paramètres généraux et diagnostics.
- Rôles Administrateur, Coordinateur et Consultation.
- Sauvegarde et restauration avec copie de sécurité Drive.
- Contrôle d’intégrité.
- Historique détaillé avant/après.
- Verrouillage optimiste de toutes les fiches collaboratives.
- Fusion intelligente des modifications concurrentes.

### Historique navigable des versions

- Reconstruction des instantanés à partir de l’audit structuré existant.
- Chronologie numérotée par fiche.
- Déduplication des instantanés consécutifs identiques.
- Ajout de l’état actuel lorsqu’il manque dans l’audit.
- Recherche des fiches versionnées.
- Chargement progressif par pages de 40 fiches.
- Construction des chronologies uniquement pour la page visible.
- Conservation des périodes de disponibilité actives et désactivées dans les instantanés courants.
- Sélection et comparaison de deux versions.
- Libellés lisibles pour les relations, discours et disponibilités.
- Restauration contrôlée d’une ancienne version.
- Vérification de la version technique actuelle avant restauration.
- Nouvelle validation métier des programmations restaurées.
- Confirmation des avertissements non bloquants.
- Refus des restaurations incompatibles avec les règles actuelles.
- Création d’une nouvelle version après restauration.
- Protection contre la désactivation de son propre accès administrateur.

### Référentiels et communication

- Discours publics.
- Orateurs et discours déclarés.
- Disponibilités, indisponibilités, périodes préférées et dates à éviter.
- Assemblées.
- Invitations.
- Hospitalité.

### Programmation intelligente

- Moteur central de règles PLAN_001 à PLAN_010.
- Alerte de répétition configurable.
- Recommandation pondérée des orateurs.
- Assistant de résolution des conflits métier.
- Solutions combinées lorsque plusieurs blocages doivent être corrigés ensemble.
- Planification automatique de 1 à 6 mois.
- Comparaison des scénarios Équilibré, Renouvellement des discours et Rotation des orateurs.
- Brouillons protégés contre les modifications concurrentes.
- Validation humaine obligatoire avant toute écriture automatique.

### Consultation

- Tableau de bord et priorités.
- Planning imprimable sur 3 ou 6 mois.
- Historique des opérations.
- Historique des versions.
- Interface Français / Kréyòl Gwadloup.

## Prochain lot — 1.11

- Documentation utilisateur complète.
- Documentation administrateur et procédure de déploiement.
- Recette professionnelle consolidée sur ordinateur et téléphone.
- Mesure des temps de réponse avec des bases de démonstration volumineuses.
- Amélioration des libellés et résumés de versions.
- Réduction supplémentaire des lectures Google Sheets répétitives.

## Version 2

- Portail orateur et demandes de modification.
- Indisponibilités déclarées directement par les orateurs avec validation du coordinateur.
- Envoi automatisé des invitations et rappels selon les droits accordés.
- Préparation annuelle et analyses d’équilibre approfondies.
- Migration optionnelle vers une base de données externe.
