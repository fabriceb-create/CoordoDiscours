const AUTOMATIC_PLANNING_ENGINE_VERSION = '1.0.0';
const AUTOMATIC_PLANNING_MAX_MONTHS = 6;
const AUTOMATIC_PLANNING_MAX_ITEMS = 32;
const AUTOMATIC_PLANNING_SCENARIOS = Object.freeze({
  BALANCED: { key: 'BALANCED', label: 'Équilibré', recommendation: 0.45, talk: 0.30, rotation: 0.25 },
  TALK_RENEWAL: { key: 'TALK_RENEWAL', label: 'Renouvellement des discours', recommendation: 0.30, talk: 0.55, rotation: 0.15 },
  SPEAKER_ROTATION: { key: 'SPEAKER_ROTATION', label: 'Rotation des orateurs', recommendation: 0.30, talk: 0.15, rotation: 0.55 }
});

function getAutomaticPlanningDefaults() {
  assertEditAccess_();
  const months = Number(getSetting_('AUTO_PLAN_MOIS')) || 4;
  return {
    startDate: automaticPlanningNextStartDate_(),
    time: String(getSetting_('HEURE_REUNION_DEFAUT') || '09:30'),
    months: Math.max(1, Math.min(AUTOMATIC_PLANNING_MAX_MONTHS, months)),
    createFollowUps: String(getSetting_('AUTO_PLAN_SUIVIS') || 'OUI').toUpperCase() !== 'NON',
    maxMonths: AUTOMATIC_PLANNING_MAX_MONTHS,
    engineVersion: AUTOMATIC_PLANNING_ENGINE_VERSION
  };
}

function generateAutomaticPlanningDraft(payload) {
  assertEditAccess_();
  const request = normalizeAutomaticPlanningRequest_(payload);
  const dataset = buildAutomaticPlanningDataset_();
  const dates = buildAutomaticPlanningDates_(request.startDate, request.months);
  const sourceSignature = automaticPlanningDatasetSignature_(dataset);
  const scenarios = Object.keys(AUTOMATIC_PLANNING_SCENARIOS).map(function (key) {
    return buildAutomaticPlanningScenario_(AUTOMATIC_PLANNING_SCENARIOS[key], request, dates, dataset);
  });
  const recommendedScenario = selectRecommendedAutomaticPlanningScenario_(scenarios);
  return {
    ready: true,
    version: AUTOMATIC_PLANNING_ENGINE_VERSION,
    generatedAt: new Date().toISOString(),
    sourceSignature: sourceSignature,
    request: request,
    scenarios: scenarios,
    recommendedScenario: recommendedScenario,
    message: scenarios.some(function (scenario) { return scenario.items.length; })
      ? 'Trois scénarios ont été préparés. Vérifie les propositions avant validation.'
      : 'Aucune programmation automatique n’a pu être proposée avec les données actuelles.'
  };
}

