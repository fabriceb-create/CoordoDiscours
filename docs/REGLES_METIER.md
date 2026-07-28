# Règles métier

## Orateurs

1. Un orateur local peut présenter tout discours public actif.
2. Les discours associés à un orateur local représentent ses thèmes favoris ou son historique, mais ne limitent pas sa programmation.
3. Un orateur extérieur ne peut être programmé que sur un discours déclaré dans sa fiche.
4. Une fiche orateur doit permettre d’ajouter et de retirer un discours.
5. La suppression d’un discours d’une fiche ne doit jamais supprimer l’historique des programmations passées.
6. Les disponibilités constituent une fiche collaborative distincte, protégée par verrouillage optimiste.

## Disponibilités des orateurs

1. Une période `INDISPONIBLE` bloque toute programmation dont la date est comprise entre la date de début et la date de fin incluses.
2. Lorsqu’un orateur possède au moins une période active `DISPONIBLE_SEULEMENT`, toute date située hors de l’ensemble de ces fenêtres est bloquée.
3. Une date `PREFEREE` reste non bloquante et augmente le score de recommandation selon un bonus configurable.
4. Une date `A_EVITER` reste enregistrable après confirmation, déclenche un avertissement et diminue le score selon un malus configurable.
5. Une période `INDISPONIBLE` prévaut toujours lorsqu’elle chevauche une autre indication.
6. Les périodes désactivées sont conservées mais ignorées par les moteurs.
7. Une date de fin antérieure à la date de début est refusée.
8. Deux périodes strictement identiques pour le même orateur sont refusées.
9. Le rapport d’intégrité signale les orateurs inexistants, types inconnus, dates invalides, doublons et contradictions.

## Discours

1. Les discours 59, 82, 122 et 123 sont inactifs.
2. Le discours 148 est intitulé : « Avez-vous la pensée de Dieu sur la vie ? »
3. Le discours 159 est intitulé : « Comment trouver la sécurité dans un monde dangereux ».
4. Un discours inactif ne peut plus être proposé pour une nouvelle programmation.
5. Une programmation ancienne conserve le numéro et le titre utilisés à cette date.
6. La recherche doit fonctionner par numéro, titre partiel et mots-clés.

## Programmation

1. Une seule programmation active peut occuper un même créneau composé de la date et de l’heure.
2. La répétition d’un même discours dans la période configurée déclenche une alerte non bloquante.
3. Un orateur déjà programmé à la même date déclenche une alerte non bloquante.
4. Un orateur archivé, un discours inactif, une assemblée archivée ou un discours non déclaré pour un orateur extérieur bloque l’enregistrement.
5. Une indisponibilité ou une date située hors des fenêtres autorisées bloque l’enregistrement.
6. Une date à éviter déclenche un avertissement non bloquant.
7. Une date préférée produit une information positive.
8. Si le créneau cible est occupé, le logiciel affiche l’orateur et le discours déjà programmés.
9. Les règles `PLAN_001` à `PLAN_010` sont évaluées côté serveur avant toute écriture.
10. Les règles sont réévaluées sous verrou immédiatement avant l’enregistrement afin d’éviter qu’un autre utilisateur ne prenne le créneau entre la validation et l’écriture.
11. Toutes les modifications sont enregistrées dans l’historique.

## Codes du moteur de règles

- `PLAN_001` : orateur introuvable ou archivé — erreur.
- `PLAN_002` : discours introuvable ou inactif — erreur.
- `PLAN_003` : discours non déclaré pour un orateur extérieur — erreur.
- `PLAN_004` : assemblée d’origine introuvable ou archivée — erreur.
- `PLAN_005` : créneau déjà occupé — erreur.
- `PLAN_006` : orateur déjà programmé à la même date — avertissement.
- `PLAN_007` : discours répété dans la période configurée — avertissement.
- `PLAN_008` : orateur indisponible ou date hors fenêtre autorisée — erreur.
- `PLAN_009` : date à éviter pour l’orateur — avertissement.
- `PLAN_010` : date préférée par l’orateur — information.

## Recommandation des orateurs

1. Un orateur bloqué par `PLAN_008` est exclu des recommandations.
2. Une date préférée reçoit le bonus `RECO_BONUS_DATE_PREFEREE`.
3. Une date à éviter reçoit le malus `RECO_MALUS_DATE_A_EVITER`.
4. Les critères historiques restent normalisés sur 100 avant application de ces ajustements.
5. Le score final reste compris entre 0 et 100.
6. Les raisons positives et réserves liées aux disponibilités sont visibles dans l’interface.

