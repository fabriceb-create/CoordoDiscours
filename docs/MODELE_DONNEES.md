# Modèle de données

Les feuilles sont créées automatiquement par `setupDatabase_()`. Les identifiants métier restent stables et ne dépendent jamais des numéros de ligne.

## PARAMETRES

| Colonne | Description |
|---|---|
| CLE | Identifiant unique du paramètre. |
| VALEUR | Valeur enregistrée sous forme de texte. |
| DESCRIPTION | Aide d’administration. |

## DISCOURS

| Colonne | Description |
|---|---|
| NUMERO | Numéro officiel du discours. |
| TITRE | Titre courant. |
| ACTIF | Disponibilité pour une nouvelle programmation. |
| DATE_MISE_A_JOUR | Dernière modification du référentiel. |

## ASSEMBLEES

| Colonne | Description |
|---|---|
| ID | Identifiant UUID. |
| NOM | Nom de l’assemblée. |
| COORDINATEUR | Coordinateur ou contact principal. |
| TELEPHONE | Téléphone. |
| EMAIL | Adresse électronique. |
| ADRESSE | Adresse ou lieu de réunion. |
| JOUR_REUNION | Jour habituel. |
| HEURE_REUNION | Heure habituelle. |
| ACTIF | Assemblée active ou archivée. |

## ORATEURS

| Colonne | Description |
|---|---|
| ID | Identifiant UUID. |
| NOM | Nom. |
| PRENOM | Prénom. |
| TYPE | `LOCAL` ou `EXTERIEUR`. |
| ASSEMBLEE_ID | Assemblée associée. |
| TELEPHONE | Téléphone. |
| EMAIL | Adresse électronique. |
| ACTIF | Orateur actif ou archivé. |
| NOTES | Informations complémentaires. |

## ORATEUR_DISCOURS

| Colonne | Description |
|---|---|
| ORATEUR_ID | Orateur concerné. |
| DISCOURS_NUMERO | Numéro de discours déclaré. |
| FAVORI | Indicateur réservé aux évolutions futures. |
| DATE_AJOUT | Date d’ajout. |

Pour un orateur extérieur, cette feuille limite les discours pouvant être programmés. Pour un orateur local, elle peut servir de préférence ou d’historique sans bloquer les autres discours actifs.

## ORATEUR_DISPONIBILITES

| Colonne | Description |
|---|---|
| ID | Identifiant UUID de la période. |
| ORATEUR_ID | Orateur concerné. |
| TYPE | `INDISPONIBLE`, `DISPONIBLE_SEULEMENT`, `PREFEREE` ou `A_EVITER`. |
| DATE_DEBUT | Premier jour inclus. |
| DATE_FIN | Dernier jour inclus. |
| MOTIF | Motif ou précision facultative. |
| ACTIF | Période prise en compte ou désactivée. |
| DATE_MISE_A_JOUR | Dernière écriture de la période. |

L’ensemble des périodes d’un même orateur est protégé par une version optimiste unique `ORATEUR_DISPONIBILITES_<ORATEUR_ID>` conservée dans les propriétés du script.

## PROGRAMMATIONS

| Colonne | Description |
|---|---|
| ID | Identifiant UUID. |
| DATE | Date de la réunion. |
| HEURE | Heure. |
| ORATEUR_ID | Orateur programmé. |
| DISCOURS_NUMERO | Numéro du discours. |
| STATUT | `PROGRAMME` ou `ANNULE`. |
| ASSEMBLEE_ORIGINE_ID | Assemblée d’origine facultative. |
| NOTES | Notes du coordinateur ou origine automatique. |

## HOSPITALITE

| Colonne | Description |
|---|---|
| ID | Identifiant UUID. |
| PROGRAMMATION_ID | Programmation liée. |
| GROUPE | Groupe d’accueil. |
| STATUT | `A_ATTRIBUER`, `PROPOSE`, `CONFIRME`, `REFUSE` ou `ANNULE`. |
| CONTACT | Contact du groupe. |
| NOTES | Informations complémentaires. |

## INVITATIONS

| Colonne | Description |
|---|---|
| ID | Identifiant UUID. |
| PROGRAMMATION_ID | Programmation liée. |
| DATE_ENVOI | Date d’envoi. |
| STATUT | `A_ENVOYER`, `ENVOYEE`, `ACCEPTEE`, `REFUSEE`, `RELANCEE` ou `ANNULEE`. |
| DESTINATAIRE | Adresse ou nom du destinataire. |
| NOTES | Informations complémentaires. |

## UTILISATEURS

| Colonne | Description |
|---|---|
| EMAIL | Identifiant de connexion normalisé. |
| NOM | Nom affiché. |
| ROLE | `ADMIN`, `COORDINATEUR` ou `CONSULTATION`. |
| ACTIF | Accès autorisé ou désactivé. |
| DATE_MISE_A_JOUR | Date de la dernière modification. |
| MODIFIE_PAR | Utilisateur ayant effectué la modification. |

## HISTORIQUE

| Colonne | Description |
|---|---|
| DATE_HEURE | Horodatage. |
| UTILISATEUR | Compte ayant effectué l’action. |
| ACTION | Type d’opération. |
| ENTITE | Domaine métier. |
| ENTITE_ID | Identifiant de la fiche. |
| DETAILS | JSON structuré contenant notamment l’état avant, l’état après et les champs modifiés. |

## Versions collaboratives

Les versions ne sont pas stockées dans les feuilles. `Concurrency.gs` les conserve dans les propriétés du script sous la forme :

```text
ENTITY_VERSION_<ENTITE>_<IDENTIFIANT>
```

Chaque valeur contient :

- `version` ;
- `updatedAt` ;
- `updatedBy`.

## Principes d’intégrité

- Les suppressions fonctionnelles utilisent un statut inactif, archivé ou annulé.
- Les relations utilisent des identifiants stables plutôt que les numéros de ligne.
- Une période de disponibilité doit référencer un orateur existant et contenir des dates cohérentes.
- Les doublons stricts de disponibilité sont interdits.
- Les périodes contradictoires sont signalées par le rapport d’intégrité.
- Les sauvegardes incluent automatiquement toutes les feuilles déclarées dans `APP_CONFIG.sheets`.