function commitAutomaticPlanningDraft(payload, confirmWarnings) {
  assertEditAccess_();
  const request = payload || {};
  const sourceSignature = requiredText_(request.sourceSignature, 'La signature du brouillon');
  const scenarioKey = String(request.scenario || 'BALANCED').toUpperCase();
  const createFollowUps = request.createFollowUps !== false;
  const rawItems = Array.isArray(request.items) ? request.items : [];
  if (!rawItems.length) throw new Error('Sélectionne au moins une proposition à enregistrer.');
  if (rawItems.length > AUTOMATIC_PLANNING_MAX_ITEMS) throw new Error('Le brouillon contient trop de programmations pour une seule validation.');

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  const rollback = { events: null, invitations: null, hospitality: null, versions: [] };
  try {
    const dataset = buildAutomaticPlanningDataset_();
    const currentSignature = automaticPlanningDatasetSignature_(dataset);
    if (sourceSignature !== currentSignature) {
      throw new Error('AUTO_PLAN_OBSOLETE|Le planning ou un référentiel a changé depuis la génération. Génère un nouveau brouillon avant de poursuivre.');
    }

    const normalized = rawItems.map(function (item) {
      const data = normalizePlanningPayload_(Object.assign({}, item, { id: '', version: '', status: 'PROGRAMME' }));
      data.originCongregationId = String(item.originCongregationId || data.originCongregationId || '');
      data.notes = String(item.notes || ('Planification automatique - ' + automaticPlanningScenarioLabel_(scenarioKey))).trim();
      return data;
    });
    assertAutomaticPlanningUniqueSlots_(normalized);

    const virtualDataset = cloneAutomaticPlanningDataset_(dataset);
    const validations = [];
    const warnings = [];
    normalized.forEach(function (item, index) {
      const evaluation = evaluatePlanningRules_(item, virtualDataset);
      if (!evaluation.valid) {
        throw new Error('La proposition du ' + formatAutomaticPlanningDateFr_(item.date) + ' n’est plus valide : ' + ruleMessages_(evaluation.errors).join(' '));
      }
      const itemWarnings = ruleMessages_(evaluation.warnings);
      itemWarnings.forEach(function (message) {
        warnings.push(formatAutomaticPlanningDateFr_(item.date) + ' : ' + message);
      });
      validations.push({ item: item, evaluation: evaluation, index: index });
      virtualDataset.plannings.push(automaticPlanningVirtualRecord_(item, 'AUTO_COMMIT_' + index, virtualDataset));
    });

    if (warnings.length && !confirmWarnings) {
      return { saved: false, requiresConfirmation: true, warnings: warnings };
    }

    const database = getDatabase_();
    const eventSheet = database.getSheetByName(APP_CONFIG.sheets.events);
    const invitationSheet = database.getSheetByName(APP_CONFIG.sheets.invitations);
    const hospitalitySheet = database.getSheetByName(APP_CONFIG.sheets.hospitality);
    if (!eventSheet) throw new Error('La feuille PROGRAMMATIONS est introuvable.');

    const speakers = (dataset.speakers || []).reduce(function (map, speaker) {
      map[String(speaker.id)] = speaker;
      return map;
    }, {});
    const created = validations.map(function (entry) {
      const id = Utilities.getUuid();
      const item = entry.item;
      return {
        id: id,
        item: item,
        evaluation: entry.evaluation,
        speaker: speakers[String(item.speakerId)] || {},
        values: [id, new Date(item.date + 'T12:00:00'), item.time, item.speakerId, item.talkNumber, 'PROGRAMME', item.originCongregationId || '', item.notes || '']
      };
    });

    const eventStartRow = eventSheet.getLastRow() + 1;
    eventSheet.getRange(eventStartRow, 1, created.length, 8).setValues(created.map(function (item) { return item.values; }));
    rollback.events = { sheet: eventSheet, startRow: eventStartRow, count: created.length };

    const followUps = createFollowUps ? buildAutomaticPlanningFollowUps_(created) : { invitations: [], hospitalities: [] };
    if (followUps.invitations.length) {
      if (!invitationSheet) throw new Error('La feuille INVITATIONS est introuvable.');
      const startRow = invitationSheet.getLastRow() + 1;
      invitationSheet.getRange(startRow, 1, followUps.invitations.length, 6).setValues(followUps.invitations.map(function (item) { return item.values; }));
      rollback.invitations = { sheet: invitationSheet, startRow: startRow, count: followUps.invitations.length };
    }
    if (followUps.hospitalities.length) {
      if (!hospitalitySheet) throw new Error('La feuille HOSPITALITE est introuvable.');
      const startRow = hospitalitySheet.getLastRow() + 1;
      hospitalitySheet.getRange(startRow, 1, followUps.hospitalities.length, 6).setValues(followUps.hospitalities.map(function (item) { return item.values; }));
      rollback.hospitality = { sheet: hospitalitySheet, startRow: startRow, count: followUps.hospitalities.length };
    }

    created.forEach(function (record) {
      const metadata = advanceEntityVersion_('PROGRAMMATION', record.id);
      rollback.versions.push({ entity: 'PROGRAMMATION', id: record.id });
      record.version = metadata;
    });
    followUps.invitations.forEach(function (record) {
      advanceEntityVersion_('INVITATION', record.id);
      rollback.versions.push({ entity: 'INVITATION', id: record.id });
    });
    followUps.hospitalities.forEach(function (record) {
      advanceEntityVersion_('HOSPITALITE', record.id);
      rollback.versions.push({ entity: 'HOSPITALITE', id: record.id });
    });

    safeAutomaticPlanningAudit_(created, followUps, scenarioKey, sourceSignature);
    return {
      saved: true,
      scenario: scenarioKey,
      createdCount: created.length,
      invitationCount: followUps.invitations.length,
      hospitalityCount: followUps.hospitalities.length,
      warnings: warnings,
      ids: created.map(function (item) { return item.id; })
    };
  } catch (error) {
    rollbackAutomaticPlanningWrites_(rollback);
    throw error;
  } finally {
    lock.releaseLock();
  }
}

