const RELEASE_GOVERNANCE_VERSION = '1.0.0';
const RELEASE_ACTION_SOURCES = Object.freeze({
  RAPPORT: 'Rapport de santé',
  MANUEL: 'Action manuelle'
});
const RELEASE_ACTION_STATUSES = Object.freeze({
  A_FAIRE: 'À faire',
  EN_COURS: 'En cours',
  TERMINEE: 'Terminée',
  RISQUE_ACCEPTE: 'Risque accepté',
  ANNULEE: 'Annulée'
});
const RELEASE_ACTION_PRIORITIES = Object.freeze({
  BLOQUANTE: 'Bloquante',
  HAUTE: 'Haute',
  NORMALE: 'Normale'
});
const RELEASE_ENVIRONMENTS = Object.freeze({
  RECETTE: 'Recette',
  PRODUCTION: 'Production'
});
const RELEASE_DECISION_TYPES = Object.freeze({
  APPROVED: 'Déploiement approuvé',
  POSTPONED: 'Déploiement reporté',
  DEPLOYED: 'Version déployée',
  ROLLED_BACK: 'Retour arrière enregistré'
});
const RELEASE_DEVICE_TYPES = Object.freeze({
  ORDINATEUR: 'Ordinateur',
  TABLETTE: 'Tablette',
  TELEPHONE: 'Téléphone'
});
const RELEASE_DEVICE_STATUSES = Object.freeze({
  A_TESTER: 'À tester',
  REUSSI: 'Réussi',
  ECHEC: 'Échec'
});
const RELEASE_DEVICE_TESTS = Object.freeze([
  { id: 'NAVIGATION', label: 'Connexion, navigation et retour au tableau de bord' },
  { id: 'PLANNING', label: 'Création, modification et annulation d’une programmation' },
  { id: 'FORMULAIRES', label: 'Ouverture, saisie, validation et fermeture des formulaires' },
  { id: 'RECHERCHE', label: 'Recherche, filtres et chargement des listes' },
  { id: 'IMPRESSION', label: 'Aperçu, export ou impression du planning' }
]);
const RELEASE_HISTORY_ARCHIVE_DEFAULT_DAYS = 730;
const RELEASE_HISTORY_ARCHIVE_MIN_DAYS = 180;
const RELEASE_HISTORY_ARCHIVE_DEFAULT_KEEP = 1000;
const RELEASE_HISTORY_ARCHIVE_MIN_KEEP = 500;
const RELEASE_HISTORY_ARCHIVE_MAX_ROWS = 25000;

function getReleaseGovernanceBootstrap(year) {
  assertAdminAccess_();
  return measureServerOperation_('getReleaseGovernanceBootstrap', function () {
    const actions = listReleaseCorrectiveActions({ limit: 250 });
    const deviceAcceptance = getReleaseDeviceAcceptance();
    const decisions = listReleaseDecisions(25);
    return {
      governanceVersion: RELEASE_GOVERNANCE_VERSION,
      appVersion: APP_CONFIG.version,
      generatedAt: new Date().toISOString(),
      actionStatuses: RELEASE_ACTION_STATUSES,
      actionPriorities: RELEASE_ACTION_PRIORITIES,
      decisionTypes: RELEASE_DECISION_TYPES,
      deviceTypes: RELEASE_DEVICE_TYPES,
      deviceStatuses: RELEASE_DEVICE_STATUSES,
      actions: actions,
      actionSummary: releaseCorrectiveActionSummary_(actions),
      deviceAcceptance: deviceAcceptance,
      decisions: decisions,
      annualCapacity: getAnnualCapacityReport(year),
      archivePreview: previewHistoryArchive({})
    };
  });
}

function listReleaseCorrectiveActions(filters) {
  assertAdminAccess_();
  filters = filters || {};
  const sheet = getDatabase_().getSheetByName(APP_CONFIG.sheets.releaseActions);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const status = String(filters.status || '').trim().toUpperCase();
  const query = normalizeText_(filters.query);
  const includeClosed = filters.includeClosed !== false;
  const limit = Math.min(Math.max(Number(filters.limit) || 250, 1), 1000);
  return sheetRowsAsObjects_(sheet).map(releaseCorrectiveActionFromRow_).filter(function (item) {
    if (status && item.status !== status) return false;
    if (!includeClosed && releaseCorrectiveActionTerminal_(item.status)) return false;
    if (!query) return true;
    return normalizeText_([
      item.title, item.description, item.priority, item.status, item.responsible,
      item.dueDate, item.notes, item.sourceId, item.reportReference
    ].join(' ')).includes(query);
  }).sort(function (a, b) {
    const terminalDiff = Number(releaseCorrectiveActionTerminal_(a.status)) - Number(releaseCorrectiveActionTerminal_(b.status));
    if (terminalDiff) return terminalDiff;
    const priorityDiff = releaseCorrectiveActionPriorityRank_(a.priority) - releaseCorrectiveActionPriorityRank_(b.priority);
    if (priorityDiff) return priorityDiff;
    const dueA = a.dueDate || '9999-12-31';
    const dueB = b.dueDate || '9999-12-31';
    if (dueA !== dueB) return dueA.localeCompare(dueB);
    return String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt));
  }).slice(0, limit);
}

