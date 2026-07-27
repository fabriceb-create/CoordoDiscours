const RULE_SEVERITY = Object.freeze({
  INFO: 'INFO',
  WARNING: 'WARNING',
  ERROR: 'ERROR'
});

function evaluatePlanningRules_(planning, dataset) {
  const context = buildPlanningRuleContext_(planning, dataset);
  const rules = [
    rulePlanningSpeakerActive_,
    rulePlanningTalkActive_,
    rulePlanningExternalSpeakerTalk_,
    rulePlanningCongregationActive_,
    rulePlanningSlotAvailable_,
    rulePlanningSpeakerSameDate_,
    rulePlanningTalkRepetition_
  ];
  const results = rules.map(function (rule) { return rule(context); }).filter(Boolean);
  const errors = results.filter(function (item) { return item.severity === RULE_SEVERITY.ERROR; });
  const warnings = results.filter(function (item) { return item.severity === RULE_SEVERITY.WARNING; });
  const infos = results.filter(function (item) { return item.severity === RULE_SEVERITY.INFO; });
  return {
    valid: errors.length === 0,
    hasErrors: errors.length > 0,
    hasWarnings: warnings.length > 0,
    errors: errors,
    warnings: warnings,
    infos: infos,
    rules: results,
    data: planning
  };
}

function buildPlanningRuleDataset_() {
  return {
    speakers: listSpeakers('', true),
    talks: listTalks('', true),
    congregations: listCongregations('', true),
    plannings: listPlannings('', true),
    speakerTalks: getSpeakerTalkNumbersMap_(),
    repetitionMonths: Number(getSetting_('ALERTE_REPETITION_MOIS')) || 12
  };
}

function buildPlanningRuleContext_(planning, dataset) {
  const resources = dataset || buildPlanningRuleDataset_();
  const speakers = resources.speakers || [];
  const talks = resources.talks || [];
  const congregations = resources.congregations || [];
  const existing = (resources.plannings || []).filter(function (item) {
    return item.id !== planning.id && item.status !== 'ANNULE';
  });
  return {
    planning: planning,
    speaker: speakers.find(function (item) { return item.id === planning.speakerId; }) || null,
    talk: talks.find(function (item) { return Number(item.number) === Number(planning.talkNumber); }) || null,
    congregation: planning.originCongregationId ? congregations.find(function (item) { return item.id === planning.originCongregationId; }) || null : null,
    existing: existing,
    speakerTalks: resources.speakerTalks || getSpeakerTalkNumbersMap_(),
    repetitionMonths: Number(resources.repetitionMonths) || 12
  };
}

function planningRuleResult_(id, severity, message, details) {
  return { id: id, severity: severity, message: message, details: details || {} };
}

function rulePlanningSpeakerActive_(context) {
  if (context.speaker && context.speaker.active) return null;
  return planningRuleResult_('PLAN_001', RULE_SEVERITY.ERROR, 'L’orateur sélectionné est introuvable ou archivé.', { speakerId: context.planning.speakerId });
}

function rulePlanningTalkActive_(context) {
  if (context.talk && context.talk.active) return null;
  return planningRuleResult_('PLAN_002', RULE_SEVERITY.ERROR, 'Le discours sélectionné est introuvable ou inactif.', { talkNumber: context.planning.talkNumber });
}

function rulePlanningExternalSpeakerTalk_(context) {
  if (!context.speaker || context.speaker.type !== 'EXTERIEUR') return null;
  const declared = context.speakerTalks[String(context.speaker.id)] || [];
  if (declared.includes(Number(context.planning.talkNumber))) return null;
  return planningRuleResult_('PLAN_003', RULE_SEVERITY.ERROR, 'Cet orateur extérieur n’a pas ce discours dans sa liste déclarée.', { speakerId: context.speaker.id, talkNumber: context.planning.talkNumber });
}

function rulePlanningCongregationActive_(context) {
  if (!context.planning.originCongregationId) return null;
  if (context.congregation && context.congregation.active) return null;
  return planningRuleResult_('PLAN_004', RULE_SEVERITY.ERROR, 'L’assemblée d’origine sélectionnée est introuvable ou archivée.', { congregationId: context.planning.originCongregationId });
}

function rulePlanningSlotAvailable_(context) {
  const conflict = context.existing.find(function (item) {
    return item.date === context.planning.date && item.time === context.planning.time;
  });
  if (!conflict) return null;
  return planningRuleResult_('PLAN_005', RULE_SEVERITY.ERROR, 'Ce créneau est déjà occupé par ' + conflict.speakerName + ' - discours n° ' + conflict.talkNumber + '.', { planningId: conflict.id, date: conflict.date, time: conflict.time });
}

function rulePlanningSpeakerSameDate_(context) {
  const conflict = context.existing.find(function (item) {
    return item.date === context.planning.date && item.speakerId === context.planning.speakerId;
  });
  if (!conflict) return null;
  return planningRuleResult_('PLAN_006', RULE_SEVERITY.WARNING, 'Cet orateur est déjà programmé à cette date.', { planningId: conflict.id, speakerId: context.planning.speakerId, date: context.planning.date });
}

function rulePlanningTalkRepetition_(context) {
  const eventDate = new Date(context.planning.date + 'T12:00:00');
  const threshold = new Date(eventDate);
  threshold.setMonth(threshold.getMonth() - context.repetitionMonths);
  const repeated = context.existing.filter(function (item) {
    return Number(item.talkNumber) === Number(context.planning.talkNumber) && item.date;
  }).map(function (item) {
    return { item: item, date: new Date(item.date + 'T12:00:00') };
  }).filter(function (entry) {
    return entry.date <= eventDate && entry.date >= threshold;
  }).sort(function (a, b) { return b.date - a.date; })[0];
  if (!repeated) return null;
  return planningRuleResult_('PLAN_007', RULE_SEVERITY.WARNING, 'Ce discours a déjà été programmé le ' + repeated.item.displayDate + ' avec ' + repeated.item.speakerName + '.', { planningId: repeated.item.id, previousDate: repeated.item.date, talkNumber: context.planning.talkNumber });
}

function ruleMessages_(items) {
  return (items || []).map(function (item) { return item.message; });
}
