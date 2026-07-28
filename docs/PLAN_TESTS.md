# Plan de recette fonctionnelle CoordoDiscours 1.14

## Préparation

- Utiliser une base de test.
- Exécuter `npm run check` et vérifier la réussite des onze suites.
- Exécuter `npm run predeploy:check` et traiter toute erreur bloquante.
- Envoyer le code dans un projet Apps Script de recette.
- Exécuter `installCoordoDiscours`.
- Vérifier que `runAcceptanceTests` renvoie `success: true`.
- Tester avec un compte Administrateur, un compte Coordinateur et un compte Consultation.
- Préparer un ordinateur, une tablette et un téléphone.

## 1. Démarrage et navigation

- Ouvrir l’application sans fragment d’URL et vérifier le tableau de bord.
- Ouvrir directement `#planning`, `#versions`, `#help` et `#settings`.
- Vérifier que les vues autorisées s’ouvrent correctement.
- Vérifier qu’un rôle non administrateur est redirigé lorsqu’il tente d’ouvrir une vue administrative.
- Sur téléphone, ouvrir et fermer le tiroir avec le bouton, le voile et Échap.
- Vérifier que le focus reste dans le tiroir puis revient au bouton d’ouverture.

## 2. Guide intégré

### Tous les rôles

- Ouvrir le menu **Aide**.
- Rechercher `invitation`, `version`, `erreur` et `indisponible`.
- Sélectionner plusieurs sujets et vérifier le résumé, les étapes et les conseils.
- Ouvrir l’aide avec le bouton global `?`.
- Ouvrir l’aide avec la touche `?`.
- Vérifier que le raccourci ne s’active pas pendant la saisie dans un champ.
- Fermer la fenêtre et vérifier la restitution du focus.

### Consultation

- Vérifier l’accès aux sujets de démarrage, tableau de bord, impression, historique, versions et dépannage.
- Vérifier l’absence des sujets Coordinateur et Administrateur.

### Coordinateur

- Vérifier l’accès aux sujets de programmation, recommandations, planification automatique, orateurs, disponibilités et communication.
- Vérifier l’absence des sujets administrateur.

### Administrateur

- Vérifier les sujets administration, déploiement et performance.

### Langue

- Passer en Kréyòl Gwadloup.
- Vérifier que les commandes du guide restent traduites.
- Vérifier le message indiquant que le contenu détaillé reste en français.

## 3. Paramètres et accès

- Modifier le nom de l’assemblée et vérifier l’en-tête.
- Modifier l’horizon du tableau de bord.
- Modifier les pondérations, le bonus préféré et le malus à éviter.
- Vérifier le refus d’un total de pondérations égal à zéro.
- Créer les trois rôles.
- Vérifier qu’un Coordinateur ne peut pas modifier les paramètres ou utilisateurs.
- Vérifier qu’un administrateur ne peut pas désactiver son propre accès si cela compromet l’administration.

## 4. Assemblées, orateurs et discours

- Créer une assemblée complète.
- Créer un orateur local et un orateur extérieur.
- Associer plusieurs discours à l’orateur extérieur.
- Ajouter ses disponibilités.
- Modifier puis archiver et restaurer les fiches.
- Vérifier que les discours 59, 82, 122 et 123 restent inactifs.
- Vérifier la recherche par mots, numéro, coordonnées et assemblée.

## 5. Disponibilités

- Ajouter les quatre types de période.
- Vérifier les dates inclusives.
- Vérifier une date de fin antérieure à la date de début.
- Vérifier un doublon strict.
- Désactiver une période et vérifier qu’elle reste dans l’historique.
- Vérifier qu’une indisponibilité prévaut sur une préférence chevauchante.

## 6. Programmation manuelle

- Programmer un orateur local avec un discours actif.
- Programmer un orateur extérieur avec un discours déclaré.
- Vérifier les règles PLAN_001 à PLAN_010.
- Vérifier la confirmation des avertissements.
- Vérifier le refus des erreurs bloquantes.
- Modifier, annuler puis restaurer une programmation.

## 7. Recommandations et résolution

- Comparer les scores sur une date neutre, préférée et à éviter.
- Vérifier l’exclusion d’un orateur indisponible.
- Vérifier une proposition d’autre orateur, date, discours et assemblée.
- Vérifier une solution combinée.
- Vérifier que le bouton Appliquer ne déclenche aucune écriture immédiate.

## 8. Planification automatique

- Générer les trois scénarios sur quatre mois.
- Vérifier la conservation des créneaux existants.
- Vérifier les discours déclarés des orateurs extérieurs.
- Vérifier l’exclusion des indisponibilités.
- Décocher des dates puis valider.
- Vérifier la création facultative des suivis.
- Modifier une donnée après génération et vérifier le refus du brouillon obsolète.
- Provoquer un échec pendant l’écriture de recette et vérifier le retour arrière.

