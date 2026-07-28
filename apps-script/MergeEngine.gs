const CONCURRENT_MERGE_ENGINE_VERSION = '1.0.0';
const CONCURRENT_MERGE_STRATEGIES = Object.freeze({
  SCALAR: 'SCALAR',
  SET: 'SET',
  COLLECTION: 'COLLECTION'
});

function prepareConcurrentMerge(request) {
  request = request || {};
  const definition = getConcurrentMergeDefinition_(request.entity);
  assertAccess_(definition.minimumRole, 'prepareConcurrentMerge');
  const normalized = normalizeConcurrentMergeRequest_(definition, request);
  return prepareConcurrentMergeInternal_(definition, normalized, 0);
}

function applyConcurrentMergeResolution(request) {
  request = request || {};
  const definition = getConcurrentMergeDefinition_(request.entity);
  assertAccess_(definition.minimumRole, 'applyConcurrentMergeResolution');
  const normalized = normalizeConcurrentMergeRequest_(definition, request);
  const remote = readConcurrentMergeEntity_(definition, normalized.entityId);
  const plan = buildConcurrentMergePlan_(definition, normalized.base, normalized.local, remote.data);

  if (String(request.remoteVersion || '') !== String(remote.version || '')) {
    return concurrentMergePlanResponse_(definition, normalized, remote, plan, {
      stale: true,
      message: 'La fiche a encore changé pendant l’arbitrage. Les différences ont été recalculées.'
    });
  }

  const choices = request.choices || {};
  const candidate = applyConcurrentMergeChoices_(definition, plan, choices);
  return saveConcurrentMergeCandidate_(definition, normalized, remote, plan, candidate, {
    mode: 'RESOLVED',
    choices: choices,
    attempt: 0
  });
}

function prepareConcurrentMergeInternal_(definition, request, attempt) {
  const remote = readConcurrentMergeEntity_(definition, request.entityId);
  const plan = buildConcurrentMergePlan_(definition, request.base, request.local, remote.data);
  if (plan.conflicts.length) {
    return concurrentMergePlanResponse_(definition, request, remote, plan, {
      stale: attempt > 0,
      message: attempt > 0
        ? 'La fiche a évolué pendant la tentative de fusion. Les différences ont été recalculées.'
        : 'Certains champs ont été modifiés des deux côtés. Choisis la valeur à conserver.'
    });
  }

  if (mergeValuesEqual_(plan.merged, remote.data)) {
    return {
      saved: true,
      autoMerged: true,
      noWrite: true,
      engineVersion: CONCURRENT_MERGE_ENGINE_VERSION,
      entity: definition.entity,
      entityLabel: definition.label,
      entityId: request.entityId,
      remoteVersion: remote.version,
      result: remote.raw,
      merged: plan.merged,
      mergeSummary: publicConcurrentMergeSummary_(plan),
      message: 'La version actuelle contient déjà toutes les modifications demandées.'
    };
  }

  return saveConcurrentMergeCandidate_(definition, request, remote, plan, plan.merged, {
    mode: 'AUTO',
    choices: {},
    attempt: attempt
  });
}