function buildAutomaticPlanningDataset_() {
  const dataset = buildPlanningRuleDataset_();
  dataset.hospitalities = listHospitalities('');
  dataset.invitations = listInvitations('');
  return dataset;
}

function buildAutomaticPlanningScenario_(scenario, request, dates, dataset) {
  const resources = cloneAutomaticPlanningDataset_(dataset);
  const items = [];
  const skipped = [];
  const usedPairs = {};

  dates.forEach(function (date, index) {
    const occupied = (resources.plannings || []).find(function (planning) {
      return planning.status !== 'ANNULE' && planning.date === date && planning.time === request.time;
    });
    if (occupied) {
      skipped.push({ date: date, displayDate: formatAutomaticPlanningDateFr_(date), reason: 'Créneau déjà occupé par ' + occupied.speakerName + ' - discours n° ' + occupied.talkNumber + '.' });
      return;
    }

    const candidate = findBestAutomaticPlanningCandidate_(date, request.time, scenario, resources, usedPairs, index);
    if (!candidate) {
      skipped.push({ date: date, displayDate: formatAutomaticPlanningDateFr_(date), reason: 'Aucune combinaison valide trouvée.' });
      return;
    }
    items.push(candidate);
    usedPairs[automaticPlanningPairKey_(candidate.speakerId, candidate.talkNumber)] = (usedPairs[automaticPlanningPairKey_(candidate.speakerId, candidate.talkNumber)] || 0) + 1;
    resources.plannings.push(automaticPlanningVirtualRecord_(candidate, 'AUTO_DRAFT_' + scenario.key + '_' + index, resources));
  });

  const summary = automaticPlanningScenarioSummary_(items, skipped);
  return {
    key: scenario.key,
    label: scenario.label,
    description: automaticPlanningScenarioDescription_(scenario.key),
    items: items,
    skipped: skipped,
    summary: summary,
    score: automaticPlanningScenarioScore_(summary)
  };
}

