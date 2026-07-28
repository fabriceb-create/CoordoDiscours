# Feuille de route CoordoDiscours

## Objectif principal

Construire un assistant fiable permettant au coordinateur des discours publics de gérer l’ensemble du processus dans un seul outil, avec des propositions automatiques contrôlées par des règles métier explicites.

## Version 1.12 Stable — en préparation de recette

### Fondations et sécurité

- Structure modulaire Google Apps Script.
- Installation automatique de la base Google Sheets.
- Rôles Administrateur, Coordinateur et Consultation.
- Sauvegarde et restauration avec copie de sécurité Drive.
- Contrôle d’intégrité et historique détaillé avant/après.
- Verrouillage optimiste et fusion intelligente des modifications concurrentes.

### Guide et assistance

- Module Aide intégré à la navigation.
- Recherche dans les sujets du guide.
- Contenu filtré selon le rôle réel de l’utilisateur.
- Aide contextuelle disponible depuis chaque module.
- Bouton global et raccourci clavier `?`.
- Guide utilisateur et guide administrateur dans la documentation.
- Procédure de déploiement et de retour arrière consolidée.

### Fiabilité réseau

- Classement explicite des appels client en lectures et écritures.
- Une seule reprise automatique pour une lecture transitoirement interrompue.
- Aucune répétition automatique d’une écriture.
- Bandeau indiquant quand recharger et quand vérifier l’état avant de recommencer.
- Conservation des protections contre les doubles clics, conflits de version et doublons métier.

### Performance serveur

- Cache serveur de 60 secondes pour les données partagées compatibles avec une cohérence courte.
- Invalidation ciblée après les écritures concernées.
- Réutilisation des référentiels préchargés dans les calculs composites.
- Mesure temporaire des durées, erreurs et appels lents.
- Diagnostic administrateur dans Paramètres.
- Aucune donnée métier sensible enregistrée dans le contexte des mesures.

### Ergonomie et accessibilité

- Navigation mobile en tiroir sous 820 pixels.
- Lien d’évitement et focus clavier visible.
- Focus contenu dans le tiroir et restitué après fermeture.
- Annonces accessibles pour les messages et erreurs.
- Réduction des animations respectée.
- Guide et reprise réseau adaptés aux écrans étroits.

### Programmation intelligente et collaboration

- Moteur central de règles PLAN_001 à PLAN_010.
- Recommandation pondérée des orateurs.
- Assistant de résolution des conflits métier.
- Planification automatique de 1 à 6 mois.
- Disponibilités, périodes préférées et dates à éviter.
- Fusion intelligente à trois voies.
- Historique navigable, paginé et restaurable.

## Prochain lot — 1.13

- Rapport de santé global avant déploiement, réunissant installation, intégrité, sauvegarde récente et performances.
- Mode recette guidée avec progression et résultats exportables.
- Diagnostics d’erreur enrichis avec identifiant de corrélation non sensible.
- Amélioration des résumés de versions et des journaux d’administration.
- Consolidation des procédures de mise en production et de support.

## Version 2

- Portail orateur et demandes de modification.
- Indisponibilités déclarées directement par les orateurs avec validation du coordinateur.
- Envoi automatisé des invitations et rappels selon les droits accordés.
- Préparation annuelle et analyses d’équilibre approfondies.
- Migration optionnelle vers une base de données externe.