function syncReleaseCorrectiveActions() {
  const access = assertAdminAccess_();
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const report = buildReleaseReadinessReport_();
    const sheet = getDatabase_().getSheetByName(APP_CONFIG.sheets.releaseActions);
    if (!sheet) throw new Error('La feuille ACTIONS_CORRECTIVES est introuvable. Exécute installCoordoDiscours.');
    const now = new Date();
    const nowIso = now.toISOString();
    const existing = sheet.getLastRow() < 2 ? [] : sheetRowsAsObjects_(sheet).map(releaseCorrectiveActionFromRow_);
    const currentRecommendations = (report.recommendations || []).reduce(function (map, item) {
      map[String(item.checkId)] = item;
      return map;
    }, {});
    const changed = [];

    Object.keys(currentRecommendations).forEach(function (checkId) {
      const recommendation = currentRecommendations[checkId];
      const related = existing.filter(function (item) {
        return item.source === 'RAPPORT' && item.sourceId === checkId && item.appVersion === APP_CONFIG.version;
      });
      const active = related.find(function (item) { return !releaseCorrectiveActionTerminal_(item.status); });
      if (!active && related.some(function (item) { return releaseCorrectiveActionSuppressesResync_(item.status); })) return;
      const check = (report.checks || []).find(function (item) { return item.id === checkId; }) || {};
      const priority = check.status === 'BLOCKING' ? 'BLOQUANTE' : 'HAUTE';
      if (active) {
        const row = findRowById_(sheet, active.id);
        if (!row) return;
        const updated = Object.assign({}, active, {
          title: recommendation.label || active.title,
          description: recommendation.action || active.description,
          priority: priority
        });
        const meaningfulChanged = ['title', 'description', 'priority'].some(function (field) {
          return String(updated[field] || '') !== String(active[field] || '');
        });
        if (!meaningfulChanged) return;
        updated.updatedAt = nowIso;
        updated.updatedBy = access.email;
        const values = releaseCorrectiveActionValues_(updated);
        sheet.getRange(row, 1, 1, values.length).setValues([values]);
        const metadata = advanceEntityVersion_('ACTION_CORRECTIVE', active.id);
        const after = Object.assign({}, updated, metadata);
        logAction_('MODIFICATION', 'ACTION_CORRECTIVE', active.id, buildAuditDetails_(active, after, { source: 'SYNCHRONISATION_RAPPORT' }));
        changed.push(Object.assign({}, after, { operation: 'UPDATED' }));
      } else {
        const id = newId_();
        const item = {
          id: id,
          source: 'RAPPORT',
          sourceId: checkId,
          appVersion: APP_CONFIG.version,
          reportReference: report.reference,
          title: recommendation.label || checkId,
          description: recommendation.action || '',
          priority: priority,
          status: 'A_FAIRE',
          responsible: '',
          dueDate: '',
          notes: '',
          createdAt: nowIso,
          createdBy: access.email,
          updatedAt: nowIso,
          updatedBy: access.email
        };
        sheet.appendRow(releaseCorrectiveActionValues_(item));
        const metadata = advanceEntityVersion_('ACTION_CORRECTIVE', id);
        const after = Object.assign({}, item, metadata);
        logAction_('CREATION', 'ACTION_CORRECTIVE', id, buildAuditDetails_({}, after, { source: 'SYNCHRONISATION_RAPPORT' }));
        changed.push(Object.assign({}, after, { operation: 'CREATED' }));
      }
    });

    existing.filter(function (item) {
      return item.source === 'RAPPORT' && item.appVersion === APP_CONFIG.version && !releaseCorrectiveActionTerminal_(item.status) && !currentRecommendations[item.sourceId];
    }).forEach(function (item) {
      const row = findRowById_(sheet, item.id);
      if (!row) return;
      const notes = [item.notes, 'Résolue automatiquement après un rapport conforme.'].filter(Boolean).join('\n').slice(0, 1000);
      const updated = Object.assign({}, item, {
        status: 'TERMINEE',
        notes: notes,
        updatedAt: nowIso,
        updatedBy: access.email
      });
      sheet.getRange(row, 1, 1, releaseCorrectiveActionValues_(updated).length).setValues([releaseCorrectiveActionValues_(updated)]);
      const metadata = advanceEntityVersion_('ACTION_CORRECTIVE', item.id);
      const after = Object.assign({}, updated, metadata);
      logAction_('MODIFICATION', 'ACTION_CORRECTIVE', item.id, buildAuditDetails_(item, after, { source: 'SYNCHRONISATION_RAPPORT', automaticClosure: true }));
      changed.push(Object.assign({}, after, { operation: 'AUTO_COMPLETED' }));
    });

    logAction_('SYNCHRONISATION_ACTIONS_CORRECTIVES', 'APPLICATION', report.reference, {
      appVersion: APP_CONFIG.version,
      reportStatus: report.status,
      reportScore: report.score,
      changedCount: changed.length
    });
    return {
      report: report,
      changedCount: changed.length,
      actions: listReleaseCorrectiveActions({ limit: 250 })
    };
  } finally {
    lock.releaseLock();
  }
}

function saveReleaseCorrectiveAction(payload) {
  const access = assertAdminAccess_();
  payload = payload || {};
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getDatabase_().getSheetByName(APP_CONFIG.sheets.releaseActions);
    if (!sheet) throw new Error('La feuille ACTIONS_CORRECTIVES est introuvable.');
    const id = String(payload.id || '').trim() || newId_();
    const row = findRowById_(sheet, id);
    const existing = row ? listReleaseCorrectiveActions({ limit: 1000 }).find(function (item) { return item.id === id; }) : null;
    if (row) assertEntityVersion_('ACTION_CORRECTIVE', id, payload.version);
    const nowIso = new Date().toISOString();
    const status = releaseGovernanceEnum_(payload.status || (existing && existing.status) || 'A_FAIRE', RELEASE_ACTION_STATUSES, 'Le statut de l’action corrective');
    const priority = releaseGovernanceEnum_(payload.priority || (existing && existing.priority) || 'NORMALE', RELEASE_ACTION_PRIORITIES, 'La priorité de l’action corrective');
    const dueDate = releaseGovernanceDate_(payload.dueDate, 'La date d’échéance');
    const item = {
      id: id,
      source: existing ? existing.source : releaseGovernanceEnum_(payload.source || 'MANUEL', RELEASE_ACTION_SOURCES, 'La source de l’action corrective'),
      sourceId: existing ? existing.sourceId : String(payload.sourceId || '').trim(),
      appVersion: existing ? existing.appVersion : APP_CONFIG.version,
      reportReference: existing ? existing.reportReference : String(payload.reportReference || '').trim(),
      title: requiredText_(payload.title, 'Le titre'),
      description: requiredText_(payload.description, 'La description'),
      priority: priority,
      status: status,
      responsible: sanitizeSupportText_(payload.responsible, 120),
      dueDate: dueDate,
      notes: sanitizeSupportText_(payload.notes, 1000),
      createdAt: existing ? existing.createdAt : nowIso,
      createdBy: existing ? existing.createdBy : access.email,
      updatedAt: nowIso,
      updatedBy: access.email
    };
    const before = existing || {};
    const values = releaseCorrectiveActionValues_(item);
    if (row) sheet.getRange(row, 1, 1, values.length).setValues([values]);
    else sheet.appendRow(values);
    const metadata = advanceEntityVersion_('ACTION_CORRECTIVE', id);
    const after = Object.assign({}, item, metadata);
    logAction_(row ? 'MODIFICATION' : 'CREATION', 'ACTION_CORRECTIVE', id, buildAuditDetails_(before, after));
    return after;
  } finally {
    lock.releaseLock();
  }
}

