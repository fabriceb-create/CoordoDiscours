const VERSION_HISTORY_ENGINE_VERSION = '1.1.0';
const VERSION_HISTORY_DEFAULT_PAGE_SIZE = 40;
const VERSION_HISTORY_MAX_PAGE_SIZE = 100;
const VERSION_HISTORY_ENTITY_KEYS = Object.freeze([
  'ORATEUR', 'ASSEMBLEE', 'DISCOURS', 'PROGRAMMATION', 'HOSPITALITE',
  'INVITATION', 'ORATEUR_DISCOURS', 'ORATEUR_DISPONIBILITES', 'PARAMETRES', 'UTILISATEUR'
]);

function getVersionHistoryBootstrap() {
  assertAccess_('CONSULTATION', 'getVersionHistoryBootstrap');
  const current = getCurrentUserAccess();
  const entities = VERSION_HISTORY_ENTITY_KEYS.map(function (entity) {
    const definition = getConcurrentMergeDefinition_(entity);
    return {
      key: entity,
      label: definition.label,
      viewRole: versionHistoryViewRole_(definition),
      restoreRole: definition.minimumRole,
      canView: versionHistoryRoleAllowed_(current.role, versionHistoryViewRole_(definition)),
      canRestore: versionHistoryRoleAllowed_(current.role, definition.minimumRole)
    };
  }).filter(function (item) { return item.canView; });
  return {
    engineVersion: VERSION_HISTORY_ENGINE_VERSION,
    entities: entities,
    defaultEntity: entities.length ? entities[0].key : '',
    currentAccess: current
  };
}

function listVersionHistoryRecords(entity, searchText, options) {
  const definition = getConcurrentMergeDefinition_(entity);
  assertAccess_(versionHistoryViewRole_(definition), 'listVersionHistoryRecords');
  const request = normalizeVersionHistoryListRequest_(options);
  const query = normalizeText_(searchText);
  const historyRows = readVersionHistoryRows_(definition.entity);
  const groupedRows = historyRows.reduce(function (map, row) {
    const id = String(row.entityId || '');
    if (!map[id]) map[id] = [];
    map[id].push(row);
    return map;
  }, {});
  const currentRecords = listCurrentVersionHistoryRecords_(definition);
  const currentMap = currentRecords.reduce(function (map, record) {
    map[String(record.entityId)] = record;
    return map;
  }, {});
  const ids = Array.from(new Set(Object.keys(groupedRows).concat(Object.keys(currentMap))));
  const currentAccess = getCurrentUserAccess();
  const summaries = ids.map(function (id) {
    const current = currentMap[id] || null;
    const label = current ? current.label : versionHistoryHistoricalLabelFromRows_(definition, id, groupedRows[id] || []);
    return { id: id, current: current, label: label };
  }).filter(function (summary) {
    return !query || normalizeText_([summary.label, summary.id].join(' ')).includes(query);
  }).sort(function (a, b) {
    return String(a.label || '').localeCompare(String(b.label || ''), 'fr');
  });

  const totalCount = summaries.length;
  const selected = request.paged
    ? summaries.slice(request.offset, request.offset + request.limit)
    : summaries;
  const records = selected.map(function (summary) {
    const timeline = buildEntityVersionTimeline_(definition, summary.id, groupedRows[summary.id] || [], summary.current);
    return {
      entity: definition.entity,
      entityId: versionHistoryEntityIdOutput_(definition, summary.id),
      label: summary.label,
      versionCount: timeline.versions.length,
      currentVersionNumber: timeline.currentVersionNumber,
      currentTechnicalVersion: timeline.currentTechnicalVersion,
      lastVersionAt: timeline.versions.length ? timeline.versions[timeline.versions.length - 1].date : '',
      lastDisplayDate: timeline.versions.length ? timeline.versions[timeline.versions.length - 1].displayDate : '',
      canRestore: Boolean(summary.current && versionHistoryRoleAllowed_(currentAccess.role, definition.minimumRole))
    };
  });

  if (!request.paged) return records;
  const nextOffset = Math.min(totalCount, request.offset + records.length);
  return {
    records: records,
    totalCount: totalCount,
    offset: request.offset,
    limit: request.limit,
    nextOffset: nextOffset,
    hasMore: nextOffset < totalCount
  };
}