function saveConcurrentMergeCandidate_(definition, request, remote, plan, candidate, options) {
  options = options || {};
  try {
    const outcome = writeConcurrentMergeEntity_(definition, request.entityId, candidate, remote.version, request);
    if (outcome && outcome.validation) {
      return {
        saved: false,
        validation: outcome.validation,
        engineVersion: CONCURRENT_MERGE_ENGINE_VERSION,
        entity: definition.entity,
        entityLabel: definition.label,
        entityId: request.entityId,
        remoteVersion: remote.version,
        remote: remote.data,
        candidate: candidate,
        mergeSummary: publicConcurrentMergeSummary_(plan),
        message: 'La fusion est prête, mais les règles métier demandent encore une validation.'
      };
    }

    safeConcurrentMergeAudit_(definition, request.entityId, plan, options.mode, options.choices);
    return {
      saved: true,
      autoMerged: options.mode === 'AUTO',
      resolved: options.mode === 'RESOLVED',
      engineVersion: CONCURRENT_MERGE_ENGINE_VERSION,
      entity: definition.entity,
      entityLabel: definition.label,
      entityId: request.entityId,
      result: outcome ? outcome.result : null,
      merged: candidate,
      mergeSummary: publicConcurrentMergeSummary_(plan),
      message: options.mode === 'AUTO'
        ? 'Les modifications portant sur des champs différents ont été fusionnées automatiquement.'
        : 'Les choix ont été appliqués et la fiche a été enregistrée.'
    };
  } catch (error) {
    if (isConcurrentMergeVersionError_(error)) {
      if ((options.attempt || 0) < 1) {
        return prepareConcurrentMergeInternal_(definition, request, (options.attempt || 0) + 1);
      }
      const latest = readConcurrentMergeEntity_(definition, request.entityId);
      const latestPlan = buildConcurrentMergePlan_(definition, request.base, request.local, latest.data);
      return concurrentMergePlanResponse_(definition, request, latest, latestPlan, {
        stale: true,
        message: 'La fiche a encore changé. Les différences affichées correspondent maintenant à la dernière version.'
      });
    }
    throw error;
  }
}

function getConcurrentMergeDefinition_(entity) {
  const key = String(entity || '').trim().toUpperCase();
  const scalar = function (name, label, type) {
    return { name: name, label: label, strategy: CONCURRENT_MERGE_STRATEGIES.SCALAR, type: type || 'STRING' };
  };
  const definitions = {
    ORATEUR: {
      entity: 'ORATEUR', label: 'Fiche orateur', minimumRole: 'COORDINATEUR', idType: 'STRING',
      fields: [
        scalar('lastName', 'Nom'), scalar('firstName', 'Prénom'), scalar('type', 'Type'),
        scalar('congregationId', 'Assemblée'), scalar('phone', 'Téléphone'), scalar('email', 'E-mail'),
        scalar('active', 'Statut actif', 'BOOLEAN'), scalar('notes', 'Notes')
      ]
    },
    ASSEMBLEE: {
      entity: 'ASSEMBLEE', label: 'Fiche assemblée', minimumRole: 'COORDINATEUR', idType: 'STRING',
      fields: [
        scalar('name', 'Nom'), scalar('coordinator', 'Coordinateur'), scalar('phone', 'Téléphone'),
        scalar('email', 'E-mail'), scalar('address', 'Adresse'), scalar('meetingDay', 'Jour de réunion'),
        scalar('meetingTime', 'Heure de réunion'), scalar('active', 'Statut actif', 'BOOLEAN')
      ]
    },
    DISCOURS: {
      entity: 'DISCOURS', label: 'Fiche discours', minimumRole: 'COORDINATEUR', idType: 'NUMBER',
      fields: [scalar('title', 'Titre'), scalar('active', 'Statut actif', 'BOOLEAN')]
    },
    PROGRAMMATION: {
      entity: 'PROGRAMMATION', label: 'Programmation', minimumRole: 'COORDINATEUR', idType: 'STRING',
      fields: [
        scalar('date', 'Date'), scalar('time', 'Heure'), scalar('speakerId', 'Orateur'),
        scalar('talkNumber', 'Discours', 'NUMBER'), scalar('status', 'Statut'),
        scalar('originCongregationId', 'Assemblée d’origine'), scalar('notes', 'Notes')
      ]
    },
    HOSPITALITE: {
      entity: 'HOSPITALITE', label: 'Hospitalité', minimumRole: 'COORDINATEUR', idType: 'STRING',
      fields: [
        scalar('planningId', 'Programmation'), scalar('group', 'Groupe d’accueil'), scalar('status', 'Statut'),
        scalar('contact', 'Contact'), scalar('notes', 'Notes')
      ]
    },
    INVITATION: {
      entity: 'INVITATION', label: 'Invitation', minimumRole: 'COORDINATEUR', idType: 'STRING',
      fields: [
        scalar('planningId', 'Programmation'), scalar('sentDate', 'Date d’envoi'), scalar('status', 'Statut'),
        scalar('recipient', 'Destinataire'), scalar('notes', 'Notes')
      ]
    },
    UTILISATEUR: {
      entity: 'UTILISATEUR', label: 'Accès utilisateur', minimumRole: 'ADMIN', idType: 'EMAIL',
      fields: [scalar('name', 'Nom'), scalar('role', 'Rôle'), scalar('active', 'Accès actif', 'BOOLEAN')]
    },
    ORATEUR_DISCOURS: {
      entity: 'ORATEUR_DISCOURS', label: 'Discours déclarés', minimumRole: 'COORDINATEUR', idType: 'STRING',
      fields: [{ name: 'talkNumbers', label: 'Liste des discours', strategy: CONCURRENT_MERGE_STRATEGIES.SET, type: 'NUMBER' }]
    },
    ORATEUR_DISPONIBILITES: {
      entity: 'ORATEUR_DISPONIBILITES', label: 'Disponibilités de l’orateur', minimumRole: 'COORDINATEUR', idType: 'STRING',
      fields: [{
        name: 'entries', label: 'Périodes de disponibilité', strategy: CONCURRENT_MERGE_STRATEGIES.COLLECTION,
        itemId: 'id',
        itemFields: [
          scalar('id', 'Identifiant'), scalar('type', 'Type'), scalar('startDate', 'Date de début'),
          scalar('endDate', 'Date de fin'), scalar('reason', 'Motif'), scalar('active', 'Active', 'BOOLEAN')
        ]
      }]
    }
  };

  if (key === 'PARAMETRES') {
    return {
      entity: 'PARAMETRES', label: 'Paramètres de l’application', minimumRole: 'ADMIN', idType: 'STRING',
      fields: SETTINGS_DEFINITIONS.map(function (definition) {
        return scalar(definition.key, definition.label, definition.type === 'number' ? 'NUMBER_TEXT' : 'STRING');
      })
    };
  }

  if (!definitions[key]) throw new Error('Type de fiche non pris en charge par la fusion intelligente.');
  return definitions[key];
}