function setReleaseCorrectiveActionStatus(id, status, expectedVersion) {
  assertAdminAccess_();
  const current = listReleaseCorrectiveActions({ limit: 1000 }).find(function (item) { return item.id === String(id); });
  if (!current) throw new Error('Action corrective introuvable.');
  return saveReleaseCorrectiveAction(Object.assign({}, current, {
    status: status,
    version: expectedVersion || current.version
  }));
}

function getReleaseDeviceAcceptance() {
  assertAdminAccess_();
  const entries = listReleaseDeviceAcceptanceEntries_();
  const metadata = getEntityVersion_('RECETTE_MULTI_ECRANS', APP_CONFIG.version);
  return {
    appVersion: APP_CONFIG.version,
    entries: entries,
    summary: releaseDeviceAcceptanceSummary_(entries),
    version: metadata.version,
    updatedAt: metadata.updatedAt,
    updatedBy: metadata.updatedBy
  };
}

function saveReleaseDeviceAcceptance(payload) {
  const access = assertAdminAccess_();
  payload = payload || {};
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    assertEntityVersion_('RECETTE_MULTI_ECRANS', APP_CONFIG.version, payload.version);
    const normalized = normalizeReleaseDeviceAcceptanceEntries_(payload.entries);
    const sheet = getDatabase_().getSheetByName(APP_CONFIG.sheets.releaseDevices);
    if (!sheet) throw new Error('La feuille RECETTE_MULTI_ECRANS est introuvable.');
    const before = getReleaseDeviceAcceptance();
    releaseDeleteRowsForVersion_(sheet, APP_CONFIG.version, 2);
    if (normalized.length) {
      const now = new Date();
      const rows = normalized.map(function (entry) {
        const tested = entry.status === 'A_TESTER' ? '' : now;
        return [
          entry.id, APP_CONFIG.version, entry.device, entry.testId, entry.label,
          entry.status, entry.comment, tested, entry.status === 'A_TESTER' ? '' : access.email
        ];
      });
      sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
    }
    const metadata = advanceEntityVersion_('RECETTE_MULTI_ECRANS', APP_CONFIG.version);
    const after = {
      appVersion: APP_CONFIG.version,
      entries: normalized,
      summary: releaseDeviceAcceptanceSummary_(normalized),
      version: metadata.version,
      updatedAt: metadata.updatedAt,
      updatedBy: metadata.updatedBy
    };
    logAction_('MISE_A_JOUR_RECETTE_MULTI_ECRANS', 'RECETTE_MULTI_ECRANS', APP_CONFIG.version, buildAuditDetails_(before, after));
    return after;
  } finally {
    lock.releaseLock();
  }
}

function getReleaseDeviceAcceptanceSummary_() {
  const entries = listReleaseDeviceAcceptanceEntries_();
  return releaseDeviceAcceptanceSummary_(entries);
}

function listReleaseDecisions(limit) {
  assertAdminAccess_();
  const sheet = getDatabase_().getSheetByName(APP_CONFIG.sheets.releaseDecisions);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const safeLimit = Math.min(Math.max(Number(limit) || 25, 1), 100);
  return sheetRowsAsObjects_(sheet).map(releaseDecisionFromRow_).sort(function (a, b) {
    return String(b.decidedAt).localeCompare(String(a.decidedAt));
  }).slice(0, safeLimit);
}

function registerReleaseDecision(payload) {
  const access = assertAdminAccess_();
  payload = payload || {};
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const decisionType = releaseGovernanceEnum_(payload.decision, RELEASE_DECISION_TYPES, 'La décision');
    const report = buildReleaseReadinessReport_();
    const currentFingerprint = report.fingerprint || releaseReadinessFingerprint_(report);
    const actions = listReleaseCorrectiveActions({ includeClosed: false, limit: 1000 });
    const actionSummary = releaseCorrectiveActionSummary_(actions);
    const decisions = listReleaseDecisions(100);
    validateReleaseDecisionRequest_({
      request: payload,
      decision: decisionType,
      report: report,
      fingerprint: currentFingerprint,
      actionSummary: actionSummary,
      decisions: decisions
    });

    const decisionId = buildSupportReference_('DEPLOI');
    const decidedAt = new Date().toISOString();
    const environment = releaseGovernanceEnum_(payload.environment || 'PRODUCTION', RELEASE_ENVIRONMENTS, 'L’environnement');
    const deploymentId = sanitizeSupportText_(payload.deploymentId, 160);
    const reason = sanitizeSupportText_(payload.reason, 1000);
    const backupCheck = (report.checks || []).find(function (item) { return item.id === 'backup'; }) || {};
    const backupReference = sanitizeSupportText_(backupCheck.details && backupCheck.details.fileName, 180);
    const rowObject = {
      id: decisionId,
      appVersion: APP_CONFIG.version,
      decision: decisionType,
      reportReference: report.reference,
      reportFingerprint: currentFingerprint,
      reportStatus: report.status,
      score: report.score,
      environment: environment,
      deploymentId: deploymentId,
      backupReference: backupReference,
      reason: reason,
      decidedAt: decidedAt,
      decidedBy: access.email,
      manifestSha256: ''
    };
    rowObject.manifestSha256 = releaseGovernanceSha256_(JSON.stringify(releaseDecisionManifestCore_(rowObject)));
    const sheet = getDatabase_().getSheetByName(APP_CONFIG.sheets.releaseDecisions);
    if (!sheet) throw new Error('La feuille MISES_EN_PRODUCTION est introuvable.');
    sheet.appendRow(releaseDecisionValues_(rowObject));
    logAction_('DECISION_MISE_EN_PRODUCTION', 'MISE_EN_PRODUCTION', decisionId, {
      appVersion: APP_CONFIG.version,
      decision: decisionType,
      reportReference: report.reference,
      reportFingerprint: currentFingerprint,
      reportStatus: report.status,
      score: report.score,
      environment: environment,
      deploymentId: deploymentId,
      backupReference: backupReference,
      reason: reason,
      manifestSha256: rowObject.manifestSha256
    });
    return rowObject;
  } finally {
    lock.releaseLock();
  }
}

function exportReleaseManifest(decisionId) {
  assertAdminAccess_();
  const decision = listReleaseDecisions(100).find(function (item) { return item.id === String(decisionId); });
  if (!decision) throw new Error('Décision de mise en production introuvable.');
  const core = releaseDecisionManifestCore_(decision);
  const checksum = releaseGovernanceSha256_(JSON.stringify(core));
  const payload = {
    format: 'CoordoDiscours-Release-Manifest',
    formatVersion: 1,
    generatedAt: new Date().toISOString(),
    manifest: core,
    checksum: { algorithm: 'SHA-256', value: checksum }
  };
  return {
    fileName: 'CoordoDiscours-manifeste-' + decision.appVersion.replace(/[^a-zA-Z0-9._-]+/g, '-') + '-' + decision.id + '.json',
    mimeType: 'application/json',
    content: JSON.stringify(payload, null, 2)
  };
}

