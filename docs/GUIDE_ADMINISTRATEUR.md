# Guide administrateur CoordoDiscours 1.14

## 1. Responsabilités

L’administrateur gère :

- les paramètres ;
- les utilisateurs et rôles ;
- les sauvegardes ;
- le contrôle d’intégrité ;
- les diagnostics de performance ;
- le rapport de santé et la recette guidée ;
- les actions correctives ;
- la recette réelle sur ordinateur, tablette et téléphone ;
- les décisions de mise en production ;
- le rapport annuel de capacité ;
- l’archivage contrôlé de l’historique ;
- l’installation, la mise à jour et le retour arrière.

Maintiens toujours au moins un administrateur actif. Les fonctions de gouvernance ne doivent pas être déléguées à un compte partagé non traçable.

## 2. Vérification quotidienne ou hebdomadaire

Selon le volume d’utilisation :

1. contrôle le tableau de bord ;
2. lance le rapport d’intégrité ;
3. vérifie la date de la dernière sauvegarde ;
4. consulte les références d’erreur signalées ;
5. regarde les opérations serveur lentes ou en erreur ;
6. examine les actions correctives en retard ;
7. vérifie que le registre de production correspond à la version réellement active.

## 3. Lire le diagnostic de performance

Dans **Paramètres > Performance serveur** :

- **Appels** indique la fréquence ;
- **Moyenne** aide à repérer une lenteur régulière ;
- **Maximum** révèle un pic ;
- **Appels lents** compte les durées supérieures ou égales à 1 500 ms ;
- **Erreurs** compte les appels ayant levé une exception.

Les données expirent après six heures. Elles sont indicatives et peuvent être affectées par la charge de Google Apps Script.

Après une optimisation, utilise **Réinitialiser** pour ouvrir une nouvelle fenêtre de mesure. Cette action est auditée.

## 4. Comprendre les caches serveur

Les caches ont une durée courte de 60 secondes. Ils concernent les paramètres et certaines listes de référence. Les écritures invalidant ces données suppriment les entrées concernées.

Ne considère jamais le cache comme une sauvegarde. Les données de référence restent dans Google Sheets.

Une restauration complète ou une réinstallation invalide l’ensemble des caches.

## 5. Gérer un incident réseau

Une lecture peut être retentée automatiquement une fois. Une écriture ne l’est jamais.

Lorsqu’un utilisateur signale une coupure pendant un enregistrement :

1. lui demander de ne pas répéter immédiatement l’action ;
2. noter la référence `CD-ERR-...` ;
3. recharger la fiche ou la liste ;
4. vérifier l’historique ;
5. contrôler les doublons et l’intégrité ;
6. reprendre l’action uniquement si l’état attendu est absent.

Le dossier de support peut être exporté depuis **Mise en production**. Il est conçu pour rester non nominatif concernant les orateurs et ne doit pas contenir l’identifiant de la base Google Sheets.

## 6. Utiliser le rapport de santé

Ouvre **Mise en production** avant chaque déploiement important.

- `Prêt` : six contrôles conformes, score 100/100.
- `À vérifier` : une vérification ou une décision reste nécessaire.
- `Bloqué` : la mise en production ne doit pas être approuvée.

Les six domaines contrôlés sont : installation, intégrité, sauvegarde, performance, recette interne et recette multi-écrans.

Exécute les sept étapes de recette puis exporte le rapport JSON. Conserve-le avec la sauvegarde, le commit GitHub, le manifeste et l’identifiant de déploiement.

## 7. Gérer les actions correctives

Clique sur **Synchroniser le rapport** pour créer ou mettre à jour les actions liées aux contrôles non conformes.

Pour chaque action :

- vérifie la priorité ;
- désigne un responsable ;
- fixe une échéance réaliste ;
- documente les travaux ;
- place l’action en cours ;
- termine-la uniquement après vérification du résultat.

`RISQUE_ACCEPTE` doit rester exceptionnel. Il signifie que le risque est connu et assumé, mais une action de priorité `BLOQUANTE` dans ce statut terminal ne bloque plus techniquement l’approbation. Cette décision doit donc être justifiée dans les notes et, idéalement, accompagnée d’une décision de report plutôt que d’une mise en production précipitée.

## 8. Compléter la recette multi-écrans

La matrice contient 15 lignes : cinq scénarios sur trois formats.

Pour chaque ligne :

1. exécute réellement le scénario ;
2. choisis `Réussi`, `Échec` ou `À tester` ;
3. ajoute une observation en cas d’échec ou de particularité ;
4. enregistre la matrice.

