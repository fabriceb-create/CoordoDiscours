const CONFLICT_RESOLUTION_ENGINE_VERSION = '1.0.0';
const CONFLICT_RESOLUTION_TYPES = Object.freeze({
  SPEAKER: 'SPEAKER',
  DATE: 'DATE',
  TALK: 'TALK',
  CONGREGATION: 'CONGREGATION',
  COMBINATION: 'COMBINATION'
});

function getPlanningConflictResolutions(payload) {
  assertEditAccess_();
  const planning = normalizePlanningPayload_(payload);
  const dataset = buildPlanningRuleDataset_();
  const evaluation = evaluatePlanningRules_(planning, dataset);
  return buildPlanningConflictResolution_(planning, evaluation, dataset);
}

function buildPlanningConflictResolution_(planning, evaluation, dataset) {
  const resources = dataset || buildPlanningRuleDataset_();
  const currentEvaluation = evaluation || evaluatePlanningRules_(planning, resources);
  const errors = currentEvaluation.errors || [];
  if (!errors.length) {
    return {
      ready: true,
      blocked: false,
      version: CONFLICT_RESOLUTION_ENGINE_VERSION,
      errors: [],
      rules: currentEvaluation.rules || [],
      suggestions: [],
      counts: {},
      message: 'La programmation est valide. Aucune correction n’est nécessaire.'
    };
  }

  const groups = buildConflictOptionGroups_(planning, resources);
  let candidates = [];

  groups.forEach(function (group) {
    group.options.forEach(function (option) {
      const suggestion = evaluateConflictSuggestion_(planning, [{ group: group, option: option }], currentEvaluation, resources);
      if (suggestion) candidates.push(suggestion);
    });
  });

  if (errors.length > 1 || candidates.length < 6) {
    candidates = candidates.concat(buildConflictCombinationSuggestions_(planning, groups, currentEvaluation, resources, 2));
  }
  if (candidates.length < 4 && errors.length > 2) {
    candidates = candidates.concat(buildConflictCombinationSuggestions_(planning, groups, currentEvaluation, resources, 3));
  }
  if (candidates.length < 2 && errors.length > 3) {
    candidates = candidates.concat(buildConflictCombinationSuggestions_(planning, groups, currentEvaluation, resources, 4));
  }

  candidates = deduplicateConflictSuggestions_(candidates).sort(compareConflictSuggestions_);
  const suggestions = selectDiverseConflictSuggestions_(candidates, 12);
  const counts = suggestions.reduce(function (map, item) {
    map[item.type] = (map[item.type] || 0) + 1;
    return map;
  }, {});

  return {
    ready: true,
    blocked: true,
    version: CONFLICT_RESOLUTION_ENGINE_VERSION,
    errors: ruleMessages_(errors),
    errorRules: errors.map(function (item) { return item.id; }),
    rules: currentEvaluation.rules || [],
    suggestions: suggestions,
    counts: counts,
    message: suggestions.length
      ? suggestions.length + ' solution(s) valide(s) classée(s) automatiquement.'
      : 'Aucune correction automatique simple n’a été trouvée. Modifie plusieurs champs puis relance l’analyse.'
  };
}

function buildConflictOptionGroups_(planning, dataset) {
  return [
    {
      key: 'speakerId',
      type: CONFLICT_RESOLUTION_TYPES.SPEAKER,
      options: conflictSpeakerOptions_(planning, dataset)
    },
    {
      key: 'date',
      type: CONFLICT_RESOLUTION_TYPES.DATE,
      options: conflictDateOptions_(planning)
    },
    {
      key: 'talkNumber',
      type: CONFLICT_RESOLUTION_TYPES.TALK,
      options: conflictTalkOptions_(planning, dataset)
    },
    {
      key: 'originCongregationId',
      type: CONFLICT_RESOLUTION_TYPES.CONGREGATION,
      options: conflictCongregationOptions_(planning, dataset)
    }
  ];
}

