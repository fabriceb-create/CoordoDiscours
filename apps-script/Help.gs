const HELP_CONTENT_VERSION = '1.0.0';
const HELP_VIEW_TOPICS = Object.freeze({
  dashboard: 'dashboard',
  planning: 'planning',
  print: 'impression',
  hospitality: 'communication',
  invitations: 'communication',
  speakers: 'orateurs',
  congregations: 'referentiels',
  talks: 'referentiels',
  history: 'historique',
  versions: 'versions',
  backup: 'sauvegardes',
  settings: 'administration',
  help: 'demarrage'
});

const HELP_TOPICS = Object.freeze([
  {
    id: 'demarrage', category: 'Premiers pas', title: 'Bien démarrer avec CoordoDiscours', minimumRole: 'CONSULTATION', view: 'dashboard',
    summary: 'Comprendre l’organisation générale de l’application et l’ordre conseillé pour préparer les premières programmations.',
    steps: [
      'Vérifie le nom de l’assemblée et l’état « Application prête » dans l’en-tête.',
      'Renseigne d’abord les assemblées, puis les orateurs et les discours qu’ils peuvent présenter.',
      'Ajoute les périodes d’indisponibilité ou les dates préférées avant de préparer le planning.',
      'Crée les programmations manuellement ou utilise l’assistant automatique, puis contrôle les invitations et l’hospitalité.',
      'Consulte régulièrement le tableau de bord, l’historique et les sauvegardes.'
    ],
    tips: ['Le bouton ? ouvre l’aide correspondant au module affiché.', 'La touche ? ouvre également l’aide contextuelle lorsque le curseur n’est pas dans un champ.'],
    keywords: ['début', 'premiers pas', 'ordre', 'installation', 'navigation']
  },
  {
    id: 'dashboard', category: 'Suivi quotidien', title: 'Lire le tableau de bord', minimumRole: 'CONSULTATION', view: 'dashboard',
    summary: 'Identifier rapidement la prochaine programmation, les invitations à traiter, l’hospitalité à attribuer et les conflits éventuels.',
    steps: [
      'Commence par la carte d’action prioritaire : elle présente l’élément le plus urgent dans l’horizon configuré.',
      'Contrôle les compteurs de programmations, invitations, hospitalités, confirmations et conflits.',
      'Ouvre une action pour rejoindre directement le module concerné.',
      'Actualise après une modification importante si le tableau de bord n’a pas encore été rechargé.'
    ],
    tips: ['L’horizon des actions se règle dans Paramètres.', 'Un conflit de créneau doit être corrigé avant toute nouvelle communication.'],
    keywords: ['priorité', 'alerte', 'compteur', 'conflit', 'prochaine date']
  },
  {
    id: 'planning', category: 'Programmation', title: 'Créer ou modifier une programmation', minimumRole: 'COORDINATEUR', view: 'planning',
    summary: 'Programmer un discours tout en respectant les règles, les disponibilités et les limites propres aux orateurs extérieurs.',
    steps: [
      'Choisis la date et l’heure, puis le discours souhaité.',
      'Examine les orateurs recommandés et leurs raisons de classement.',
      'Sélectionne l’orateur et, s’il vient de l’extérieur, vérifie son assemblée d’origine.',
      'Lis les avertissements avant de confirmer. Une erreur bloquante n’est jamais enregistrée.',
      'Enregistre seulement après avoir contrôlé la proposition complète.'
    ],
    tips: ['Un avertissement peut être confirmé ; une erreur doit être corrigée.', 'Une fiche modifiée simultanément est fusionnée automatiquement lorsque les champs ne se contredisent pas.'],
    keywords: ['planning', 'date', 'orateur', 'discours', 'règle', 'avertissement']
  },
  {
    id: 'recommandations', category: 'Programmation', title: 'Comprendre les recommandations', minimumRole: 'COORDINATEUR', view: 'planning',
    summary: 'Interpréter le score proposé pour chaque orateur sans remplacer le jugement du coordinateur.',
    steps: [
      'Le moteur vérifie d’abord que l’orateur est autorisé et disponible.',
      'Il tient ensuite compte de l’ancienneté du dernier passage, de la fréquence dans le mois, de la proximité et de l’équilibre général.',
      'Les dates préférées ajoutent un bonus ; les dates à éviter retirent des points et produisent un avertissement.',
      'Le score final reste une aide au choix : le coordinateur conserve la décision.'
    ],
    tips: ['Les pondérations sont modifiables par un administrateur.', 'Un orateur indisponible n’apparaît pas parmi les candidats admissibles.'],
    keywords: ['score', 'recommandation', 'pondération', 'équilibre', 'ancienneté']
  },
  {
    id: 'planification-automatique', category: 'Programmation', title: 'Préparer plusieurs mois automatiquement', minimumRole: 'COORDINATEUR', view: 'planning',
    summary: 'Comparer trois scénarios de planning et n’enregistrer que les dates réellement retenues.',
    steps: [
      'Choisis la première date, l’heure et une période de 1 à 6 mois.',
      'Génère les scénarios Équilibré, Renouvellement des discours et Rotation des orateurs.',
      'Compare les scores, les avertissements et les dates laissées sans solution.',
      'Décoche les propositions que tu ne souhaites pas conserver.',
      'Valide le scénario choisi. Les données sont recontrôlées juste avant l’écriture.'
    ],
    tips: ['Un brouillon devient obsolète si le planning ou un référentiel change.', 'Les suivis d’invitation et d’hospitalité restent à compléter après leur création.'],
    keywords: ['automatique', 'quatre mois', 'scénario', 'rotation', 'brouillon']
  },
  {
    id: 'orateurs', category: 'Référentiels', title: 'Gérer les orateurs', minimumRole: 'COORDINATEUR', view: 'speakers',
    summary: 'Créer les fiches, distinguer les orateurs locaux et extérieurs, puis maintenir leurs discours et disponibilités.',
    steps: [
      'Renseigne le nom, le type d’orateur, les coordonnées et l’assemblée d’origine si nécessaire.',
      'Pour un orateur extérieur, ouvre la liste de ses discours déclarés et sélectionne uniquement les numéros réellement autorisés.',
      'Ajoute ses indisponibilités, fenêtres autorisées, périodes préférées ou dates à éviter.',
      'Archive une fiche qui ne doit plus être proposée sans supprimer son historique.'
    ],
    tips: ['Un orateur local peut présenter tout discours actif.', 'L’archivage est réversible et ne supprime aucune programmation passée.'],
    keywords: ['orateur', 'extérieur', 'local', 'discours déclarés', 'archive']
  },
  {
    id: 'disponibilites', category: 'Référentiels', title: 'Déclarer les disponibilités', minimumRole: 'COORDINATEUR', view: 'speakers',
    summary: 'Utiliser les quatre types de périodes pour guider ou bloquer les propositions.',
    steps: [
      'Indisponible bloque toutes les dates comprises dans la période.',
      'Disponible seulement interdit les dates situées hors de toutes les fenêtres autorisées.',
      'Période préférée favorise les dates concernées sans les rendre obligatoires.',
      'Période à éviter laisse la date possible mais ajoute un avertissement et un malus.',
      'Désactive une période pour la conserver dans l’historique sans qu’elle influence le moteur.'
    ],
    tips: ['Une indisponibilité prévaut sur une préférence qui la chevauche.', 'Les dates de début et de fin sont incluses.'],
    keywords: ['indisponible', 'préférée', 'à éviter', 'fenêtre', 'calendrier']
  },
  {
    id: 'referentiels', category: 'Référentiels', title: 'Maintenir les assemblées et les discours', minimumRole: 'COORDINATEUR', view: 'congregations',
    summary: 'Conserver des référentiels propres afin que les programmations et les communications restent fiables.',
    steps: [
      'Crée chaque assemblée avec son coordinateur, ses coordonnées et son horaire habituel.',
      'Maintiens le titre officiel des discours et leur statut actif.',
      'Archive une assemblée qui ne doit plus être proposée.',
      'Ne réactive jamais les discours officiellement retirés : CoordoDiscours les protège automatiquement.'
    ],
    tips: ['Les discours 59, 82, 122 et 123 restent inactifs.', 'Une ancienne programmation conserve les informations utilisées à sa date.'],
    keywords: ['assemblée', 'discours', 'titre', 'référentiel', 'inactif']
  },
  {
    id: 'communication', category: 'Communication', title: 'Suivre invitations et hospitalité', minimumRole: 'COORDINATEUR', view: 'invitations',
    summary: 'S’assurer que chaque orateur extérieur est invité, confirmé et accueilli dans de bonnes conditions.',
    steps: [
      'Crée ou ouvre l’invitation liée à la programmation.',
      'Renseigne le destinataire puis fais évoluer le statut : à envoyer, envoyée, acceptée, refusée ou relancée.',
      'Attribue l’hospitalité à un groupe ou un contact, puis confirme-la.',
      'Vérifie le tableau de bord jusqu’à disparition des actions en attente.'
    ],
    tips: ['Une seule invitation et une seule hospitalité actives sont admises par programmation.', 'La date d’envoi est proposée automatiquement lorsque le statut devient Envoyée.'],
    keywords: ['invitation', 'hospitalité', 'accueil', 'destinataire', 'confirmation']
  },
  {
    id: 'impression', category: 'Consultation', title: 'Imprimer le planning', minimumRole: 'CONSULTATION', view: 'print',
    summary: 'Générer un aperçu sur trois ou six mois avant impression ou partage.',
    steps: [
      'Choisis le mois de départ et la durée souhaitée.',
      'Actualise l’aperçu après toute modification du planning.',
      'Contrôle les dates, noms et titres visibles.',
      'Utilise Imprimer puis sélectionne le format A4 dans la boîte de dialogue du navigateur.'
    ],
    tips: ['L’impression n’accorde aucun droit de modification.', 'Une durée par défaut peut être définie dans Paramètres.'],
    keywords: ['imprimer', 'A4', 'trois mois', 'six mois', 'aperçu']
  },
  {
    id: 'historique', category: 'Traçabilité', title: 'Rechercher une opération', minimumRole: 'CONSULTATION', view: 'history',
    summary: 'Retrouver qui a modifié une fiche, à quelle date et quels champs ont changé.',
    steps: [
      'Utilise la recherche libre ou filtre par action, entité et période.',
      'Ouvre une opération pour consulter les valeurs avant et après.',
      'Repère les actions de fusion, de restauration et les refus d’accès si nécessaire.',
      'Imprime le résultat filtré lorsqu’un relevé doit être conservé.'
    ],
    tips: ['L’historique est un journal d’audit ; il ne remplace pas la sauvegarde complète.', 'Les détails techniques sont conservés pour les diagnostics.'],
    keywords: ['audit', 'avant', 'après', 'utilisateur', 'date', 'action']
  },
  {
    id: 'versions', category: 'Traçabilité', title: 'Comparer ou restaurer une version', minimumRole: 'CONSULTATION', view: 'versions',
    summary: 'Parcourir l’évolution d’une fiche, comparer deux états et restaurer une ancienne version avec les droits appropriés.',
    steps: [
      'Choisis le type de fiche puis recherche l’élément concerné.',
      'Ouvre sa chronologie et sélectionne exactement deux versions pour les comparer.',
      'Vérifie les champs différents et l’identité de la version actuelle.',
      'Si ton rôle le permet, restaure une ancienne version. Les règles métier actuelles sont réappliquées.',
      'Recharge la chronologie si la fiche a changé pendant l’opération.'
    ],
    tips: ['Une restauration crée une nouvelle version : elle n’efface pas les états intermédiaires.', 'Une ancienne programmation devenue invalide reste bloquée.'],
    keywords: ['version', 'comparer', 'restaurer', 'chronologie', 'ancien état']
  },
  {
    id: 'sauvegardes', category: 'Administration', title: 'Sauvegarder et restaurer les données', minimumRole: 'ADMIN', view: 'backup',
    summary: 'Créer une copie JSON complète et restaurer une base uniquement après vérification.',
    steps: [
      'Télécharge une sauvegarde avant toute mise à jour importante ou opération exceptionnelle.',
      'Conserve le fichier dans un emplacement protégé avec la date et la version de l’application.',
      'Avant restauration, sélectionne le fichier et contrôle le résumé des feuilles.',
      'Saisis exactement RESTAURER pour confirmer.',
      'CoordoDiscours crée d’abord une copie de sécurité dans Google Drive.'
    ],
    tips: ['Une restauration remplace les données actuelles.', 'Après restauration, lance le contrôle d’intégrité et la recette d’acceptation.'],
    keywords: ['backup', 'json', 'restauration', 'drive', 'sécurité']
  },
  {
    id: 'administration', category: 'Administration', title: 'Administrer l’application', minimumRole: 'ADMIN', view: 'settings',
    summary: 'Gérer les paramètres, les utilisateurs, l’intégrité et les diagnostics de performance.',
    steps: [
      'Vérifie les paramètres généraux et les pondérations du moteur de recommandation.',
      'Maintiens au moins un administrateur actif et attribue le rôle minimal nécessaire à chaque utilisateur.',
      'Lance régulièrement le contrôle d’intégrité.',
      'Consulte les durées serveur pour repérer les opérations coûteuses.',
      'Réinitialise les mesures après une optimisation afin de comparer sur une nouvelle fenêtre.'
    ],
    tips: ['Un coordinateur ne peut pas modifier les paramètres ni les utilisateurs.', 'Ne désactive jamais le dernier administrateur actif.'],
    keywords: ['admin', 'paramètres', 'utilisateurs', 'rôle', 'intégrité', 'performance']
  },
  {
    id: 'deploiement', category: 'Administration', title: 'Déployer une nouvelle version', minimumRole: 'ADMIN', view: 'settings',
    summary: 'Appliquer une mise à jour en conservant une possibilité de retour arrière.',
    steps: [
      'Crée une sauvegarde depuis l’application et note la version actuellement déployée.',
      'Exécute npm run check puis npm run predeploy:check dans le dépôt.',
      'Envoie le code avec npm run clasp:push.',
      'Exécute installCoordoDiscours puis runAcceptanceTests dans Apps Script.',
      'Crée une nouvelle version du déploiement Web et effectue la recette sur ordinateur, tablette et téléphone.',
      'En cas d’incident, redéploie la version Apps Script précédente avant d’envisager une restauration des données.'
    ],
    tips: ['Le fichier .clasp.json ne doit jamais être publié.', 'Le code et les données possèdent des procédures de retour arrière distinctes.'],
    keywords: ['déploiement', 'clasp', 'mise à jour', 'rollback', 'recette']
  },
  {
    id: 'diagnostic-performance', category: 'Administration', title: 'Lire le diagnostic de performance', minimumRole: 'ADMIN', view: 'settings',
    summary: 'Interpréter les mesures agrégées des appels serveur les plus sollicités.',
    steps: [
      'Ouvre Paramètres puis actualise la section Performance serveur.',
      'Compare le nombre d’appels, la moyenne, le maximum et le nombre d’appels lents.',
      'Commence par les opérations fréquemment appelées ou régulièrement au-dessus du seuil.',
      'Réinitialise les mesures après une correction et observe une nouvelle période représentative.'
    ],
    tips: ['Les mesures sont indicatives et conservées temporairement dans le cache du script.', 'Une durée élevée isolée peut provenir d’un ralentissement ponctuel de Google.'],
    keywords: ['performance', 'durée', 'latence', 'appel lent', 'diagnostic']
  },
  {
    id: 'depannage', category: 'Assistance', title: 'Réagir à une erreur ou une coupure réseau', minimumRole: 'CONSULTATION', view: 'dashboard',
    summary: 'Distinguer une lecture relançable d’une écriture dont le résultat doit d’abord être vérifié.',
    steps: [
      'Pour une lecture interrompue, utilise Réessayer dans le bandeau de connexion.',
      'Après une erreur sur un enregistrement, actualise d’abord le module pour vérifier si la modification a été reçue.',
      'Ne répète pas immédiatement une écriture incertaine : cela pourrait créer un doublon.',
      'Si l’erreur persiste, note le module, l’heure et le message puis consulte l’administrateur.',
      'L’administrateur peut contrôler l’intégrité, les performances et l’historique.'
    ],
    tips: ['Les lectures transitoirement interrompues sont relancées automatiquement une fois.', 'Les écritures ne sont jamais répétées automatiquement.'],
    keywords: ['erreur', 'réseau', 'connexion', 'réessayer', 'doublon', 'panne']
  }
]);