function normalizeVersionHistoryListRequest_(options) {
  const paged = Boolean(options && typeof options === 'object');
  const source = paged ? options : {};
  const offset = Math.max(0, Math.floor(Number(source.offset) || 0));
  const requestedLimit = Math.floor(Number(source.limit) || VERSION_HISTORY_DEFAULT_PAGE_SIZE);
  const limit = Math.max(1, Math.min(VERSION_HISTORY_MAX_PAGE_SIZE, requestedLimit));
  return { paged: paged, offset: offset, limit: limit };
}

function versionHistoryHistoricalLabelFromRows_(definition, entityId, rows) {
  const snapshot = versionHistoryLatestSnapshotFromRows_(definition, rows);
  return versionHistoryLabelFromSnapshot_(definition, entityId, snapshot);
}

function versionHistoryLatestSnapshotFromRows_(definition, rows) {
  const ordered = (rows || []).slice().sort(function (a, b) {
    return b.timestamp - a.timestamp || b.rowNumber - a.rowNumber;
  });
  for (let index = 0; index < ordered.length; index += 1) {
    const details = ordered[index].details || {};
    if (details.after && versionHistoryHasSnapshotData_(details.after)) {
      return canonicalizeConcurrentMergeData_(definition, details.after);
    }
    if (details.before && versionHistoryHasSnapshotData_(details.before)) {
      return canonicalizeConcurrentMergeData_(definition, details.before);
    }
  }
  return null;
}

function getEntityVersionTimeline(entity, entityId) {
  const definition = getConcurrentMergeDefinition_(entity);
  assertAccess_(versionHistoryViewRole_(definition), 'getEntityVersionTimeline');
  const normalizedId = normalizeConcurrentMergeEntityId_(definition, entityId);
  const current = readCurrentVersionHistoryRecord_(definition, normalizedId, false);
  const historyRows = readVersionHistoryRows_(definition.entity, normalizedId);
  const timeline = buildEntityVersionTimeline_(definition, normalizedId, historyRows, current);
  const access = getCurrentUserAccess();
  return {
    engineVersion: VERSION_HISTORY_ENGINE_VERSION,
    entity: definition.entity,
    entityLabel: definition.label,
    entityId: normalizedId,
    recordLabel: current ? current.label : versionHistoryHistoricalLabel_(definition, normalizedId, timeline),
    versions: timeline.versions.slice().reverse(),
    currentVersionNumber: timeline.currentVersionNumber,
    currentTechnicalVersion: timeline.currentTechnicalVersion,
    canRestore: Boolean(current && versionHistoryRoleAllowed_(access.role, definition.minimumRole)),
    restoreRole: definition.minimumRole
  };
}

function compareEntityVersions(entity, entityId, leftVersionId, rightVersionId) {
  const definition = getConcurrentMergeDefinition_(entity);
  assertAccess_(versionHistoryViewRole_(definition), 'compareEntityVersions');
  const normalizedId = normalizeConcurrentMergeEntityId_(definition, entityId);
  const current = readCurrentVersionHistoryRecord_(definition, normalizedId, false);
  const timeline = buildEntityVersionTimeline_(definition, normalizedId, readVersionHistoryRows_(definition.entity, normalizedId), current);
  const left = timeline.versions.find(function (item) { return item.id === String(leftVersionId); });
  const right = timeline.versions.find(function (item) { return item.id === String(rightVersionId); });
  if (!left || !right) throw new Error('Une des versions sélectionnées est introuvable.');
  return {
    entity: definition.entity,
    entityId: normalizedId,
    left: versionHistoryPublicVersion_(left),
    right: versionHistoryPublicVersion_(right),
    differences: compareVersionSnapshots_(definition, left.snapshot, right.snapshot)
  };
}

