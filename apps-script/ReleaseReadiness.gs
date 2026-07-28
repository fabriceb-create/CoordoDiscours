const RELEASE_READINESS_ENGINE_VERSION = '1.1.0';
const RELEASE_READINESS_SESSION_PROPERTY = 'COORDODISCOURS_RELEASE_ACCEPTANCE_V1';
const RELEASE_READINESS_BACKUP_WARNING_DAYS = 7;
const RELEASE_READINESS_BACKUP_BLOCKING_DAYS = 14;
const RELEASE_READINESS_ACCEPTANCE_WARNING_DAYS = 7;
const RELEASE_READINESS_ACCEPTANCE_BLOCKING_DAYS = 14;
const RELEASE_READINESS_PERFORMANCE_ERROR_BLOCKING = 3;
const RELEASE_READINESS_PERFORMANCE_SLOW_RATIO_WARNING = 0.20;

const RELEASE_ACCEPTANCE_STEPS = Object.freeze([
  { id: 'installation', label: 'Installation et structure', description: 'Vérifier les feuilles, la version, le schéma et le fuseau horaire.' },
  { id: 'integrity', label: 'Intégrité des données', description: 'Contrôler les relations, doublons et référentiels obligatoires.' },
  { id: 'backup', label: 'Sauvegarde récente', description: 'Vérifier qu’une sauvegarde exploitable a été créée récemment.' },
  { id: 'performance', label: 'Performance et incidents', description: 'Examiner les erreurs et appels lents observés côté serveur.' },
  { id: 'acceptance', label: 'Recette interne', description: 'Exécuter les tests d’acceptation dans l’environnement Apps Script.' },
  { id: 'devices', label: 'Recette multi-écrans', description: 'Valider manuellement l’application sur ordinateur, tablette et téléphone.' },
  { id: 'final', label: 'Décision de mise en production', description: 'Consolider le score, les blocages et les recommandations finales.' }
]);

function getReleaseReadinessBootstrap() {
  assertAdminAccess_();
  return measureServerOperation_('getReleaseReadinessBootstrap', function () {
    return {
      engineVersion: RELEASE_READINESS_ENGINE_VERSION,
      appVersion: APP_CONFIG.version,
      generatedAt: new Date().toISOString(),
      report: buildReleaseReadinessReport_(),
      session: readReleaseAcceptanceSession_(),
      steps: RELEASE_ACCEPTANCE_STEPS.map(function (step, index) {
        return { id: step.id, label: step.label, description: step.description, number: index + 1 };
      }),
      thresholds: {
        backupWarningDays: RELEASE_READINESS_BACKUP_WARNING_DAYS,
        backupBlockingDays: RELEASE_READINESS_BACKUP_BLOCKING_DAYS,
        acceptanceWarningDays: RELEASE_READINESS_ACCEPTANCE_WARNING_DAYS,
        acceptanceBlockingDays: RELEASE_READINESS_ACCEPTANCE_BLOCKING_DAYS,
        performanceErrorBlocking: RELEASE_READINESS_PERFORMANCE_ERROR_BLOCKING,
        performanceSlowRatioWarning: RELEASE_READINESS_PERFORMANCE_SLOW_RATIO_WARNING
      }
    };
  });
}

function getReleaseReadinessReport() {
  assertAdminAccess_();
  return measureServerOperation_('getReleaseReadinessReport', function () {
    return buildReleaseReadinessReport_();
  });
}

function startReleaseAcceptance() {
  const access = assertAdminAccess_();
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const now = new Date().toISOString();
    const session = {
      id: buildSupportReference_('RECETTE'),
      engineVersion: RELEASE_READINESS_ENGINE_VERSION,
      appVersion: APP_CONFIG.version,
      status: 'IN_PROGRESS',
      startedAt: now,
      finishedAt: '',
      startedBy: access.email,
      currentStepId: RELEASE_ACCEPTANCE_STEPS[0].id,
      results: [],
      finalReport: null
    };
    writeReleaseAcceptanceSession_(session);
    logAction_('RECETTE_DEPLOIEMENT_DEMARREE', 'APPLICATION', session.id, {
      appVersion: APP_CONFIG.version,
      steps: RELEASE_ACCEPTANCE_STEPS.length
    });
    return publicReleaseAcceptanceSession_(session);
  } finally {
    lock.releaseLock();
  }
}

