# Guide administrateur CoordoDiscours 1.12

## 1. Responsabilités

L’administrateur gère :

- les paramètres ;
- les utilisateurs et rôles ;
- les sauvegardes ;
- le contrôle d’intégrité ;
- les diagnostics de performance ;
- l’installation, la mise à jour et le retour arrière.

Maintiens toujours au moins un administrateur actif.

## 2. Vérification quotidienne ou hebdomadaire

Selon le volume d’utilisation :

1. contrôle le tableau de bord ;
2. lance le rapport d’intégrité ;
3. vérifie les sauvegardes ;
4. consulte les erreurs signalées par les utilisateurs ;
5. regarde les opérations serveur lentes ou en erreur.

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
2. recharger la fiche ou la liste ;
3. vérifier l’historique ;
4. contrôler les doublons et l’intégrité ;
5. reprendre l’action uniquement si l’état attendu est absent.

## 6. Préparer une mise à jour

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
9. Crée une nouvelle version du déploiement Web.
10. Effectue la recette sur ordinateur, tablette et téléphone.

## 7. Contrôles après déploiement

- version affichée : `1.12 Stable` ;
- application prête ;
- accès des trois rôles ;
- ouverture de l’aide ;
- création et modification d’une fiche test ;
- recommandation et validation d’une programmation ;
- invitation et hospitalité ;
- impression ;
- historique et versions ;
- sauvegarde ;
- intégrité ;
- performance serveur.

## 8. Retour arrière

### Code

Redéploie la version Apps Script précédente. Cela ne restaure pas automatiquement les données.

### Données

Utilise une sauvegarde uniquement si les données ont réellement été altérées. La restauration crée d’abord une copie de sécurité Drive.

Après un retour arrière :

- relance `installCoordoDiscours` si nécessaire ;
- exécute `runAcceptanceTests` ;
- vérifie l’intégrité ;
- informe les utilisateurs de l’état retenu.

## 9. Sécurité

- ne publie jamais `.clasp.json` ou `.clasprc.json` ;
- limite l’application aux utilisateurs autorisés ;
- attribue le rôle minimal nécessaire ;
- ne modifie pas les en-têtes des feuilles ;
- sauvegarde avant toute mise à jour importante ;
- n’utilise pas `clasp push --force` sans contrôle du contenu remplacé.