function exportReleaseSupportBundle(year) {
  assertAdminAccess_();
  const report = buildReleaseReadinessReport_();
  const installation = getInstallationStatus();
  const incidents = getRecentSupportIncidents(20).map(function (item) {
    return {
      reference: item.reference,
      timestamp: item.timestamp,
      operation: item.operation,
      view: item.view,
      message: item.message,
      transient: item.transient,
      readOnly: item.readOnly
    };
  });
  const payload = {
    format: 'CoordoDiscours-Support-Bundle',
    formatVersion: 1,
    generatedAt: new Date().toISOString(),
    appVersion: APP_CONFIG.version,
    environmentFingerprint: releaseGovernanceSha256_([installation.databaseId || '', APP_CONFIG.version].join('|')),
    installation: {
      installed: installation.installed,
      schemaVersion: installation.schemaVersion,
      timezone: installation.timezone,
      missingSheets: installation.missingSheets || []
    },
    readiness: releaseGovernanceSanitizeReport_(report),
    correctiveActions: releaseCorrectiveActionSummary_(listReleaseCorrectiveActions({ limit: 1000 })),
    deviceAcceptance: getReleaseDeviceAcceptanceSummary_(),
    annualCapacity: releaseGovernanceSanitizeCapacityReport_(getAnnualCapacityReport(year)),
    decisions: listReleaseDecisions(10).map(function (item) {
      return {
        id: item.id,
        appVersion: item.appVersion,
        decision: item.decision,
        reportReference: item.reportReference,
        reportStatus: item.reportStatus,
        score: item.score,
        environment: item.environment,
        deploymentId: item.deploymentId,
        decidedAt: item.decidedAt,
        manifestSha256: item.manifestSha256
      };
    }),
    incidents: incidents
  };
  return {
    fileName: 'CoordoDiscours-support-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd-HHmmss') + '.json',
    mimeType: 'application/json',
    content: JSON.stringify(payload, null, 2)
  };
}

function getAnnualCapacityReport(year) {
  assertAdminAccess_();
  const selectedYear = releaseGovernanceYear_(year);
  return measureServerOperation_('getAnnualCapacityReport', function () {
    const plannings = listPlannings('', true);
    const speakers = listSpeakers('', true);
    const talks = listTalks('', true);
    return releaseGovernanceCapacityFromData_(selectedYear, plannings, speakers, talks);
  }, { year: selectedYear });
}

function releaseGovernanceSanitizeCapacityReport_(report) {
  report = report || {};
  return {
    year: Number(report.year) || 0,
    generatedAt: String(report.generatedAt || ''),
    meetingWeekday: report.meetingWeekday ? {
      day: Number(report.meetingWeekday.day) || 0,
      label: String(report.meetingWeekday.label || ''),
      inferredFromPlannings: Boolean(report.meetingWeekday.inferredFromPlannings),
      observations: Number(report.meetingWeekday.observations) || 0
    } : null,
    metrics: Object.assign({}, report.metrics || {}),
    monthly: (report.monthly || []).map(function (item) {
      return { month: Number(item.month) || 0, label: String(item.label || ''), count: Number(item.count) || 0 };
    }),
    recommendations: (report.recommendations || []).map(function (item) { return String(item || ''); }),
    formulas: Object.assign({}, report.formulas || {})
  };
}

function previewHistoryArchive(options) {
  assertAdminAccess_();
  options = options || {};
  const sheet = getDatabase_().getSheetByName(APP_CONFIG.sheets.history);
  if (!sheet || sheet.getLastRow() < 2) {
    return releaseHistoryArchiveEmptyPreview_(options);
  }
  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 6).getValues();
  return releaseHistoryArchivePlanFromRows_(rows, options, new Date());
}

function archiveHistoryRows(payload) {
  assertAdminAccess_();
  payload = payload || {};
  if (String(payload.confirmation || '').trim().toUpperCase() !== 'ARCHIVER') {
    throw new Error('La confirmation ARCHIVER est obligatoire.');
  }
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sheet = getDatabase_().getSheetByName(APP_CONFIG.sheets.history);
    if (!sheet || sheet.getLastRow() < 2) throw new Error('Aucune ligne d’historique ne peut être archivée.');
    const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 6).getValues();
    const plan = releaseHistoryArchivePlanFromRows_(rows, payload, new Date());
    if (!plan.eligibleRows) throw new Error('Aucune ligne ne correspond aux critères d’archivage.');
    if (plan.eligibleRows > RELEASE_HISTORY_ARCHIVE_MAX_ROWS) {
      throw new Error('Le lot dépasse la limite de ' + RELEASE_HISTORY_ARCHIVE_MAX_ROWS + ' lignes. Réduis la période puis recommence.');
    }
    if (payload.expectedRows != null && Number(payload.expectedRows) !== plan.eligibleRows) {
      throw new Error('L’historique a changé depuis l’aperçu. Relance le calcul avant d’archiver.');
    }
    const archivePayload = {
      product: APP_CONFIG.name,
      format: 'CoordoDiscours-History-Archive',
      formatVersion: 1,
      appVersion: APP_CONFIG.version,
      createdAt: new Date().toISOString(),
      criteria: {
        olderThanDays: plan.olderThanDays,
        keepLatestRows: plan.keepLatestRows,
        cutoffDate: plan.cutoffDate
      },
      headers: ['DATE_HEURE', 'UTILISATEUR', 'ACTION', 'ENTITE', 'ENTITE_ID', 'DETAILS'],
      rows: plan.rowIndexes.map(function (rowIndex) { return rows[rowIndex]; })
    };
    const fileName = 'CoordoDiscours-historique-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd-HHmmss') + '.json';
    const archiveContent = JSON.stringify(archivePayload, null, 2);
    const archiveSha256 = releaseGovernanceSha256_(archiveContent);
    DriveApp.createFile(fileName, archiveContent, MimeType.PLAIN_TEXT);
    releaseDeletePhysicalRowGroups_(sheet, plan.physicalRows);
    logAction_('ARCHIVAGE_HISTORIQUE', 'APPLICATION', fileName, {
      archivedRows: plan.eligibleRows,
      olderThanDays: plan.olderThanDays,
      keepLatestRows: plan.keepLatestRows,
      cutoffDate: plan.cutoffDate,
      archiveSha256: archiveSha256
    });
    return {
      ok: true,
      fileName: fileName,
      archiveSha256: archiveSha256,
      archivedRows: plan.eligibleRows,
      remainingRows: Math.max(0, sheet.getLastRow() - 1),
      cutoffDate: plan.cutoffDate
    };
  } finally {
    lock.releaseLock();
  }
}

