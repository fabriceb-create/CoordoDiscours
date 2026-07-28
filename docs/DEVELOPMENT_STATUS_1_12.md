# Statut de développement — CoordoDiscours 1.12

## Portée du lot

- guide intégré et recherche documentaire ;
- aide contextuelle par module ;
- filtrage des sujets selon les rôles ;
- guide utilisateur et guide administrateur ;
- reprise explicite après erreur réseau ;
- une seule relance automatique des lectures transitoires ;
- aucune relance automatique des écritures ;
- cache serveur court et invalidation ciblée ;
- partage de référentiels préchargés entre les modules composites ;
- mesure temporaire des appels serveur ;
- diagnostic administrateur ;
- recette interne étendue ;
- neuvième suite de tests.

## Choix d’architecture

Le lot n’ajoute aucune feuille Google Sheets. L’aide est embarquée dans le code et les mesures sont temporaires dans `CacheService`. Le schéma de données reste donc en version `1.8.0`.

Les caches sont strictement des optimisations. Toute indisponibilité du cache provoque une lecture directe et non un blocage métier.

Les écritures ne sont pas relancées automatiquement après une coupure réseau, car leur résultat peut déjà avoir été accepté par Google Apps Script.

## Validation attendue

La version peut être fusionnée lorsque :

- `npm run check` réussit ;
- `npm run predeploy:check` ne signale aucune erreur bloquante ;
- GitHub Actions réussit sur la pull request ;
- la pull request reste fusionnable ;
- aucun fichier temporaire n’est présent dans le diff.

Une recette réelle dans Google Apps Script reste nécessaire avant la validation définitive de production.
