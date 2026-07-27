function getSpeakerTalkSelection(speakerId) {
  const speaker = getSpeaker(speakerId);
  const selected = getSpeakerTalkNumbers_(speakerId);
  const metadata = getEntityVersion_('ORATEUR_DISCOURS', speakerId);
  const talks = listTalks('', true)
    .filter(function (talk) { return talk.active; })
    .map(function (talk) {
      return {
        number: Number(talk.number),
        title: String(talk.title || ''),
        selected: selected.includes(Number(talk.number))
      };
    });
  return {
    speaker: speaker,
    talks: talks,
    version: metadata.version,
    updatedAt: metadata.updatedAt,
    updatedBy: metadata.updatedBy
  };
}

function saveSpeakerTalkSelection(speakerId, talkNumbers, expectedVersion) {
  assertEditAccess_();
  speakerId = requiredText_(speakerId, 'L’orateur');
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const speaker = getSpeaker(speakerId);
    assertEntityVersion_('ORATEUR_DISCOURS', speakerId, expectedVersion);
    const numbers = Array.isArray(talkNumbers)
      ? talkNumbers.map(Number).filter(function (number) { return Number.isFinite(number); })
      : [];
    const uniqueNumbers = Array.from(new Set(numbers)).sort(function (a, b) { return a - b; });
    const activeNumbers = listTalks('', false)
      .filter(function (talk) { return talk.active; })
      .map(function (talk) { return Number(talk.number); });
    const invalid = uniqueNumbers.filter(function (number) { return !activeNumbers.includes(number); });
    if (invalid.length) throw new Error('Un ou plusieurs discours sélectionnés sont inactifs ou introuvables.');

    const before = { speakerId: speakerId, talkNumbers: getSpeakerTalkNumbers_(speakerId).slice().sort(function (a, b) { return a - b; }) };
    const ss = getDatabase_();
    const sheet = ss.getSheetByName(APP_CONFIG.sheets.speakerTalks);
    if (!sheet) throw new Error('La feuille des discours déclarés est introuvable.');
    if (sheet.getLastRow() > 1) {
      const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 4).getValues();
      for (let index = rows.length - 1; index >= 0; index--) {
        if (String(rows[index][0]) === String(speakerId)) sheet.deleteRow(index + 2);
      }
    }

    if (uniqueNumbers.length) {
      const values = uniqueNumbers.map(function (number) {
        return [speakerId, number, false, new Date()];
      });
      sheet.getRange(sheet.getLastRow() + 1, 1, values.length, 4).setValues(values);
    }

    advanceEntityVersion_('ORATEUR_DISCOURS', speakerId);
    const after = { speakerId: speakerId, talkNumbers: uniqueNumbers };
    logAction_('MISE_A_JOUR_DISCOURS', 'ORATEUR_DISCOURS', speakerId, buildAuditDetails_(before, after, { nom: speaker.fullName }));
    return getSpeakerTalkSelection(speakerId);
  } finally {
    lock.releaseLock();
  }
}
