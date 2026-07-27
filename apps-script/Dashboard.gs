function getDashboardData() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const plannings = listPlannings('', false)
    .filter(function (item) {
      if (!item.date || item.status === 'ANNULE') return false;
      const date = new Date(item.date + 'T12:00:00');
      return date >= now;
    })
    .sort(function (a, b) {
      return String(a.date).localeCompare(String(b.date)) || String(a.time).localeCompare(String(b.time));
    });

  const speakers = listSpeakers('', false);
  const congregations = listCongregations('', false);
  const activeTalks = listTalks('', false).filter(function (item) { return item.active; });
  const externalSpeakerIds = speakers
    .filter(function (item) { return item.type === 'EXTERIEUR'; })
    .map(function (item) { return item.id; });

  const ss = getDatabase_();
  const hospitalitySheet = ss.getSheetByName(APP_CONFIG.sheets.hospitality);
  const invitationSheet = ss.getSheetByName(APP_CONFIG.sheets.invitations);
  const hospitalityIds = getRelatedPlanningIds_(hospitalitySheet);
  const invitationIds = getRelatedPlanningIds_(invitationSheet);

  const next14Days = new Date(now);
  next14Days.setDate(next14Days.getDate() + 14);

  const actions = [];
  plannings.forEach(function (item) {
    const date = new Date(item.date + 'T12:00:00');
    if (date > next14Days) return;

    if (!item.speakerId) {
      actions.push(makeDashboardAction_('danger', 'Orateur à définir', item.displayDate + ' à ' + item.time, 'planning', item.id));
    }
    if (!item.talkNumber) {
      actions.push(makeDashboardAction_('danger', 'Discours à définir', item.displayDate + ' à ' + item.time, 'planning', item.id));
    }
    if (externalSpeakerIds.indexOf(item.speakerId) !== -1) {
      if (invitationIds.indexOf(item.id) === -1) {
        actions.push(makeDashboardAction_('warning', 'Invitation à préparer', item.speakerName + ' - ' + item.displayDate, 'planning', item.id));
      }
      if (hospitalityIds.indexOf(item.id) === -1) {
        actions.push(makeDashboardAction_('warning', 'Hospitalité à attribuer', item.speakerName + ' - ' + item.displayDate, 'planning', item.id));
      }
    }
  });

  const nextPlanning = plannings.length ? plannings[0] : null;
  return {
    generatedAt: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm'),
    metrics: {
      upcoming: plannings.length,
      activeSpeakers: speakers.length,
      activeCongregations: congregations.length,
      activeTalks: activeTalks.length,
      actions: actions.length
    },
    nextPlanning: nextPlanning,
    upcoming: plannings.slice(0, 6),
    actions: actions.slice(0, 12),
    health: buildDashboardHealth_(ss)
  };
}

function getRelatedPlanningIds_(sheet) {
  if (!sheet || sheet.getLastRow() < 2) return [];
  return sheet.getRange(2, 2, sheet.getLastRow() - 1, 1).getValues()
    .map(function (row) { return String(row[0] || ''); })
    .filter(Boolean);
}

function makeDashboardAction_(level, title, detail, target, entityId) {
  return {
    level: level,
    title: title,
    detail: detail,
    target: target,
    entityId: entityId || ''
  };
}

function buildDashboardHealth_(ss) {
  const checks = Object.keys(APP_CONFIG.sheets).map(function (key) {
    const name = APP_CONFIG.sheets[key];
    return { name: name, ok: Boolean(ss.getSheetByName(name)) };
  });
  return {
    ok: checks.every(function (item) { return item.ok; }),
    checks: checks
  };
}
