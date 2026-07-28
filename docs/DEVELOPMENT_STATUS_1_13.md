# Statut de développement — CoordoDiscours 1.13

## Portée

La version 1.13 ajoute une couche de préparation à la mise en production destinée aux administrateurs.

### Rapport de santé

Le rapport consolide cinq domaines :

1. installation et structure ;
2. intégrité des données ;
3. sauvegarde récente ;
4. performance et incidents ;
5. dernière recette d’acceptation.

Chaque domaine reçoit un poids. Le résultat final est un score sur 100 et un état `READY`, `ATTENTION` ou `BLOCKED`.

### Recette guidée

Une session persistée exécute six étapes dans l’ordre. Elle est protégée par `ScriptLock`, compactée avant stockage dans `PropertiesService` et peut être exportée au format JSON.

### Support

Les erreurs affichées reçoivent une référence non sensible. Les informations journalisées sont limitées au module, à l’opération, au type de lecture ou d’écriture et à un message borné.

## Validation attendue

La version peut être fusionnée lorsque :

- `npm run check` réussit ;
- `npm run predeploy:check` ne contient aucune erreur bloquante ;
- GitHub Actions est vert ;
- la pull request est fusionnable ;
- aucun fichier temporaire de transfert n’est présent.

Une recette réelle dans Google Apps Script reste obligatoire avant déclaration de production.
