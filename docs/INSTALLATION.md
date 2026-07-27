# Installation de CoordoDiscours

## 1. Créer le projet Apps Script

1. Ouvrir Google Drive.
2. Créer un nouveau projet **Google Apps Script**.
3. Nommer le projet `CoordoDiscours`.
4. Dans les paramètres du projet, activer l’affichage du fichier manifeste `appsscript.json`.
5. Vérifier que le fuseau horaire est `America/Guadeloupe`.

## 2. Copier les fichiers

Créer dans Apps Script tous les fichiers présents dans le dossier `apps-script/` du dépôt GitHub.

- Les fichiers `.gs` doivent être créés comme fichiers **Script**.
- Les fichiers `.html` doivent être créés comme fichiers **HTML**.
- Le contenu de `appsscript.json` doit remplacer le manifeste du projet.

Les noms doivent être reproduits exactement, sans extension affichée dans l’éditeur Apps Script.

## 3. Première installation

1. Dans la liste des fonctions, choisir `installCoordoDiscours`.
2. Cliquer sur **Exécuter**.
3. Accepter les autorisations demandées par Google.
4. Vérifier dans le journal d’exécution que la propriété `success` vaut `true`.
5. Ouvrir l’URL de la base Google Sheets indiquée dans le résultat.

Cette opération :

- crée ou retrouve la base de données ;
- crée les feuilles manquantes ;
- ajoute les paramètres par défaut ;
- applique les migrations de structure ;
- lance les tests automatiques.

## 4. Vérification

Exécuter ensuite `runAcceptanceTests`.

Le résultat attendu est :

- `success: true` ;
- aucune feuille manquante ;
- tous les tests réussis.

La fonction `getInstallationStatus` permet de retrouver à tout moment :

- le nom et l’identifiant de la base ;
- l’URL de la base ;
- la version installée ;
- la version du schéma ;
- les éventuelles feuilles manquantes.

## 5. Déployer l’application web

1. Cliquer sur **Déployer** puis **Nouveau déploiement**.
2. Choisir le type **Application Web**.
3. Donner un nom au déploiement, par exemple `CoordoDiscours 1.4 test`.
4. Choisir l’utilisateur qui exécutera l’application selon le mode de partage retenu.
5. Limiter l’accès aux personnes autorisées pendant la phase de test.
6. Cliquer sur **Déployer** puis conserver l’URL fournie.

Pour une autre assemblée, créer de préférence une nouvelle copie du projet et une nouvelle base afin que ses données restent séparées.

## 6. Mise à jour ultérieure

Après avoir remplacé les fichiers modifiés :

1. exécuter `installCoordoDiscours` une nouvelle fois ;
2. vérifier le résultat des migrations ;
3. exécuter `runAcceptanceTests` ;
4. créer une nouvelle version du déploiement web.

La migration ne supprime pas les données existantes. Elle ajoute uniquement les feuilles ou paramètres manquants et met à jour les numéros de version.

## 7. Retour arrière

Avant toute mise à jour importante :

1. ouvrir la base Google Sheets ;
2. utiliser **Fichier > Créer une copie** ;
3. conserver cette copie avec la date et la version de l’application.

Le retour arrière consiste à restaurer l’ancienne version du code et à reconnecter la copie de sauvegarde si nécessaire.
