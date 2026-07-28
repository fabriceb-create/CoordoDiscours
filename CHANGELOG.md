# Journal des versions

Toutes les modifications importantes de CoordoDiscours sont consignées dans ce fichier.

## [En développement]

## [1.14.0] — en préparation de recette réelle

### Ajouté

- Plan d’actions correctives synchronisable avec les recommandations du rapport de santé.
- Recette réelle de 15 scénarios répartis entre ordinateur, tablette et téléphone.
- Registre des décisions `APPROVED`, `POSTPONED`, `DEPLOYED` et `ROLLED_BACK`.
- Manifeste de déploiement JSON avec checksum SHA-256.
- Dossier de support expurgé des identifiants de base et des noms d’orateurs.
- Rapport annuel de capacité, d’équilibre et de couverture.
- Archivage contrôlé de l’historique avec copie Google Drive préalable.
- Nouvelle suite `test-release-governance.mjs`.

### Amélioré

- Rapport de santé étendu à la recette multi-écrans.
- Recette guidée portée à sept étapes.
- Score de préparation réparti sur six contrôles.
- Schéma d’installation porté à `1.9.0`.
- Contrôle d’intégrité étendu aux actions, tests multi-écrans et décisions de déploiement.
- Aide intégrée et traductions complétées pour la gouvernance de production.
- Validation automatique portée à onze suites.

### Sécurité et fiabilité

- Verrouillage optimiste des actions correctives.
- Approbation impossible sans rapport `READY` à `100/100`.
- Approbation impossible lorsqu’une action bloquante reste ouverte.
- Confirmation textuelle obligatoire pour l’approbation, le déploiement, le retour arrière et l’archivage.
- Vérification de l’empreinte du rapport avant enregistrement d’une décision.
- Limites d’âge, de conservation et de volume appliquées à l’archivage.


## [1.13.0] — en préparation de recette

### Ajouté

- Module administrateur Mise en production avec score global de santé.
- Recette guidée en six étapes, persistée et exportable en JSON.
- Références non sensibles pour les erreurs visibles et journal des incidents récents.
- Suite automatique `test-release-readiness.mjs`.
- Guides de recette et statut de développement 1.13.

### Amélioré

- Rapport d’intégrité exécutable silencieusement dans un contrôle composite.
- Rapport de performance réutilisable par les diagnostics internes.
- Guide intégré complété par la procédure de mise en production.
- Validation automatique portée à dix suites.

### Sécurité

- Verrou serveur sur la progression de recette.
- Compactage de la session avant stockage dans `PropertiesService`.
- Assainissement et limitation des messages d’incident avant journalisation.

## [1.12.0] — en préparation de recette

### Ajouté

- Module **Aide** avec recherche, sujets filtrés par rôle et aide contextuelle par écran.
- Bouton d’aide global, boutons contextuels et raccourci clavier `?`.
- Guide utilisateur et guide administrateur détaillés.
- Mesure agrégée et temporaire des durées d’appels serveur.
- Diagnostic administrateur des appels, lenteurs et erreurs.
- Nouvelle suite `test-help-observability.mjs`.

### Amélioré

- Cache serveur court pour les paramètres, options de programmation, options de communication et libellés de versions.
- Réutilisation des référentiels et programmations préchargés dans le tableau de bord, l’intégrité, la planification automatique et l’historique des versions.
- Une lecture interrompue par une erreur transitoire est relancée une seule fois.
- Le panneau de reprise distingue désormais une lecture relançable d’une écriture au résultat incertain.
- La validation automatique contrôle 64 fichiers essentiels et 35 fonctions sensibles.

### Sécurité et fiabilité

- Les écritures ne sont jamais répétées automatiquement après une coupure réseau.
- Les caches sont invalidés après les écritures concernées et ignorés sans bloquer l’application en cas d’indisponibilité.
- Le rapport de performance et sa réinitialisation sont réservés aux administrateurs.
- Les contextes de mesure sont filtrés et bornés avant stockage temporaire.

## [1.11.0] — en préparation de recette

### Ajouté

- Navigation mobile en tiroir avec bouton d’ouverture, fermeture par voile de fond et touche Échap.
- Lien d’évitement vers le contenu principal.
- Libellés accessibles sur les boutons icônes et annonces `aria-live` pour les messages.
- Nouvelle suite `test-responsive-accessibility.mjs`.

### Amélioré

- Focus clavier visible et contenu dans le tiroir mobile ouvert.
- Respect de la préférence de réduction des animations.
- Navigation centralisée par événement `coordodiscours:viewchange`, y compris pour les liens directs par ancre.
- Cache client de 60 secondes pour les options de programmation et de communication.
- Mutualisation des demandes simultanées et rejet des réponses de recherche devenues obsolètes.
- Chargement à la demande des modules impression, paramètres, sauvegarde, historique et versions.
- Protection des principaux boutons et formulaires contre les doubles actions.

