const SPEAKER_AVAILABILITY_TYPES = Object.freeze({
  INDISPONIBLE: { key: 'INDISPONIBLE', label: 'Indisponible', severity: 'ERROR' },
  DISPONIBLE_SEULEMENT: { key: 'DISPONIBLE_SEULEMENT', label: 'Disponible seulement', severity: 'ERROR' },
  PREFEREE: { key: 'PREFEREE', label: 'Période préférée', severity: 'INFO' },
  A_EVITER: { key: 'A_EVITER', label: 'Période à éviter', severity: 'WARNING' }
});

const SPEAKER_AVAILABILITY_MAX_ENTRIES = 80;

function getSpeakerAvailabilitySchedule(speakerId) {
  speakerId = requiredText_(speakerId, 'L’orateur');
  const speaker = getSpeaker(speakerId);
  const metadata = getEntityVersion_('ORATEUR_DISPONIBILITES', speakerId);
  return {
    speaker: speaker,
    entries: listSpeakerAvailability_(true).filter(function (entry) { return entry.speakerId === speakerId; }),
    types: Object.keys(SPEAKER_AVAILABILITY_TYPES).map(function (key) {
      return { key: key, label: SPEAKER_AVAILABILITY_TYPES[key].label, severity: SPEAKER_AVAILABILITY_TYPES[key].severity };
    }),
    version: metadata.version,
    updatedAt: metadata.updatedAt,
    updatedBy: metadata.updatedBy
  };
}

function saveSpeakerAvailabilitySchedule(speakerId, entries, expectedVersion) {
  assertEditAccess_();
  speakerId = requiredText_(speakerId, 'L’orateur');
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  let sheet;
  let snapshot;
  try {
    const speaker = getSpeaker(speakerId);
    assertEntityVersion_('ORATEUR_DISPONIBILITES', speakerId, expectedVersion);
    const normalized = normalizeSpeakerAvailabilityEntries_(speakerId, entries);
    sheet = getDatabase_().getSheetByName(APP_CONFIG.sheets.speakerAvailability);
    if (!sheet) throw new Error('La feuille des disponibilités des orateurs est introuvable.');
    snapshot = sheet.getDataRange().getValues();
    const before = {
      speakerId: speakerId,
      entries: listSpeakerAvailability_(true).filter(function (entry) { return entry.speakerId === speakerId; })
    };

    replaceSpeakerAvailabilityRows_(sheet, speakerId, normalized);
    const metadata = advanceEntityVersion_('ORATEUR_DISPONIBILITES', speakerId);
    const after = { speakerId: speakerId, entries: normalized };
    logAction_('MISE_A_JOUR_DISPONIBILITES', 'ORATEUR_DISPONIBILITES', speakerId, buildAuditDetails_(before, after, {
      nom: speaker.fullName || speaker.lastName,
      concurrency: metadata
    }));
    return getSpeakerAvailabilitySchedule(speakerId);
  } catch (error) {
    if (sheet && snapshot) restoreSpeakerAvailabilitySnapshot_(sheet, snapshot);
    throw error;
  } finally {
    lock.releaseLock();
  }
}

function listSpeakerAvailability_(includeInactive) {
  const sheet = getDatabase_().getSheetByName(APP_CONFIG.sheets.speakerAvailability);
  if (!sheet || sheet.getLastRow() < 2) return [];
  return sheetRowsAsObjects_(sheet).map(function (row) {
    const type = String(row.TYPE || '').toUpperCase();
    const startDate = speakerAvailabilityDateToIso_(row.DATE_DEBUT);
    const endDate = speakerAvailabilityDateToIso_(row.DATE_FIN);
    return {
      id: String(row.ID || ''),
      speakerId: String(row.ORATEUR_ID || ''),
      type: type,
      typeLabel: SPEAKER_AVAILABILITY_TYPES[type] ? SPEAKER_AVAILABILITY_TYPES[type].label : type,
      startDate: startDate,
      endDate: endDate,
      displayRange: speakerAvailabilityDisplayRange_(startDate, endDate),
      reason: String(row.MOTIF || ''),
      active: booleanValue_(row.ACTIF),
      updatedAt: row.DATE_MISE_A_JOUR instanceof Date ? row.DATE_MISE_A_JOUR.toISOString() : String(row.DATE_MISE_A_JOUR || '')
    };
  }).filter(function (entry) {
    return includeInactive || entry.active;
  }).sort(compareSpeakerAvailabilityEntries_);
}

