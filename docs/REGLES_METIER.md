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