### Corrigé

- Invalidation des listes partagées après modification d’une programmation ou d’un référentiel.
- Nettoyage des caches après restauration complète de la base.
- Redirection vers le tableau de bord lorsqu’un lien direct ouvre une vue administrateur sans droit suffisant.

## [1.10.0] — en préparation de recette

### Amélioré

- Chargement progressif des fiches dans le module Versions, par pages de 40.
- Construction des chronologies détaillées limitée aux fiches réellement affichées.
- Compteur indiquant le nombre de fiches chargées et le total disponible.
- Retour automatique à la fiche restaurée, même lorsqu’elle se trouve sur une page suivante.

### Corrigé

- Conservation des périodes de disponibilité désactivées dans l’état courant versionné.
- Attribution des champs modifiés à la version `AFTER` plutôt qu’à l’état `BEFORE` de la même opération.
- Bornage serveur des paramètres de pagination.


### Ajouté

- Initialisation du dépôt GitHub.
- Documentation fonctionnelle, architecture, modèle de données et règles métier.
- Installation automatique de la base Google Sheets.
- Interface d’application avec navigation latérale.
- Modules Tableau de bord, Programmation, Orateurs, Assemblées et Discours.
- Gestion des discours déclarés par les orateurs extérieurs.
- Modules Hospitalité et Invitations.
- Planning imprimable sur 3 ou 6 mois en A4 paysage.
- Module Historique avec recherche et filtres.
- Module Paramètres et diagnostic de la base.
- Interface multilingue Français / Kréyòl Gwadloup.
- Validation des champs obligatoires et des adresses e-mail.
- Contrôle bloquant des créneaux déjà occupés.
- Contrôle des discours inactifs et des orateurs archivés.
- Alerte non bloquante de répétition d’un discours.
- Détection des invitations et hospitalités manquantes.
- Historisation des créations, modifications et changements de statut.
- Fonction d’installation complète `installCoordoDiscours`.
- Migrations automatiques et suivi de version du schéma.
- Diagnostic d’installation avec `getInstallationStatus`.
- Batterie de tests automatiques avec `runAcceptanceTests`.
- Procédure détaillée d’installation Apps Script.
- Plan complet de recette fonctionnelle.
- Export JSON complet de la base depuis l’interface.
- Inspection et validation d’une sauvegarde avant restauration.
- Restauration protégée par confirmation explicite et verrou Apps Script.
- Copie de sécurité automatique dans Google Drive avant chaque restauration.
- Limites de taille et contrôle strict des feuilles autorisées pendant l’import.
- Feuille `UTILISATEURS` créée automatiquement lors de l’installation ou d’une migration.
- Gestion des rôles Administrateur, Coordinateur et Consultation seule.
- Premier utilisateur Google automatiquement enregistré comme administrateur sur une installation vide.
- Interface d’administration des utilisateurs intégrée aux paramètres.
- Activation, désactivation et modification des droits avec traçabilité dans l’historique.
- Masquage automatique des commandes de modification et d’administration pour les profils en consultation seule.

### Décisions figées

- Les orateurs locaux peuvent présenter tous les discours actifs.
- Les orateurs extérieurs sont limités aux discours déclarés.
- Les discours 59, 82, 122 et 123 sont inactifs.
- La répétition sur 12 mois produit une alerte non bloquante.
- Toutes les modifications de programmation doivent être historisées.
- Une programmation ne peut avoir qu’une hospitalité active et une invitation active dans la version actuelle.
- Le français est la langue par défaut ; le créole guadeloupéen peut être sélectionné dans les paramètres.
- Les données métier ne sont pas traduites automatiquement ; seule l’interface et les textes générés le sont.
- Une restauration ne peut être exécutée qu’après création d’une copie de sécurité automatique.
- L’administrateur gère les utilisateurs et la configuration ; le coordinateur gère les données métier ; le profil Consultation ne peut que lire et imprimer.

### À valider avant publication stable

- Exécution réelle dans Google Apps Script.
- Autorisations Google et création de la base.
- Réussite de tous les tests automatiques.
- Recette fonctionnelle sur ordinateur et téléphone.
- Vérification et ajustement du vocabulaire créole.
- Validation de l’impression sur un document réel.
- Test réel d’un cycle sauvegarde puis restauration sur une base de démonstration.
- Vérification de l’adresse renvoyée par `Session.getActiveUser().getEmail()` selon le mode de déploiement Google choisi.