function getSpeakerAvailabilityMap_() {
  return listSpeakerAvailability_(false).reduce(function (map, entry) {
    if (!map[entry.speakerId]) map[entry.speakerId] = [];
    map[entry.speakerId].push(entry);
    return map;
  }, {});
}

function evaluateSpeakerAvailability_(speakerId, isoDate, availabilityMap) {
  const date = String(isoDate || '').trim();
  const map = availabilityMap || getSpeakerAvailabilityMap_();
  const entries = (map[String(speakerId)] || []).filter(function (entry) { return entry.active !== false; });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return speakerAvailabilityEvaluation_('NEUTRE', false, false, false, [], [], [], [], '');
  }

  const unavailable = entries.filter(function (entry) {
    return entry.type === 'INDISPONIBLE' && speakerAvailabilityContainsDate_(entry, date);
  });
  const onlyWindows = entries.filter(function (entry) { return entry.type === 'DISPONIBLE_SEULEMENT'; });
  const allowedWindows = onlyWindows.filter(function (entry) { return speakerAvailabilityContainsDate_(entry, date); });
  const avoid = entries.filter(function (entry) {
    return entry.type === 'A_EVITER' && speakerAvailabilityContainsDate_(entry, date);
  });
  const preferred = entries.filter(function (entry) {
    return entry.type === 'PREFEREE' && speakerAvailabilityContainsDate_(entry, date);
  });

  if (unavailable.length) {
    return speakerAvailabilityEvaluation_(
      'INDISPONIBLE', true, preferred.length > 0, avoid.length > 0,
      unavailable, allowedWindows, preferred, avoid,
      speakerAvailabilityMessage_('INDISPONIBLE', unavailable[0], date)
    );
  }
  if (onlyWindows.length && !allowedWindows.length) {
    return speakerAvailabilityEvaluation_(
      'HORS_PERIODE_AUTORISEE', true, preferred.length > 0, avoid.length > 0,
      [], allowedWindows, preferred, avoid,
      speakerAvailabilityMessage_('HORS_PERIODE_AUTORISEE', null, date)
    );
  }
  if (avoid.length) {
    return speakerAvailabilityEvaluation_(
      'A_EVITER', false, preferred.length > 0, true,
      [], allowedWindows, preferred, avoid,
      speakerAvailabilityMessage_('A_EVITER', avoid[0], date)
    );
  }
  if (preferred.length) {
    return speakerAvailabilityEvaluation_(
      'PREFEREE', false, true, false,
      [], allowedWindows, preferred, [],
      speakerAvailabilityMessage_('PREFEREE', preferred[0], date)
    );
  }
  if (allowedWindows.length) {
    return speakerAvailabilityEvaluation_(
      'DISPONIBLE_SEULEMENT', false, false, false,
      [], allowedWindows, [], [],
      speakerAvailabilityMessage_('DISPONIBLE_SEULEMENT', allowedWindows[0], date)
    );
  }
  return speakerAvailabilityEvaluation_('NEUTRE', false, false, false, [], [], [], [], '');
}

function speakerAvailabilityEvaluation_(status, blocked, preferred, avoid, unavailablePeriods, allowedPeriods, preferredPeriods, avoidPeriods, message) {
  return {
    status: status,
    blocked: Boolean(blocked),
    preferred: Boolean(preferred),
    avoid: Boolean(avoid),
    unavailablePeriods: unavailablePeriods || [],
    allowedPeriods: allowedPeriods || [],
    preferredPeriods: preferredPeriods || [],
    avoidPeriods: avoidPeriods || [],
    message: String(message || '')
  };
}

function normalizeSpeakerAvailabilityEntries_(speakerId, entries) {
  const values = Array.isArray(entries) ? entries : [];
  if (values.length > SPEAKER_AVAILABILITY_MAX_ENTRIES) {
    throw new Error('Un orateur ne peut pas avoir plus de ' + SPEAKER_AVAILABILITY_MAX_ENTRIES + ' périodes enregistrées.');
  }
  const duplicates = {};
  return values.map(function (entry) {
    const source = entry || {};
    const type = String(source.type || '').toUpperCase();
    if (!SPEAKER_AVAILABILITY_TYPES[type]) throw new Error('Type de disponibilité invalide.');
    const startDate = normalizeSpeakerAvailabilityDate_(source.startDate, 'La date de début');
    const endDate = normalizeSpeakerAvailabilityDate_(source.endDate || startDate, 'La date de fin');
    if (endDate < startDate) throw new Error('La date de fin doit être postérieure ou égale à la date de début.');
    const reason = String(source.reason || '').trim();
    if (reason.length > 500) throw new Error('Le motif d’une période ne peut pas dépasser 500 caractères.');
    const key = [type, startDate, endDate].join('|');
    if (duplicates[key]) throw new Error('Deux périodes identiques ne peuvent pas être enregistrées pour le même orateur.');
    duplicates[key] = true;
    return {
      id: String(source.id || '').trim() || newId_(),
      speakerId: speakerId,
      type: type,
      typeLabel: SPEAKER_AVAILABILITY_TYPES[type].label,
      startDate: startDate,
      endDate: endDate,
      displayRange: speakerAvailabilityDisplayRange_(startDate, endDate),
      reason: reason,
      active: source.active !== false,
      updatedAt: new Date().toISOString()
    };
  }).sort(compareSpeakerAvailabilityEntries_);
}

