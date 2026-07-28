# Installation de CoordoDiscours 1.13

## 1. Préparer les fichiers

À la racine du dépôt :

```bash
npm install
npm run check
npm run predeploy:check
```

`npm run check` doit terminer les dix suites sans erreur. `predeploy:check` peut signaler l’absence de `.clasp.json` tant que le projet Apps Script n’a pas encore été associé.

## 2. Créer le projet Apps Script

1. Ouvrir Google Drive.
2. Créer un projet **Google Apps Script** autonome.
3. Nommer le projet `CoordoDiscours`.
4. Afficher le manifeste `appsscript.json`.
5. Vérifier le fuseau `America/Guadeloupe`.

## 3. Copier ou pousser le code

### Copie manuelle

Créer tous les fichiers du dossier `apps-script/` avec leurs noms exacts.

- `.gs` : fichiers Script ;
- `.html` : fichiers HTML ;
- `appsscript.json` : manifeste.

### Avec clasp

```bash
cp .clasp.json.example .clasp.json
```

Renseigner le `scriptId`, puis :

```bash
npm run clasp:login
npm run clasp:status
npm run clasp:push
```

Ne jamais publier `.clasp.json` ou `.clasprc.json`.

## 4. Première installation

Dans Apps Script :

1. choisir `installCoordoDiscours` ;
2. cliquer sur **Exécuter** ;
3. accepter les autorisations ;
4. vérifier `success: true` ;
5. ouvrir l’URL de la base Google Sheets renvoyée.

L’installation :

- crée ou retrouve la base ;
- crée les feuilles manquantes ;
- ajoute les paramètres ;
- migre les anciennes clés ;
- invalide les caches ;
- exécute la recette interne.

La version 1.13 n’ajoute aucune feuille : le schéma reste `1.8.0`.

## 5. Vérification

Exécuter :

```text
getInstallationStatus
runAcceptanceTests
```

Le résultat attendu est `success: true`. Les tests non bloquants du guide et de l’observabilité doivent également être examinés.

Vérifier ensuite manuellement :

1. ouverture du guide ;
2. création d’une assemblée et d’un orateur ;
3. programmation d’une date ;
4. invitation et hospitalité ;
5. impression ;
6. historique et versions ;
7. sauvegarde ;
8. intégrité ;
9. performance serveur ;
10. affichage mobile ;
11. rapport de santé et recette guidée.

## 6. Déployer l’application Web

1. Ouvrir **Déployer > Nouveau déploiement**.
2. Choisir **Application Web**.
3. Nommer la version, par exemple `CoordoDiscours 1.13 recette`.
4. Exécuter l’application avec le compte du propriétaire.
5. Limiter l’accès aux utilisateurs autorisés.
6. Déployer et conserver l’URL.

Le manifeste fourni limite l’accès au propriétaire. Élargir l’accès uniquement après validation de l’organisation retenue.

## 7. Mise à jour d’une installation existante

1. Créer une sauvegarde depuis l’application.
2. Noter la version Apps Script déployée.
3. Remplacer ou pousser les fichiers.
4. Exécuter `installCoordoDiscours`.
5. Exécuter `runAcceptanceTests`.
6. Ouvrir Mise en production et terminer la recette guidée.
7. Exporter le rapport de recette.
8. Créer une nouvelle version du déploiement Web.
9. Effectuer la recette réelle.

Les migrations ne suppriment pas les données existantes.

## 8. Retour arrière

### Code

Redéployer la version Apps Script précédente.

### Données

Restaurer une sauvegarde uniquement si les données ont été altérées. La restauration crée une copie de sécurité Drive avant toute modification.

Après un retour arrière, relancer les contrôles d’installation et d’intégrité.
