function getDataIntegrityReport() {
  assertAccess_('ADMIN');
  return getDataIntegrityReport_();
}

function getDataIntegrityReport_() {
  const ss = getDatabase_();
  const issues = [];
  const pushIssue = function (severity, code, message, details) {
    issues.push({ severity: severity, code: code, message: message, details: details || {} });
  };

  const speakers = listSpeakers('', true);
  const congregations = listCongregations('', true);
  const talks = listTalks('', true);
  const plannings = listPlannings('', true);
  const hospitalities = listHospitalities('');
  const invitations = listInvitations('');

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
      issues: issues.length
    },
    issues: issues
  };

  logAction_('CONTROLE_INTEGRITE', 'APPLICATION', APP_CONFIG.version, { ok: result.ok, issues: issues.length });
  return result;
}