function restoreEntityVersion(payload) {
  payload = payload || {};
  const definition = getConcurrentMergeDefinition_(payload.entity);
  assertAccess_(definition.minimumRole, 'restoreEntityVersion');
  const entityId = normalizeConcurrentMergeEntityId_(definition, payload.entityId);
  const current = readCurrentVersionHistoryRecord_(definition, entityId, true);
  if (!current) throw new Error('La fiche actuelle est introuvable et ne peut pas être restaurée automatiquement.');
  const timeline = buildEntityVersionTimeline_(definition, entityId, readVersionHistoryRows_(definition.entity, entityId), current);
  const target = timeline.versions.find(function (item) { return item.id === String(payload.versionId || ''); });
  if (!target) throw new Error('La version à restaurer est introuvable.');
  if (target.isCurrent) {
    return { saved: true, noWrite: true, message: 'Cette version est déjà la version actuelle.', timeline: getEntityVersionTimeline(definition.entity, entityId) };
  }
  if (String(payload.expectedCurrentVersion || '') !== String(current.version || '')) {
    return {
      saved: false,
      stale: true,
      message: 'La fiche a changé depuis l’ouverture de l’historique. Recharge les versions avant de restaurer.',
      timeline: getEntityVersionTimeline(definition.entity, entityId)
    };
  }
  if (definition.entity === 'UTILISATEUR') {
    const access = getCurrentUserAccess();
    if (normalizeAccessEmail_(entityId) === normalizeAccessEmail_(access.email) && target.snapshot.active === false) {
      throw new Error('Tu ne peux pas restaurer une version qui désactive ton propre accès administrateur.');
    }
  }

  try {
    const outcome = writeConcurrentMergeEntity_(definition, entityId, target.snapshot, current.version, {
      operation: '',
      confirmWarnings: payload.confirmWarnings === true,
      context: { sourceVersionId: target.id, sourceVersionNumber: target.number }
    });
    if (outcome && outcome.validation) {
      return {
        saved: false,
        validation: outcome.validation,
        versionId: target.id,
        versionNumber: target.number,
        message: 'La restauration nécessite encore une validation métier.'
      };
    }
    logAction_('RESTAURATION_VERSION', definition.entity, entityId, {
      sourceVersionId: target.id,
      sourceVersionNumber: target.number,
      sourceDate: target.date,
      engineVersion: VERSION_HISTORY_ENGINE_VERSION
    });
    return {
      saved: true,
      versionId: target.id,
      versionNumber: target.number,
      result: outcome ? outcome.result : null,
      message: 'La version ' + target.number + ' a été restaurée. Une nouvelle version a été créée.',
      timeline: getEntityVersionTimeline(definition.entity, entityId)
    };
  } catch (error) {
    if (isConcurrentMergeVersionError_(error)) {
      return {
        saved: false,
        stale: true,
        message: 'La fiche a changé pendant la restauration. Recharge les versions avant de poursuivre.',
        timeline: getEntityVersionTimeline(definition.entity, entityId)
      };
    }
    throw error;
  }
}

function buildEntityVersionTimeline_(definition, entityId, rows, currentRecord) {
  const candidates = [];
  (rows || []).slice().sort(function (a, b) {
    return a.timestamp - b.timestamp || a.rowNumber - b.rowNumber;
  }).forEach(function (row) {
    const details = row.details || {};
    if (details.before && versionHistoryHasSnapshotData_(details.before)) {
      candidates.push(versionHistoryCandidate_(definition, entityId, row, 'BEFORE', details.before, Math.max(0, row.timestamp - 1)));
    }
    if (details.after && versionHistoryHasSnapshotData_(details.after)) {
      candidates.push(versionHistoryCandidate_(definition, entityId, row, 'AFTER', details.after, row.timestamp));
    }
  });

  const versions = [];
  let lastHash = '';
  candidates.sort(function (a, b) { return a.timestamp - b.timestamp || String(a.id).localeCompare(String(b.id)); }).forEach(function (candidate) {
    if (!candidate.hash || candidate.hash === lastHash) return;
    versions.push(candidate);
    lastHash = candidate.hash;
  });

  let currentTechnicalVersion = '';
  if (currentRecord) {
    const currentSnapshot = canonicalizeConcurrentMergeData_(definition, currentRecord.data || {});
    const currentHash = versionHistorySnapshotHash_(currentSnapshot);
    currentTechnicalVersion = String(currentRecord.version || '');
    if (versions.length && versions[versions.length - 1].hash === currentHash) {
      versions[versions.length - 1].isCurrent = true;
      versions[versions.length - 1].technicalVersion = currentTechnicalVersion;
    } else {
      versions.push({
        id: 'CURRENT:' + currentHash.slice(0, 20),
        source: 'CURRENT',
        timestamp: Date.now(),
        date: new Date().toISOString(),
        displayDate: versionHistoryDisplayDate_(new Date()),
        user: Session.getActiveUser().getEmail() || 'Utilisateur',
        action: 'ETAT_ACTUEL',
        snapshot: currentSnapshot,
        hash: currentHash,
        changedFields: [],
        isCurrent: true,
        technicalVersion: currentTechnicalVersion
      });
    }
  }

  versions.forEach(function (version, index) {
    version.number = index + 1;
    version.previousVersionId = index ? versions[index - 1].id : '';
    if (!version.changedFields.length && index) {
      version.changedFields = versionHistoryChangedFields_(definition, versions[index - 1].snapshot, version.snapshot);
    }
  });

  const currentVersion = versions.find(function (item) { return item.isCurrent; }) || null;
  return {
    versions: versions,
    currentVersionNumber: currentVersion ? currentVersion.number : 0,
    currentTechnicalVersion: currentTechnicalVersion
  };
}

