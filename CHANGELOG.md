# Journal des versions

Toutes les modifications importantes de CoordoDiscours sont consignées dans ce fichier.

## [En développement]

### Ajouté

- Initialisation du dépôt GitHub.
- README du projet.
- Architecture technique initiale.
- Modèle de données initial.
- Règles métier validées.
- Feuille de route de développement.
- Installation automatique de la base Google Sheets.
- Interface d’application avec navigation latérale.
- Module Orateurs : création, recherche, modification, archivage et restauration.
- Module Assemblées : création, recherche, modification, archivage et restauration.
- Module Discours : création, recherche, modification, activation et désactivation.
- Liaison d’un orateur à une assemblée.
- Validation des champs obligatoires et des adresses e-mail.
- Historisation des créations, modifications, archivages et restaurations.
- Diagnostic automatique du socle avec `runSmokeTests`.
- Module Programmation : création, recherche, modification, annulation et restauration.
- Contrôle bloquant des créneaux déjà occupés.
- Contrôle des discours inactifs et des orateurs archivés.
- Restriction des orateurs extérieurs à leurs discours déclarés.
- Alerte non bloquante lorsqu’un discours a déjà été programmé durant les 12 derniers mois.
- Confirmation explicite avant l’enregistrement d’une programmation comportant une alerte.
- Tableau de bord actif avec indicateurs, prochaine programmation et liste des priorités.
- Détection des invitations et hospitalités manquantes pour les orateurs extérieurs dans les 14 prochains jours.
- Diagnostic visuel de la présence des feuilles de données.
- Actualisation manuelle et automatique du tableau de bord.
- Module Hospitalité : rattachement à une programmation, groupe d’accueil, contact, notes et suivi du statut.
- Module Invitations : rattachement à une programmation, destinataire, date d’envoi, notes et suivi du statut.
- Recherche dans les hospitalités et les invitations.
- Actions rapides pour confirmer une hospitalité et marquer une invitation comme envoyée.
- Blocage des doublons d’hospitalité ou d’invitation pour une même programmation.
- Actualisation automatique du tableau de bord après une action de communication.

### Décisions figées

- Les orateurs locaux peuvent présenter tous les discours actifs.
- Les orateurs extérieurs sont limités aux discours déclarés.
- Les discours 59, 82, 122 et 123 sont inactifs.
- La répétition sur 12 mois produit une alerte non bloquante.
- Toutes les modifications de programmation doivent être historisées.
- Une programmation ne peut avoir qu’une hospitalité active et une invitation active dans la version actuelle.