function normalizeConcurrentMergeRequest_(definition, request) {
  const entityId = normalizeConcurrentMergeEntityId_(definition, request.entityId);
  const baseSource = request.base || {};
  const localSource = Object.assign({}, baseSource, request.local || {});
  return {
    entity: definition.entity,
    entityId: entityId,
    base: canonicalizeConcurrentMergeData_(definition, baseSource),
    local: canonicalizeConcurrentMergeData_(definition, localSource),
    operation: String(request.operation || '').toUpperCase(),
    confirmWarnings: request.confirmWarnings === true,
    context: request.context || {}
  };
}

function normalizeConcurrentMergeEntityId_(definition, value) {
  if (definition.entity === 'PARAMETRES') return 'APPLICATION';
  if (definition.idType === 'NUMBER') {
    const number = Number(value);
    if (!Number.isFinite(number)) throw new Error('Identifiant numérique invalide pour la fusion.');
    return number;
  }
  if (definition.idType === 'EMAIL') {
    const email = normalizeAccessEmail_(value);
    if (!email) throw new Error('Adresse e-mail utilisateur manquante pour la fusion.');
    return email;
  }
  return requiredText_(value, 'L’identifiant de la fiche');
}

function readConcurrentMergeEntity_(definition, entityId) {
  let raw;
  let version;
  if (definition.entity === 'ORATEUR') raw = getSpeaker(entityId);
  else if (definition.entity === 'ASSEMBLEE') raw = getCongregation(entityId);
  else if (definition.entity === 'DISCOURS') raw = getTalk(entityId);
  else if (definition.entity === 'PROGRAMMATION') {
    raw = listPlannings('', true).find(function (item) { return item.id === String(entityId); });
    if (!raw) throw new Error('Programmation introuvable.');
  } else if (definition.entity === 'HOSPITALITE') {
    raw = listHospitalities('').find(function (item) { return item.id === String(entityId); });
    if (!raw) throw new Error('Hospitalité introuvable.');
  } else if (definition.entity === 'INVITATION') {
    raw = listInvitations('').find(function (item) { return item.id === String(entityId); });
    if (!raw) throw new Error('Invitation introuvable.');
  } else if (definition.entity === 'PARAMETRES') {
    const settings = getApplicationSettings();
    raw = settings.settings.reduce(function (map, item) { map[item.key] = item.value; return map; }, {});
    version = settings.settingsVersion;
    return { raw: settings, data: canonicalizeConcurrentMergeData_(definition, raw), version: version };
  } else if (definition.entity === 'UTILISATEUR') {
    raw = listAccessUsers_().find(function (item) { return item.email === String(entityId); });
    if (!raw) throw new Error('Utilisateur introuvable.');
  } else if (definition.entity === 'ORATEUR_DISCOURS') {
    const selection = getSpeakerTalkSelection(entityId);
    raw = { talkNumbers: selection.talks.filter(function (item) { return item.selected; }).map(function (item) { return Number(item.number); }) };
    version = selection.version;
    return { raw: selection, data: canonicalizeConcurrentMergeData_(definition, raw), version: version };
  } else if (definition.entity === 'ORATEUR_DISPONIBILITES') {
    const schedule = getSpeakerAvailabilitySchedule(entityId);
    raw = { entries: schedule.entries };
    version = schedule.version;
    return { raw: schedule, data: canonicalizeConcurrentMergeData_(definition, raw), version: version };
  }

  version = raw && raw.version;
  return { raw: raw, data: canonicalizeConcurrentMergeData_(definition, raw || {}), version: String(version || '') };
}

