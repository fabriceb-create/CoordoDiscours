function getDataIntegrityReport() {
  assertAccess_('ADMIN');
  return measureServerOperation_('getDataIntegrityReport', function () {
    return getDataIntegrityReport_();
  });
}

function getDataIntegrityReport_(options) {
  options = options || {};
  const ss = getDatabase_();
  const issues = [];
  const pushIssue = function (severity, code, message, details) {
    issues.push({ severity: severity, code: code, message: message, details: details || {} });
  };

  const congregations = listCongregations('', true);
  const speakers = listSpeakersWithCongregations_('', true, congregations);
  const talks = listTalks('', true);
  const plannings = listPlanningsWithResources_('', true, speakers, talks);
  const hospitalities = listHospitalitiesWithPlannings_('', plannings);
  const invitations = listInvitationsWithPlannings_('', plannings);
  const availability = listSpeakerAvailability_(true);
  const releaseActions = typeof listReleaseCorrectiveActions === 'function' ? listReleaseCorrectiveActions({ limit: 1000 }) : [];
  const releaseDevices = typeof listReleaseDeviceAcceptanceIntegrityEntries_ === 'function' ? listReleaseDeviceAcceptanceIntegrityEntries_() : [];
  const releaseDecisions = typeof listReleaseDecisions === 'function' ? listReleaseDecisions(100) : [];

  const speakerIds = new Set(speakers.map(item => String(item.id)));
  const congregationIds = new Set(congregations.map(item => String(item.id)));
  const talkNumbers = new Set(talks.map(item => Number(item.number)));
  const planningIds = new Set(plannings.map(item => String(item.id)));

  speakers.forEach(function (speaker) {
    if (speaker.congregationId && !congregationIds.has(String(speaker.congregationId))) {
      pushIssue('ERREUR', 'ORATEUR_ASSEMBLEE_INTRouvable', 'Un orateur référence une assemblée inexistante.', {
        speakerId: speaker.id,
        speakerName: speaker.fullName,
        congregationId: speaker.congregationId
      });
    }
  });

  plannings.forEach(function (planning) {
    if (!speakerIds.has(String(planning.speakerId))) {
      pushIssue('ERREUR', 'PROGRAMMATION_ORATEUR_INTRouvable', 'Une programmation référence un orateur inexistant.', { planningId: planning.id, speakerId: planning.speakerId });
    }
    if (!talkNumbers.has(Number(planning.talkNumber))) {
      pushIssue('ERREUR', 'PROGRAMMATION_DISCOURS_INTRouvable', 'Une programmation référence un discours inexistant.', { planningId: planning.id, talkNumber: planning.talkNumber });
    }
  });

  const slots = {};
  plannings.filter(item => item.status !== 'ANNULE').forEach(function (planning) {
    const key = String(planning.date) + '|' + String(planning.time);
    slots[key] = slots[key] || [];
    slots[key].push(planning.id);
  });
  Object.keys(slots).forEach(function (key) {
    if (slots[key].length > 1) {
      pushIssue('ERREUR', 'CRENEAU_DUPLIQUE', 'Plusieurs programmations actives utilisent le même créneau.', { slot: key, planningIds: slots[key] });
    }
  });

  hospitalities.forEach(function (item) {
    if (!planningIds.has(String(item.planningId))) {
      pushIssue('ERREUR', 'HOSPITALITE_PROGRAMMATION_INTRouvable', 'Une hospitalité référence une programmation inexistante.', { hospitalityId: item.id, planningId: item.planningId });
    }
  });

  invitations.forEach(function (item) {
    if (!planningIds.has(String(item.planningId))) {
      pushIssue('ERREUR', 'INVITATION_PROGRAMMATION_INTRouvable', 'Une invitation référence une programmation inexistante.', { invitationId: item.id, planningId: item.planningId });
    }
  });

  validateSpeakerAvailabilityIntegrity_(availability, speakerIds, pushIssue);
  validateReleaseGovernanceIntegrity_(releaseActions, releaseDevices, releaseDecisions, pushIssue);

  APP_CONFIG.inactiveTalks.forEach(function (number) {
    const talk = talks.find(item => Number(item.number) === Number(number));
    if (!talk || talk.active) {
      pushIssue('ERREUR', 'DISCOURS_OFFICIEL_INACTIF', 'Un discours officiellement inactif est absent ou actif.', { talkNumber: number });
    }
  });

  const result = {
    ok: !issues.some(issue => issue.severity === 'ERREUR'),
    generatedAt: new Date().toISOString(),
    counts: {
      speakers: speakers.length,
      congregations: congregations.length,
      talks: talks.length,
      plannings: plannings.length,
      hospitalities: hospitalities.length,
      invitations: invitations.length,
      speakerAvailability: availability.length,
      releaseActions: releaseActions.length,
      releaseDeviceChecks: releaseDevices.length,
      releaseDecisions: releaseDecisions.length,
      issues: issues.length
    },
    issues: issues
  };

  if (!options.silent) logAction_('CONTROLE_INTEGRITE', 'APPLICATION', APP_CONFIG.version, { ok: result.ok, issues: issues.length });
  return result;
}

