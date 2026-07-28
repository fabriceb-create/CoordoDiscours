# Recette de mise en production CoordoDiscours

## Avant de commencer

- utiliser un compte Administrateur ;
- vérifier le commit GitHub et la version Apps Script ciblés ;
- créer une sauvegarde complète ;
- conserver la version Web actuellement active pour un éventuel retour arrière.

## Rapport de santé

Ouvrir **Mise en production** puis actualiser le rapport.

La mise en production ne doit pas être proposée lorsqu’un contrôle est `Bloquant`. Un état `À vérifier` impose une décision documentée de l’administrateur.

## Recette guidée

Exécuter dans l’ordre :

1. installation et structure ;
2. intégrité des données ;
3. sauvegarde récente ;
4. performance et incidents ;
5. recette interne ;
6. décision finale.

Exporter le rapport JSON et le conserver avec :

- le fichier de sauvegarde ;
- le commit GitHub ;
- le numéro de version Apps Script ;
- le numéro du déploiement Web ;
- la date et l’identité de l’administrateur.

## Recette fonctionnelle réelle

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
- navigation téléphone, tablette et ordinateur ;
- coupure réseau pendant une lecture puis pendant une écriture.

## Incident

Conserver la référence affichée par CoordoDiscours. L’administrateur peut la retrouver dans le module Mise en production avec le module, l’opération et l’heure, sans donnée métier sensible.

## Retour arrière

Le retour arrière du code consiste à redéployer la version Apps Script précédente. La restauration des données ne doit être utilisée que si les données ont réellement été altérées.