function getReleaseAcceptanceSession() {
  assertAdminAccess_();
  return publicReleaseAcceptanceSession_(readReleaseAcceptanceSession_());
}

function runReleaseAcceptanceStep(sessionId, stepId) {
  assertAdminAccess_();
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const session = readReleaseAcceptanceSession_();
    if (!session || String(session.id) !== String(sessionId || '')) {
      throw new Error('La session de recette a changé. Recharge le module avant de poursuivre.');
    }
    if (session.status !== 'IN_PROGRESS') {
      throw new Error('Cette recette est déjà terminée. Démarre une nouvelle recette pour la rejouer.');
    }
    const expected = nextReleaseAcceptanceStep_(session);
    if (!expected) throw new Error('Aucune étape de recette ne reste à exécuter.');
    if (String(stepId || '') !== expected.id) {
      throw new Error('L’étape attendue est « ' + expected.label + ' ».');
    }

    const startedAt = Date.now();
    let result;
    try {
      result = executeReleaseAcceptanceStep_(expected.id);
    } catch (error) {
      result = releaseReadinessCheck_(expected.id, expected.label, 'BLOCKING', 0,
        'L’étape a rencontré une erreur inattendue.',
        { error: sanitizeSupportText_(error && error.message ? error.message : error, 220) },
        'Consulte l’historique avec la référence de recette puis corrige l’erreur avant une nouvelle tentative.');
    }
    result.startedAt = new Date(startedAt).toISOString();
    result.finishedAt = new Date().toISOString();
    result.durationMs = Math.max(0, Date.now() - startedAt);
    session.results.push(result);

    if (expected.id === 'final') {
      session.finalReport = result.details && result.details.report ? result.details.report : buildReleaseReadinessReport_();
      session.status = session.finalReport.status === 'READY' ? 'COMPLETED' : 'COMPLETED_WITH_ISSUES';
      session.finishedAt = new Date().toISOString();
      session.currentStepId = '';
      logAction_('RECETTE_DEPLOIEMENT_TERMINEE', 'APPLICATION', session.id, {
        status: session.status,
        releaseStatus: session.finalReport.status,
        score: session.finalReport.score,
        blockingCount: session.finalReport.counts.blocking,
        warningCount: session.finalReport.counts.warning
      });
    } else {
      const next = nextReleaseAcceptanceStep_(session);
      session.currentStepId = next ? next.id : 'final';
    }
    writeReleaseAcceptanceSession_(session);
    return publicReleaseAcceptanceSession_(session);
  } finally {
    lock.releaseLock();
  }
}

function exportReleaseAcceptanceReport(sessionId) {
  assertAdminAccess_();
  const session = readReleaseAcceptanceSession_();
  if (!session || String(session.id) !== String(sessionId || '')) throw new Error('Session de recette introuvable.');
  const payload = {
    product: APP_CONFIG.name,
    appVersion: APP_CONFIG.version,
    engineVersion: RELEASE_READINESS_ENGINE_VERSION,
    exportedAt: new Date().toISOString(),
    session: publicReleaseAcceptanceSession_(session)
  };
  return {
    fileName: 'CoordoDiscours-recette-' + String(session.id).replace(/[^a-zA-Z0-9_-]+/g, '-') + '.json',
    mimeType: 'application/json',
    content: JSON.stringify(payload, null, 2)
  };
}