function validateSpeakerAvailabilityIntegrity_(entries, speakerIds, pushIssue) {
  const duplicates = {};
  const bySpeaker = {};
  (entries || []).forEach(function (entry) {
    if (!speakerIds.has(String(entry.speakerId))) {
      pushIssue('ERREUR', 'DISPONIBILITE_ORATEUR_INTROUVABLE', 'Une période de disponibilité référence un orateur inexistant.', { availabilityId: entry.id, speakerId: entry.speakerId });
    }
    if (!SPEAKER_AVAILABILITY_TYPES[entry.type]) {
      pushIssue('ERREUR', 'DISPONIBILITE_TYPE_INVALIDE', 'Une période utilise un type de disponibilité inconnu.', { availabilityId: entry.id, type: entry.type });
    }
    if (!entry.startDate || !entry.endDate || entry.endDate < entry.startDate) {
      pushIssue('ERREUR', 'DISPONIBILITE_DATES_INVALIDES', 'Une période de disponibilité contient des dates invalides.', { availabilityId: entry.id, startDate: entry.startDate, endDate: entry.endDate });
    }
    const duplicateKey = [entry.speakerId, entry.type, entry.startDate, entry.endDate].join('|');
    if (duplicates[duplicateKey]) {
      pushIssue('ERREUR', 'DISPONIBILITE_DUPLIQUEE', 'Deux périodes de disponibilité identiques sont enregistrées.', { availabilityIds: [duplicates[duplicateKey], entry.id], key: duplicateKey });
    } else {
      duplicates[duplicateKey] = entry.id;
    }
    if (!bySpeaker[entry.speakerId]) bySpeaker[entry.speakerId] = [];
    if (entry.active !== false) bySpeaker[entry.speakerId].push(entry);
  });

  Object.keys(bySpeaker).forEach(function (speakerId) {
    const items = bySpeaker[speakerId];
    items.forEach(function (entry, index) {
      if (entry.type !== 'INDISPONIBLE') return;
      items.slice(index + 1).forEach(function (other) {
        if (other.type === 'INDISPONIBLE') return;
        const overlap = entry.startDate <= other.endDate && entry.endDate >= other.startDate;
        if (overlap) {
          pushIssue('AVERTISSEMENT', 'DISPONIBILITE_CONTRADICTOIRE', 'Une période indisponible chevauche une autre indication de disponibilité.', {
            speakerId: speakerId,
            availabilityIds: [entry.id, other.id],
            types: [entry.type, other.type]
          });
        }
      });
    });
  });
}


