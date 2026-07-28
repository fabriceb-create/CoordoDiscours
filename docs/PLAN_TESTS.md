# Plan de recette fonctionnelle

## Préparation

- Installer l’application avec `installCoordoDiscours`.
- Vérifier que `runAcceptanceTests` renvoie `success: true`.
- Exécuter `npm run check` et vérifier la réussite des cinq suites de contrôle.
- Déployer l’application en accès restreint.
- Effectuer les essais avec une base de test, jamais avec les données définitives au premier passage.

## 1. Paramètres et langues

- Modifier le nom de l’assemblée et vérifier son affichage dans l’en-tête.
- Choisir Français puis vérifier les menus et boutons.
- Choisir Kréyòl Gwadloup puis vérifier le changement d’interface.
- Revenir au français.
- Modifier l’alerte de répétition et vérifier sa conservation après rechargement.
- Modifier le bonus de date préférée et le malus de date à éviter.

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

## 4. Disponibilités des orateurs

- Ouvrir une fiche orateur enregistrée puis cliquer sur « Gérer ses disponibilités ».
- Ajouter une journée `INDISPONIBLE` avec un motif.
- Ajouter une fenêtre `DISPONIBLE_SEULEMENT` couvrant plusieurs jours.
- Ajouter une date `PREFEREE` et une date `A_EVITER`.
- Modifier une période, en désactiver une et retirer une autre avant enregistrement.
- Recharger la fiche et vérifier la conservation de toutes les périodes.
- Vérifier qu’une date de fin antérieure à la date de début est refusée.
- Vérifier que deux périodes strictement identiques sont refusées.
- Ouvrir la même liste de disponibilités dans deux fenêtres, modifier la première puis vérifier que l’ancienne version est refusée dans la seconde.

## 5. Discours

- Créer ou compléter un titre de discours.
- Rechercher par numéro et par mot du titre.
- Vérifier que les discours 59, 82, 122 et 123 restent inactifs.
- Désactiver puis réactiver un autre discours.

## 6. Programmation

- Programmer un orateur local avec un discours actif.
- Programmer un orateur extérieur avec un discours déclaré.
- Renseigner puis modifier l’assemblée d’origine.
- Vérifier le blocage d’un discours non déclaré pour un orateur extérieur.
- Vérifier le blocage d’un créneau déjà occupé.
- Programmer deux fois le même discours dans la période d’alerte et vérifier l’avertissement non bloquant.
- Choisir une date `INDISPONIBLE` et vérifier le blocage `PLAN_008`.
- Choisir une date située hors des fenêtres `DISPONIBLE_SEULEMENT` et vérifier le blocage `PLAN_008`.
- Choisir une date `A_EVITER`, vérifier l’avertissement `PLAN_009`, puis confirmer l’enregistrement.
- Choisir une date `PREFEREE` et vérifier l’information positive `PLAN_010`.
- Modifier une programmation.
- Annuler puis restaurer une programmation.

## 7. Recommandations

- Sélectionner une date et un discours puis vérifier que les orateurs indisponibles sont absents.
- Comparer le score d’un même orateur sur une date neutre et sur une date préférée.
- Vérifier que le score augmente selon le bonus configuré.
- Comparer le score sur une date à éviter et vérifier la diminution selon le malus configuré.
- Vérifier que les raisons et réserves liées aux disponibilités sont affichées.

## 8. Assistant de résolution

- Occuper un créneau puis tenter une deuxième programmation au même jour et à la même heure.
- Vérifier que l’assistant propose une autre date et ne présente pas le simple changement d’orateur comme une solution suffisante.
- Choisir un orateur extérieur avec un discours absent de sa liste et vérifier les propositions d’un autre orateur et d’un autre discours déclaré.
- Sélectionner une assemblée archivée et vérifier la proposition d’une assemblée active ou du retrait de l’assemblée d’origine.
- Cumuler un orateur archivé et un créneau occupé puis vérifier l’apparition d’une solution combinée.
- Choisir un orateur indisponible et vérifier la proposition d’un autre orateur disponible ou d’une autre date autorisée.
- Appliquer une proposition et vérifier que les champs du formulaire changent sans enregistrement automatique.
- Enregistrer ensuite la proposition et vérifier qu’elle repasse avec succès dans le moteur de règles.
- Vérifier que les propositions sont classées par score et que les avertissements éventuels restent visibles.

## 9. Planification automatique

- Ouvrir l’assistant et générer les trois scénarios sur quatre mois.
- Vérifier que les créneaux existants sont conservés et signalés.
- Vérifier qu’aucun orateur n’est retenu pendant une indisponibilité ou hors de ses fenêtres autorisées.
- Vérifier que les dates préférées sont favorisées et que les dates à éviter sont pénalisées.
- Comparer les scénarios Équilibré, Renouvellement des discours et Rotation des orateurs.
- Décocher plusieurs propositions puis enregistrer uniquement la sélection.
- Générer un brouillon, modifier une disponibilité dans une autre fenêtre puis vérifier le refus `AUTO_PLAN_OBSOLETE`.
- Vérifier la création facultative des invitations et hospitalités pour les orateurs extérieurs.

## 10. Invitations et hospitalité