function resetReleaseAcceptanceSession() {
  assertAdminAccess_();
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    PropertiesService.getScriptProperties().deleteProperty(RELEASE_READINESS_SESSION_PROPERTY);
    logAction_('RECETTE_DEPLOIEMENT_REINITIALISEE', 'APPLICATION', APP_CONFIG.version, {
      resetAt: new Date().toISOString()
    });
    return null;
  } finally {
    lock.releaseLock();
  }
}

function buildReleaseReadinessReport_() {
  const now = new Date();
  const checks = [
    safeReleaseReadinessCheck_('installation', 'Installation et structure', 15, function () {
      return assessInstallationReadiness_(getInstallationStatus(), getSettingsSnapshot_());
    }),
    safeReleaseReadinessCheck_('integrity', 'Intégrité des données', 25, function () {
      return assessIntegrityReadiness_(getDataIntegrityReport_({ silent: true }));
    }),
    safeReleaseReadinessCheck_('backup', 'Sauvegarde récente', 15, function () {
      return assessBackupReadiness_(latestReleaseAuditEvent_('SAUVEGARDE'), now);
    }),
    safeReleaseReadinessCheck_('performance', 'Performance et incidents', 15, function () {
      return assessPerformanceReadiness_(getServerPerformanceReport_());
    }),
    safeReleaseReadinessCheck_('acceptance', 'Recette interne', 15, function () {
      return assessAcceptanceReadiness_(latestReleaseAuditEvent_('TEST_ACCEPTATION'), now);
    }),
    safeReleaseReadinessCheck_('devices', 'Recette multi-écrans', 15, function () {
      return assessDeviceAcceptanceReadiness_(getReleaseDeviceAcceptanceSummary_());
    })
  ];
  const score = checks.reduce(function (sum, item) { return sum + Number(item.score || 0); }, 0);
  const status = releaseReadinessOverallStatus_(checks);
  const counts = {
    pass: checks.filter(function (item) { return item.status === 'PASS'; }).length,
    warning: checks.filter(function (item) { return item.status === 'WARNING'; }).length,
    blocking: checks.filter(function (item) { return item.status === 'BLOCKING'; }).length
  };
  const recommendations = checks.filter(function (item) { return item.status !== 'PASS' && item.remediation; }).map(function (item) {
    return { checkId: item.id, label: item.label, status: item.status, action: item.remediation };
  });
  const report = {
    reference: buildSupportReference_('SANTE'),
    engineVersion: RELEASE_READINESS_ENGINE_VERSION,
    appVersion: APP_CONFIG.version,
    generatedAt: now.toISOString(),
    status: status,
    score: Math.max(0, Math.min(100, Math.round(score))),
    counts: counts,
    summary: releaseReadinessSummary_(status, counts),
    checks: checks,
    recommendations: recommendations
  };
  report.fingerprint = releaseReadinessFingerprint_(report);
  return report;
}

function safeReleaseReadinessCheck_(id, label, weight, callback) {
  try {
    const assessed = callback() || {};
    return releaseReadinessCheck_(id, label, assessed.status, weight, assessed.message, assessed.details, assessed.remediation);
  } catch (error) {
    return releaseReadinessCheck_(id, label, 'BLOCKING', weight,
      'Le contrôle n’a pas pu être exécuté.',
      { error: sanitizeSupportText_(error && error.message ? error.message : error, 220) },
      'Corrige l’erreur technique puis relance le rapport de santé.');
  }
}

function releaseReadinessCheck_(id, label, status, weight, message, details, remediation) {
  const normalizedStatus = ['PASS', 'WARNING', 'BLOCKING'].indexOf(String(status || '').toUpperCase()) >= 0
    ? String(status).toUpperCase() : 'BLOCKING';
  const normalizedWeight = Math.max(0, Number(weight) || 0);
  const ratio = normalizedStatus === 'PASS' ? 1 : (normalizedStatus === 'WARNING' ? 0.5 : 0);
  return {
    id: String(id || ''),
    label: String(label || id || ''),
    status: normalizedStatus,
    weight: normalizedWeight,
    score: Math.round(normalizedWeight * ratio),
    message: String(message || ''),
    details: details || {},
    remediation: String(remediation || '')
  };
}