function findBestAutomaticPlanningCandidate_(date, time, scenario, dataset, usedPairs, sequence) {
  const talks = (dataset.talks || []).filter(function (talk) { return talk.active; }).map(function (talk) {
    return { talk: talk, score: automaticTalkFreshnessScore_(Number(talk.number), date, dataset) };
  }).sort(function (a, b) {
    return b.score - a.score || Number(a.talk.number) - Number(b.talk.number);
  }).slice(0, 24);

  let best = null;
  talks.forEach(function (talkEntry) {
    const recommendation = getSpeakerRecommendationsWithData_({ date: date, talkNumber: Number(talkEntry.talk.number) }, dataset);
    (recommendation.recommendations || []).slice(0, 8).forEach(function (speakerRecommendation) {
      const speaker = (dataset.speakers || []).find(function (item) { return item.id === speakerRecommendation.speakerId; }) || {};
      const planning = {
        id: '',
        version: '',
        date: date,
        time: time,
        speakerId: speakerRecommendation.speakerId,
        talkNumber: Number(talkEntry.talk.number),
        status: 'PROGRAMME',
        originCongregationId: speaker.type === 'EXTERIEUR' ? String(speaker.congregationId || '') : '',
        notes: 'Planification automatique - ' + scenario.label
      };
      const evaluation = evaluatePlanningRules_(planning, dataset);
      if (!evaluation.valid) return;

      const rotationScore = automaticSpeakerRotationScore_(planning.speakerId, date, dataset);
      const pairCount = usedPairs[automaticPlanningPairKey_(planning.speakerId, planning.talkNumber)] || 0;
      const logisticsPenalty = speaker.type === 'EXTERIEUR' ? automaticPlanningLogisticsPenalty_(speakerRecommendation.speakerName, dataset) : 0;
      const warningPenalty = (evaluation.warnings || []).length * 10;
      const pairPenalty = pairCount * 16;
      const score = Math.max(0, Math.min(100, Math.round(
        speakerRecommendation.score * scenario.recommendation +
        talkEntry.score * scenario.talk +
        rotationScore * scenario.rotation -
        warningPenalty - pairPenalty - logisticsPenalty
      )));
      const candidate = {
        date: planning.date,
        displayDate: formatAutomaticPlanningDateFr_(planning.date),
        time: planning.time,
        speakerId: planning.speakerId,
        speakerName: speakerRecommendation.speakerName,
        speakerType: speakerRecommendation.type,
        congregationName: speakerRecommendation.congregationName || '',
        talkNumber: planning.talkNumber,
        talkTitle: String(talkEntry.talk.title || ''),
        originCongregationId: planning.originCongregationId,
        status: 'PROGRAMME',
        notes: planning.notes,
        score: score,
        recommendationScore: speakerRecommendation.score,
        talkFreshnessScore: talkEntry.score,
        rotationScore: rotationScore,
        logisticsPenalty: logisticsPenalty,
        warnings: ruleMessages_(evaluation.warnings),
        reasons: automaticPlanningCandidateReasons_(speakerRecommendation, talkEntry.score, rotationScore, pairCount, logisticsPenalty),
        sequence: sequence
      };
      if (!best || candidate.score > best.score || (candidate.score === best.score && compareAutomaticPlanningCandidate_(candidate, best) < 0)) best = candidate;
    });
  });
  return best;
}

function automaticPlanningCandidateReasons_(recommendation, talkScore, rotationScore, pairCount, logisticsPenalty) {
  const reasons = [];
  if ((recommendation.reasons || []).length) reasons.push(recommendation.reasons[0]);
  if (talkScore >= 90) reasons.push('Discours absent depuis longtemps ou jamais programmé.');
  else if (talkScore >= 70) reasons.push('Discours suffisamment renouvelé.');
  if (rotationScore >= 85) reasons.push('Orateur prioritaire pour équilibrer la rotation.');
  if (pairCount) reasons.push('Association déjà utilisée dans ce brouillon, avec pénalité appliquée.');
  if (logisticsPenalty) reasons.push('Charge de suivi extérieur déjà élevée, avec pénalité logistique.');
  return reasons.slice(0, 3);
}

function automaticPlanningLogisticsPenalty_(speakerName, dataset) {
  const normalizedName = normalizeText_(speakerName);
  const pendingHospitalities = (dataset.hospitalities || []).filter(function (item) {
    return normalizeText_(item.speakerName) === normalizedName && ['A_ATTRIBUER', 'PROPOSE'].includes(String(item.status || '').toUpperCase());
  }).length;
  const pendingInvitations = (dataset.invitations || []).filter(function (item) {
    return normalizeText_(item.speakerName) === normalizedName && ['A_ENVOYER', 'ENVOYEE', 'RELANCEE'].includes(String(item.status || '').toUpperCase());
  }).length;
  return Math.min(12, (pendingHospitalities + pendingInvitations) * 3);
}