function versionHistoryCandidate_(definition, entityId, row, side, rawSnapshot, timestamp) {
  const snapshot = canonicalizeConcurrentMergeData_(definition, rawSnapshot || {});
  const hash = versionHistorySnapshotHash_(snapshot);
  return {
    id: ['H', row.rowNumber, side, hash.slice(0, 16)].join(':'),
    source: side,
    timestamp: timestamp,
    date: new Date(timestamp).toISOString(),
    displayDate: versionHistoryDisplayDate_(new Date(timestamp)),
    user: row.user,
    action: side === 'BEFORE' ? 'État avant ' + row.action : row.action,
    snapshot: snapshot,
    hash: hash,
    changedFields: side === 'AFTER' && Array.isArray(row.details.changedFields) ? row.details.changedFields.slice() : [],
    isCurrent: false,
    technicalVersion: ''
  };
}

function versionHistoryPublicVersion_(version) {
  return {
    id: version.id,
    number: version.number,
    date: version.date,
    displayDate: version.displayDate,
    user: version.user,
    action: version.action,
    changedFields: version.changedFields,
    isCurrent: version.isCurrent,
    technicalVersion: version.technicalVersion
  };
}

function readVersionHistoryRows_(entity, entityId) {
  const sheet = getDatabase_().getSheetByName(APP_CONFIG.sheets.history);
  if (!sheet || sheet.getLastRow() < 2) return [];
  return sheetRowsAsObjects_(sheet).map(function (row) {
    const date = row.DATE_HEURE instanceof Date ? row.DATE_HEURE : new Date(row.DATE_HEURE);
    return {
      rowNumber: row._row,
      timestamp: isNaN(date.getTime()) ? row._row : date.getTime(),
      date: isNaN(date.getTime()) ? '' : date.toISOString(),
      user: String(row.UTILISATEUR || 'Utilisateur'),
      action: String(row.ACTION || ''),
      entity: String(row.ENTITE || '').toUpperCase(),
      entityId: String(row.ENTITE_ID || ''),
      details: parseVersionHistoryDetails_(row.DETAILS)
    };
  }).filter(function (row) {
    if (row.entity !== String(entity || '').toUpperCase()) return false;
    return entityId == null || String(row.entityId) === String(entityId);
  });
}

function parseVersionHistoryDetails_(value) {
  if (value && typeof value === 'object') return value;
  try { return JSON.parse(String(value || '{}')); }
  catch (error) { return {}; }
}