function assessInstallationReadiness_(status, settings) {
  status = status || {};
  settings = settings || {};
  if (!status.installed || (status.missingSheets || []).length) {
    return {
      status: 'BLOCKING',
      message: 'L’installation est incomplète.',
      details: status,
      remediation: 'Exécute installCoordoDiscours puis vérifie que toutes les feuilles obligatoires existent.'
    };
  }
  const warnings = [];
  if (String(status.schemaVersion || '') !== String(INSTALLATION_SCHEMA_VERSION)) warnings.push('schéma ' + (status.schemaVersion || 'absent'));
  if (String(settings.VERSION || '') !== String(APP_CONFIG.version)) warnings.push('version installée ' + (settings.VERSION || 'absente'));
  if (String(status.timezone || '') !== 'America/Guadeloupe') warnings.push('fuseau ' + (status.timezone || 'absent'));
  if (warnings.length) {
    return {
      status: String(status.schemaVersion || '') !== String(INSTALLATION_SCHEMA_VERSION) ? 'BLOCKING' : 'WARNING',
      message: 'L’installation nécessite une mise à niveau : ' + warnings.join(', ') + '.',
      details: status,
      remediation: 'Exécute installCoordoDiscours et vérifie le fuseau horaire avant le déploiement.'
    };
  }
  return { status: 'PASS', message: 'Installation, schéma et version sont cohérents.', details: status, remediation: '' };
}

function assessIntegrityReadiness_(report) {
  report = report || { ok: false, issues: [], counts: {} };
  const errors = (report.issues || []).filter(function (item) { return item.severity === 'ERREUR'; });
  const warnings = (report.issues || []).filter(function (item) { return item.severity !== 'ERREUR'; });
  if (!report.ok || errors.length) {
    return {
      status: 'BLOCKING',
      message: errors.length + ' anomalie(s) bloquante(s) détectée(s).',
      details: { counts: report.counts || {}, issues: errors.slice(0, 12) },
      remediation: 'Corrige toutes les anomalies d’intégrité puis relance le contrôle.'
    };
  }
  if (warnings.length) {
    return {
      status: 'WARNING',
      message: warnings.length + ' avertissement(s) d’intégrité restent à examiner.',
      details: { counts: report.counts || {}, issues: warnings.slice(0, 12) },
      remediation: 'Examine les avertissements et documente ceux qui sont volontairement conservés.'
    };
  }
  return { status: 'PASS', message: 'Aucune anomalie d’intégrité détectée.', details: { counts: report.counts || {} }, remediation: '' };
}

function assessBackupReadiness_(event, now) {
  if (!event || !event.timestamp) {
    return {
      status: 'BLOCKING',
      message: 'Aucune sauvegarde récente n’est enregistrée dans l’historique.',
      details: {},
      remediation: 'Télécharge une sauvegarde complète depuis le module Sauvegardes avant le déploiement.'
    };
  }
  const ageDays = releaseAgeDays_(event.timestamp, now);
  const details = { timestamp: event.timestamp, displayDate: event.displayDate, ageDays: ageDays, fileName: event.entityId };
  if (ageDays > RELEASE_READINESS_BACKUP_BLOCKING_DAYS) {
    return { status: 'BLOCKING', message: 'La dernière sauvegarde date de ' + ageDays + ' jour(s).', details: details, remediation: 'Crée une nouvelle sauvegarde avant de poursuivre.' };
  }
  if (ageDays > RELEASE_READINESS_BACKUP_WARNING_DAYS) {
    return { status: 'WARNING', message: 'La sauvegarde a ' + ageDays + ' jour(s) et doit être renouvelée.', details: details, remediation: 'Crée une sauvegarde le jour de la mise en production.' };
  }
  return { status: 'PASS', message: 'Une sauvegarde récente est disponible.', details: details, remediation: '' };
}

