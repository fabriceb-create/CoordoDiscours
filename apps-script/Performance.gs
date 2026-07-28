const SERVER_PERFORMANCE_CACHE_KEY = 'COORDODISCOURS_SERVER_PERFORMANCE_V1';
const SERVER_PERFORMANCE_TTL_SECONDS = 21600;
const SERVER_PERFORMANCE_SLOW_THRESHOLD_MS = 1500;
const SERVER_PERFORMANCE_MAX_OPERATIONS = 60;

function measureServerOperation_(operation, callback, context) {
  const startedAt = Date.now();
  let failed = false;
  try {
    return callback();
  } catch (error) {
    failed = true;
    throw error;
  } finally {
    recordServerPerformance_(operation, Math.max(0, Date.now() - startedAt), failed, context);
  }
}

function recordServerPerformance_(operation, durationMs, failed, context) {
  try {
    const cache = CacheService.getScriptCache();
    const state = readServerPerformanceState_(cache);
    const key = normalizeServerPerformanceOperation_(operation);
    const now = new Date().toISOString();
    const current = state.operations[key] || {
      operation: key,
      count: 0,
      totalMs: 0,
      minMs: null,
      maxMs: 0,
      lastMs: 0,
      slowCount: 0,
      errorCount: 0,
      lastAt: '',
      lastContext: {}
    };
    const duration = Math.max(0, Number(durationMs) || 0);
    current.count += 1;
    current.totalMs += duration;
    current.minMs = current.minMs == null ? duration : Math.min(current.minMs, duration);
    current.maxMs = Math.max(current.maxMs, duration);
    current.lastMs = duration;
    current.slowCount += duration >= SERVER_PERFORMANCE_SLOW_THRESHOLD_MS ? 1 : 0;
    current.errorCount += failed ? 1 : 0;
    current.lastAt = now;
    current.lastContext = sanitizeServerPerformanceContext_(context);
    state.operations[key] = current;
    state.updatedAt = now;
    trimServerPerformanceOperations_(state);
    cache.put(SERVER_PERFORMANCE_CACHE_KEY, JSON.stringify(state), SERVER_PERFORMANCE_TTL_SECONDS);
  } catch (error) {
    console.warn('Mesure de performance ignorée : ' + (error.message || error));
  }
}

function getServerPerformanceReport() {
  assertAdminAccess_();
  const state = readServerPerformanceState_(CacheService.getScriptCache());
  const operations = Object.keys(state.operations).map(function (key) {
    const item = state.operations[key];
    const count = Number(item.count) || 0;
    const average = count ? Math.round((Number(item.totalMs) || 0) / count) : 0;
    return {
      operation: key,
      count: count,
      averageMs: average,
      minMs: item.minMs == null ? 0 : Number(item.minMs),
      maxMs: Number(item.maxMs) || 0,
      lastMs: Number(item.lastMs) || 0,
      slowCount: Number(item.slowCount) || 0,
      errorCount: Number(item.errorCount) || 0,
      lastAt: String(item.lastAt || ''),
      lastContext: item.lastContext || {},
      status: item.errorCount ? 'ERROR' : (item.slowCount ? 'SLOW' : 'OK')
    };
  }).sort(function (a, b) {
    return b.averageMs - a.averageMs || b.maxMs - a.maxMs || a.operation.localeCompare(b.operation, 'fr');
  });
  return {
    generatedAt: new Date().toISOString(),
    windowStartedAt: state.startedAt,
    updatedAt: state.updatedAt,
    expiresAfterSeconds: SERVER_PERFORMANCE_TTL_SECONDS,
    slowThresholdMs: SERVER_PERFORMANCE_SLOW_THRESHOLD_MS,
    totals: {
      operations: operations.length,
      calls: operations.reduce(function (sum, item) { return sum + item.count; }, 0),
      slowCalls: operations.reduce(function (sum, item) { return sum + item.slowCount; }, 0),
      errors: operations.reduce(function (sum, item) { return sum + item.errorCount; }, 0)
    },
    operations: operations
  };
}

function resetServerPerformanceReport() {
  assertAdminAccess_();
  CacheService.getScriptCache().remove(SERVER_PERFORMANCE_CACHE_KEY);
  const result = getServerPerformanceReport();
  logAction_('REINITIALISATION_PERFORMANCE', 'APPLICATION', APP_CONFIG.version, {
    engine: 'SERVER_PERFORMANCE_V1',
    resetAt: result.generatedAt
  });
  return result;
}

function readServerPerformanceState_(cache) {
  let state = null;
  try {
    const raw = cache.get(SERVER_PERFORMANCE_CACHE_KEY);
    state = raw ? JSON.parse(raw) : null;
  } catch (error) {
    state = null;
  }
  if (!state || typeof state !== 'object' || !state.operations || typeof state.operations !== 'object') {
    const now = new Date().toISOString();
    state = { startedAt: now, updatedAt: now, operations: {} };
  }
  return state;
}

function normalizeServerPerformanceOperation_(operation) {
  const value = String(operation || 'operation-inconnue').replace(/[^a-zA-Z0-9_.:-]+/g, '-');
  return value.slice(0, 80) || 'operation-inconnue';
}

function sanitizeServerPerformanceContext_(context) {
  if (!context || typeof context !== 'object') return {};
  return Object.keys(context).slice(0, 8).reduce(function (result, key) {
    const value = context[key];
    if (value == null || ['string', 'number', 'boolean'].indexOf(typeof value) !== -1) {
      result[String(key).slice(0, 40)] = typeof value === 'string' ? value.slice(0, 120) : value;
    }
    return result;
  }, {});
}

function trimServerPerformanceOperations_(state) {
  const keys = Object.keys(state.operations || {});
  if (keys.length <= SERVER_PERFORMANCE_MAX_OPERATIONS) return;
  keys.sort(function (a, b) {
    return String(state.operations[a].lastAt || '').localeCompare(String(state.operations[b].lastAt || ''));
  }).slice(0, keys.length - SERVER_PERFORMANCE_MAX_OPERATIONS).forEach(function (key) {
    delete state.operations[key];
  });
}
