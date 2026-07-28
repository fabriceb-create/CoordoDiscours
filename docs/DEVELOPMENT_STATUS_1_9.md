# Statut de développement — CoordoDiscours 1.9

Ce lot introduit l’historique navigable des versions.

## Portée

- reconstruction des versions depuis les instantanés avant/après de l’audit ;
- déduplication des états consécutifs identiques ;
- ajout de l’état actuellement stocké lorsqu’il manque dans l’audit ;
- chronologie numérotée par fiche ;
- comparaison de deux versions ;
- formatage lisible des relations, listes de discours et disponibilités ;
- restauration d’une ancienne version par les fonctions métier existantes ;
- contrôle du rôle et de la version technique actuelle ;
- propagation des avertissements et erreurs de `RulesEngine` ;
- protection du propre accès administrateur ;
- interface responsive Français / Kréyòl Gwadloup ;
- scénarios automatiques dédiés.

## Choix d’architecture

La version 1.9 réutilise la feuille `HISTORIQUE` existante et n’ajoute pas de feuille de stockage des versions. Le schéma de base reste donc en version 1.8.0.

## Validation attendue

La version peut être fusionnée lorsque :

- `npm run check` réussit localement ;
- GitHub Actions réussit sur la pull request ;
- la pull request est fusionnable sans conflit.

Une recette réelle dans Google Apps Script reste ensuite nécessaire avant la validation définitive.