function assessPerformanceReadiness_(report) {
  report = report || { totals: {}, operations: [] };
  const totals = report.totals || {};
  const calls = Number(totals.calls) || 0;
  const errors = Number(totals.errors) || 0;
  const slowCalls = Number(totals.slowCalls) || 0;
  const slowRatio = calls ? slowCalls / calls : 0;
  const details = {
    calls: calls,
    errors: errors,
    slowCalls: slowCalls,
    slowRatio: Math.round(slowRatio * 1000) / 1000,
    slowThresholdMs: report.slowThresholdMs || 0,
    operations: (report.operations || []).filter(function (item) { return item.status !== 'OK'; }).slice(0, 10)
  };
  if (errors >= RELEASE_READINESS_PERFORMANCE_ERROR_BLOCKING) {
    return { status: 'BLOCKING', message: errors + ' erreur(s) serveur ont été observées.', details: details, remediation: 'Analyse les opérations en erreur et réinitialise les mesures après correction.' };
  }
  if (!calls) {
    return { status: 'WARNING', message: 'Aucune mesure de performance n’est disponible pour cette fenêtre.', details: details, remediation: 'Utilise l’application pendant une période représentative puis relance le rapport.' };
  }
  if (errors > 0 || slowRatio >= RELEASE_READINESS_PERFORMANCE_SLOW_RATIO_WARNING || slowCalls >= 5) {
    return { status: 'WARNING', message: 'Des erreurs ou lenteurs serveur restent à surveiller.', details: details, remediation: 'Examine les opérations lentes dans Paramètres avant la mise en production.' };
  }
  return { status: 'PASS', message: 'Aucun signal de performance bloquant n’est détecté.', details: details, remediation: '' };
}

function assessAcceptanceReadiness_(event, now) {
  if (!event || !event.timestamp) {
    return { status: 'BLOCKING', message: 'Aucune recette d’acceptation n’est enregistrée.', details: {}, remediation: 'Exécute la recette guidée ou runAcceptanceTests avant le déploiement.' };
  }
  const result = event.details || {};
  const ageDays = releaseAgeDays_(event.timestamp, now);
  const details = {
    timestamp: event.timestamp,
    displayDate: event.displayDate,
    ageDays: ageDays,
    success: result.success === true,
    passed: Number(result.passed) || 0,
    failed: Number(result.failed) || 0,
    blockingFailed: Number(result.blockingFailed) || 0
  };
  if (result.success !== true || details.blockingFailed > 0) {
    return { status: 'BLOCKING', message: 'La dernière recette contient des échecs bloquants.', details: details, remediation: 'Corrige les tests en échec puis exécute une nouvelle recette.' };
  }
  if (ageDays > RELEASE_READINESS_ACCEPTANCE_BLOCKING_DAYS) {
    return { status: 'BLOCKING', message: 'La dernière recette réussie est trop ancienne (' + ageDays + ' jours).', details: details, remediation: 'Exécute une nouvelle recette sur la version actuelle.' };
  }
  if (ageDays > RELEASE_READINESS_ACCEPTANCE_WARNING_DAYS) {
    return { status: 'WARNING', message: 'La dernière recette réussie date de ' + ageDays + ' jour(s).', details: details, remediation: 'Rejoue la recette juste avant la mise en production.' };
  }
  return { status: 'PASS', message: 'La dernière recette d’acceptation est récente et réussie.', details: details, remediation: '' };
}

function assessDeviceAcceptanceReadiness_(summary) {
  summary = summary || { total: 0, passed: 0, failed: 0, pending: 0, complete: false, byDevice: [] };
  const details = {
    total: Number(summary.total) || 0,
    passed: Number(summary.passed) || 0,
    failed: Number(summary.failed) || 0,
    pending: Number(summary.pending) || 0,
    complete: summary.complete === true,
    byDevice: summary.byDevice || []
  };
  if (details.failed > 0) {
    return {
      status: 'BLOCKING',
      message: details.failed + ' contrôle(s) multi-écrans sont en échec.',
      details: details,
      remediation: 'Corrige les échecs puis rejoue les contrôles sur les trois formats d’écran.'
    };
  }
  if (!details.complete) {
    return {
      status: 'BLOCKING',
      message: details.pending + ' contrôle(s) multi-écrans restent à exécuter.',
      details: details,
      remediation: 'Valide tous les scénarios sur ordinateur, tablette et téléphone avant la production.'
    };
  }
  return { status: 'PASS', message: 'La recette multi-écrans est complète et réussie.', details: details, remediation: '' };
}

