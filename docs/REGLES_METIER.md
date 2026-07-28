# Règles métier

## Orateurs

1. Un orateur local peut présenter tout discours public actif.
2. Les discours associés à un orateur local représentent ses thèmes favoris ou son historique, mais ne limitent pas sa programmation.
3. Un orateur extérieur ne peut être programmé que sur un discours déclaré dans sa fiche.
4. Une fiche orateur doit permettre d’ajouter et de retirer un discours.
5. La suppression d’un discours d’une fiche ne doit jamais supprimer l’historique des programmations passées.

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
5. Si le créneau cible est occupé, le logiciel affiche l’orateur et le discours déjà programmés.
6. Les règles PLAN_001 à PLAN_007 sont évaluées côté serveur avant toute écriture.
7. Les règles sont réévaluées sous verrou immédiatement avant l’enregistrement afin d’éviter qu’un autre utilisateur ne prenne le créneau entre la validation et l’écriture.
8. Toutes les modifications sont enregistrées dans l’historique.

## Assistant de résolution

1. Une programmation bloquée ne doit jamais être enregistrée automatiquement.
2. Le logiciel peut proposer un autre orateur, une autre date, un autre discours ou une autre assemblée d’origine.
3. Si plusieurs erreurs sont indépendantes, le logiciel peut proposer une combinaison de deux, trois ou quatre changements.
4. Chaque hypothèse est repassée dans le moteur central de règles.
5. Une proposition contenant encore une erreur bloquante est éliminée.
6. Les avertissements non bloquants restent visibles et diminuent le score de la proposition.
7. Les solutions sont classées automatiquement tout en conservant une diversité de types.
8. Le bouton « Appliquer » remplit uniquement le formulaire ; le coordinateur doit encore vérifier puis enregistrer.

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
2. Le coordinateur modifie les données métier et les programmations.
3. Le rôle Consultation dispose d’un accès en lecture seule.
4. Toute vérification de droit est répétée côté serveur.

## Affichage

1. Le tableau d’affichage doit pouvoir couvrir 3 ou 6 mois.
2. Il doit être imprimable en A4.
3. Il contient la date, le numéro, le titre, l’orateur, l’assemblée et le groupe d’hospitalité.
4. Un seul verset aléatoire est proposé par tableau généré.
5. Les textes utilisent le tiret simple « - » et non le tiret long.