function releaseCorrectiveActionFromRow_(row) {
  const id = String(row.ID || '');
  const metadata = getEntityVersion_('ACTION_CORRECTIVE', id);
  return {
    id: id,
    source: String(row.SOURCE || 'MANUEL').toUpperCase(),
    sourceId: String(row.SOURCE_ID || ''),
    appVersion: String(row.VERSION || ''),
    reportReference: String(row.RAPPORT_REF || ''),
    title: String(row.TITRE || ''),
    description: String(row.DESCRIPTION || ''),
    priority: String(row.PRIORITE || 'NORMALE').toUpperCase(),
    status: String(row.STATUT || 'A_FAIRE').toUpperCase(),
    responsible: String(row.RESPONSABLE || ''),
    dueDate: releaseGovernanceCellDate_(row.DATE_ECHEANCE),
    notes: String(row.NOTES || ''),
    createdAt: releaseGovernanceCellDateTime_(row.CREE_LE),
    createdBy: String(row.CREE_PAR || ''),
    updatedAt: releaseGovernanceCellDateTime_(row.MODIFIE_LE),
    updatedBy: String(row.MODIFIE_PAR || ''),
    version: metadata.version,
    entityUpdatedAt: metadata.updatedAt,
    entityUpdatedBy: metadata.updatedBy
  };
}

function releaseCorrectiveActionValues_(item) {
  return [
    item.id, item.source, item.sourceId, item.appVersion, item.reportReference,
    item.title, item.description, item.priority, item.status, item.responsible,
    item.dueDate ? new Date(item.dueDate + 'T12:00:00') : '', item.notes,
    item.createdAt ? new Date(item.createdAt) : new Date(), item.createdBy,
    item.updatedAt ? new Date(item.updatedAt) : new Date(), item.updatedBy
  ];
}

function releaseCorrectiveActionSummary_(actions) {
  const list = actions || [];
  const active = list.filter(function (item) { return !releaseCorrectiveActionTerminal_(item.status); });
  return {
    total: list.length,
    active: active.length,
    blockingOpen: active.filter(function (item) { return item.priority === 'BLOQUANTE'; }).length,
    highOpen: active.filter(function (item) { return item.priority === 'HAUTE'; }).length,
    overdue: active.filter(function (item) { return item.dueDate && item.dueDate < releaseGovernanceToday_(); }).length,
    completed: list.filter(function (item) { return item.status === 'TERMINEE'; }).length,
    riskAccepted: list.filter(function (item) { return item.status === 'RISQUE_ACCEPTE'; }).length
  };
}

function releaseCorrectiveActionTerminal_(status) {
  return ['TERMINEE', 'RISQUE_ACCEPTE', 'ANNULEE'].indexOf(String(status || '').toUpperCase()) >= 0;
}

function releaseCorrectiveActionPriorityRank_(priority) {
  const order = { BLOQUANTE: 0, HAUTE: 1, NORMALE: 2 };
  const key = String(priority || '').toUpperCase();
  return Object.prototype.hasOwnProperty.call(order, key) ? order[key] : 9;
}

function releaseCorrectiveActionSuppressesResync_(status) {
  return String(status || '').toUpperCase() === 'RISQUE_ACCEPTE';
}

function listReleaseDeviceAcceptanceIntegrityEntries_() {
  const sheet = getDatabase_().getSheetByName(APP_CONFIG.sheets.releaseDevices);
  if (!sheet || sheet.getLastRow() < 2) return [];
  return sheetRowsAsObjects_(sheet).filter(function (row) {
    return String(row.VERSION || '') === APP_CONFIG.version;
  }).map(function (row) {
    return {
      id: String(row.ID || ''),
      appVersion: String(row.VERSION || ''),
      device: String(row.APPAREIL || '').toUpperCase(),
      testId: String(row.TEST_ID || '').toUpperCase(),
      label: String(row.LIBELLE || ''),
      status: String(row.STATUT || '').toUpperCase(),
      comment: String(row.COMMENTAIRE || '')
    };
  });
}

function listReleaseDeviceAcceptanceEntries_() {
  const sheet = getDatabase_().getSheetByName(APP_CONFIG.sheets.releaseDevices);
  const existing = {};
  if (sheet && sheet.getLastRow() >= 2) {
    sheetRowsAsObjects_(sheet).filter(function (row) { return String(row.VERSION || '') === APP_CONFIG.version; }).forEach(function (row) {
      const key = String(row.APPAREIL || '') + '|' + String(row.TEST_ID || '');
      existing[key] = {
        id: String(row.ID || ''),
        device: String(row.APPAREIL || '').toUpperCase(),
        testId: String(row.TEST_ID || '').toUpperCase(),
        label: String(row.LIBELLE || ''),
        status: String(row.STATUT || 'A_TESTER').toUpperCase(),
        comment: String(row.COMMENTAIRE || ''),
        testedAt: releaseGovernanceCellDateTime_(row.TESTE_LE),
        testedBy: String(row.TESTE_PAR || '')
      };
    });
  }
  const entries = [];
  Object.keys(RELEASE_DEVICE_TYPES).forEach(function (device) {
    RELEASE_DEVICE_TESTS.forEach(function (test) {
      const key = device + '|' + test.id;
      const stored = existing[key] || {};
      entries.push({
        id: stored.id || [APP_CONFIG.version, device, test.id].join('|'),
        device: device,
        deviceLabel: RELEASE_DEVICE_TYPES[device],
        testId: test.id,
        label: test.label,
        status: RELEASE_DEVICE_STATUSES[stored.status] ? stored.status : 'A_TESTER',
        comment: stored.comment || '',
        testedAt: stored.testedAt || '',
        testedBy: stored.testedBy || ''
      });
    });
  });
  return entries;
}