function writeConcurrentMergeEntity_(definition, entityId, candidate, remoteVersion, request) {
  let result;
  if (definition.entity === 'ORATEUR') {
    result = saveSpeaker(Object.assign({ id: entityId, version: remoteVersion }, candidate));
  } else if (definition.entity === 'ASSEMBLEE') {
    result = saveCongregation(Object.assign({ id: entityId, version: remoteVersion }, candidate));
  } else if (definition.entity === 'DISCOURS') {
    result = saveTalk(Object.assign({ number: Number(entityId), version: remoteVersion }, candidate));
  } else if (definition.entity === 'PROGRAMMATION') {
    if (request.operation === 'STATUS') {
      result = setPlanningStatus_(entityId, candidate.status, remoteVersion);
    } else {
      const planningResult = savePlanning(Object.assign({ id: entityId, version: remoteVersion }, candidate), request.confirmWarnings === true);
      if (!planningResult.saved) return { validation: planningResult };
      result = planningResult;
    }
  } else if (definition.entity === 'HOSPITALITE') {
    result = saveHospitality(Object.assign({ id: entityId, version: remoteVersion }, candidate));
  } else if (definition.entity === 'INVITATION') {
    result = saveInvitation(Object.assign({ id: entityId, version: remoteVersion }, candidate));
  } else if (definition.entity === 'PARAMETRES') {
    result = saveApplicationSettings(Object.assign({}, candidate, { version: remoteVersion }));
  } else if (definition.entity === 'UTILISATEUR') {
    result = saveAccessUser(Object.assign({ email: entityId, version: remoteVersion }, candidate));
  } else if (definition.entity === 'ORATEUR_DISCOURS') {
    result = saveSpeakerTalkSelection(entityId, candidate.talkNumbers || [], remoteVersion);
  } else if (definition.entity === 'ORATEUR_DISPONIBILITES') {
    result = saveSpeakerAvailabilitySchedule(entityId, candidate.entries || [], remoteVersion);
  } else {
    throw new Error('Écriture de fusion non prise en charge.');
  }
  return { result: result };
}