function automaticTalkFreshnessScore_(talkNumber, date, dataset) {
  const eventDate = new Date(date + 'T12:00:00');
  const previous = (dataset.plannings || []).filter(function (item) {
    return item.status !== 'ANNULE' && Number(item.talkNumber) === Number(talkNumber) && item.date;
  }).map(function (item) {
    return new Date(item.date + 'T12:00:00');
  }).filter(function (itemDate) {
    return !isNaN(itemDate.getTime()) && itemDate <= eventDate;
  }).sort(function (a, b) { return b - a; })[0];
  if (!previous) return 100;
  const months = Math.max(0, Math.floor((eventDate - previous) / 2629800000));
  const repetitionMonths = Math.max(1, Number(dataset.repetitionMonths) || 12);
  return Math.max(25, Math.min(100, Math.round(35 + Math.min(1, months / repetitionMonths) * 65)));
}

function automaticSpeakerRotationScore_(speakerId, date, dataset) {
  const eventDate = new Date(date + 'T12:00:00');
  const relevant = (dataset.plannings || []).filter(function (item) {
    return item.status !== 'ANNULE' && item.speakerId === speakerId && item.date;
  }).map(function (item) {
    return new Date(item.date + 'T12:00:00');
  }).filter(function (itemDate) {
    return !isNaN(itemDate.getTime()) && itemDate <= eventDate;
  }).sort(function (a, b) { return b - a; });
  if (!relevant.length) return 100;
  const months = Math.max(0, Math.floor((eventDate - relevant[0]) / 2629800000));
  const recentCount = relevant.filter(function (itemDate) { return (eventDate - itemDate) <= 365 * 86400000; }).length;
  return Math.max(20, Math.min(100, Math.round(45 + Math.min(1, months / 12) * 55 - Math.max(0, recentCount - 1) * 8)));
}

function automaticPlanningScenarioSummary_(items, skipped) {
  const totalScore = items.reduce(function (sum, item) { return sum + Number(item.score || 0); }, 0);
  return {
    proposedCount: items.length,
    skippedCount: skipped.length,
    averageScore: items.length ? Math.round(totalScore / items.length) : 0,
    warningCount: items.reduce(function (sum, item) { return sum + (item.warnings || []).length; }, 0),
    externalCount: items.filter(function (item) { return item.speakerType === 'EXTERIEUR'; }).length,
    uniqueSpeakers: Object.keys(items.reduce(function (map, item) { map[item.speakerId] = true; return map; }, {})).length,
    uniqueTalks: Object.keys(items.reduce(function (map, item) { map[String(item.talkNumber)] = true; return map; }, {})).length
  };
}

function automaticPlanningScenarioScore_(summary) {
  if (!summary.proposedCount) return 0;
  const completeness = summary.proposedCount / Math.max(1, summary.proposedCount + summary.skippedCount);
  return Math.max(0, Math.min(100, Math.round(summary.averageScore * 0.75 + completeness * 25 - summary.warningCount * 2)));
}

function selectRecommendedAutomaticPlanningScenario_(scenarios) {
  const sorted = (scenarios || []).slice().sort(function (a, b) {
    return b.score - a.score || b.summary.proposedCount - a.summary.proposedCount || a.summary.warningCount - b.summary.warningCount;
  });
  return sorted.length ? sorted[0].key : '';
}

function buildAutomaticPlanningDates_(startDate, months) {
  const start = new Date(startDate + 'T12:00:00');
  if (isNaN(start.getTime())) throw new Error('La première date est invalide.');
  const end = new Date(start);
  end.setMonth(end.getMonth() + months);
  const dates = [];
  for (let cursor = new Date(start); cursor < end && dates.length < AUTOMATIC_PLANNING_MAX_ITEMS; cursor.setDate(cursor.getDate() + 7)) {
    dates.push(Utilities.formatDate(cursor, Session.getScriptTimeZone(), 'yyyy-MM-dd'));
  }
  return dates;
}

function normalizeAutomaticPlanningRequest_(payload) {
  const request = payload || {};
  const startDate = String(request.startDate || '').trim();
  const time = String(request.time || '').trim();
  const months = Number(request.months || 4);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || isNaN(new Date(startDate + 'T12:00:00').getTime())) throw new Error('La première date est invalide.');
  if (!/^\d{2}:\d{2}$/.test(time)) throw new Error('L’heure de réunion est invalide.');
  if (!Number.isInteger(months) || months < 1 || months > AUTOMATIC_PLANNING_MAX_MONTHS) throw new Error('La période doit être comprise entre 1 et ' + AUTOMATIC_PLANNING_MAX_MONTHS + ' mois.');
  return { startDate: startDate, time: time, months: months, createFollowUps: request.createFollowUps !== false };
}