function normalizeReleaseDeviceAcceptanceEntries_(entries) {
  const input = Array.isArray(entries) ? entries : [];
  const expectedCount = Object.keys(RELEASE_DEVICE_TYPES).length * RELEASE_DEVICE_TESTS.length;
  if (input.length !== expectedCount) throw new Error('La recette multi-écrans doit contenir exactement ' + expectedCount + ' contrôles.');
  const testMap = RELEASE_DEVICE_TESTS.reduce(function (map, item) { map[item.id] = item; return map; }, {});
  const seen = {};
  return input.map(function (entry) {
    const device = releaseGovernanceEnum_(entry.device, RELEASE_DEVICE_TYPES, 'L’appareil');
    const testId = String(entry.testId || '').toUpperCase();
    if (!testMap[testId]) throw new Error('Test multi-écrans inconnu : ' + testId + '.');
    const key = device + '|' + testId;
    if (seen[key]) throw new Error('Le contrôle ' + key + ' est dupliqué.');
    seen[key] = true;
    const status = releaseGovernanceEnum_(entry.status || 'A_TESTER', RELEASE_DEVICE_STATUSES, 'Le résultat du test');
    return {
      id: [APP_CONFIG.version, device, testId].join('|'),
      device: device,
      deviceLabel: RELEASE_DEVICE_TYPES[device],
      testId: testId,
      label: testMap[testId].label,
      status: status,
      comment: sanitizeSupportText_(entry.comment, 500),
      testedAt: '',
      testedBy: ''
    };
  });
}

function releaseDeviceAcceptanceSummary_(entries) {
  const list = entries || [];
  const total = Object.keys(RELEASE_DEVICE_TYPES).length * RELEASE_DEVICE_TESTS.length;
  const passed = list.filter(function (item) { return item.status === 'REUSSI'; }).length;
  const failed = list.filter(function (item) { return item.status === 'ECHEC'; }).length;
  const pending = Math.max(0, total - passed - failed);
  const byDevice = Object.keys(RELEASE_DEVICE_TYPES).map(function (device) {
    const deviceEntries = list.filter(function (item) { return item.device === device; });
    return {
      device: device,
      label: RELEASE_DEVICE_TYPES[device],
      total: RELEASE_DEVICE_TESTS.length,
      passed: deviceEntries.filter(function (item) { return item.status === 'REUSSI'; }).length,
      failed: deviceEntries.filter(function (item) { return item.status === 'ECHEC'; }).length,
      pending: RELEASE_DEVICE_TESTS.length - deviceEntries.filter(function (item) { return item.status === 'REUSSI' || item.status === 'ECHEC'; }).length
    };
  });
  return {
    total: total,
    passed: passed,
    failed: failed,
    pending: pending,
    complete: passed === total && failed === 0,
    status: failed > 0 ? 'BLOCKING' : (passed === total ? 'PASS' : 'WARNING'),
    byDevice: byDevice
  };
}

function releaseDeleteRowsForVersion_(sheet, version, versionColumn) {
  if (!sheet || sheet.getLastRow() < 2) return;
  const values = sheet.getRange(2, versionColumn, sheet.getLastRow() - 1, 1).getValues();
  for (let index = values.length - 1; index >= 0; index -= 1) {
    if (String(values[index][0] || '') === String(version || '')) sheet.deleteRow(index + 2);
  }
}

function releaseDecisionFromRow_(row) {
  return {
    id: String(row.ID || ''),
    appVersion: String(row.VERSION || ''),
    decision: String(row.DECISION || '').toUpperCase(),
    decisionLabel: RELEASE_DECISION_TYPES[String(row.DECISION || '').toUpperCase()] || String(row.DECISION || ''),
    reportReference: String(row.RAPPORT_REF || ''),
    reportFingerprint: String(row.RAPPORT_EMPREINTE || ''),
    reportStatus: String(row.RAPPORT_STATUT || ''),
    score: Number(row.SCORE) || 0,
    environment: String(row.ENVIRONNEMENT || ''),
    deploymentId: String(row.DEPLOIEMENT_ID || ''),
    backupReference: String(row.SAUVEGARDE_REF || ''),
    reason: String(row.MOTIF || ''),
    decidedAt: releaseGovernanceCellDateTime_(row.DATE_DECISION),
    decidedBy: String(row.DECIDE_PAR || ''),
    manifestSha256: String(row.MANIFESTE_SHA256 || '')
  };
}

function releaseDecisionValues_(item) {
  return [
    item.id, item.appVersion, item.decision, item.reportReference, item.reportFingerprint,
    item.reportStatus, item.score, item.environment, item.deploymentId, item.backupReference,
    item.reason, item.decidedAt ? new Date(item.decidedAt) : new Date(), item.decidedBy, item.manifestSha256
  ];
}

function validateReleaseDecisionRequest_(context) {
  const request = context.request || {};
  const decision = context.decision;
  const report = context.report || {};
  const fingerprint = context.fingerprint || '';
  const actions = context.actionSummary || {};
  const decisions = context.decisions || [];
  const expectedFingerprint = String(request.reportFingerprint || '').trim();
  const environment = releaseGovernanceEnum_(request.environment || 'PRODUCTION', RELEASE_ENVIRONMENTS, 'L’environnement');
  if (['APPROVED', 'DEPLOYED'].indexOf(decision) >= 0 && !expectedFingerprint) {
    throw new Error('L’empreinte du rapport actuel est obligatoire. Actualise le module avant de poursuivre.');
  }
  if (expectedFingerprint && expectedFingerprint !== fingerprint) {
    throw new Error('Le rapport de santé a changé. Actualise le module avant d’enregistrer la décision.');
  }
  if (decision === 'APPROVED') {
    if (String(request.confirmation || '').trim().toUpperCase() !== 'AUTORISER') throw new Error('La confirmation AUTORISER est obligatoire.');
    if (report.status !== 'READY' || Number(report.score) !== 100) throw new Error('Le déploiement ne peut être approuvé que sur un rapport READY à 100/100.');
    if (Number(actions.blockingOpen) > 0) throw new Error('Des actions correctives bloquantes restent ouvertes.');
    if (decisions.some(function (item) { return item.appVersion === APP_CONFIG.version && item.reportFingerprint === fingerprint && item.environment === environment && ['APPROVED', 'DEPLOYED'].indexOf(item.decision) >= 0; })) {
      throw new Error('Ce rapport a déjà été approuvé ou déployé.');
    }
  }
  if (decision === 'POSTPONED' && !String(request.reason || '').trim()) {
    throw new Error('Le motif du report est obligatoire.');
  }
  if (decision === 'DEPLOYED') {
    if (String(request.confirmation || '').trim().toUpperCase() !== 'DEPLOYE') throw new Error('La confirmation DEPLOYE est obligatoire.');
    if (!String(request.deploymentId || '').trim()) throw new Error('L’identifiant du déploiement Apps Script est obligatoire.');
    const approval = decisions.find(function (item) {
      return item.appVersion === APP_CONFIG.version && item.reportFingerprint === fingerprint && item.environment === environment && item.decision === 'APPROVED';
    });
    if (!approval) throw new Error('Aucune approbation correspondant au rapport actuel n’est enregistrée.');
  }
  if (decision === 'ROLLED_BACK') {
    if (String(request.confirmation || '').trim().toUpperCase() !== 'RETOUR') throw new Error('La confirmation RETOUR est obligatoire.');
    if (!String(request.reason || '').trim()) throw new Error('Le motif du retour arrière est obligatoire.');
    if (!decisions.some(function (item) { return item.decision === 'DEPLOYED' && item.environment === environment; })) throw new Error('Aucun déploiement antérieur ne permet d’enregistrer un retour arrière.');
  }
  return true;
}

