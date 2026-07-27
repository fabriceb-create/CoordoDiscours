# Déploiement de CoordoDiscours

## 1. Préparer le poste

Installer Node.js 20 ou une version plus récente, puis exécuter à la racine du dépôt :

```bash
npm install
npm run validate
```

La validation doit se terminer sans erreur avant tout envoi vers Google Apps Script.

## 2. Créer ou ouvrir le projet Apps Script

Créer un projet autonome dans Google Apps Script, puis relever son identifiant dans les paramètres du projet.

Copier `.clasp.json.example` vers `.clasp.json`, puis remplacer la valeur de `scriptId`.

```bash
cp .clasp.json.example .clasp.json
```

Le fichier `.clasp.json` est propre à chaque installation et ne doit pas être partagé publiquement.

## 3. Se connecter et envoyer le code

```bash
npm run clasp:login
npm run clasp:push
```

Dans l’éditeur Apps Script, exécuter ensuite une première fois :

```text
installCoordoDiscours
```

Accepter les autorisations Google demandées. La fonction crée ou migre la base Google Sheets, initialise les paramètres et lance les contrôles internes.

## 4. Vérifier l’installation

Exécuter :

```text
getInstallationStatus
runAcceptanceTests
```

Tous les contrôles bloquants doivent être validés avant la publication.

## 5. Publier l’application Web

Dans Apps Script :

1. Ouvrir **Déployer > Nouveau déploiement**.
2. Choisir **Application Web**.
3. Exécuter l’application en tant que propriétaire du projet.
4. Limiter l’accès aux personnes prévues pour cette installation.
5. Déployer et conserver l’URL générée.

Pour une assemblée distincte, utiliser un projet Apps Script et une base Google Sheets distincts. Cela isole les orateurs, le planning, la langue et l’historique.

## 6. Mettre à jour une installation existante

Après récupération d’une nouvelle version :

```bash
npm install
npm run validate
npm run clasp:push
```

Exécuter ensuite `installCoordoDiscours` afin d’appliquer les migrations sans supprimer les données existantes, puis créer une nouvelle version du déploiement Web.

## Sécurité

- Ne jamais publier `.clasp.json` ni des identifiants Google.
- Conserver l’accès à l’application limité aux utilisateurs autorisés.
- Ne pas modifier directement les en-têtes des feuilles de données.
- Effectuer une copie de sauvegarde de la base avant une mise à jour majeure.
