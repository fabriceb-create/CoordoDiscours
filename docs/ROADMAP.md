# Feuille de route CoordoDiscours

## Objectif principal

Construire un assistant fiable permettant au coordinateur des discours publics de gérer l’ensemble du processus dans un seul outil, avec des propositions automatiques contrôlées par des règles métier explicites.

## Version 1.11 Stable — en préparation de recette

### Fondations et sécurité

- Structure modulaire Google Apps Script.
- Installation automatique de la base Google Sheets.
- Rôles Administrateur, Coordinateur et Consultation.
- Sauvegarde et restauration avec copie de sécurité Drive.
- Contrôle d’intégrité et historique détaillé avant/après.
- Verrouillage optimiste et fusion intelligente des modifications concurrentes.

### Ergonomie et accessibilité

- Navigation mobile en tiroir sous 820 pixels.
- En-tête mobile fixe et dialogues adaptés à la hauteur dynamique.
- Lien d’évitement vers le contenu principal.
- Focus clavier visible et contenu dans le tiroir ouvert.
- Fermeture du menu par bouton, voile de fond et touche Échap.
- Section active exposée avec `aria-current`.
- Messages de confirmation et d’erreur annoncés aux technologies d’assistance.
- Libellés accessibles traduits en Français et Kréyòl Gwadloup.
- Respect de la réduction des animations demandée par le système.

### Performance client

- Cache court des options de programmation.
- Cache court des programmations utilisées par les invitations et hospitalités.
- Mutualisation des appels serveur identiques en cours.
- Chargement parallèle des données indépendantes.
- Rejet des réponses de recherche devenues obsolètes.
- Invalidation centralisée après les modifications concernées.
- Chargement à la demande des principaux modules.
- Protection contre les doubles actions sur les écritures principales.

### Programmation intelligente

- Moteur central de règles PLAN_001 à PLAN_010.
- Recommandation pondérée des orateurs.
- Assistant de résolution des conflits métier.
- Planification automatique de 1 à 6 mois.
- Comparaison de trois scénarios.
- Disponibilités, périodes préférées et dates à éviter.
- Brouillons protégés contre les modifications concurrentes.

### Historique et collaboration

- Fusion intelligente à trois voies.
- Historique navigable et paginé des versions.
- Comparaison de deux versions.
- Restauration contrôlée d’un ancien état.
- Conservation des validations métier et des droits lors d’une restauration.

## Prochain lot — 1.12

- Guide utilisateur intégré et aide contextuelle.
- Guide administrateur et procédure de déploiement pas à pas.
- Mesure des durées des appels serveur les plus coûteux.
- Réduction des lectures répétitives côté serveur lorsque la cohérence le permet.
- Amélioration de l’affichage des erreurs réseau et proposition de reprise.
- Recette professionnelle consolidée sur ordinateur, tablette et téléphone.

## Version 2

- Portail orateur et demandes de modification.
- Indisponibilités déclarées directement par les orateurs avec validation du coordinateur.
- Envoi automatisé des invitations et rappels selon les droits accordés.
- Préparation annuelle et analyses d’équilibre approfondies.
- Migration optionnelle vers une base de données externe.