function canonicalizeConcurrentMergeData_(definition, source) {
  const data = source || {};
  return definition.fields.reduce(function (result, field) {
    result[field.name] = normalizeConcurrentMergeFieldValue_(field, data[field.name]);
    return result;
  }, {});
}

function normalizeConcurrentMergeFieldValue_(field, value) {
  if (field.strategy === CONCURRENT_MERGE_STRATEGIES.SET) {
    const values = Array.isArray(value) ? value : [];
    const normalized = values.map(function (item) {
      return field.type === 'NUMBER' ? Number(item) : String(item || '').trim();
    }).filter(function (item) {
      return field.type === 'NUMBER' ? Number.isFinite(item) : Boolean(item);
    });
    return Array.from(new Set(normalized)).sort(function (a, b) {
      return field.type === 'NUMBER' ? a - b : String(a).localeCompare(String(b), 'fr');
    });
  }
  if (field.strategy === CONCURRENT_MERGE_STRATEGIES.COLLECTION) {
    const values = Array.isArray(value) ? value : [];
    return values.map(function (item) {
      return canonicalizeConcurrentMergeCollectionItem_(field, item || {});
    }).sort(function (a, b) { return concurrentMergeCollectionSortKey_(a).localeCompare(concurrentMergeCollectionSortKey_(b)); });
  }
  if (field.type === 'BOOLEAN') return value === true || String(value).toLowerCase() === 'true' || String(value).toUpperCase() === 'OUI';
  if (field.type === 'NUMBER') {
    if (value === '' || value == null) return '';
    const number = Number(value);
    return Number.isFinite(number) ? number : '';
  }
  if (field.type === 'NUMBER_TEXT') {
    if (value === '' || value == null) return '';
    const number = Number(value);
    return Number.isFinite(number) ? String(number) : String(value).trim();
  }
  return String(value == null ? '' : value).trim();
}

function canonicalizeConcurrentMergeCollectionItem_(field, source) {
  return (field.itemFields || []).reduce(function (result, itemField) {
    result[itemField.name] = normalizeConcurrentMergeFieldValue_(itemField, source[itemField.name]);
    return result;
  }, {});
}

function buildConcurrentMergePlan_(definition, base, local, remote) {
  const merged = {};
  const conflicts = [];
  const fieldStates = [];
  const collectionStates = {};

  definition.fields.forEach(function (field) {
    if (field.strategy === CONCURRENT_MERGE_STRATEGIES.SET) {
      const setResult = mergeConcurrentSet_(base[field.name], local[field.name], remote[field.name]);
      merged[field.name] = setResult.value;
      fieldStates.push({ field: field.name, label: field.label, status: setResult.status });
      return;
    }
    if (field.strategy === CONCURRENT_MERGE_STRATEGIES.COLLECTION) {
      const collectionResult = mergeConcurrentCollection_(field, base[field.name], local[field.name], remote[field.name]);
      merged[field.name] = collectionResult.value;
      collectionStates[field.name] = collectionResult;
      collectionResult.conflicts.forEach(function (conflict) { conflicts.push(conflict); });
      fieldStates.push({ field: field.name, label: field.label, status: collectionResult.conflicts.length ? 'CONFLICT' : collectionResult.status });
      return;
    }

    const scalarResult = mergeConcurrentScalar_(base[field.name], local[field.name], remote[field.name]);
    if (scalarResult.conflict) {
      const conflictId = 'FIELD::' + field.name;
      conflicts.push({
        id: conflictId,
        field: field.name,
        path: field.name,
        label: field.label,
        strategy: CONCURRENT_MERGE_STRATEGIES.SCALAR,
        base: base[field.name],
        local: local[field.name],
        remote: remote[field.name]
      });
      merged[field.name] = remote[field.name];
      fieldStates.push({ field: field.name, label: field.label, status: 'CONFLICT' });
    } else {
      merged[field.name] = scalarResult.value;
      fieldStates.push({ field: field.name, label: field.label, status: scalarResult.status });
    }
  });

  return {
    merged: merged,
    conflicts: conflicts,
    fieldStates: fieldStates,
    _collectionStates: collectionStates
  };
}