function releaseDecisionManifestCore_(decision) {
  return {
    product: APP_CONFIG.name,
    appVersion: decision.appVersion,
    decisionId: decision.id,
    decision: decision.decision,
    reportReference: decision.reportReference,
    reportFingerprint: decision.reportFingerprint,
    reportStatus: decision.reportStatus,
    score: decision.score,
    environment: decision.environment,
    deploymentId: decision.deploymentId,
    backupReference: decision.backupReference,
    reason: decision.reason,
    decidedAt: decision.decidedAt,
    decidedBy: decision.decidedBy
  };
}

function releaseGovernanceCapacityFromData_(year, plannings, speakers, talks) {
  const selectedYear = releaseGovernanceYear_(year);
  const allPlannings = (plannings || []).filter(function (item) { return item.date && item.status !== 'ANNULE'; });
  const yearPlannings = allPlannings.filter(function (item) { return Number(String(item.date).slice(0, 4)) === selectedYear; });
  const activeSpeakers = (speakers || []).filter(function (item) { return item.active !== false; });
  const activeTalks = (talks || []).filter(function (item) { return item.active !== false; });
  const speakerMap = (speakers || []).reduce(function (map, item) { map[String(item.id)] = item; return map; }, {});
  const counts = activeSpeakers.reduce(function (map, item) { map[String(item.id)] = 0; return map; }, {});
  yearPlannings.forEach(function (item) { counts[String(item.speakerId)] = (counts[String(item.speakerId)] || 0) + 1; });
  const speakerRows = Object.keys(counts).map(function (speakerId) {
    const speaker = speakerMap[speakerId] || {};
    return {
      speakerId: speakerId,
      speakerName: speaker.fullName || [speaker.firstName, speaker.lastName].filter(Boolean).join(' ') || speakerId,
      type: speaker.type || '',
      count: counts[speakerId]
    };
  }).sort(function (a, b) { return b.count - a.count || a.speakerName.localeCompare(b.speakerName, 'fr'); });
  const assignedCounts = speakerRows.map(function (item) { return item.count; });
  const mean = activeSpeakers.length ? yearPlannings.length / activeSpeakers.length : 0;
  const variance = assignedCounts.length ? assignedCounts.reduce(function (sum, value) { return sum + Math.pow(value - mean, 2); }, 0) / assignedCounts.length : 0;
  const standardDeviation = Math.sqrt(variance);
  const coefficientVariation = mean > 0 ? standardDeviation / mean : 0;
  const balanceScore = mean > 0 ? Math.round(100 / (1 + coefficientVariation)) : 0;
  const topCount = Math.max(1, Math.ceil(activeSpeakers.length * 0.2));
  const topAssignments = speakerRows.slice(0, topCount).reduce(function (sum, item) { return sum + item.count; }, 0);
  const topShare = yearPlannings.length ? topAssignments / yearPlannings.length : 0;
  const usedTalks = new Set(yearPlannings.map(function (item) { return Number(item.talkNumber); }));
  const activeTalkNumbers = new Set(activeTalks.map(function (item) { return Number(item.number); }));
  const usedActiveTalks = Array.from(usedTalks).filter(function (number) { return activeTalkNumbers.has(number); }).length;
  const meetingWeekday = releaseGovernanceInferMeetingWeekday_(allPlannings);
  const theoreticalSlots = releaseGovernanceWeekdayOccurrences_(selectedYear, meetingWeekday.day);
  const monthly = Array.from({ length: 12 }, function (_, month) {
    const count = yearPlannings.filter(function (item) { return Number(String(item.date).slice(5, 7)) === month + 1; }).length;
    return { month: month + 1, label: releaseGovernanceMonthLabel_(month), count: count };
  });
  const externalCount = yearPlannings.filter(function (item) {
    const speaker = speakerMap[String(item.speakerId)] || {};
    return speaker.type === 'EXTERIEUR';
  }).length;
  const metrics = {
    planned: yearPlannings.length,
    theoreticalSlots: theoreticalSlots,
    occupancyRate: theoreticalSlots ? yearPlannings.length / theoreticalSlots : 0,
    activeSpeakers: activeSpeakers.length,
    usedSpeakers: speakerRows.filter(function (item) { return item.count > 0; }).length,
    speakersWithoutAssignment: speakerRows.filter(function (item) { return item.count === 0; }).length,
    averagePerActiveSpeaker: Math.round(mean * 100) / 100,
    maxPerSpeaker: speakerRows.length ? speakerRows[0].count : 0,
    balanceScore: balanceScore,
    coefficientVariation: Math.round(coefficientVariation * 1000) / 1000,
    top20Share: Math.round(topShare * 1000) / 1000,
    activeTalks: activeTalks.length,
    usedActiveTalks: usedActiveTalks,
    talkCoverageRate: activeTalks.length ? usedActiveTalks / activeTalks.length : 0,
    repeatedTalkAssignments: Math.max(0, yearPlannings.length - usedTalks.size),
    externalShare: yearPlannings.length ? externalCount / yearPlannings.length : 0
  };
  const recommendations = [];
  if (metrics.occupancyRate < 0.70) recommendations.push('Moins de 70 % des créneaux hebdomadaires théoriques sont programmés.');
  if (metrics.activeSpeakers && metrics.usedSpeakers / metrics.activeSpeakers < 0.60) recommendations.push('Moins de 60 % des orateurs actifs sont utilisés sur l’année.');
  if (metrics.top20Share > 0.50) recommendations.push('Les 20 % d’orateurs les plus sollicités concentrent plus de la moitié des affectations.');
  if (metrics.balanceScore < 60 && metrics.planned > 0) recommendations.push('L’indice d’équilibre des affectations est inférieur à 60/100.');
  if (metrics.talkCoverageRate < 0.30 && metrics.planned > 0) recommendations.push('Moins de 30 % des discours actifs ont été utilisés sur l’année.');
  return {
    year: selectedYear,
    generatedAt: new Date().toISOString(),
    meetingWeekday: meetingWeekday,
    metrics: metrics,
    monthly: monthly,
    speakers: speakerRows.slice(0, 50),
    recommendations: recommendations,
    formulas: {
      occupancyRate: 'programmations actives / occurrences du jour de réunion le plus fréquent',
      balanceScore: '100 / (1 + coefficient de variation des affectations, zéros inclus)',
      top20Share: 'affectations des 20 % d’orateurs les plus sollicités / affectations totales',
      talkCoverageRate: 'discours actifs différents utilisés / discours actifs'
    }
  };
}