function getHelpBootstrap() {
  const access = assertAccess_('CONSULTATION');
  return measureServerOperation_('getHelpBootstrap', function () {
    const language = getInterfaceLanguage();
    const topics = HELP_TOPICS.filter(function (topic) {
      return helpRoleAllowed_(access.role, topic.minimumRole);
    }).map(function (topic) {
      return {
        id: topic.id,
        category: topic.category,
        title: topic.title,
        summary: topic.summary,
        steps: topic.steps.slice(),
        tips: topic.tips.slice(),
        keywords: topic.keywords.slice(),
        view: topic.view,
        minimumRole: topic.minimumRole
      };
    });
    const allowedIds = topics.reduce(function (map, topic) { map[topic.id] = true; return map; }, {});
    const viewTopics = Object.keys(HELP_VIEW_TOPICS).reduce(function (map, view) {
      const topicId = HELP_VIEW_TOPICS[view];
      if (allowedIds[topicId]) map[view] = topicId;
      return map;
    }, {});
    return {
      contentVersion: HELP_CONTENT_VERSION,
      generatedAt: new Date().toISOString(),
      language: language,
      languageNotice: language === 'fr' ? '' : 'Le guide détaillé est actuellement présenté en français. Les commandes de l’interface restent traduites.',
      currentRole: access.role,
      defaultTopic: allowedIds.demarrage ? 'demarrage' : (topics[0] ? topics[0].id : ''),
      viewTopics: viewTopics,
      topics: topics
    };
  }, { role: access.role });
}

function helpRoleAllowed_(actualRole, minimumRole) {
  const actual = ACCESS_ROLES[String(actualRole || '').toUpperCase()] || ACCESS_ROLES.CONSULTATION;
  const expected = ACCESS_ROLES[String(minimumRole || '').toUpperCase()] || ACCESS_ROLES.CONSULTATION;
  return actual.level >= expected.level;
}
