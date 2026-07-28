# Statut de développement — CoordoDiscours 1.7

Ce lot introduit la gestion structurée des disponibilités des orateurs.

## Portée

- quatre types de période : indisponible, disponible seulement, préférée et à éviter ;
- nouvelles règles `PLAN_008`, `PLAN_009` et `PLAN_010` ;
- intégration au moteur de recommandation ;
- intégration à l’assistant de résolution ;
- intégration à la planification automatique ;
- verrouillage optimiste et retour arrière des écritures ;
- contrôle d’intégrité, sauvegarde, audit et migration ;
- interface Français / Kréyòl Gwadloup ;
- scénarios automatiques dédiés.

## Validation attendue

La version peut être fusionnée lorsque `npm run check` réussit dans GitHub Actions et que la pull request est fusionnable sans conflit.