Un échec bloque le rapport. Un test non exécuté empêche l’état `READY`.

## 9. Enregistrer une décision de production

### Approuver

Le bouton est disponible uniquement lorsque le rapport est `READY` à 100/100 et qu’aucune action bloquante n’est ouverte. Saisis `AUTORISER`.

### Reporter

Saisis un motif précis : blocage technique, recette incomplète, absence d’un utilisateur clé, fenêtre de maintenance inadaptée, etc.

### Confirmer déployé

Après la publication Apps Script réelle, renseigne l’identifiant du déploiement et saisis `DEPLOYE`.

### Enregistrer un retour arrière

Après avoir redéployé une version précédente, indique le motif et saisis `RETOUR`.

Le registre ne déploie ni ne redéploie le code. Il conserve la preuve de la décision.

## 10. Exporter un manifeste

Le manifeste contient la version, la décision, le rapport, le score, l’environnement, l’identifiant de déploiement, la sauvegarde de référence et un checksum SHA-256.

Conserve ensemble :

- le manifeste ;
- le rapport de recette ;
- la sauvegarde ;
- le commit GitHub ;
- l’URL et l’identifiant du déploiement ;
- les captures réelles de la version publiée.

## 11. Lire le rapport annuel de capacité

Le rapport aide à repérer :

- des créneaux non couverts ;
- des orateurs actifs jamais utilisés ;
- une concentration excessive des affectations ;
- une faible couverture des discours ;
- une dépendance inhabituelle aux orateurs extérieurs.

Les indicateurs n’ont pas vocation à juger les personnes. Ils servent à ouvrir une analyse et à préparer les décisions du coordinateur.

## 12. Archiver l’historique

N’utilise l’archivage qu’après avoir défini une politique de conservation.

1. calcule l’aperçu ;
2. contrôle la date limite et le nombre de lignes conservées ;
3. vérifie que le lot ne dépasse pas 25 000 lignes ;
4. saisis `ARCHIVER` ;
5. confirme l’opération ;
6. vérifie le fichier JSON créé dans Google Drive ;
7. conserve l’archive dans le dossier prévu.

L’archive est créée avant la suppression. N’effectue pas de suppression manuelle parallèle.

## 13. Préparer une mise à jour

1. Crée une sauvegarde depuis l’application.
2. Note la version Apps Script actuellement déployée.
3. Vérifie le commit GitHub correspondant.
4. Exécute :

```bash
npm install
npm run check
npm run predeploy:check
```

5. Vérifie les avertissements sans ignorer les erreurs bloquantes.
6. Envoie le code avec `npm run clasp:push`.
7. Exécute `installCoordoDiscours`.
8. Exécute `runAcceptanceTests`.
9. Synchronise et traite les actions correctives.
10. Complète la recette multi-écrans.
11. Exécute la recette guidée.
12. Approuve ou reporte.
13. Crée une nouvelle version du déploiement Web.
14. Confirme le déploiement réel dans le registre.

## 14. Contrôles après déploiement

- version affichée : `1.14 Stable` ;
- application prête ;
- accès des trois rôles ;
- ouverture de l’aide ;
- création et modification d’une fiche test maîtrisée ;
- recommandation et validation d’une programmation ;
- invitation et hospitalité ;
- impression ;
- historique et versions ;
- sauvegarde ;
- intégrité ;
- performance serveur ;
- absence de nouvelle action bloquante ;
- manifeste final conservé.

## 15. Retour arrière

### Code

Redéploie la version Apps Script précédente. Cela ne restaure pas automatiquement les données. Enregistre ensuite la décision `ROLLED_BACK`.

### Données

Utilise une sauvegarde uniquement si les données ont réellement été altérées. La restauration crée d’abord une copie de sécurité Drive.

Après un retour arrière :

- relance `installCoordoDiscours` si nécessaire ;
- exécute `runAcceptanceTests` ;
- vérifie l’intégrité ;
- actualise le rapport de santé ;
- informe les utilisateurs de l’état retenu.

## 16. Sécurité

- ne publie jamais `.clasp.json` ou `.clasprc.json` ;
- limite l’application aux utilisateurs autorisés ;
- attribue le rôle minimal nécessaire ;
- ne modifie pas les en-têtes des feuilles ;
- sauvegarde avant toute mise à jour importante ;
- ne publie pas un dossier de support sans le relire ;
- n’utilise pas `clasp push --force` sans contrôle du contenu remplacé ;
- n’enregistre pas `DEPLOYED` avant la publication réelle.