function mergeConcurrentScalar_(base, local, remote) {
  const localChanged = !mergeValuesEqual_(local, base);
  const remoteChanged = !mergeValuesEqual_(remote, base);
  if (!localChanged && !remoteChanged) return { value: remote, status: 'UNCHANGED', conflict: false };
  if (localChanged && !remoteChanged) return { value: local, status: 'LOCAL_ONLY', conflict: false };
  if (!localChanged && remoteChanged) return { value: remote, status: 'REMOTE_ONLY', conflict: false };
  if (mergeValuesEqual_(local, remote)) return { value: local, status: 'SAME_CHANGE', conflict: false };
  return { value: remote, status: 'CONFLICT', conflict: true };
}

function mergeConcurrentSet_(base, local, remote) {
  const baseSet = concurrentMergePrimitiveSet_(base);
  const localSet = concurrentMergePrimitiveSet_(local);
  const remoteSet = concurrentMergePrimitiveSet_(remote);
  const universe = Array.from(new Set([].concat(Array.from(baseSet), Array.from(localSet), Array.from(remoteSet))));
  const result = [];
  universe.forEach(function (item) {
    const scalar = mergeConcurrentScalar_(baseSet.has(item), localSet.has(item), remoteSet.has(item));
    if (scalar.value) result.push(item);
  });
  result.sort(function (a, b) { return typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b), 'fr'); });
  const localChanged = !mergeValuesEqual_(Array.from(baseSet).sort(), Array.from(localSet).sort());
  const remoteChanged = !mergeValuesEqual_(Array.from(baseSet).sort(), Array.from(remoteSet).sort());
  return { value: result, status: localChanged && remoteChanged ? 'AUTO_MERGED' : localChanged ? 'LOCAL_ONLY' : remoteChanged ? 'REMOTE_ONLY' : 'UNCHANGED' };
}

function concurrentMergePrimitiveSet_(values) {
  return new Set(Array.isArray(values) ? values : []);
}

function mergeConcurrentCollection_(field, baseValues, localValues, remoteValues) {
  const maps = buildConcurrentCollectionMaps_(field, baseValues, localValues, remoteValues);
  const resultMap = {};
  const conflicts = [];
  const keys = Array.from(new Set([].concat(Object.keys(maps.base), Object.keys(maps.local), Object.keys(maps.remote)))).sort();

  keys.forEach(function (key) {
    const hasBase = Object.prototype.hasOwnProperty.call(maps.base, key);
    const hasLocal = Object.prototype.hasOwnProperty.call(maps.local, key);
    const hasRemote = Object.prototype.hasOwnProperty.call(maps.remote, key);
    const base = hasBase ? maps.base[key] : null;
    const local = hasLocal ? maps.local[key] : null;
    const remote = hasRemote ? maps.remote[key] : null;
    const scalar = mergeConcurrentScalar_(hasBase ? base : null, hasLocal ? local : null, hasRemote ? remote : null);
    if (scalar.conflict) {
      const conflictId = 'COLLECTION::' + field.name + '::' + key;
      conflicts.push({
        id: conflictId,
        field: field.name,
        path: field.name + '[' + key + ']',
        collectionKey: key,
        label: field.label + ' — ' + concurrentMergeCollectionItemLabel_(local || remote || base),
        strategy: 'COLLECTION_ITEM',
        base: base,
        local: local,
        remote: remote
      });
    } else if (scalar.value) {
      resultMap[key] = scalar.value;
    }
  });

  return {
    value: deduplicateConcurrentCollection_(Object.keys(resultMap).map(function (key) { return resultMap[key]; })),
    conflicts: conflicts,
    status: conflicts.length ? 'CONFLICT' : (!mergeValuesEqual_(baseValues, localValues) && !mergeValuesEqual_(baseValues, remoteValues) ? 'AUTO_MERGED' : !mergeValuesEqual_(baseValues, localValues) ? 'LOCAL_ONLY' : !mergeValuesEqual_(baseValues, remoteValues) ? 'REMOTE_ONLY' : 'UNCHANGED'),
    _maps: maps,
    _resultMap: resultMap
  };
}