function listCurrentVersionHistoryRecords_(definition) {
  const records = [];
  if (definition.entity === 'ORATEUR') {
    listSpeakers('', true).forEach(function (item) { records.push(versionHistoryCurrentRecord_(definition, item.id, item.fullName || item.lastName, item, item.version)); });
  } else if (definition.entity === 'ASSEMBLEE') {
    listCongregations('', true).forEach(function (item) { records.push(versionHistoryCurrentRecord_(definition, item.id, item.name, item, item.version)); });
  } else if (definition.entity === 'DISCOURS') {
    listTalks('', true).forEach(function (item) { records.push(versionHistoryCurrentRecord_(definition, item.number, 'N° ' + item.number + ' - ' + (item.title || 'Titre à compléter'), item, item.version)); });
  } else if (definition.entity === 'PROGRAMMATION') {
    listPlannings('', true).forEach(function (item) { records.push(versionHistoryCurrentRecord_(definition, item.id, item.displayDate + ' - ' + item.speakerName + ' - n° ' + item.talkNumber, item, item.version)); });
  } else if (definition.entity === 'HOSPITALITE') {
    listHospitalities('').forEach(function (item) { records.push(versionHistoryCurrentRecord_(definition, item.id, item.planningLabel, item, item.version)); });
  } else if (definition.entity === 'INVITATION') {
    listInvitations('').forEach(function (item) { records.push(versionHistoryCurrentRecord_(definition, item.id, item.planningLabel, item, item.version)); });
  } else if (definition.entity === 'PARAMETRES') {
    const settings = getApplicationSettings();
    const map = settings.settings.reduce(function (result, item) { result[item.key] = item.value; return result; }, {});
    records.push(versionHistoryCurrentRecord_(definition, 'APPLICATION', 'Paramètres de l’application', map, settings.settingsVersion));
  } else if (definition.entity === 'UTILISATEUR') {
    listAccessUsers_().forEach(function (item) { records.push(versionHistoryCurrentRecord_(definition, item.email, item.name ? item.name + ' - ' + item.email : item.email, item, item.version)); });
  } else if (definition.entity === 'ORATEUR_DISCOURS') {
    const speakers = listSpeakers('', true);
    const map = getSpeakerTalkNumbersMap_();
    speakers.forEach(function (speaker) {
      const metadata = getEntityVersion_('ORATEUR_DISCOURS', speaker.id);
      records.push(versionHistoryCurrentRecord_(definition, speaker.id, 'Discours de ' + (speaker.fullName || speaker.lastName), { talkNumbers: map[speaker.id] || [] }, metadata.version));
    });
  } else if (definition.entity === 'ORATEUR_DISPONIBILITES') {
    const speakers = listSpeakers('', true);
    const map = listSpeakerAvailability_(true).reduce(function (result, entry) {
      const speakerId = String(entry.speakerId || '');
      if (!speakerId) return result;
      if (!result[speakerId]) result[speakerId] = [];
      result[speakerId].push(entry);
      return result;
    }, {});
    speakers.forEach(function (speaker) {
      const metadata = getEntityVersion_('ORATEUR_DISPONIBILITES', speaker.id);
      records.push(versionHistoryCurrentRecord_(definition, speaker.id, 'Disponibilités de ' + (speaker.fullName || speaker.lastName), { entries: map[speaker.id] || [] }, metadata.version));
    });
  }
  return records;
}

function readCurrentVersionHistoryRecord_(definition, entityId, throwIfMissing) {
  const record = listCurrentVersionHistoryRecords_(definition).find(function (item) {
    return String(item.entityId) === String(entityId);
  }) || null;
  if (!record && throwIfMissing) throw new Error('Fiche actuelle introuvable.');
  return record;
}

function versionHistoryCurrentRecord_(definition, entityId, label, data, version) {
  return {
    entity: definition.entity,
    entityId: entityId,
    label: String(label || entityId),
    data: canonicalizeConcurrentMergeData_(definition, data || {}),
    version: String(version || '')
  };
}

function compareVersionSnapshots_(definition, left, right) {
  const context = buildVersionHistoryDisplayContext_();
  return definition.fields.map(function (field) {
    const leftValue = left[field.name];
    const rightValue = right[field.name];
    if (mergeValuesEqual_(leftValue, rightValue)) return null;
    return {
      field: field.name,
      label: field.label,
      left: leftValue,
      right: rightValue,
      leftDisplay: formatVersionHistoryValue_(field, leftValue, context),
      rightDisplay: formatVersionHistoryValue_(field, rightValue, context)
    };
  }).filter(Boolean);
}

function versionHistoryChangedFields_(definition, left, right) {
  return definition.fields.filter(function (field) {
    return !mergeValuesEqual_(left[field.name], right[field.name]);
  }).map(function (field) { return field.name; });
}