## Assistant de résolution

1. Une programmation bloquée ne doit jamais être enregistrée automatiquement.
2. Le logiciel peut proposer un autre orateur, une autre date, un autre discours ou une autre assemblée d’origine.
3. Si plusieurs erreurs sont indépendantes, le logiciel peut proposer une combinaison de deux, trois ou quatre changements.
4. Chaque hypothèse est repassée dans le moteur central de règles, y compris les disponibilités.
5. Une proposition contenant encore une erreur bloquante est éliminée.
6. Les avertissements non bloquants restent visibles et diminuent le score de la proposition.
7. Les solutions sont classées automatiquement tout en conservant une diversité de types.
8. Le bouton « Appliquer » remplit uniquement le formulaire ; le coordinateur doit encore vérifier puis enregistrer.

## Planification automatique

1. Le coordinateur choisit une période de 1 à 6 mois et valide toujours le résultat avant écriture.
2. Les créneaux déjà occupés sont conservés et signalés comme ignorés.
3. Chaque proposition est validée avec `RulesEngine` et classée avec `RecommendationEngine`.
4. Un orateur indisponible ne peut pas être retenu.
5. Les dates préférées et à éviter influencent le classement.
6. Le moteur compare les scénarios Équilibré, Renouvellement des discours et Rotation des orateurs.
7. Le coordinateur peut désélectionner des dates avant enregistrement.
8. Un brouillon devient obsolète si le planning, un référentiel, une disponibilité ou un réglage utilisé pour le score a changé.
9. Les propositions sont revalidées dans l’ordre sous un verrou serveur avant l’écriture groupée.
10. En cas d’échec pendant l’écriture, les lignes et versions créées par l’opération sont retirées.
11. Les invitations et hospitalités des orateurs extérieurs peuvent être préparées automatiquement, mais restent à compléter.

## Concurrence

1. Chaque fiche collaborative possède une version technique.
2. L’interface transmet la version lue lors d’une modification.
3. Le serveur refuse l’écriture lorsque la version courante est différente.
4. Les modifications portant sur une fiche périmée ne doivent jamais écraser silencieusement une version plus récente.
5. Une nouvelle version est générée après chaque écriture réussie.

## Hospitalité

1. L’hospitalité concerne en priorité les orateurs extérieurs.
2. Le logiciel peut suggérer un groupe, mais le coordinateur valide le choix.
3. Les rappels sont prévus 7 jours puis 2 jours avant la visite.

## Accès

1. L’administrateur gère les paramètres, les utilisateurs, les sauvegardes et les diagnostics.
2. Le coordinateur modifie les données métier, les disponibilités et les programmations.
3. Le rôle Consultation dispose d’un accès en lecture seule.
4. Toute vérification de droit est répétée côté serveur.

## Affichage

1. Le tableau d’affichage doit pouvoir couvrir 3 ou 6 mois.
2. Il doit être imprimable en A4.
3. Il contient la date, le numéro, le titre, l’orateur, l’assemblée et le groupe d’hospitalité.
4. Un seul verset aléatoire est proposé par tableau généré.
5. Les textes utilisent le tiret simple « - » et non le tiret long.

## Aide intégrée

1. Le guide doit être consultable par tous les utilisateurs autorisés.
2. Chaque sujet possède un rôle minimal et le serveur filtre le contenu avant de le transmettre.
3. Un rôle Consultation ne reçoit aucun sujet Coordinateur ou Administrateur.
4. L’aide contextuelle dépend de la vue réellement ouverte.
5. Le guide ne doit jamais fournir un moyen de contourner les droits de l’application.

## Cache serveur

1. Un cache est une optimisation temporaire et non la source de vérité.
2. Une indisponibilité du cache ne doit pas bloquer une lecture Google Sheets.
3. Les paramètres et options partagées peuvent être conservés au maximum 60 secondes.
4. Toute écriture susceptible de rendre une valeur obsolète invalide le cache concerné.
5. Une installation ou restauration complète invalide tous les caches.
6. Les validations définitives continuent à appliquer les règles métier et les verrous habituels.

## Fiabilité réseau

1. Une lecture interrompue par une erreur transitoire peut être relancée automatiquement une seule fois.
2. Une écriture n’est jamais relancée automatiquement.
3. Après une coupure pendant une écriture, l’utilisateur doit vérifier l’état actuel avant de recommencer.
4. Le message de reprise doit distinguer une lecture échouée d’une écriture au résultat incertain.
5. La reprise réseau ne remplace ni le contrôle des doublons, ni le verrouillage optimiste, ni la fusion intelligente.

