function getDashboardData() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const horizonDays = Number(getSetting_('HORIZON_ACTIONS_JOURS')) || 14;
  const horizonDate = new Date(now);
  horizonDate.setDate(horizonDate.getDate() + horizonDays);

  const allPlannings = listPlannings('', true);
  const plannings = allPlannings
    .filter(function (item) {
      if (!item.date || item.status === 'ANNULE') return false;
      return new Date(item.date + 'T12:00:00') >= now;
    })
    .sort(function (a, b) {
      return String(a.date).localeCompare(String(b.date)) || String(a.time).localeCompare(String(b.time));
    });

  const speakers = listSpeakers('', false);
  const congregations = listCongregations('', false);
  const activeTalks = listTalks('', false).filter(function (item) { return item.active; });
  const externalSpeakerIds = speakers.filter(function (item) { return item.type === 'EXTERIEUR'; }).map(function (item) { return item.id; });
  const hospitalities = listHospitalities('');
  const invitations = listInvitations('');
  const hospitalityMap = hospitalities.reduce(function (map, item) { map[item.planningId] = item; return map; }, {});
  const invitationMap = invitations.reduce(function (map, item) { map[item.planningId] = item; return map; }, {});

  const actions = [];
  const counters = { invitations: 0, hospitalities: 0, conflicts: 0, confirmations: 0 };

  plannings.forEach(function (item) {
    const date = new Date(item.date + 'T12:00:00');
    if (date > horizonDate) return;

    if (!item.speakerId) addDashboardAction_(actions, counters, 'danger', 'Orateur à définir', item.displayDate + ' à ' + item.time, 'planning', item.id, 'conflicts');
    if (!item.talkNumber) addDashboardAction_(actions, counters, 'danger', 'Discours à définir', item.displayDate + ' à ' + item.time, 'planning', item.id, 'conflicts');

    if (externalSpeakerIds.indexOf(item.speakerId) !== -1) {
      const invitation = invitationMap[item.id];
      if (!invitation || ['A_ENVOYER', 'REFUSEE', 'ANNULEE'].indexOf(invitation.status) !== -1) {
        addDashboardAction_(actions, counters, invitation && invitation.status === 'REFUSEE' ? 'danger' : 'warning', 'Invitation à traiter', item.speakerName + ' - ' + item.displayDate, 'invitations', item.id, 'invitations');
      } else if (['ENVOYEE', 'RELANCEE'].indexOf(invitation.status) !== -1) {
        addDashboardAction_(actions, counters, 'info', 'Confirmation d’invitation attendue', item.speakerName + ' - ' + item.displayDate, 'invitations', item.id, 'confirmations');
      }

      const hospitality = hospitalityMap[item.id];
      if (!hospitality || ['A_ATTRIBUER', 'REFUSE', 'ANNULE'].indexOf(hospitality.status) !== -1) {
        addDashboardAction_(actions, counters, hospitality && hospitality.status === 'REFUSE' ? 'danger' : 'warning', 'Hospitalité à attribuer', item.speakerName + ' - ' + item.displayDate, 'hospitality', item.id, 'hospitalities');
      } else if (hospitality.status === 'PROPOSE') {
        addDashboardAction_(actions, counters, 'info', 'Hospitalité à confirmer', item.speakerName + ' - ' + item.displayDate, 'hospitality', item.id, 'confirmations');
      }
    }
  });

  const slots = {};
  allPlannings.filter(function (item) { return item.status !== 'ANNULE' && item.date; }).forEach(function (item) {
    const key = item.date + '|' + item.time;
    slots[key] = slots[key] || [];
    slots[key].push(item);
  });
  Object.keys(slots).forEach(function (key) {
    if (slots[key].length < 2) return;
    const sample = slots[key][0];
    addDashboardAction_(actions, counters, 'danger', 'Conflit de créneau', sample.displayDate + ' à ' + sample.time + ' — ' + slots[key].length + ' programmations', 'planning', sample.id, 'conflicts');
  });

  actions.sort(function (a, b) {
    const rank = { danger: 0, warning: 1, info: 2 };
    return rank[a.level] - rank[b.level] || a.title.localeCompare(b.title, 'fr');
  });

  const nextPlanning = plannings.length ? plannings[0] : null;
  const topPriority = actions.length ? actions[0] : null;
  return {
    generatedAt: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm'),
    horizonDays: horizonDays,
    metrics: {
      upcoming: plannings.length,
      activeSpeakers: speakers.length,
      activeCongregations: congregations.length,
      activeTalks: activeTalks.length,
      actions: actions.length,
      invitations: counters.invitations,
      hospitalities: counters.hospitalities,
      conflicts: counters.conflicts,
      confirmations: counters.confirmations
    },
    nextPlanning: nextPlanning,
    topPriority: topPriority,
    upcoming: plannings.slice(0, 6),
    actions: actions.slice(0, 16),
    health: buildDashboardHealth_(getDatabase_())
  };
}

function addDashboardAction_(actions, counters, level, title, detail, target, entityId, counterKey) {
  actions.push(makeDashboardAction_(level, title, detail, target, entityId));
  if (counterKey && Object.prototype.hasOwnProperty.call(counters, counterKey)) counters[counterKey] += 1;
}

function getRelatedPlanningIds_(sheet) {
  if (!sheet || sheet.getLastRow() < 2) return [];
  return sheet.getRange(2, 2, sheet.getLastRow() - 1, 1).getValues()
    .map(function (row) { return String(row[0] || ''); })
    .filter(Boolean);
}

function makeDashboardAction_(level, title, detail, target, entityId) {
  return { level: level, title: title, detail: detail, target: target, entityId: entityId || '' };
}

function buildDashboardHealth_(ss) {
  const checks = Object.keys(APP_CONFIG.sheets).map(function (key) {
    const name = APP_CONFIG.sheets[key];
    return { name: name, ok: Boolean(ss.getSheetByName(name)) };
  });
  return { ok: checks.every(function (item) { return item.ok; }), checks: checks };
}