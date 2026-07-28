# Déploiement de CoordoDiscours 1.13

## 1. Préparer le poste

Installer Node.js 22, puis :

```bash
npm install
npm run check
npm run predeploy:check
```

Les dix suites automatiques doivent réussir avant tout envoi.

## 2. Associer le projet Apps Script

Copier `.clasp.json.example` vers `.clasp.json`, renseigner l’identifiant du projet, puis :

```bash
npm run clasp:login
npm run clasp:status
```

Le fichier local est ignoré par Git et ne doit jamais être publié.

## 3. Préparer le retour arrière

Avant chaque mise à jour :

- noter le commit GitHub ;
- noter la version Apps Script actuellement déployée ;
- créer une sauvegarde depuis CoordoDiscours ;
- conserver l’URL et le numéro du déploiement Web actif.

## 4. Envoyer le code

```bash
npm run clasp:push
```

La commande relance les contrôles avant l’envoi.

## 5. Appliquer les migrations

Dans Apps Script :

```text
installCoordoDiscours
runAcceptanceTests
```

Vérifier :

- `success: true` ;
- aucune feuille manquante ;
- version `1.13 Stable` ;
- intégrité correcte ;
- aide, cache, observabilité et module de mise en production disponibles.

## 6. Exécuter la recette guidée

Ouvrir l’application avec un compte Administrateur, puis **Mise en production**.

1. Actualiser le rapport de santé.
2. Traiter tout contrôle `Bloquant`.
3. Démarrer la recette guidée.
4. Exécuter les six étapes.
5. Exporter le rapport JSON.
6. Conserver le rapport avec la sauvegarde, le commit et le numéro de version.

Un état `À vérifier` doit être documenté. Un état `Bloqué` interdit la mise en production.

## 7. Créer la version Web

1. Ouvrir **Déployer > Gérer les déploiements**.
2. Modifier le déploiement ou en créer un nouveau.
3. Sélectionner une nouvelle version du code.
4. Conserver le mode d’exécution sous le compte du propriétaire.
5. Limiter l’accès aux utilisateurs autorisés.
6. Conserver l’URL et le numéro de version.

## 8. Recette après déploiement

Effectuer au minimum :

- démarrage et droits ;
- programmation manuelle et automatique ;
- invitation et hospitalité ;
- fusion concurrente ;
- versions et restauration ;
- impression ;
- sauvegarde ;
- intégrité ;
- guide ;
- rapport de santé ;
- erreur réseau contrôlée ;
- ordinateur, tablette et téléphone.

## 9. Diagnostic d’un incident

Noter la référence affichée par l’application. Le module Mise en production permet à l’administrateur de retrouver :

- la date et l’utilisateur ;
- le module ;
- l’opération ;
- le type lecture ou écriture ;
- le message borné.

Aucune pile technique ni donnée métier arbitraire n’est enregistrée par ce mécanisme.

Après une coupure pendant une écriture, vérifier l’état avant de répéter l’action.

## 10. Retour arrière

### Retour arrière du code

Redéployer la version Apps Script précédente. Le retour arrière du code ne modifie pas les données.

### Retour arrière des données

Utiliser la sauvegarde uniquement lorsque les données ont réellement changé de manière incorrecte. Contrôler ensuite l’intégrité, les accès et le rapport de santé.

## Sécurité

- ne jamais publier les identifiants clasp ;
- ne pas modifier directement les en-têtes des feuilles ;
- limiter les rôles administrateurs ;
- sauvegarder avant chaque mise à jour majeure ;
- conserver le rapport de recette ;
- ne pas utiliser `clasp push --force` sans audit du contenu remplacé.