function conflictSpeakerOptions_(planning, dataset) {
  const result = getSpeakerRecommendationsWithData_(planning, dataset);
  const options = (result.recommendations || []).filter(function (item) {
    return item.speakerId !== planning.speakerId;
  }).map(function (item) {
    return {
      value: item.speakerId,
      score: item.score,
      display: item.speakerName,
      secondary: item.congregationName || '',
      reason: (item.reasons || [])[0] || 'Orateur actif compatible avec la programmation.'
    };
  });
  if (options.length) return options.slice(0, 8);

  const activePlannings = (dataset.plannings || []).filter(function (item) { return item.status !== 'ANNULE'; });
  const counts = activePlannings.reduce(function (map, item) {
    map[item.speakerId] = (map[item.speakerId] || 0) + 1;
    return map;
  }, {});
  return (dataset.speakers || []).filter(function (speaker) {
    return speaker.active && speaker.id !== planning.speakerId;
  }).map(function (speaker) {
    const count = counts[speaker.id] || 0;
    return {
      value: speaker.id,
      score: Math.max(55, 92 - count * 6 + (speaker.type === 'LOCAL' ? 4 : 0)),
      display: speaker.fullName || speaker.lastName,
      secondary: speaker.congregationName || '',
      reason: count ? 'Orateur actif, déjà programmé ' + count + ' fois.' : 'Orateur actif encore peu sollicité.'
    };
  }).sort(function (a, b) {
    return b.score - a.score || a.display.localeCompare(b.display, 'fr');
  }).slice(0, 8);
}

