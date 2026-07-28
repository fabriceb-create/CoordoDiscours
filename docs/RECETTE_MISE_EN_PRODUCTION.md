# Recette de mise en production CoordoDiscours 1.14

## Avant de commencer

- utiliser un compte Administrateur nominatif ;
- vérifier le commit GitHub et la version Apps Script ciblés ;
- créer une sauvegarde complète ;
- conserver la version Web actuellement active pour un éventuel retour arrière ;
- disposer d’un ordinateur, d’une tablette et d’un téléphone ;
- préparer un jeu d’essai maîtrisé sans perturber les données réelles.

## Rapport de santé

Ouvrir **Mise en production** puis actualiser le rapport.

Les six contrôles doivent être compris :

1. installation et schéma ;
2. intégrité ;
3. sauvegarde récente ;
4. performance et incidents ;
5. recette interne ;
6. recette multi-écrans.

La mise en production ne doit pas être approuvée lorsqu’un contrôle est `Bloquant`. Un état `À vérifier` ne permet pas l’approbation technique de la version 1.14.

## Plan d’actions correctives

1. Cliquer sur **Synchroniser le rapport**.
2. Vérifier les actions créées ou mises à jour.
3. Désigner un responsable et une échéance.
4. Traiter d’abord les priorités `BLOQUANTE`.
5. Actualiser le rapport.
6. Resynchroniser les actions.
7. Vérifier qu’aucune action bloquante active ne reste ouverte.

## Recette guidée

Exécuter dans l’ordre :

1. installation et structure ;
2. intégrité des données ;
3. sauvegarde récente ;
4. performance et incidents ;
5. recette interne ;
6. recette multi-écrans ;
7. décision finale.

Exporter le rapport JSON et le conserver avec :

- le fichier de sauvegarde ;
- le commit GitHub ;
- le numéro de version Apps Script ;
- le numéro du déploiement Web ;
- le manifeste SHA-256 ;
- la date et l’identité de l’administrateur.

## Recette multi-écrans

Exécuter réellement les 15 contrôles.

| Appareil | Navigation | Programmation | Formulaires | Recherche | Impression/export |
|---|---|---|---|---|---|
| Ordinateur | À tester | À tester | À tester | À tester | À tester |
| Tablette | À tester | À tester | À tester | À tester | À tester |
| Téléphone | À tester | À tester | À tester | À tester | À tester |

### Navigation

- connexion ;
- ouverture et fermeture du menu ;
- passage entre les modules ;
- retour au tableau de bord ;
- utilisation au clavier lorsque le format le permet.

### Programmation

- ouverture de la liste ;
- création d’une programmation de test ;
- validation d’un avertissement ;
- refus d’une erreur bloquante ;
- modification puis annulation contrôlée.

### Formulaires

- affichage complet ;
- saisie ;
- validation ;
- message d’erreur ;
- fermeture et restitution du focus.

### Recherche

- saisie rapide ;
- filtre ;
- absence de remplacement par une réponse obsolète ;
- chargement progressif lorsque présent.

### Impression ou export

- aperçu ;
- mise en page ;
- téléchargement JSON ou impression ;
- lisibilité sur le format testé.

Chaque échec doit comporter une observation et, si disponible, une référence `CD-ERR-...`.

## Recette fonctionnelle complémentaire

Après déploiement, vérifier au minimum :

- connexion et droits des trois rôles ;
- création et modification d’une programmation ;
- avertissement et conflit bloquant ;
- planification automatique ;
- invitation et hospitalité ;
- fusion concurrente ;
- historique et restauration d’une version ;
- impression ;
- sauvegarde ;
- coupure réseau pendant une lecture puis pendant une écriture ;
- rapport annuel de capacité ;
- dossier de support expurgé.

L’archivage de l’historique doit être testé uniquement sur une copie de recette.

## Décision

### Approuver

Conditions cumulatives :

- rapport `READY` ;
- score `100/100` ;
- 15 tests multi-écrans réussis ;
- aucune action bloquante ouverte ;
- sauvegarde récente ;
- empreinte du rapport inchangée.

Saisir `AUTORISER`, puis exporter le manifeste.

### Reporter

Saisir un motif précis. Exporter le rapport même en cas de report afin de conserver l’état constaté.

### Confirmer déployé

Après le déploiement Apps Script réel, saisir l’identifiant et `DEPLOYE`, puis exporter le manifeste final.

## Incident

Conserver la référence affichée par CoordoDiscours. L’administrateur peut la retrouver avec le module, l’opération et l’heure, sans donnée métier arbitraire.

Le dossier de support doit être relu avant transmission. Il ne doit pas contenir d’identifiant direct de la base ni de nom d’orateur.

## Retour arrière

Le retour arrière du code consiste à redéployer la version Apps Script précédente. La restauration des données ne doit être utilisée que si les données ont réellement été altérées.

Après le retour arrière, enregistrer `ROLLED_BACK` avec le motif et la confirmation `RETOUR`.
