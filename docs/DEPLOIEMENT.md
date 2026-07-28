# Déploiement de CoordoDiscours 1.14

Cette procédure distingue quatre opérations : préparation, approbation, publication Apps Script et confirmation post-déploiement. CoordoDiscours enregistre la décision, mais ne publie jamais le code automatiquement.

## 1. Préparer le poste

Installer Node.js 22, puis exécuter :

```bash
npm install
npm run check
npm run predeploy:check
```

Les onze suites automatiques doivent réussir. Une erreur bloquante interdit l’envoi. Les avertissements concernant `.clasp.json` et les droits du futur déploiement doivent être résolus dans l’environnement réel.

## 2. Associer le projet Apps Script

Copier `.clasp.json.example` vers `.clasp.json`, renseigner l’identifiant exact du projet, puis :

```bash
npm run clasp:login
npm run clasp:status
```

Avant tout `push`, vérifier le nom du projet, le compte connecté et le `scriptId`. Le fichier `.clasp.json` est local, ignoré par Git et ne doit jamais être transmis.

## 3. Préparer le retour arrière

Avant chaque mise à jour :

- noter le commit GitHub visé ;
- noter l’identifiant et la version du déploiement Web actif ;
- créer une sauvegarde depuis CoordoDiscours ;
- vérifier que la sauvegarde apparaît dans l’audit ;
- conserver l’URL de production ;
- définir le critère de retour arrière et la personne autorisée à décider.

### Critères minimaux de retour arrière

Un retour arrière doit être envisagé lorsqu’au moins une situation est confirmée :

- impossibilité générale d’ouvrir l’application ;
- refus d’accès anormal pour plusieurs utilisateurs autorisés ;
- écriture impossible sur un module essentiel ;
- données incohérentes après migration ;
- erreur JavaScript bloquant la navigation principale ;
- duplication ou perte de données confirmée ;
- temps de réponse durablement incompatible avec l’utilisation normale.

Une anomalie isolée et contournable peut conduire à un report de correction plutôt qu’à un retour arrière immédiat. La décision doit être documentée.

## 4. Envoyer le code

```bash
npm run clasp:push
```

La commande relance les contrôles avant l’envoi. Elle met à jour le projet Apps Script, mais ne change pas encore la version Web servie aux utilisateurs tant qu’un déploiement existant n’est pas mis à jour.

## 5. Appliquer les migrations

Dans Apps Script, exécuter :

```text
installCoordoDiscours
runAcceptanceTests
```

Vérifier :

- `success: true` ;
- aucune feuille manquante ;
- schéma `1.9.0` ;
- version `1.14 Stable` ;
- présence des feuilles `ACTIONS_CORRECTIVES`, `RECETTE_MULTI_ECRANS` et `MISES_EN_PRODUCTION` ;
- intégrité correcte ;
- aide, cache, observabilité, rapport de santé et gouvernance disponibles.

## 6. Préparer le rapport de santé

Ouvrir l’application avec un compte Administrateur, puis **Mise en production**.

1. Actualiser le rapport.
2. Synchroniser les recommandations vers les actions correctives.
3. Attribuer les actions, fixer les échéances et traiter les blocages.
4. Créer ou confirmer une sauvegarde récente.
5. Vérifier les mesures de performance et les incidents.
6. Exécuter la recette interne.
7. Compléter la matrice multi-écrans.

Un rapport `BLOCKED` interdit l’approbation. Un rapport `ATTENTION` doit rester reporté tant que le point n’est pas résolu ou formellement requalifié par une évolution du contrôle.

## 7. Exécuter la recette guidée

La recette comporte sept étapes :

1. installation et structure ;
2. intégrité des données ;
3. sauvegarde récente ;
4. performance et incidents ;
5. recette interne ;
6. recette multi-écrans ;
7. décision finale.

Exporter le rapport JSON et le conserver avec le commit, la sauvegarde et les preuves de test.

## 8. Compléter la recette multi-écrans

Exécuter les cinq scénarios sur chaque format :

| Scénario | Ordinateur | Tablette | Téléphone |
|---|---:|---:|---:|
| Navigation | à vérifier | à vérifier | à vérifier |
| Programmation | à vérifier | à vérifier | à vérifier |
| Formulaires | à vérifier | à vérifier | à vérifier |
| Recherche et filtres | à vérifier | à vérifier | à vérifier |
| Impression ou export | à vérifier | à vérifier | à vérifier |

Pour chaque test, enregistrer `REUSSI`, `ECHEC` ou `A_TESTER` et une observation utile. Les 15 résultats doivent être `REUSSI` pour obtenir un rapport `READY`.