function conflictDateOptions_(planning) {
  const base = new Date(planning.date + 'T12:00:00');
  if (isNaN(base.getTime())) return [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const options = [];
  for (let weeks = 1; weeks <= 16 && options.length < 10; weeks += 1) {
    const date = new Date(base);
    date.setDate(date.getDate() + weeks * 7);
    if (date < today) continue;
    const iso = Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    options.push({
      value: iso,
      score: Math.max(55, 100 - weeks * 4),
      display: formatConflictDateFr_(iso),
      secondary: 'Même jour de la semaine à ' + planning.time,
      reason: weeks === 1 ? 'Décalage limité à une semaine.' : 'Décalage de ' + weeks + ' semaines.'
    });
  }
  return options;
}

function conflictTalkOptions_(planning, dataset) {
  const speaker = (dataset.speakers || []).find(function (item) { return item.id === planning.speakerId; });
  const declared = speaker && speaker.type === 'EXTERIEUR' ? (dataset.speakerTalks[String(speaker.id)] || []) : null;
  const eventDate = new Date(planning.date + 'T12:00:00');
  const repetitionMonths = Number(dataset.repetitionMonths) || 12;
  return (dataset.talks || []).filter(function (talk) {
    if (!talk.active || Number(talk.number) === Number(planning.talkNumber)) return false;
    return !declared || declared.includes(Number(talk.number));
  }).map(function (talk) {
    const previous = (dataset.plannings || []).filter(function (item) {
      return item.status !== 'ANNULE' && item.id !== planning.id && Number(item.talkNumber) === Number(talk.number) && item.date;
    }).map(function (item) {
      return { item: item, date: new Date(item.date + 'T12:00:00') };
    }).filter(function (entry) {
      return entry.date <= eventDate;
    }).sort(function (a, b) { return b.date - a.date; })[0];
    let score = 96;
    let reason = 'Discours jamais programmé dans l’historique disponible.';
    if (previous) {
      const months = Math.max(0, Math.floor((eventDate - previous.date) / 2629800000));
      const ratio = Math.min(1, months / Math.max(1, repetitionMonths));
      score = Math.round(62 + ratio * 32);
      reason = 'Dernière programmation il y a environ ' + months + ' mois.';
    }
    return {
      value: Number(talk.number),
      score: score,
      display: 'Discours n° ' + talk.number,
      secondary: talk.title || '',
      reason: reason
    };
  }).sort(function (a, b) {
    return b.score - a.score || Number(a.value) - Number(b.value);
  }).slice(0, 12);
}

function conflictCongregationOptions_(planning, dataset) {
  const speaker = (dataset.speakers || []).find(function (item) { return item.id === planning.speakerId; });
  const options = (dataset.congregations || []).filter(function (item) {
    return item.active && item.id !== planning.originCongregationId;
  }).map(function (item) {
    const sameAsSpeaker = speaker && speaker.congregationId === item.id;
    return {
      value: item.id,
      score: sameAsSpeaker ? 100 : 82,
      display: item.name,
      secondary: sameAsSpeaker ? 'Assemblée enregistrée pour cet orateur' : (item.coordinator || ''),
      reason: sameAsSpeaker ? 'Correspond à l’assemblée de l’orateur.' : 'Assemblée active disponible.'
    };
  }).sort(function (a, b) {
    return b.score - a.score || a.display.localeCompare(b.display, 'fr');
  }).slice(0, 6);
  if (planning.originCongregationId) {
    options.unshift({
      value: '',
      score: 94,
      display: 'Aucune assemblée d’origine',
      secondary: 'Retirer la valeur actuellement invalide',
      reason: 'L’assemblée d’origine est facultative.'
    });
  }
  return options;
}

function buildConflictCombinationSuggestions_(planning, groups, originalEvaluation, dataset, depth) {
  const eligibleGroups = groups.filter(function (group) { return group.options.length; });
  const results = [];
  const optionLimit = depth === 2 ? 4 : 3;

  function visit(start, selections) {
    if (selections.length === depth) {
      const suggestion = evaluateConflictSuggestion_(planning, selections, originalEvaluation, dataset);
      if (suggestion) results.push(suggestion);
      return;
    }
    for (let index = start; index < eligibleGroups.length; index += 1) {
      const group = eligibleGroups[index];
      group.options.slice(0, optionLimit).forEach(function (option) {
        visit(index + 1, selections.concat([{ group: group, option: option }]));
      });
    }
  }

  visit(0, []);
  return results;
}

function evaluateConflictSuggestion_(planning, selections, originalEvaluation, dataset) {
  const changes = {};
  const metadata = [];
  selections.forEach(function (selection) {
    if (String(planning[selection.group.key] == null ? '' : planning[selection.group.key]) === String(selection.option.value == null ? '' : selection.option.value)) return;
    changes[selection.group.key] = selection.option.value;
    metadata.push({
      key: selection.group.key,
      type: selection.group.type,
      score: Number(selection.option.score) || 0,
      display: selection.option.display || '',
      secondary: selection.option.secondary || '',
      reason: selection.option.reason || ''
    });
  });
  if (!metadata.length) return null;

  const candidate = Object.assign({}, planning, changes);
  const evaluation = evaluatePlanningRules_(candidate, dataset);
  if (evaluation.errors.length) return null;

  const baseScore = metadata.reduce(function (sum, item) { return sum + item.score; }, 0) / metadata.length;
  const warningPenalty = Math.min(24, evaluation.warnings.length * 8);
  const complexityPenalty = Math.max(0, metadata.length - 1) * 6;
  const score = Math.max(0, Math.min(100, Math.round(baseScore - warningPenalty - complexityPenalty)));
  const type = metadata.length === 1 ? metadata[0].type : CONFLICT_RESOLUTION_TYPES.COMBINATION;
  const preview = conflictPlanningPreview_(candidate, dataset);

  return {
    id: conflictSuggestionId_(changes),
    type: type,
    score: score,
    label: conflictSuggestionLabel_(type, metadata, preview),
    description: conflictSuggestionDescription_(metadata, preview),
    changes: changes,
    changeCount: metadata.length,
    resolves: (originalEvaluation.errors || []).map(function (item) { return item.id; }),
    warnings: ruleMessages_(evaluation.warnings),
    reasons: metadata.map(function (item) { return item.reason; }).filter(Boolean),
    preview: preview
  };
}

function conflictPlanningPreview_(planning, dataset) {
  const speaker = (dataset.speakers || []).find(function (item) { return item.id === planning.speakerId; }) || {};
  const talk = (dataset.talks || []).find(function (item) { return Number(item.number) === Number(planning.talkNumber); }) || {};
  const congregation = (dataset.congregations || []).find(function (item) { return item.id === planning.originCongregationId; }) || {};
  return {
    date: planning.date,
    displayDate: formatConflictDateFr_(planning.date),
    time: planning.time,
    speakerId: planning.speakerId,
    speakerName: speaker.fullName || speaker.lastName || 'Orateur à définir',
    talkNumber: Number(planning.talkNumber) || '',
    talkTitle: talk.title || '',
    originCongregationId: planning.originCongregationId || '',
    congregationName: congregation.name || ''
  };
}

function conflictSuggestionLabel_(type, metadata, preview) {
  if (type === CONFLICT_RESOLUTION_TYPES.SPEAKER) return 'Choisir ' + preview.speakerName;
  if (type === CONFLICT_RESOLUTION_TYPES.DATE) return 'Décaler au ' + preview.displayDate;
  if (type === CONFLICT_RESOLUTION_TYPES.TALK) return 'Choisir le discours n° ' + preview.talkNumber;
  if (type === CONFLICT_RESOLUTION_TYPES.CONGREGATION) return preview.congregationName ? 'Choisir ' + preview.congregationName : 'Retirer l’assemblée d’origine';
  return 'Appliquer ' + metadata.length + ' ajustements coordonnés';
}

function conflictSuggestionDescription_(metadata, preview) {
  if (metadata.length === 1) {
    const item = metadata[0];
    return [item.display, item.secondary].filter(Boolean).join(' — ');
  }
  const labels = metadata.map(function (item) {
    if (item.key === 'speakerId') return 'Orateur : ' + preview.speakerName;
    if (item.key === 'date') return 'Date : ' + preview.displayDate;
    if (item.key === 'talkNumber') return 'Discours n° ' + preview.talkNumber;
    if (item.key === 'originCongregationId') return 'Assemblée : ' + (preview.congregationName || 'aucune');
    return item.display;
  });
  return labels.join(' · ');
}

function conflictSuggestionId_(changes) {
  return Object.keys(changes).sort().map(function (key) { return key + ':' + String(changes[key]); }).join('|');
}

function deduplicateConflictSuggestions_(items) {
  const seen = {};
  return (items || []).filter(function (item) {
    if (!item || seen[item.id]) return false;
    seen[item.id] = true;
    return true;
  });
}

function compareConflictSuggestions_(a, b) {
  return b.score - a.score || a.changeCount - b.changeCount || a.label.localeCompare(b.label, 'fr');
}

function selectDiverseConflictSuggestions_(items, limit) {
  const selected = [];
  const selectedIds = {};
  const types = [
    CONFLICT_RESOLUTION_TYPES.SPEAKER,
    CONFLICT_RESOLUTION_TYPES.DATE,
    CONFLICT_RESOLUTION_TYPES.TALK,
    CONFLICT_RESOLUTION_TYPES.CONGREGATION,
    CONFLICT_RESOLUTION_TYPES.COMBINATION
  ];
  types.forEach(function (type) {
    items.filter(function (item) { return item.type === type; }).slice(0, 2).forEach(function (item) {
      if (selected.length < limit && !selectedIds[item.id]) {
        selected.push(item);
        selectedIds[item.id] = true;
      }
    });
  });
  items.forEach(function (item) {
    if (selected.length < limit && !selectedIds[item.id]) {
      selected.push(item);
      selectedIds[item.id] = true;
    }
  });
  return selected.sort(compareConflictSuggestions_);
}

function formatConflictDateFr_(isoDate) {
  const match = String(isoDate || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? match[3] + '/' + match[2] + '/' + match[1] : String(isoDate || '');
}
