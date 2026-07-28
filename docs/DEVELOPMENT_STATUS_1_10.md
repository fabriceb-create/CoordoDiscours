# État de développement — CoordoDiscours 1.10

## Objectif

Durcir le module d’historique des versions et maintenir des temps de réponse maîtrisés lorsque le nombre de fiches ou d’opérations augmente.

## Réalisé

- Pagination serveur rétrocompatible de `listVersionHistoryRecords`.
- Taille par défaut de 40 fiches et limite maximale de 100.
- Tri et filtrage avant la construction détaillée des chronologies.
- Construction des chronologies uniquement pour la page demandée.
- Bouton **Charger plus** dans l’interface.
- Recherche et changement de type réinitialisant correctement la pagination.
- Retour à la fiche restaurée, y compris lorsqu’elle se trouve après la première page.
- Inclusion des disponibilités désactivées dans l’état courant versionné.
- Correction des champs modifiés associés aux instantanés `BEFORE`.
- Seize scénarios exécutables pour le moteur de versions.
- Publication temporaire pendant 24 heures du code testé comme artefact GitHub Actions afin de faciliter les diagnostics.

## Compatibilité

L’appel historique `listVersionHistoryRecords(entity, searchText)` continue de renvoyer un tableau complet. L’interface 1.10 transmet un troisième argument `{ offset, limit }` et reçoit une réponse paginée contenant `records`, `totalCount`, `nextOffset` et `hasMore`.

## Validation requise

- Réussite complète de `npm run check`.
- Réussite de GitHub Actions.
- Test manuel avec plus de 40 fiches d’un même type.
- Vérification de la recherche, du bouton **Charger plus** et du retour après restauration.