function releaseGovernanceInferMeetingWeekday_(plannings) {
  const counts = [0, 0, 0, 0, 0, 0, 0];
  (plannings || []).forEach(function (item) {
    const date = new Date(String(item.date) + 'T12:00:00');
    if (!isNaN(date.getTime())) counts[date.getDay()] += 1;
  });
  let day = 0;
  counts.forEach(function (count, index) { if (count > counts[day]) day = index; });
  const labels = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  return { day: day, label: labels[day], inferredFromPlannings: counts[day] > 0, observations: counts[day] };
}

function releaseGovernanceWeekdayOccurrences_(year, weekday) {
  let count = 0;
  const date = new Date(year, 0, 1, 12, 0, 0);
  while (date.getFullYear() === year) {
    if (date.getDay() === weekday) count += 1;
    date.setDate(date.getDate() + 1);
  }
  return count;
}

function releaseHistoryArchivePlanFromRows_(rows, options, now) {
  options = options || {};
  const olderThanDays = Math.min(Math.max(Number(options.olderThanDays) || RELEASE_HISTORY_ARCHIVE_DEFAULT_DAYS, RELEASE_HISTORY_ARCHIVE_MIN_DAYS), 3650);
  const keepLatestRows = Math.min(Math.max(Number(options.keepLatestRows) || RELEASE_HISTORY_ARCHIVE_DEFAULT_KEEP, RELEASE_HISTORY_ARCHIVE_MIN_KEEP), 10000);
  const cutoff = new Date((now instanceof Date ? now : new Date()).getTime() - olderThanDays * 86400000);
  const safePhysicalLimit = Math.max(0, (rows || []).length - keepLatestRows);
  const rowIndexes = [];
  const physicalRows = [];
  for (let index = 0; index < safePhysicalLimit; index += 1) {
    const rawDate = rows[index] && rows[index][0];
    const date = rawDate instanceof Date ? rawDate : new Date(rawDate);
    if (!isNaN(date.getTime()) && date < cutoff) {
      rowIndexes.push(index);
      physicalRows.push(index + 2);
    }
  }
  return {
    olderThanDays: olderThanDays,
    keepLatestRows: keepLatestRows,
    cutoffDate: cutoff.toISOString(),
    totalRows: (rows || []).length,
    eligibleRows: rowIndexes.length,
    firstEligibleDate: rowIndexes.length ? releaseGovernanceCellDateTime_(rows[rowIndexes[0]][0]) : '',
    lastEligibleDate: rowIndexes.length ? releaseGovernanceCellDateTime_(rows[rowIndexes[rowIndexes.length - 1]][0]) : '',
    rowIndexes: rowIndexes,
    physicalRows: physicalRows,
    limited: rowIndexes.length > RELEASE_HISTORY_ARCHIVE_MAX_ROWS
  };
}

function releaseHistoryArchiveEmptyPreview_(options) {
  return releaseHistoryArchivePlanFromRows_([], options || {}, new Date());
}

function releaseDeletePhysicalRowGroups_(sheet, physicalRows) {
  if (!physicalRows || !physicalRows.length) return;
  const sorted = physicalRows.slice().sort(function (a, b) { return b - a; });
  let groupEnd = sorted[0];
  let groupStart = sorted[0];
  for (let index = 1; index <= sorted.length; index += 1) {
    const value = sorted[index];
    if (value === groupStart - 1) {
      groupStart = value;
      continue;
    }
    sheet.deleteRows(groupStart, groupEnd - groupStart + 1);
    groupEnd = value;
    groupStart = value;
  }
}

function releaseGovernanceSanitizeReport_(report) {
  const clone = JSON.parse(JSON.stringify(report || {}));
  (clone.checks || []).forEach(function (check) {
    if (check.id === 'installation' && check.details) {
      delete check.details.databaseId;
      delete check.details.databaseUrl;
      delete check.details.databaseName;
      delete check.details.spreadsheetId;
      delete check.details.spreadsheetUrl;
    }
    if (check.details && check.details.issues) {
      check.details.issues = check.details.issues.map(function (issue) {
        return { severity: issue.severity, code: issue.code, message: issue.message };
      });
    }
  });
  return clone;
}

function releaseGovernanceSha256_(text) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(text || ''), Utilities.Charset.UTF_8);
  return bytes.map(function (value) {
    const normalized = value < 0 ? value + 256 : value;
    return ('0' + normalized.toString(16)).slice(-2);
  }).join('');
}

function releaseGovernanceEnum_(value, dictionary, label) {
  const key = String(value || '').trim().toUpperCase();
  if (!dictionary[key]) throw new Error((label || 'La valeur') + ' est invalide.');
  return key;
}

function releaseGovernanceDate_(value, label) {
  const text = String(value || '').trim();
  if (!text) return '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || isNaN(new Date(text + 'T12:00:00').getTime())) throw new Error((label || 'La date') + ' est invalide.');
  return text;
}

function releaseGovernanceCellDate_(value) {
  if (!value) return '';
  if (value instanceof Date) return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const text = String(value || '');
  const match = text.match(/^\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : text;
}

function releaseGovernanceCellDateTime_(value) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  return isNaN(date.getTime()) ? String(value || '') : date.toISOString();
}

function releaseGovernanceToday_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function releaseGovernanceYear_(value) {
  const current = new Date().getFullYear();
  const year = Number(value) || current;
  return Math.max(current - 5, Math.min(current + 2, Math.floor(year)));
}

function releaseGovernanceMonthLabel_(monthIndex) {
  return ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'][monthIndex] || '';
}