function releaseReadinessFingerprint_(report) {
  const stable = {
    appVersion: report && report.appVersion,
    engineVersion: report && report.engineVersion,
    status: report && report.status,
    score: report && report.score,
    checks: (report && report.checks || []).map(function (item) {
      return {
        id: item.id,
        status: item.status,
        score: item.score,
        weight: item.weight,
        message: item.message
      };
    })
  };
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, JSON.stringify(stable), Utilities.Charset.UTF_8);
  return bytes.map(function (value) {
    const normalized = value < 0 ? value + 256 : value;
    return ('0' + normalized.toString(16)).slice(-2);
  }).join('');
}

function releaseReadinessOverallStatus_(checks) {
  if ((checks || []).some(function (item) { return item.status === 'BLOCKING'; })) return 'BLOCKED';
  if ((checks || []).some(function (item) { return item.status === 'WARNING'; })) return 'ATTENTION';
  return 'READY';
}

function releaseReadinessSummary_(status, counts) {
  if (status === 'READY') return 'Tous les contrôles sont favorables. La mise en production peut être proposée.';
  if (status === 'BLOCKED') return counts.blocking + ' contrôle(s) bloquent la mise en production.';
  return counts.warning + ' point(s) nécessitent encore une décision ou une vérification.';
}

function latestReleaseAuditEvent_(action) {
  const rows = listHistory({ action: action, entity: 'APPLICATION', limit: 1 });
  return rows && rows.length ? rows[0] : null;
}

function releaseAgeDays_(timestamp, now) {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  const reference = now instanceof Date ? now : new Date(now || Date.now());
  if (isNaN(date.getTime()) || isNaN(reference.getTime())) return 9999;
  return Math.max(0, Math.floor((reference.getTime() - date.getTime()) / 86400000));
}

function executeReleaseAcceptanceStep_(stepId) {
  if (stepId === 'installation') {
    const assessed = assessInstallationReadiness_(getInstallationStatus(), getSettingsSnapshot_());
    return releaseReadinessCheck_('installation', 'Installation et structure', assessed.status, 0, assessed.message, assessed.details, assessed.remediation);
  }
  if (stepId === 'integrity') {
    const assessed = assessIntegrityReadiness_(getDataIntegrityReport_({ silent: true }));
    return releaseReadinessCheck_('integrity', 'Intégrité des données', assessed.status, 0, assessed.message, assessed.details, assessed.remediation);
  }
  if (stepId === 'backup') {
    const assessed = assessBackupReadiness_(latestReleaseAuditEvent_('SAUVEGARDE'), new Date());
    return releaseReadinessCheck_('backup', 'Sauvegarde récente', assessed.status, 0, assessed.message, assessed.details, assessed.remediation);
  }
  if (stepId === 'performance') {
    const assessed = assessPerformanceReadiness_(getServerPerformanceReport_());
    return releaseReadinessCheck_('performance', 'Performance et incidents', assessed.status, 0, assessed.message, assessed.details, assessed.remediation);
  }
  if (stepId === 'acceptance') {
    const tests = runAcceptanceTests();
    const assessed = tests.success
      ? { status: 'PASS', message: tests.passed + ' test(s) réussis sur ' + tests.total + '.', details: tests, remediation: '' }
      : { status: 'BLOCKING', message: tests.blockingFailed + ' échec(s) bloquant(s) pendant la recette.', details: tests, remediation: 'Corrige les tests en échec avant la mise en production.' };
    return releaseReadinessCheck_('acceptance', 'Recette interne', assessed.status, 0, assessed.message, assessed.details, assessed.remediation);
  }
  if (stepId === 'devices') {
    const assessed = assessDeviceAcceptanceReadiness_(getReleaseDeviceAcceptanceSummary_());
    return releaseReadinessCheck_('devices', 'Recette multi-écrans', assessed.status, 0, assessed.message, assessed.details, assessed.remediation);
  }
  if (stepId === 'final') {
    const report = buildReleaseReadinessReport_();
    const status = report.status === 'READY' ? 'PASS' : (report.status === 'ATTENTION' ? 'WARNING' : 'BLOCKING');
    return releaseReadinessCheck_('final', 'Décision de mise en production', status, 0, report.summary, { report: report },
      report.status === 'READY' ? '' : 'Traite les recommandations du rapport puis démarre une nouvelle recette.');
  }
  throw new Error('Étape de recette inconnue : ' + stepId);
}