function replaceSpeakerAvailabilityRows_(sheet, speakerId, entries) {
  const width = 8;
  const existing = sheet.getLastRow() > 1 ? sheet.getRange(2, 1, sheet.getLastRow() - 1, width).getValues() : [];
  const remaining = existing.filter(function (row) { return String(row[1] || '') !== String(speakerId); });
  const now = new Date();
  const replacement = entries.map(function (entry) {
    return [
      entry.id,
      speakerId,
      entry.type,
      new Date(entry.startDate + 'T12:00:00'),
      new Date(entry.endDate + 'T12:00:00'),
      entry.reason,
      entry.active !== false,
      now
    ];
  });
  const rows = remaining.concat(replacement);
  const clearCount = Math.max(existing.length, rows.length);
  if (clearCount) sheet.getRange(2, 1, clearCount, width).clearContent();
  if (rows.length) sheet.getRange(2, 1, rows.length, width).setValues(rows);
}

function restoreSpeakerAvailabilitySnapshot_(sheet, snapshot) {
  try {
    sheet.clearContents();
    if (snapshot.length && snapshot[0].length) sheet.getRange(1, 1, snapshot.length, snapshot[0].length).setValues(snapshot);
    sheet.setFrozenRows(1);
  } catch (restoreError) {
    console.error('Impossible de restaurer les disponibilités après échec : ' + restoreError.message);
  }
}

function normalizeSpeakerAvailabilityDate_(value, label) {
  const iso = speakerAvailabilityDateToIso_(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso) || isNaN(new Date(iso + 'T12:00:00').getTime())) {
    throw new Error(label + ' est invalide.');
  }
  return iso;
}

function speakerAvailabilityDateToIso_(value) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  const text = String(value || '').trim();
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return iso ? iso[1] + '-' + iso[2] + '-' + iso[3] : '';
}

function speakerAvailabilityContainsDate_(entry, isoDate) {
  return Boolean(entry && entry.startDate && entry.endDate && entry.startDate <= isoDate && entry.endDate >= isoDate);
}

function speakerAvailabilityMessage_(status, entry, isoDate) {
  const date = formatSpeakerAvailabilityDateFr_(isoDate);
  const reason = entry && entry.reason ? ' Motif : ' + entry.reason : '';
  if (status === 'INDISPONIBLE') return 'L’orateur est déclaré indisponible le ' + date + '.' + reason;
  if (status === 'HORS_PERIODE_AUTORISEE') return 'Le ' + date + ' se trouve en dehors des périodes pendant lesquelles cet orateur s’est déclaré disponible.';
  if (status === 'A_EVITER') return 'Le ' + date + ' est marqué comme une date à éviter pour cet orateur.' + reason;
  if (status === 'PREFEREE') return 'Le ' + date + ' fait partie des dates préférées de cet orateur.' + reason;
  if (status === 'DISPONIBLE_SEULEMENT') return 'Le ' + date + ' se trouve dans une période de disponibilité déclarée.' + reason;
  return '';
}

function speakerAvailabilityDisplayRange_(startDate, endDate) {
  if (!startDate) return '';
  if (!endDate || startDate === endDate) return formatSpeakerAvailabilityDateFr_(startDate);
  return 'Du ' + formatSpeakerAvailabilityDateFr_(startDate) + ' au ' + formatSpeakerAvailabilityDateFr_(endDate);
}

function formatSpeakerAvailabilityDateFr_(isoDate) {
  const match = String(isoDate || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? match[3] + '/' + match[2] + '/' + match[1] : String(isoDate || '');
}

function compareSpeakerAvailabilityEntries_(a, b) {
  return String(a.startDate || '').localeCompare(String(b.startDate || '')) ||
    String(a.endDate || '').localeCompare(String(b.endDate || '')) ||
    String(a.type || '').localeCompare(String(b.type || '')) ||
    String(a.id || '').localeCompare(String(b.id || ''));
}
