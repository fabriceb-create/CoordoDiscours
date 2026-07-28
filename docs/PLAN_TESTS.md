# Plan de recette fonctionnelle

## Préparation

- Installer l’application avec `installCoordoDiscours`.
- Vérifier que `runAcceptanceTests` renvoie `success: true`.
- Exécuter `npm run check` et vérifier la réussite des trois suites de contrôle.
- Déployer l’application en accès restreint.
- Effectuer les essais avec une base de test, jamais avec les données définitives au premier passage.

## 1. Paramètres et langues

- Modifier le nom de l’assemblée et vérifier son affichage dans l’en-tête.
- Choisir Français puis vérifier les menus et boutons.
- Choisir Kréyòl Gwadloup puis vérifier le changement d’interface.
- Revenir au français.
- Modifier l’alerte de répétition et vérifier sa conservation après rechargement.

## 2. Assemblées

- Créer une assemblée complète.
- Rechercher cette assemblée par nom et par coordinateur.
- Modifier son heure de réunion.
- Archiver puis restaurer la fiche.

## 3. Orateurs

- Créer un orateur local.
- Créer un orateur extérieur lié à une assemblée.
- Attribuer plusieurs discours à l’orateur extérieur.
- Vérifier la recherche par nom, assemblée et téléphone.
- Archiver puis restaurer une fiche.

## 4. Discours

- Créer ou compléter un titre de discours.
- Rechercher par numéro et par mot du titre.
- Vérifier que les discours 59, 82, 122 et 123 restent inactifs.
- Désactiver puis réactiver un autre discours.

## 5. Programmation

- Programmer un orateur local avec un discours actif.
- Programmer un orateur extérieur avec un discours déclaré.
- Renseigner puis modifier l’assemblée d’origine.
- Vérifier le blocage d’un discours non déclaré pour un orateur extérieur.
- Vérifier le blocage d’un créneau déjà occupé.
- Programmer deux fois le même discours dans la période d’alerte et vérifier l’avertissement non bloquant.
- Modifier une programmation.
- Annuler puis restaurer une programmation.

## 6. Assistant de résolution

- Occuper un créneau puis tenter une deuxième programmation au même jour et à la même heure.
- Vérifier que l’assistant propose une autre date et ne présente pas le simple changement d’orateur comme une solution suffisante.
- Choisir un orateur extérieur avec un discours absent de sa liste et vérifier les propositions d’un autre orateur et d’un autre discours déclaré.
- Sélectionner une assemblée archivée et vérifier la proposition d’une assemblée active ou du retrait de l’assemblée d’origine.
- Cumuler un orateur archivé et un créneau occupé puis vérifier l’apparition d’une solution combinée.
- Appliquer une proposition et vérifier que les champs du formulaire changent sans enregistrement automatique.
- Enregistrer ensuite la proposition et vérifier qu’elle repasse avec succès dans le moteur de règles.
- Vérifier que les propositions sont classées par score et que les avertissements éventuels restent visibles.

## 7. Invitations et hospitalité

- Créer une invitation liée à une programmation extérieure.
- Marquer l’invitation comme envoyée puis acceptée.
- Créer une hospitalité liée à la même programmation.
- Renseigner le groupe et le contact puis confirmer.
- Vérifier le blocage des doublons actifs.

## 8. Tableau de bord

- Vérifier le nombre de programmations à venir.
- Vérifier la prochaine programmation.
- Créer une programmation extérieure sans invitation ni hospitalité et vérifier les alertes.
- Compléter ces éléments et vérifier la disparition des alertes.

## 9. Impression

- Générer un planning de 3 mois.
- Générer un planning de 6 mois.
- Vérifier la lisibilité en aperçu avant impression A4 paysage.
- Vérifier que les programmations annulées ne figurent pas dans l’affichage normal.

## 10. Historique

- Vérifier la présence des créations et modifications précédentes.
- Filtrer par entité et par action.
- Rechercher un identifiant ou un nom présent dans les détails.
- Imprimer une sélection filtrée.

## 11. Modifications concurrentes

- Ouvrir la même programmation dans deux fenêtres avec deux comptes autorisés.
- Enregistrer une modification dans la première fenêtre.
- Essayer d’enregistrer l’ancienne fiche dans la deuxième fenêtre.
- Vérifier que la seconde écriture est refusée et que la fiche récente est rechargée.
- Répéter le contrôle sur un discours, un utilisateur, les paramètres et la liste des discours d’un orateur.

## 12. Critères de validation

La version peut être déclarée testable lorsque :

- tous les tests automatiques réussissent ;
- les six scénarios automatiques de résolution réussissent ;
- aucun blocage JavaScript n’apparaît dans l’interface ;
- les données restent présentes après rechargement ;
- les contrôles métier fonctionnent ;
- chaque solution proposée est réellement enregistrable après application ;
- aucune modification périmée n’écrase silencieusement une fiche récente ;
- les deux langues sont sélectionnables ;
- le planning imprimé est lisible ;
- l’historique enregistre les opérations principales.