- Créer une invitation liée à une programmation extérieure.
- Marquer l’invitation comme envoyée puis acceptée.
- Créer une hospitalité liée à la même programmation.
- Renseigner le groupe et le contact puis confirmer.
- Vérifier le blocage des doublons actifs.

## 11. Tableau de bord

- Vérifier le nombre de programmations à venir.
- Vérifier la prochaine programmation.
- Créer une programmation extérieure sans invitation ni hospitalité et vérifier les alertes.
- Compléter ces éléments et vérifier la disparition des alertes.

## 12. Impression

- Générer un planning de 3 mois.
- Générer un planning de 6 mois.
- Vérifier la lisibilité en aperçu avant impression A4 paysage.
- Vérifier que les programmations annulées ne figurent pas dans l’affichage normal.

## 13. Historique

- Vérifier la présence des créations et modifications précédentes.
- Vérifier l’entrée `MISE_A_JOUR_DISPONIBILITES` avec l’état avant/après.
- Filtrer par entité et par action.
- Rechercher un identifiant ou un nom présent dans les détails.
- Imprimer une sélection filtrée.

## 14. Intégrité et sauvegarde

- Créer sur une base de test une période orpheline et vérifier le signalement par le rapport d’intégrité.
- Vérifier les signalements de type inconnu, dates invalides, doublons et périodes contradictoires.
- Créer une sauvegarde et vérifier que la feuille `ORATEUR_DISPONIBILITES` est incluse.
- Restaurer cette sauvegarde sur une base de test et contrôler les périodes.

## 15. Modifications concurrentes

- Ouvrir la même programmation dans deux fenêtres avec deux comptes autorisés.
- Enregistrer une modification dans la première fenêtre.
- Essayer d’enregistrer l’ancienne fiche dans la deuxième fenêtre.
- Vérifier que la seconde écriture est refusée et que la fiche récente est rechargée.
- Répéter le contrôle sur un discours, un utilisateur, les paramètres, la liste des discours et les disponibilités d’un orateur.

## 16. Critères de validation

La version peut être déclarée testable lorsque :

- tous les tests automatiques réussissent ;
- les scénarios automatiques de résolution, de planification et de disponibilité réussissent ;
- aucun blocage JavaScript n’apparaît dans l’interface ;
- les données restent présentes après rechargement ;
- les contrôles métier fonctionnent ;
- aucun orateur indisponible n’est proposé ou planifié ;
- chaque solution proposée est réellement enregistrable après application ;
- aucune modification périmée n’écrase silencieusement une fiche récente ;
- les deux langues sont sélectionnables ;
- le planning imprimé est lisible ;
- l’historique enregistre les opérations principales.

## 17. Responsive, accessibilité et caches — version 1.11

### Navigation mobile

- Ouvrir l’application avec une largeur inférieure à 820 pixels.
- Vérifier que la navigation est masquée au démarrage.
- Ouvrir le tiroir depuis l’en-tête.
- Vérifier que le focus est placé dans le menu et ne peut pas sortir avec Tab.
- Fermer avec le bouton, le voile de fond puis la touche Échap.
- Vérifier que le focus revient au bouton d’ouverture après une fermeture sans changement de vue.
- Choisir une section et vérifier que le focus arrive sur son titre.
- Passer en largeur supérieure à 820 pixels et vérifier que la navigation redevient fixe.

### Clavier et technologies d’assistance

- Utiliser le lien « Aller au contenu principal ».
- Parcourir toutes les actions principales uniquement au clavier.
- Vérifier la visibilité du focus.
- Vérifier que la section active possède `aria-current="page"`.
- Vérifier l’annonce d’une confirmation puis d’une erreur.
- Vérifier les libellés des boutons d’ouverture, de fermeture et des fenêtres avec un lecteur d’écran.
- Activer la réduction des animations dans le système et vérifier l’absence de transitions longues.

### Navigation directe

- Ouvrir l’application avec `#planning`, `#versions`, `#history` puis `#settings`.
- Vérifier que la section correspondante est active et chargée.
- Avec un compte non administrateur, ouvrir directement `#settings` et vérifier le retour vers le tableau de bord.

### Caches et chargements

- Ouvrir deux fois le formulaire de programmation en moins d’une minute et vérifier qu’une seule lecture récente des options suffit.
- Ouvrir successivement Invitations et Hospitalité et vérifier la réutilisation des mêmes programmations.
- Modifier une programmation puis rouvrir une invitation et vérifier l’actualisation des options.
- Modifier un orateur, une assemblée ou un discours puis rouvrir la programmation et vérifier l’actualisation.
- Lancer rapidement plusieurs recherches et vérifier qu’une réponse ancienne ne remplace pas la dernière saisie.
- Double-cliquer sur une action d’écriture et vérifier qu’une seule demande est envoyée.

### Critères de validation 1.11

- Les huit suites de `npm run check` réussissent.
- Aucun blocage JavaScript ne survient sur ordinateur ou mobile.
- Le tiroir est utilisable au clavier et avec un lecteur d’écran.
- Les vues lourdes ne sont plus chargées au démarrage lorsqu’elles ne sont pas ouvertes.
- Les caches sont réutilisés puis invalidés au bon moment.
- Les deux langues restent sélectionnables.