## 9. Approuver ou reporter

### Approuver

L’approbation est possible uniquement si :

- le rapport est `READY` ;
- le score est `100/100` ;
- aucune action bloquante n’est ouverte ;
- la matrice multi-écrans est complète ;
- l’empreinte du rapport n’a pas changé.

Saisir `AUTORISER`. Exporter ensuite le manifeste de la décision et conserver son checksum SHA-256.

### Reporter

Choisir `POSTPONED` et saisir un motif précis. Le report est préférable à une approbation sous pression lorsque la recette réelle n’est pas complète.

## 10. Créer ou mettre à jour le déploiement Web

1. Ouvrir **Déployer > Gérer les déploiements**.
2. Sélectionner le déploiement de production existant ou en créer un nouveau.
3. Choisir une nouvelle version du code.
4. Conserver le mode d’exécution sous le compte du propriétaire, sauf décision d’architecture différente validée.
5. Définir le niveau d’accès correspondant aux utilisateurs réellement autorisés.
6. Valider le déploiement.
7. Copier l’identifiant du déploiement et l’URL.

Aucune capture d’écran générique ne remplace cette preuve réelle. Les captures doivent être prises dans le projet ciblé après déploiement et conservées avec le manifeste.

## 11. Confirmer le déploiement dans CoordoDiscours

Revenir dans **Mise en production** :

1. choisir **Confirmer déployé** ;
2. renseigner l’identifiant réel Apps Script ;
3. saisir `DEPLOYE` ;
4. exporter le manifeste final ;
5. conserver l’URL, l’identifiant, le commit, la sauvegarde et le rapport de recette.

Cette confirmation ne modifie pas Apps Script : elle rend la décision traçable.

## 12. Contrôles post-déploiement

Dans les premières minutes :

- ouverture de l’application ;
- version affichée ;
- accès des trois rôles ;
- tableau de bord ;
- programmation en lecture puis écriture contrôlée ;
- invitation et hospitalité ;
- recherche ;
- impression ;
- historique ;
- sauvegarde ;
- intégrité ;
- absence de nouvelle erreur bloquante.

Conserver un suivi à 24 heures, 7 jours et 30 jours dans le dossier de mise en production.

## 13. Diagnostic d’un incident

Noter la référence affichée par l’application. Le dossier de support exportable contient :

- version et empreinte de l’environnement ;
- résumé de l’installation ;
- rapport de santé expurgé ;
- résumé des actions ;
- synthèse multi-écrans ;
- indicateurs annuels non nominatifs ;
- décisions récentes ;
- incidents bornés.

Il ne doit contenir ni identifiant de feuille Google Sheets, ni URL de base, ni nom d’orateur.

Après une coupure pendant une écriture, vérifier l’état avant de répéter l’action.

## 14. Retour arrière

### Code

1. Ouvrir **Déployer > Gérer les déploiements**.
2. Sélectionner la version Apps Script précédente connue comme stable.
3. Valider la modification du déploiement.
4. Contrôler l’ouverture et les fonctions essentielles.
5. Enregistrer `ROLLED_BACK` dans CoordoDiscours avec le motif et la confirmation `RETOUR`.

Le retour arrière du code ne restaure pas les données.

### Données

Restaurer une sauvegarde uniquement si les données ont réellement été altérées. La fonction de restauration crée d’abord une copie de sécurité Drive. Après restauration :

- relancer l’installation si nécessaire ;
- exécuter la recette interne ;
- contrôler l’intégrité ;
- vérifier les droits ;
- actualiser le rapport de santé ;
- documenter précisément les données restaurées.

## 15. Archivage de l’historique

L’archivage n’est pas une étape obligatoire du déploiement. Il doit être effectué séparément, de préférence hors période d’utilisation, sur la base d’un aperçu vérifié.

- ne pas réduire le seuil sous 180 jours ;
- conserver au minimum 500 lignes ;
- vérifier le fichier Drive créé ;
- ne jamais supprimer manuellement les lignes avant l’archive ;
- conserver l’archive selon la politique de rétention décidée.

## Sécurité

- ne jamais publier les identifiants `clasp` ;
- ne pas modifier directement les en-têtes des feuilles ;
- limiter les rôles administrateurs ;
- sauvegarder avant chaque mise à jour majeure ;
- conserver le rapport, le manifeste et la décision ;
- ne pas utiliser `clasp push --force` sans audit du contenu remplacé ;
- ne pas approuver un rapport incomplet pour respecter une échéance artificielle.
