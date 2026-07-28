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