function automaticPlanningDatasetSignature_(dataset) {
  const resources = dataset || {};
  const canonical = JSON.stringify({
    plannings: (resources.plannings || []).map(function (item) {
      return [item.id, item.date, item.time, item.speakerId, Number(item.talkNumber) || '', item.status, item.version || ''];
    }).sort(automaticPlanningArrayCompare_),
    speakers: (resources.speakers || []).map(function (item) {
      return [item.id, item.active !== false, item.type, item.congregationId || '', item.version || ''];
    }).sort(automaticPlanningArrayCompare_),
    talks: (resources.talks || []).map(function (item) {
      return [Number(item.number), item.active !== false, item.version || ''];
    }).sort(automaticPlanningArrayCompare_),
    congregations: (resources.congregations || []).map(function (item) {
      return [item.id, item.active !== false, item.version || ''];
    }).sort(automaticPlanningArrayCompare_),
    speakerTalks: Object.keys(resources.speakerTalks || {}).sort().map(function (speakerId) {
      return [speakerId, (resources.speakerTalks[speakerId] || []).slice().sort(function (a, b) { return a - b; })];
    }),
    repetitionMonths: Number(resources.repetitionMonths) || 12,
    recommendationWeights: resources.recommendationWeights || getRecommendationWeights_(),
    hospitalities: (resources.hospitalities || []).map(function (item) { return [item.id, item.planningId, item.status, item.version || '']; }).sort(automaticPlanningArrayCompare_),
    invitations: (resources.invitations || []).map(function (item) { return [item.id, item.planningId, item.status, item.version || '']; }).sort(automaticPlanningArrayCompare_)
  });
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, canonical, Utilities.Charset.UTF_8);
  return digest.map(function (byte) { return ('0' + ((byte + 256) % 256).toString(16)).slice(-2); }).join('');
}

function cloneAutomaticPlanningDataset_(dataset) {
  return {
    speakers: (dataset.speakers || []).slice(),
    talks: (dataset.talks || []).slice(),
    congregations: (dataset.congregations || []).slice(),
    plannings: (dataset.plannings || []).slice(),
    speakerTalks: dataset.speakerTalks || {},
    repetitionMonths: dataset.repetitionMonths,
    recommendationWeights: dataset.recommendationWeights || getRecommendationWeights_(),
    hospitalities: (dataset.hospitalities || []).slice(),
    invitations: (dataset.invitations || []).slice()
  };
}

function automaticPlanningVirtualRecord_(item, id, dataset) {
  const speaker = (dataset.speakers || []).find(function (entry) { return entry.id === item.speakerId; }) || {};
  const talk = (dataset.talks || []).find(function (entry) { return Number(entry.number) === Number(item.talkNumber); }) || {};
  return {
    id: id,
    date: item.date,
    displayDate: formatAutomaticPlanningDateFr_(item.date),
    time: item.time,
    speakerId: item.speakerId,
    speakerName: item.speakerName || speaker.fullName || speaker.lastName || '',
    talkNumber: Number(item.talkNumber),
    talkTitle: item.talkTitle || talk.title || '',
    status: 'PROGRAMME',
    originCongregationId: item.originCongregationId || '',
    notes: item.notes || ''
  };
}

function buildAutomaticPlanningFollowUps_(created) {
  const invitations = [];
  const hospitalities = [];
  created.forEach(function (record) {
    if (!record.speaker || record.speaker.type !== 'EXTERIEUR') return;
    const invitationId = Utilities.getUuid();
    const hospitalityId = Utilities.getUuid();
    const note = 'Créé automatiquement pour la programmation du ' + formatAutomaticPlanningDateFr_(record.item.date) + '.';
    invitations.push({ id: invitationId, planningId: record.id, values: [invitationId, record.id, '', 'A_ENVOYER', String(record.speaker.email || ''), note] });
    hospitalities.push({ id: hospitalityId, planningId: record.id, values: [hospitalityId, record.id, '', 'A_ATTRIBUER', '', note] });
  });
  return { invitations: invitations, hospitalities: hospitalities };
}