function formatVersionHistoryValue_(field, value, context) {
  if (field.strategy === CONCURRENT_MERGE_STRATEGIES.SET) {
    const values = Array.isArray(value) ? value : [];
    if (field.name === 'talkNumbers') return values.map(function (number) {
      const talk = context.talks[String(number)] || {};
      return 'N° ' + number + (talk.title ? ' - ' + talk.title : '');
    }).join('\n') || 'Liste vide';
    return values.join(', ') || 'Liste vide';
  }
  if (field.strategy === CONCURRENT_MERGE_STRATEGIES.COLLECTION) {
    const values = Array.isArray(value) ? value : [];
    return values.map(function (item) {
      const range = item.startDate === item.endDate ? formatVersionHistoryDateFr_(item.startDate) : 'Du ' + formatVersionHistoryDateFr_(item.startDate) + ' au ' + formatVersionHistoryDateFr_(item.endDate);
      return [String(item.type || '').replace(/_/g, ' '), range, item.reason || '', item.active === false ? 'Désactivée' : 'Active'].filter(Boolean).join(' - ');
    }).join('\n') || 'Aucune période';
  }
  if (field.type === 'BOOLEAN') return value ? 'Oui' : 'Non';
  if (field.name === 'speakerId') return context.speakers[String(value)] || String(value || 'Aucun');
  if (field.name === 'congregationId' || field.name === 'originCongregationId') return context.congregations[String(value)] || String(value || 'Aucune');
  if (field.name === 'talkNumber') {
    const talk = context.talks[String(value)] || {};
    return value ? 'N° ' + value + (talk.title ? ' - ' + talk.title : '') : 'Aucun';
  }
  if (field.name === 'planningId') return context.plannings[String(value)] || String(value || 'Aucune');
  const text = String(value == null ? '' : value);
  return text || 'Valeur vide';
}

function buildVersionHistoryDisplayContext_() {
  return {
    speakers: listSpeakers('', true).reduce(function (map, item) { map[item.id] = item.fullName || item.lastName; return map; }, {}),
    congregations: listCongregations('', true).reduce(function (map, item) { map[item.id] = item.name; return map; }, {}),
    talks: listTalks('', true).reduce(function (map, item) { map[String(item.number)] = item; return map; }, {}),
    plannings: listPlannings('', true).reduce(function (map, item) { map[item.id] = item.displayDate + ' - ' + item.speakerName + ' - n° ' + item.talkNumber; return map; }, {})
  };
}

function versionHistoryHistoricalLabel_(definition, entityId, timeline) {
  const snapshot = timeline && timeline.versions.length
    ? timeline.versions[timeline.versions.length - 1].snapshot
    : null;
  return versionHistoryLabelFromSnapshot_(definition, entityId, snapshot);
}

function versionHistoryLabelFromSnapshot_(definition, entityId, snapshot) {
  const data = snapshot || {};
  if (definition.entity === 'ORATEUR') return [data.firstName, data.lastName].filter(Boolean).join(' ') || String(entityId);
  if (definition.entity === 'ASSEMBLEE') return data.name || String(entityId);
  if (definition.entity === 'DISCOURS') return 'N° ' + entityId + ' - ' + (data.title || 'Titre à compléter');
  if (definition.entity === 'PROGRAMMATION') return [data.date, data.time, data.speakerId, data.talkNumber ? 'n° ' + data.talkNumber : ''].filter(Boolean).join(' - ') || String(entityId);
  if (definition.entity === 'UTILISATEUR') return data.name ? data.name + ' - ' + entityId : String(entityId);
  return definition.label + ' - ' + entityId;
}

function versionHistoryRoleAllowed_(actualRole, expectedRole) {
  const actual = ACCESS_ROLES[String(actualRole || '')] || ACCESS_ROLES.CONSULTATION;
  const expected = ACCESS_ROLES[String(expectedRole || '')] || ACCESS_ROLES.CONSULTATION;
  return actual.level >= expected.level;
}

function versionHistoryViewRole_(definition) {
  return ['PARAMETRES', 'UTILISATEUR'].includes(definition.entity) ? 'ADMIN' : 'CONSULTATION';
}

function versionHistoryHasSnapshotData_(value) {
  return value && typeof value === 'object' && Object.keys(value).length > 0;
}

function versionHistorySnapshotHash_(snapshot) {
  const digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    stableConcurrentMergeStringify_(snapshot || {}),
    Utilities.Charset.UTF_8
  );
  return digest.map(function (byte) { return ('0' + ((byte + 256) % 256).toString(16)).slice(-2); }).join('');
}

function versionHistoryDisplayDate_(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm:ss');
}

function formatVersionHistoryDateFr_(isoDate) {
  const match = String(isoDate || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? match[3] + '/' + match[2] + '/' + match[1] : String(isoDate || '');
}

function versionHistoryEntityIdOutput_(definition, value) {
  return definition.idType === 'NUMBER' ? Number(value) : String(value);
}