function validateReleaseGovernanceIntegrity_(actions, devices, decisions, pushIssue) {
  const actionIds = {};
  (actions || []).forEach(function (item) {
    if (!item.id || actionIds[item.id]) {
      pushIssue('ERREUR', 'ACTION_CORRECTIVE_ID_INVALIDE', 'Une action corrective contient un identifiant absent ou dupliqué.', { actionId: item.id || '' });
    }
    actionIds[item.id] = true;
    if (!RELEASE_ACTION_SOURCES[item.source]) {
      pushIssue('ERREUR', 'ACTION_CORRECTIVE_SOURCE_INVALIDE', 'Une action corrective utilise une source inconnue.', { actionId: item.id, source: item.source });
    }
    if (!RELEASE_ACTION_STATUSES[item.status]) {
      pushIssue('ERREUR', 'ACTION_CORRECTIVE_STATUT_INVALIDE', 'Une action corrective utilise un statut inconnu.', { actionId: item.id, status: item.status });
    }
    if (!RELEASE_ACTION_PRIORITIES[item.priority]) {
      pushIssue('ERREUR', 'ACTION_CORRECTIVE_PRIORITE_INVALIDE', 'Une action corrective utilise une priorité inconnue.', { actionId: item.id, priority: item.priority });
    }
    if (!String(item.title || '').trim() || !String(item.description || '').trim()) {
      pushIssue('ERREUR', 'ACTION_CORRECTIVE_CONTENU_INCOMPLET', 'Une action corrective ne contient pas de titre ou de description.', { actionId: item.id });
    }
  });

  const deviceKeys = {};
  const validTestIds = new Set((RELEASE_DEVICE_TESTS || []).map(function (item) { return item.id; }));
  (devices || []).forEach(function (item) {
    const key = [item.device, item.testId].join('|');
    if (!item.id) {
      pushIssue('ERREUR', 'RECETTE_MULTI_ECRANS_ID_INVALIDE', 'Un contrôle multi-écrans ne contient pas d’identifiant.', { key: key });
    }
    if (deviceKeys[key]) {
      pushIssue('ERREUR', 'RECETTE_MULTI_ECRANS_DOUBLON', 'Un contrôle multi-écrans est dupliqué.', { key: key });
    }
    deviceKeys[key] = true;
    if (!RELEASE_DEVICE_TYPES[item.device] || !validTestIds.has(item.testId) || !RELEASE_DEVICE_STATUSES[item.status]) {
      pushIssue('ERREUR', 'RECETTE_MULTI_ECRANS_VALEUR_INVALIDE', 'Un contrôle multi-écrans contient un appareil, un scénario ou un statut inconnu.', { key: key, status: item.status });
    }
  });
  const expectedDeviceChecks = Object.keys(RELEASE_DEVICE_TYPES).length * RELEASE_DEVICE_TESTS.length;
  if ((devices || []).length && Object.keys(deviceKeys).length !== expectedDeviceChecks) {
    pushIssue('AVERTISSEMENT', 'RECETTE_MULTI_ECRANS_INCOMPLETE', 'La recette multi-écrans enregistrée ne contient pas tous les scénarios attendus.', { expected: expectedDeviceChecks, actual: Object.keys(deviceKeys).length });
  }

  const decisionIds = {};
  (decisions || []).forEach(function (item) {
    if (!item.id || decisionIds[item.id]) {
      pushIssue('ERREUR', 'MISE_PRODUCTION_ID_INVALIDE', 'Une décision de mise en production contient un identifiant absent ou dupliqué.', { decisionId: item.id || '' });
    }
    decisionIds[item.id] = true;
    if (!RELEASE_DECISION_TYPES[item.decision]) {
      pushIssue('ERREUR', 'MISE_PRODUCTION_DECISION_INVALIDE', 'Une décision de mise en production utilise un type inconnu.', { decisionId: item.id, decision: item.decision });
    }
    if (!RELEASE_ENVIRONMENTS[item.environment]) {
      pushIssue('ERREUR', 'MISE_PRODUCTION_ENVIRONNEMENT_INVALIDE', 'Une décision de mise en production utilise un environnement inconnu.', { decisionId: item.id, environment: item.environment });
    }
    if (!item.reportFingerprint || !item.manifestSha256) {
      pushIssue('AVERTISSEMENT', 'MISE_PRODUCTION_PREUVE_INCOMPLETE', 'Une décision de mise en production ne contient pas toutes ses empreintes de contrôle.', { decisionId: item.id });
    }
  });
}
