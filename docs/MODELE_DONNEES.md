# Modèle de données

## PARAMETRES

- Cle
- Valeur
- Description

## DISCOURS

- IdDiscours
- Numero
- Titre
- Actif
- DateMiseAJour
- Source

## ASSEMBLEES

- IdAssemblee
- Nom
- Adresse
- LieuReunion
- JourReunion
- HeureReunion
- Coordinateur
- Telephone
- Email
- Actif

## ORATEURS

- IdOrateur
- Nom
- Prenom
- TypeOrateur
- IdAssemblee
- Telephone
- Email
- Actif
- Notes

Valeurs de `TypeOrateur` :

- LOCAL
- EXTERIEUR

## ORATEUR_DISCOURS

- IdAssociation
- IdOrateur
- IdDiscours
- TypeAssociation
- Actif

Valeurs de `TypeAssociation` :

- DECLARE
- FAVORI
- HISTORIQUE

## PROGRAMMATIONS

- IdProgrammation
- Date
- Heure
- IdOrateur
- IdAssemblee
- IdDiscours
- NumeroHistorique
- TitreHistorique
- Statut
- Notes
- DateCreation
- DateModification

## HOSPITALITE

- IdHospitalite
- IdProgrammation
- Groupe
- Responsable
- Telephone
- Statut
- DateValidation

## INVITATIONS

- IdInvitation
- IdProgrammation
- Destinataire
- DateEnvoi
- DateRelance
- Statut
- Reponse

## HISTORIQUE

- IdHistorique
- Horodatage
- Utilisateur
- Action
- Entite
- IdEntite
- AncienneValeur
- NouvelleValeur
- Commentaire

## Principes d'intégrité

- Les suppressions fonctionnelles utilisent un statut inactif ou archivé.
- Une programmation passée ne dépend pas d'un titre susceptible d'être modifié : son numéro et son titre sont copiés dans les champs historiques.
- Les relations utilisent des identifiants stables plutôt que les numéros de ligne des feuilles.
