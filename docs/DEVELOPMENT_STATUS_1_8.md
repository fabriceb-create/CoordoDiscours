# Statut de développement — CoordoDiscours 1.8

Ce lot introduit la fusion intelligente des modifications concurrentes.

## Portée

- comparaison à trois voies entre l’état ouvert, l’état local et l’état distant ;
- fusion automatique des champs non contradictoires ;
- arbitrage guidé des champs contradictoires ;
- fusion des listes de discours comme des ensembles ;
- fusion élément par élément et champ par champ des disponibilités ;
- nouvelle vérification de la version distante pendant l’arbitrage ;
- réutilisation des validations, droits et verrous des fonctions métier ;
- audit des fusions automatiques et résolues ;
- interface Français / Kréyòl Gwadloup ;
- scénarios automatiques dédiés.

## Validation attendue

La version peut être fusionnée lorsque `npm run check` réussit dans GitHub Actions et que la pull request est fusionnable sans conflit. Une recette réelle dans Google Apps Script reste ensuite nécessaire avant la validation définitive.