function buildConcurrentCollectionMaps_(field, baseValues, localValues, remoteValues) {
  const base = concurrentCollectionMap_(field, baseValues, null);
  const remote = concurrentCollectionMap_(field, remoteValues, null);
  const remoteNewBySignature = {};
  Object.keys(remote).forEach(function (key) {
    if (!Object.prototype.hasOwnProperty.call(base, key)) {
      remoteNewBySignature[concurrentMergeCollectionContentSignature_(remote[key])] = key;
    }
  });
  const local = concurrentCollectionMap_(field, localValues, remoteNewBySignature);
  return { base: base, local: local, remote: remote };
}

function concurrentCollectionMap_(field, values, aliases) {
  return (Array.isArray(values) ? values : []).reduce(function (map, item) {
    const canonical = canonicalizeConcurrentMergeCollectionItem_(field, item || {});
    const id = String(canonical[field.itemId || 'id'] || '').trim();
    const signature = concurrentMergeCollectionContentSignature_(canonical);
    const key = id ? 'ID:' + id : (aliases && aliases[signature] ? aliases[signature] : 'NEW:' + signature);
    map[key] = canonical;
    return map;
  }, {});
}

function concurrentMergeCollectionContentSignature_(item) {
  const copy = Object.assign({}, item || {});
  delete copy.id;
  return stableConcurrentMergeStringify_(copy);
}

function concurrentMergeCollectionSortKey_(item) {
  return [item && item.startDate || '', item && item.endDate || '', item && item.type || '', item && item.id || '', stableConcurrentMergeStringify_(item || {})].join('|');
}

function concurrentMergeCollectionItemLabel_(item) {
  if (!item) return 'élément supprimé';
  if (item.startDate) {
    const start = formatConcurrentMergeDateFr_(item.startDate);
    const end = item.endDate && item.endDate !== item.startDate ? ' au ' + formatConcurrentMergeDateFr_(item.endDate) : '';
    return (item.type ? String(item.type).replace(/_/g, ' ') + ' — ' : '') + start + end;
  }
  if (item.number != null) return 'n° ' + item.number;
  return item.id ? 'élément ' + item.id : 'nouvel élément';
}

function deduplicateConcurrentCollection_(values) {
  const bySignature = {};
  (values || []).forEach(function (item) {
    const signature = concurrentMergeCollectionContentSignature_(item);
    const existing = bySignature[signature];
    if (!existing || (!existing.id && item.id)) bySignature[signature] = item;
  });
  return Object.keys(bySignature).map(function (key) { return bySignature[key]; }).sort(function (a, b) {
    return concurrentMergeCollectionSortKey_(a).localeCompare(concurrentMergeCollectionSortKey_(b));
  });
}