## 9. Invitations et hospitalité

- Créer une invitation et une hospitalité.
- Vérifier les doublons actifs.
- Faire évoluer tous les statuts.
- Vérifier la date d’envoi automatique.
- Vérifier le tableau de bord après confirmation.

## 10. Fusion concurrente

- Modifier deux champs différents d’une même fiche depuis deux fenêtres.
- Vérifier la fusion automatique.
- Modifier le même champ différemment et vérifier l’arbitrage.
- Modifier encore la fiche pendant l’arbitrage et vérifier le recalcul.
- Vérifier les listes de discours comme ensembles.
- Vérifier les disponibilités élément par élément.
- Contrôler `FUSION_AUTOMATIQUE` et `FUSION_RESOLUE` dans l’historique.

## 11. Historique des versions

- Créer plusieurs versions d’une fiche.
- Vérifier la numérotation et la version actuelle.
- Charger plus de 40 fiches et utiliser **Charger plus**.
- Comparer exactement deux versions.
- Restaurer un ancien état valide.
- Vérifier la nouvelle version créée.
- Vérifier une restauration nécessitant un avertissement.
- Vérifier une restauration bloquée par une règle actuelle.
- Modifier la fiche dans une autre fenêtre puis vérifier le refus d’une chronologie périmée.

## 12. Cache serveur

Ces essais doivent être effectués dans une base de recette, sans conclure uniquement à partir du ressenti visuel.

- Ouvrir plusieurs fois rapidement le planning et la communication.
- Vérifier que les données restent cohérentes.
- Modifier un orateur puis rouvrir les options de programmation.
- Modifier une programmation puis rouvrir invitations et hospitalité.
- Modifier les paramètres puis recharger l’application.
- Restaurer une sauvegarde et vérifier toutes les listes.
- Attendre plus de 60 secondes puis vérifier que les données sont toujours relues correctement.

## 13. Diagnostic de performance

- Ouvrir Paramètres avec un compte Administrateur.
- Vérifier la section **Performance serveur**.
- Utiliser plusieurs modules afin de produire des mesures.
- Actualiser le rapport.
- Vérifier les appels, moyennes, maximums, lenteurs et erreurs.
- Réinitialiser les mesures.
- Vérifier l’action `REINITIALISATION_PERFORMANCE` dans l’historique.
- Vérifier qu’un Coordinateur et un rôle Consultation ne peuvent pas obtenir le rapport serveur.

## 14. Reprise après erreur réseau

Ces essais peuvent être réalisés avec les outils réseau du navigateur ou une interruption contrôlée.

### Lecture

- Interrompre une lecture.
- Vérifier une seule relance automatique.
- Vérifier le bandeau si la seconde tentative échoue.
- Cliquer sur Réessayer et vérifier le rechargement.

### Écriture

- Interrompre une écriture après son lancement.
- Vérifier qu’aucune seconde écriture automatique n’est envoyée.
- Vérifier le message demandant de contrôler l’état.
- Recharger le module.
- Vérifier l’historique et l’absence de doublon avant toute nouvelle tentative.

## 15. Impression, sauvegarde et intégrité

- Générer le planning de trois puis six mois.
- Vérifier l’impression A4.
- Créer une sauvegarde JSON.
- Inspecter le résumé.
- Restaurer sur une base de test.
- Vérifier la copie de sécurité Drive.
- Exécuter le contrôle d’intégrité.

## 16. Accessibilité et responsive

- Naviguer uniquement au clavier.
- Utiliser le lien d’évitement.
- Vérifier les indicateurs de focus.
- Vérifier les annonces de statut avec un lecteur d’écran si disponible.
- Activer la réduction des animations du système.
- Tester téléphone en portrait et paysage.
- Tester les dialogues de grande hauteur.
- Tester le guide, les versions et les paramètres sur écran étroit.

## 17. Préparation à la mise en production

### Rapport de santé

- Ouvrir `#release` avec un Administrateur.
- Vérifier le score, l’état global et les six contrôles.
- Vérifier qu’un compte Coordinateur ou Consultation ne voit pas le module.
- Supprimer ou vieillir la dernière sauvegarde dans une base de recette et vérifier le blocage.
- Introduire une anomalie contrôlée puis vérifier le blocage d’intégrité.
- Produire des mesures lentes et vérifier l’avertissement de performance.

### Recette guidée

- Démarrer une recette et vérifier la référence.
- Exécuter les sept étapes dans l’ordre.
- Tenter une étape hors ordre et vérifier le refus.
- Ouvrir une seconde fenêtre, remplacer la session et vérifier le refus de la session périmée.
- Exporter le rapport JSON et contrôler la version, les étapes et la décision finale.
- Vérifier les actions de recette dans l’historique.

