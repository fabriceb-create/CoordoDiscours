# Statut de développement — CoordoDiscours 1.14

## Portée

La version 1.14 ajoute une couche de gouvernance opérationnelle autour du rapport de santé introduit en 1.13.

## Actions correctives

- synchronisation des recommandations du rapport ;
- création d’actions manuelles ;
- priorité, statut, responsable, échéance et notes ;
- verrouillage optimiste par action ;
- clôture automatique d’une action de rapport lorsque le contrôle redevient conforme ;
- blocage de l’approbation tant qu’une action bloquante reste ouverte.

## Recette multi-écrans

La recette réelle couvre trois appareils et cinq scénarios, soit 15 résultats persistés. La matrice possède une version technique unique par version applicative. Elle participe directement au rapport de santé et à la recette guidée, désormais composée de sept étapes.

## Registre de production

Quatre décisions sont prises en charge : approbation, report, confirmation de déploiement et retour arrière. Les décisions sont ajoutées à une feuille dédiée et à l’audit. Elles ne déclenchent aucune opération Apps Script automatique.

L’approbation exige :

- un rapport `READY` à 100/100 ;
- aucune action bloquante ouverte ;
- une empreinte de rapport actuelle ;
- la confirmation `AUTORISER`.

Le manifeste exporté comporte un checksum SHA-256.

## Capacité et maintenance

Le rapport annuel mesure l’occupation, l’utilisation des orateurs, l’équilibre, la concentration des affectations et la couverture des discours.

L’archivage de l’historique crée un fichier JSON dans Google Drive avant de supprimer les lignes anciennes. Les limites minimales de conservation et maximales de volume sont imposées côté serveur.

## Données

Le schéma `1.9.0` ajoute :

- `ACTIONS_CORRECTIVES` ;
- `RECETTE_MULTI_ECRANS` ;
- `MISES_EN_PRODUCTION`.

Les sauvegardes incluent automatiquement ces feuilles.

## Validation attendue

La version peut être fusionnée lorsque :

- `npm run check` réussit avec onze suites ;
- `npm run predeploy:check` ne contient aucune erreur bloquante ;
- la suite de gouvernance contrôle les préconditions, la matrice, les indicateurs, l’archivage et l’expurgation du support ;
- GitHub Actions est vert ;
- la pull request est fusionnable ;
- aucun fichier temporaire de transfert n’est présent.

Une recette réelle dans le projet Google Apps Script ciblé reste obligatoire avant d’enregistrer `DEPLOYED`.