function applyConcurrentMergeChoices_(definition, plan, choices) {
  const result = JSON.parse(JSON.stringify(plan.merged));
  plan.conflicts.forEach(function (conflict) {
    const choice = String(choices[conflict.id] || '').toUpperCase();
    if (choice !== 'LOCAL' && choice !== 'REMOTE') {
      throw new Error('Choisis une valeur pour chaque champ en conflit.');
    }
    const selected = choice === 'LOCAL' ? conflict.local : conflict.remote;
    if (conflict.strategy === CONCURRENT_MERGE_STRATEGIES.SCALAR) {
      result[conflict.field] = selected;
      return;
    }
    if (conflict.strategy === 'COLLECTION_ITEM') {
      const state = plan._collectionStates[conflict.field];
      const map = Object.assign({}, state._resultMap);
      plan.conflicts.filter(function (item) {
        return item.field === conflict.field && item.strategy === 'COLLECTION_ITEM';
      }).forEach(function (item) {
        const itemChoice = String(choices[item.id] || '').toUpperCase();
        if (itemChoice !== 'LOCAL' && itemChoice !== 'REMOTE') throw new Error('Choisis une valeur pour chaque période en conflit.');
        const value = itemChoice === 'LOCAL' ? item.local : item.remote;
        if (value) map[item.collectionKey] = value;
        else delete map[item.collectionKey];
      });
      result[conflict.field] = deduplicateConcurrentCollection_(Object.keys(map).map(function (key) { return map[key]; }));
    }
  });
  return canonicalizeConcurrentMergeData_(definition, result);
}

function concurrentMergePlanResponse_(definition, request, remote, plan, extra) {
  return Object.assign({
    saved: false,
    requiresResolution: plan.conflicts.length > 0,
    engineVersion: CONCURRENT_MERGE_ENGINE_VERSION,
    entity: definition.entity,
    entityLabel: definition.label,
    entityId: request.entityId,
    remoteVersion: remote.version,
    base: request.base,
    local: request.local,
    remote: remote.data,
    autoMerged: plan.merged,
    conflicts: plan.conflicts,
    mergeSummary: publicConcurrentMergeSummary_(plan)
  }, extra || {});
}

function publicConcurrentMergeSummary_(plan) {
  const counts = (plan.fieldStates || []).reduce(function (map, item) {
    map[item.status] = (map[item.status] || 0) + 1;
    return map;
  }, {});
  return {
    fieldStates: plan.fieldStates || [],
    counts: counts,
    conflictCount: (plan.conflicts || []).length,
    autoMergedFields: (plan.fieldStates || []).filter(function (item) {
      return ['LOCAL_ONLY', 'REMOTE_ONLY', 'SAME_CHANGE', 'AUTO_MERGED'].includes(item.status);
    }).map(function (item) { return item.field; })
  };
}

function mergeValuesEqual_(left, right) {
  return stableConcurrentMergeStringify_(left) === stableConcurrentMergeStringify_(right);
}

function stableConcurrentMergeStringify_(value) {
  return JSON.stringify(stableConcurrentMergeValue_(value));
}

function stableConcurrentMergeValue_(value) {
  if (Array.isArray(value)) return value.map(stableConcurrentMergeValue_);
  if (value && typeof value === 'object') {
    return Object.keys(value).sort().reduce(function (result, key) {
      result[key] = stableConcurrentMergeValue_(value[key]);
      return result;
    }, {});
  }
  if (value === undefined) return null;
  return value;
}

function isConcurrentMergeVersionError_(error) {
  return String(error && (error.message || error)).includes('CONFLIT_VERSION|');
}

function safeConcurrentMergeAudit_(definition, entityId, plan, mode, choices) {
  try {
    logAction_(mode === 'AUTO' ? 'FUSION_AUTOMATIQUE' : 'FUSION_RESOLUE', definition.entity, entityId, {
      engineVersion: CONCURRENT_MERGE_ENGINE_VERSION,
      mode: mode,
      conflicts: (plan.conflicts || []).map(function (item) { return item.path; }),
      choices: choices || {},
      summary: publicConcurrentMergeSummary_(plan)
    });
  } catch (error) {
    console.warn('Impossible de journaliser la fusion intelligente : ' + error.message);
  }
}

function formatConcurrentMergeDateFr_(isoDate) {
  const match = String(isoDate || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? match[3] + '/' + match[2] + '/' + match[1] : String(isoDate || '');
}