function nextReleaseAcceptanceStep_(session) {
  const completed = (session && session.results || []).reduce(function (map, item) { map[item.id] = true; return map; }, {});
  return RELEASE_ACCEPTANCE_STEPS.find(function (step) { return !completed[step.id]; }) || null;
}

function readReleaseAcceptanceSession_() {
  let session = null;
  try {
    const raw = PropertiesService.getScriptProperties().getProperty(RELEASE_READINESS_SESSION_PROPERTY);
    session = raw ? JSON.parse(raw) : null;
  } catch (error) {
    session = null;
  }
  return session && typeof session === 'object' ? session : null;
}

function writeReleaseAcceptanceSession_(session) {
  const compact = compactReleaseAcceptanceSession_(session || {});
  PropertiesService.getScriptProperties().setProperty(RELEASE_READINESS_SESSION_PROPERTY, JSON.stringify(compact));
}

function compactReleaseAcceptanceSession_(session) {
  const compact = JSON.parse(JSON.stringify(session || {}));
  compact.results = (compact.results || []).map(function (result) {
    const copy = Object.assign({}, result);
    if (copy.id === 'acceptance' && copy.details) {
      copy.details = {
        success: copy.details.success === true,
        total: Number(copy.details.total) || 0,
        passed: Number(copy.details.passed) || 0,
        failed: Number(copy.details.failed) || 0,
        blockingFailed: Number(copy.details.blockingFailed) || 0,
        failedTests: (copy.details.tests || []).filter(function (item) { return !item.success; }).slice(0, 12).map(function (item) {
          return { name: item.name, blocking: item.blocking !== false, error: sanitizeSupportText_(item.error || item.message, 160) };
        })
      };
    } else if (copy.id === 'final' && copy.details && copy.details.report) {
      copy.details = { report: compactReleaseReadinessReport_(copy.details.report) };
    } else if (copy.details && JSON.stringify(copy.details).length > 1800) {
      copy.details = { summary: sanitizeSupportText_(JSON.stringify(copy.details), 1600) };
    }
    return copy;
  });
  if (compact.finalReport) compact.finalReport = compactReleaseReadinessReport_(compact.finalReport);
  return compact;
}

function compactReleaseReadinessReport_(report) {
  if (!report) return null;
  return {
    reference: report.reference,
    engineVersion: report.engineVersion,
    appVersion: report.appVersion,
    generatedAt: report.generatedAt,
    status: report.status,
    score: report.score,
    counts: report.counts,
    summary: report.summary,
    checks: (report.checks || []).map(function (check) {
      return {
        id: check.id,
        label: check.label,
        status: check.status,
        weight: check.weight,
        score: check.score,
        message: check.message,
        remediation: check.remediation
      };
    }),
    recommendations: report.recommendations || []
  };
}

function publicReleaseAcceptanceSession_(session) {
  if (!session) return null;
  return JSON.parse(JSON.stringify(session));
}