## Observabilité

1. Les mesures de performance sont agrégées, temporaires et de type meilleur effort.
2. L’échec de la mesure ne doit jamais faire échouer l’opération métier.
3. Seuls des contextes simples, bornés et non sensibles peuvent être conservés.
4. Le rapport et sa réinitialisation sont réservés aux administrateurs.
5. La réinitialisation des mesures est historisée.
6. Une durée élevée isolée ne suffit pas à conclure à un défaut permanent.

## Rapport de santé et recette réelle

1. Le rapport de santé comporte six contrôles pondérés totalisant 100 points.
2. Un contrôle `BLOCKING` impose l’état global `BLOCKED`, quel que soit le score numérique obtenu ailleurs.
3. Un contrôle `WARNING` impose l’état global `ATTENTION` en l’absence de blocage.
4. L’état `READY` exige six contrôles `PASS` et un score de 100/100.
5. La recette guidée exécute sept étapes dans l’ordre et refuse une session remplacée ou terminée.
6. La recette multi-écrans comprend exactement 15 résultats : cinq scénarios sur trois appareils.
7. Un scénario `ECHEC` rend le contrôle multi-écrans bloquant.
8. Un scénario `A_TESTER` maintient le contrôle hors de l’état conforme.
9. La modification de la matrice multi-écrans exige la version technique attendue.

## Actions correctives

1. Une recommandation du rapport peut créer ou mettre à jour une action de source `RAPPORT`.
2. Une recommandation disparue peut terminer automatiquement l’action active correspondante de la même version applicative.
3. Une action manuelle doit comporter un titre et une description.
4. Les priorités autorisées sont `BLOQUANTE`, `HAUTE` et `NORMALE`.
5. Les statuts terminaux sont `TERMINEE`, `RISQUE_ACCEPTE` et `ANNULEE`.
6. Une action bloquante non terminale interdit l’approbation de la mise en production.
7. Une écriture sur une action périmée est refusée par le verrouillage optimiste.
8. Une action en retard reste visible tant qu’elle n’est pas dans un statut terminal.

## Décisions de mise en production

1. CoordoDiscours n’effectue aucune publication Apps Script automatique.
2. Une approbation exige le mot `AUTORISER`, un rapport `READY` à 100/100 et aucune action bloquante ouverte.
3. L’empreinte transmise par l’interface doit correspondre au rapport recalculé au moment de la décision.
4. Un même rapport ne peut pas être approuvé plusieurs fois pour la même version.
5. Un report exige un motif.
6. La confirmation d’un déploiement exige le mot `DEPLOYE`, un identifiant de déploiement Apps Script et une approbation correspondant au rapport courant.
7. Un retour arrière exige le mot `RETOUR`, un motif et l’existence d’un déploiement antérieur.
8. Chaque décision est ajoutée au registre et à l’audit ; une décision antérieure n’est pas réécrite.
9. Le manifeste reprend le noyau de la décision et son checksum SHA-256.

## Rapport annuel de capacité

1. Seules les programmations non annulées de l’année sélectionnée sont comptées.
2. Le jour hebdomadaire théorique est déduit du jour le plus fréquent dans l’historique disponible.
3. Les orateurs actifs sans affectation participent au calcul de l’équilibre.
4. L’indice d’équilibre est `100 / (1 + coefficient de variation)`.
5. La concentration des 20 % les plus sollicités est calculée sur les affectations totales.
6. La couverture des discours compare les discours actifs distincts utilisés aux discours actifs disponibles.
7. Les résultats nominaux sont réservés à l’administrateur et retirés du dossier de support expurgé.
8. Les indicateurs sont descriptifs ; ils ne remplacent pas l’appréciation pastorale et organisationnelle du coordinateur.

## Archivage de l’historique

1. Une ligne de moins de 180 jours ne peut pas être archivée.
2. Au moins les 500 lignes les plus récentes doivent rester dans la feuille `HISTORIQUE`.
3. Une opération ne peut pas dépasser 25 000 lignes.
4. L’aperçu et l’exécution doivent retrouver le même nombre de lignes éligibles.
5. Le mot `ARCHIVER` est obligatoire.
6. Un fichier JSON Google Drive est créé avant la suppression.
7. En cas d’échec de la création de l’archive, aucune ligne ne doit être supprimée.
8. La suppression s’effectue du bas vers le haut afin de préserver les numéros de ligne restants.
9. L’opération est auditée avec les critères et le nombre de lignes archivées.