### Références de support

- Provoquer une erreur de lecture et relever la référence affichée.
- Provoquer une erreur d’écriture dans une base de test et vérifier le bandeau de prudence.
- Retrouver les références dans Mise en production.
- Vérifier qu’aucune pile technique, jeton ou donnée métier complète n’est enregistrée.
- Exporter le dossier de support et vérifier l’absence d’identifiant de feuille, d’URL de base et de nom d’orateur.

## 18. Actions correctives

- Synchroniser les recommandations du rapport de santé.
- Vérifier la création d’une action par contrôle non conforme.
- Modifier le titre, la description, la priorité, le responsable, l’échéance et les notes.
- Modifier la même action depuis deux fenêtres et vérifier le refus de la version périmée.
- Terminer une action puis vérifier son classement dans les statuts terminaux.
- Rendre le contrôle conforme puis resynchroniser et vérifier la clôture automatique de l’action de rapport.
- Conserver une action bloquante ouverte et vérifier que l’approbation reste impossible.

## 19. Recette multi-écrans

- Vérifier la présence des 15 lignes : 3 appareils × 5 scénarios.
- Enregistrer un résultat `REUSSI`, `ECHEC` et `A_TESTER`.
- Vérifier qu’un échec rend le contrôle de santé bloquant.
- Vérifier qu’un résultat à tester empêche l’état `READY`.
- Compléter les 15 résultats avec succès puis vérifier le contrôle `PASS`.
- Modifier la matrice dans une seconde fenêtre puis vérifier le conflit de version.
- Tester réellement la navigation, le planning, les formulaires, la recherche et l’impression sur chaque format.

## 20. Décisions de mise en production

- Vérifier que le bouton Approuver est désactivé hors `READY` à 100/100.
- Tenter une approbation sans `AUTORISER` et vérifier le refus.
- Approuver un rapport conforme puis vérifier l’entrée du registre.
- Tenter une seconde approbation identique et vérifier le refus.
- Modifier le rapport entre affichage et décision puis vérifier le refus de l’empreinte périmée.
- Reporter avec un motif et vérifier l’audit.
- Tenter `DEPLOYED` sans approbation correspondante, sans identifiant ou sans `DEPLOYE`.
- Enregistrer l’identifiant réel du déploiement puis exporter le manifeste.
- Recalculer le checksum SHA-256 du noyau du manifeste.
- Enregistrer un retour arrière avec motif et confirmation `RETOUR`.

## 21. Capacité annuelle

- Choisir l’année courante et une année antérieure disponible.
- Vérifier le nombre de programmations non annulées.
- Vérifier le jour hebdomadaire déduit du planning.
- Contrôler le taux d’occupation théorique.
- Vérifier que les orateurs actifs sans affectation participent au calcul d’équilibre.
- Contrôler la concentration des 20 % les plus sollicités.
- Vérifier la couverture des discours actifs et la part d’orateurs extérieurs.
- Vérifier les recommandations déclenchées par des seuils insuffisants.

## 22. Archivage contrôlé de l’historique

À exécuter uniquement sur une copie de recette contenant des données artificielles.

- Vérifier le refus d’un seuil inférieur à 180 jours.
- Vérifier la conservation minimale de 500 lignes récentes.
- Calculer un aperçu puis ajouter une ligne et vérifier le refus du nombre attendu périmé.
- Tenter l’opération sans le mot `ARCHIVER`.
- Vérifier la création du fichier JSON Google Drive avant la suppression.
- Vérifier les en-têtes, critères et lignes dans l’archive.
- Vérifier le nombre de lignes restantes dans la feuille.
- Vérifier l’action `ARCHIVAGE_HISTORIQUE` dans l’audit.
- Vérifier le refus d’un lot supérieur à 25 000 lignes.

## 23. Critères de validation

La version 1.14 peut être déclarée testable lorsque :

- les onze suites automatiques réussissent ;
- `runAcceptanceTests` réussit ;
- aucun blocage JavaScript n’apparaît ;
- les droits sont respectés ;
- le guide affiche uniquement les sujets autorisés ;
- les caches n’exposent aucune donnée périmée après une écriture ;
- une lecture peut être reprise sans doubler une écriture ;
- les mesures serveur restent accessibles uniquement aux administrateurs ;
- la programmation, la fusion, les versions, les sauvegardes et l’intégrité restent fonctionnelles ;
- le rapport de santé ne contient aucun blocage non traité ;
- la recette guidée est terminée et exportée ;
- la recette ordinateur, tablette et téléphone est réussie ;
- aucune action corrective bloquante ne reste ouverte ;
- une décision d’approbation ou de report est enregistrée ;
- le manifeste et le dossier de support ont été vérifiés ;
- l’archivage a été testé uniquement sur une copie de recette.
