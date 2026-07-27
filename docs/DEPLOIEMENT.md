# Déploiement de CoordoDiscours

## 1. Préparer le poste

Installer Node.js 22, puis exécuter à la racine du dépôt :

```bash
npm install
npm run check
```

La validation structurelle et les tests métier doivent se terminer sans erreur avant tout envoi vers Google Apps Script.

## 2. Créer ou ouvrir le projet Apps Script

Créer un projet autonome dans Google Apps Script, puis relever son identifiant dans **Paramètres du projet > ID de script**.

Copier `.clasp.json.example` vers `.clasp.json`, puis remplacer la valeur de `scriptId`.

```bash
cp .clasp.json.example .clasp.json
```

Sous Windows PowerShell :

```powershell
Copy-Item .clasp.json.example .clasp.json
```

Le fichier `.clasp.json` est propre à chaque installation. Il est ignoré par Git et ne doit jamais être publié.

## 3. Se connecter et contrôler la configuration

```bash
npm run clasp:login
npm run predeploy:check
npm run clasp:status
```

Le contrôle vérifie les fichiers obligatoires, les protections serveur, les règles métier, le manifeste et la configuration locale de clasp.

## 4. Envoyer le code

```bash
npm run clasp:push
```

La commande relance automatiquement tous les contrôles avant l’envoi.

Dans l’éditeur Apps Script, exécuter ensuite une première fois :

```text
installCoordoDiscours
```

Accepter les autorisations Google demandées. La fonction crée ou migre la base Google Sheets, initialise les paramètres et lance les contrôles internes.

## 5. Vérifier l’installation

Exécuter :

```text
getInstallationStatus
runAcceptanceTests
```

Vérifier ensuite manuellement :

1. création d’un orateur et d’une assemblée ;
2. ajout d’un discours ;
3. programmation d’une date ;
4. blocage d’un doublon de créneau ;
5. création d’une invitation et d’une hospitalité ;
6. impression du planning ;
7. sauvegarde JSON ;
8. contrôle d’intégrité ;
9. rôle Coordinateur ;
10. rôle Consultation seule.

Tous les contrôles bloquants doivent être validés avant la publication.

## 6. Publier l’application Web

Dans Apps Script :

1. Ouvrir **Déployer > Nouveau déploiement**.
2. Choisir **Application Web**.
3. Exécuter l’application en tant que propriétaire du projet.
4. Choisir les personnes autorisées à ouvrir l’application.
5. Déployer et conserver l’URL générée.

Le manifeste actuel limite l’accès au propriétaire (`MYSELF`). Cette configuration convient aux premiers essais. Pour permettre l’accès à d’autres coordinateurs, le niveau d’accès du déploiement devra être élargi explicitement après validation du mode d’authentification retenu.

Pour une assemblée distincte, utiliser un projet Apps Script et une base Google Sheets distincts. Cela isole les orateurs, le planning, la langue et l’historique.

## 7. Mettre à jour une installation existante

Après récupération d’une nouvelle version :

```bash
npm install
npm run check
npm run clasp:push
```

Exécuter ensuite `installCoordoDiscours` afin d’appliquer les migrations sans supprimer les données existantes, puis créer une nouvelle version du déploiement Web.

## 8. Retour arrière

Avant une mise à jour importante :

- générer une sauvegarde complète depuis l’application ;
- noter le numéro de version Apps Script déployé ;
- conserver le commit GitHub correspondant.

En cas de problème, redéployer la version Apps Script précédente. Restaurer les données uniquement si elles ont réellement été altérées.

## Sécurité

- Ne jamais publier `.clasp.json`, `.clasprc.json` ou des identifiants Google.
- Conserver l’accès à l’application limité aux utilisateurs autorisés.
- Ne pas modifier directement les en-têtes des feuilles de données.
- Effectuer une sauvegarde avant une mise à jour majeure.
- Ne jamais utiliser `clasp push --force` sans avoir vérifié les fichiers qui seront remplacés.