function assertAutomaticPlanningUniqueSlots_(items) {
  const slots = {};
  items.forEach(function (item) {
    const key = item.date + '|' + item.time;
    if (slots[key]) throw new Error('Le brouillon contient deux propositions pour le même créneau : ' + formatAutomaticPlanningDateFr_(item.date) + ' à ' + item.time + '.');
    slots[key] = true;
  });
}

function rollbackAutomaticPlanningWrites_(rollback) {
  try { deleteAutomaticPlanningRows_(rollback.hospitality); } catch (error) { console.warn(error.message); }
  try { deleteAutomaticPlanningRows_(rollback.invitations); } catch (error) { console.warn(error.message); }
  try { deleteAutomaticPlanningRows_(rollback.events); } catch (error) { console.warn(error.message); }
  (rollback.versions || []).forEach(function (item) {
    try { removeEntityVersion_(item.entity, item.id); } catch (error) { console.warn(error.message); }
  });
}

function deleteAutomaticPlanningRows_(entry) {
  if (!entry || !entry.sheet || !entry.count) return;
  const lastRow = entry.sheet.getLastRow();
  if (entry.startRow <= lastRow) entry.sheet.deleteRows(entry.startRow, Math.min(entry.count, lastRow - entry.startRow + 1));
}

function safeAutomaticPlanningAudit_(created, followUps, scenarioKey, sourceSignature) {
  try {
    created.forEach(function (record) {
      const after = Object.assign({ id: record.id }, record.item, record.version || {});
      logAction_('CREATION_AUTOMATIQUE', 'PROGRAMMATION', record.id, buildAuditDetails_({}, after, {
        scenario: scenarioKey,
        sourceSignature: sourceSignature,
        rules: record.evaluation.rules || []
      }));
    });
    logAction_('PLANIFICATION_AUTOMATIQUE', 'PROGRAMMATION', scenarioKey, {
      createdCount: created.length,
      invitationCount: followUps.invitations.length,
      hospitalityCount: followUps.hospitalities.length,
      sourceSignature: sourceSignature,
      ids: created.map(function (item) { return item.id; })
    });
  } catch (error) {
    console.warn('Impossible de journaliser complètement la planification automatique : ' + error.message);
  }
}

function automaticPlanningNextStartDate_() {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + 7);
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function automaticPlanningScenarioLabel_(key) {
  return AUTOMATIC_PLANNING_SCENARIOS[key] ? AUTOMATIC_PLANNING_SCENARIOS[key].label : AUTOMATIC_PLANNING_SCENARIOS.BALANCED.label;
}

function automaticPlanningScenarioDescription_(key) {
  if (key === 'TALK_RENEWAL') return 'Privilégie les discours jamais présentés ou absents depuis longtemps.';
  if (key === 'SPEAKER_ROTATION') return 'Privilégie les orateurs les moins sollicités et les passages les plus anciens.';
  return 'Recherche le meilleur compromis entre qualité, renouvellement, rotation et logistique.';
}

function automaticPlanningPairKey_(speakerId, talkNumber) {
  return String(speakerId) + '|' + String(talkNumber);
}

function compareAutomaticPlanningCandidate_(a, b) {
  return String(a.speakerName || '').localeCompare(String(b.speakerName || ''), 'fr') || Number(a.talkNumber) - Number(b.talkNumber);
}

function automaticPlanningArrayCompare_(a, b) {
  return JSON.stringify(a).localeCompare(JSON.stringify(b));
}

function formatAutomaticPlanningDateFr_(isoDate) {
  const match = String(isoDate || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? match[3] + '/' + match[2] + '/' + match[1] : String(isoDate || '');
}
