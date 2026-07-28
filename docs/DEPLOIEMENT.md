# Déploiement de CoordoDiscours 1.12

## 1. Préparer le poste

Installer Node.js 22, puis :

```bash
npm install
npm run check
npm run predeploy:check
```

La validation doit réussir avant tout envoi.

## 2. Associer le projet Apps Script

Copier `.clasp.json.example` vers `.clasp.json`, renseigner l’identifiant du projet, puis :

```bash
npm run clasp:login
npm run clasp:status
```

Le fichier local est ignoré par Git et ne doit jamais être publié.

## 3. Sauvegarder avant mise à jour

Avant chaque déploiement important :

- créer une sauvegarde depuis CoordoDiscours ;
- noter la version Apps Script actuellement active ;
- noter le commit GitHub ;
- vérifier que la sauvegarde contient toutes les feuilles configurées.

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
- version `1.12 Stable` ;
- guide intégré disponible ;
- cache et observabilité chargés ;
- intégrité correcte.

## 6. Créer la version Web

1. Ouvrir **Déployer > Gérer les déploiements**.
2. Modifier le déploiement ou en créer un nouveau.
3. Sélectionner une nouvelle version du code.
4. Conserver le mode d’exécution sous le compte du propriétaire.
5. Limiter l’accès aux utilisateurs autorisés.
6. Conserver l’URL et le numéro de version.

## 7. Recette après déploiement

Effectuer au minimum :

- démarrage et droits ;
- guide et aide contextuelle ;
- programmation ;
- planification automatique ;
- invitation et hospitalité ;
- fusion concurrente ;
- versions ;
- impression ;
- sauvegarde ;
- intégrité ;
- performance serveur ;
- erreur réseau contrôlée ;
- ordinateur, tablette et téléphone.

## 8. Diagnostic d’un incident

Noter :

- version de l’application ;
- date et heure ;
- utilisateur et rôle ;
- module ;
- action ;
- message d’erreur ;
- présence éventuelle de la modification dans l’historique.

Après une coupure pendant une écriture, vérifier l’état avant de répéter l’action.

## 9. Retour arrière

### Retour arrière du code

Redéployer la version Apps Script précédente. Le retour arrière du code ne modifie pas les données.

### Retour arrière des données

Utiliser la sauvegarde uniquement lorsque les données ont réellement changé de manière incorrecte. Contrôler ensuite l’intégrité et les accès.

## Sécurité

- ne jamais publier les identifiants clasp ;
- ne pas modifier directement les en-têtes des feuilles ;
- limiter les rôles administrateurs ;
- sauvegarder avant chaque mise à jour majeure ;
- ne pas utiliser `clasp push --force` sans audit du contenu remplacé.
