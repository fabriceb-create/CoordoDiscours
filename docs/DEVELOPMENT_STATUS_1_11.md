# État de développement — CoordoDiscours 1.11

## Objectif

Améliorer l’utilisation sur téléphone et tablette, renforcer l’accessibilité clavier et réduire les lectures serveur répétitives sans modifier les règles métier.

## Réalisé

### Navigation mobile

- Tiroir latéral fermé par défaut sous 820 pixels.
- Boutons d’ouverture et de fermeture accessibles.
- Fermeture par le voile de fond et la touche Échap.
- Focus contenu dans le tiroir tant qu’il est ouvert.
- Restitution du focus au bouton d’ouverture.
- Navigation hors écran rendue inerte.
- En-tête mobile fixe et dialogues adaptés à la hauteur dynamique du navigateur.

### Accessibilité

- Lien d’évitement vers le contenu principal.
- Focus clavier visible.
- Section active exposée avec `aria-current="page"`.
- Messages normaux annoncés comme `status` et erreurs comme `alert`.
- Libellés accessibles des boutons icônes traduits en Kréyòl Gwadloup.
- Respect de `prefers-reduced-motion`.
- Repli automatique vers le tableau de bord lorsqu’une vue administrateur n’est pas autorisée.

### Performance client

- Cache de 60 secondes pour `getPlanningOptions`.
- Cache de 60 secondes pour `getCommunicationOptions`.
- Mutualisation des appels en cours afin d’éviter deux lectures identiques simultanées.
- Chargement parallèle des options et des listes d’invitations ou d’hospitalités.
- Identifiants de requête pour ignorer les réponses anciennes des recherches.
- Invalidation centralisée après modification des orateurs, assemblées, discours ou programmations.
- Invalidation après planification automatique, changement de paramètres et restauration complète.
- Chargement des modules lourds uniquement lors de l’ouverture de leur vue.

### Fiabilité

- Verrou client `aria-busy` et désactivation temporaire sur les principales actions d’écriture.
- Navigation par ancre et événement central `coordodiscours:viewchange`.
- Vérification syntaxique de tous les blocs JavaScript HTML pendant les tests.

## Validation automatique

La suite `test-responsive-accessibility.mjs` contrôle les contrats HTML, CSS et JavaScript du lot ainsi que la syntaxe de tous les blocs `<script>` de l’application.

La commande complète reste :

```bash
npm run check
```

## Recette manuelle prioritaire

- iPhone et Android en orientation portrait et paysage.
- Navigation entièrement au clavier sur ordinateur.
- Lecteur d’écran sur le menu, les boutons de fermeture et les messages d’erreur.
- Navigation directe vers `#planning`, `#versions` et `#settings`.
- Deux ouvertures successives des modules Invitations et Hospitalité pour confirmer la réduction des appels serveur.
