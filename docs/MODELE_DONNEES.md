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

## ACTIONS_CORRECTIVES

| Colonne | Description |
|---|---|
| ID | Identifiant UUID de l’action. |
| SOURCE | `RAPPORT` ou `MANUEL`. |
| SOURCE_ID | Identifiant du contrôle du rapport lorsque la source est automatique. |
| VERSION | Version applicative concernée. |
| RAPPORT_REF | Référence du rapport ayant produit l’action. |
| TITRE | Libellé court. |
| DESCRIPTION | Action attendue. |
| PRIORITE | `BLOQUANTE`, `HAUTE` ou `NORMALE`. |
| STATUT | `A_FAIRE`, `EN_COURS`, `TERMINEE`, `RISQUE_ACCEPTE` ou `ANNULEE`. |
| RESPONSABLE | Responsable désigné. |
| DATE_ECHEANCE | Échéance facultative. |
| NOTES | Suivi administratif. |
| CREE_LE / CREE_PAR | Création. |
| MODIFIE_LE / MODIFIE_PAR | Dernière modification. |

Chaque action possède en parallèle une version optimiste `ACTION_CORRECTIVE_<ID>` dans les propriétés du script.

## RECETTE_MULTI_ECRANS

| Colonne | Description |
|---|---|
| ID | Identifiant stable du couple appareil/scénario. |
| VERSION | Version applicative testée. |
| APPAREIL | `ORDINATEUR`, `TABLETTE` ou `TELEPHONE`. |
| TEST_ID | `NAVIGATION`, `PLANNING`, `FORMULAIRES`, `RECHERCHE` ou `IMPRESSION`. |
| LIBELLE | Libellé lisible du scénario. |
| STATUT | `A_TESTER`, `REUSSI` ou `ECHEC`. |
| COMMENTAIRE | Observation facultative. |
| TESTE_LE | Date du dernier résultat effectif. |
| TESTE_PAR | Administrateur ayant enregistré le résultat. |

La matrice complète de la version courante partage une version optimiste `RECETTE_MULTI_ECRANS_<VERSION>`.

## MISES_EN_PRODUCTION

| Colonne | Description |
|---|---|
| ID | Référence technique non sensible de la décision. |
| VERSION | Version applicative concernée. |
| DECISION | `APPROVED`, `POSTPONED`, `DEPLOYED` ou `ROLLED_BACK`. |
| RAPPORT_REF | Référence du rapport de santé. |
| RAPPORT_EMPREINTE | Empreinte SHA-256 du contenu stable du rapport. |
| RAPPORT_STATUT | État global du rapport. |
| SCORE | Score sur 100. |
| ENVIRONNEMENT | Environnement visé, par défaut `PRODUCTION`. |
| DEPLOIEMENT_ID | Identifiant réel du déploiement Apps Script lorsqu’il existe. |
| SAUVEGARDE_REF | Nom de la sauvegarde de référence. |
| MOTIF | Motif du report ou du retour arrière. |
| DATE_DECISION | Horodatage. |
| DECIDE_PAR | Administrateur ayant enregistré la décision. |
| MANIFESTE_SHA256 | Checksum du noyau du manifeste. |

Les décisions sont ajoutées à la suite. Elles ne déclenchent aucune publication automatique.

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
- Une décision de mise en production doit référencer une version, un rapport, un état et une empreinte non vides.
- Une matrice multi-écrans ne peut contenir qu’un résultat par couple version/appareil/scénario.
- Une action corrective doit avoir une priorité, un statut, un titre et une description reconnus.
