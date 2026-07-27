# Journal des versions

Toutes les modifications importantes de CoordoDiscours sont consignées dans ce fichier.

## [En développement]

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
