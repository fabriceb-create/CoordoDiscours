const SERVER_CACHE_TTL_SECONDS = 60;
const SERVER_CACHE_KEYS = Object.freeze({
  SETTINGS: 'SETTINGS_SNAPSHOT_V1',
  PLANNING_OPTIONS: 'PLANNING_OPTIONS_V1',
  COMMUNICATION_OPTIONS: 'COMMUNICATION_OPTIONS_V1',
  VERSION_DISPLAY_CONTEXT: 'VERSION_DISPLAY_CONTEXT_V1'
});

function getCachedServerValue_(key, loader, ttlSeconds) {
  const cache = CacheService.getScriptCache();
  const cacheKey = serverCacheKey_(key);
  try {
    const raw = cache.get(cacheKey);
    if (raw) return JSON.parse(raw);
  } catch (error) {
    console.warn('Lecture du cache serveur ignorée : ' + (error.message || error));
  }

  const value = loader();
  try {
    cache.put(cacheKey, JSON.stringify(value), Math.max(1, Number(ttlSeconds) || SERVER_CACHE_TTL_SECONDS));
  } catch (error) {
    console.warn('Écriture du cache serveur ignorée : ' + (error.message || error));
  }
  return value;
}

function invalidateServerCache_(keys) {
  const list = Array.isArray(keys) ? keys : [keys];
  try {
    CacheService.getScriptCache().removeAll(list.filter(Boolean).map(serverCacheKey_));
  } catch (error) {
    console.warn('Invalidation du cache serveur ignorée : ' + (error.message || error));
  }
}

function invalidateSettingsCache_() {
  invalidateServerCache_(SERVER_CACHE_KEYS.SETTINGS);
}

function invalidateReferenceServerCaches_() {
  invalidateServerCache_([SERVER_CACHE_KEYS.PLANNING_OPTIONS, SERVER_CACHE_KEYS.COMMUNICATION_OPTIONS, SERVER_CACHE_KEYS.VERSION_DISPLAY_CONTEXT]);
}

function invalidatePlanningServerCaches_() {
  invalidateServerCache_([SERVER_CACHE_KEYS.COMMUNICATION_OPTIONS, SERVER_CACHE_KEYS.VERSION_DISPLAY_CONTEXT]);
}

function invalidateAllServerCaches_() {
  invalidateServerCache_(Object.keys(SERVER_CACHE_KEYS).map(function (key) { return SERVER_CACHE_KEYS[key]; }));
}

function getSettingsSnapshot_() {
  return getCachedServerValue_(SERVER_CACHE_KEYS.SETTINGS, function () {
    const sheet = getDatabase_().getSheetByName(APP_CONFIG.sheets.settings);
    if (!sheet || sheet.getLastRow() < 2) return {};
    return sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues().reduce(function (map, row) {
      const key = String(row[0] || '').trim();
      if (key) map[key] = row[1];
      return map;
    }, {});
  }, SERVER_CACHE_TTL_SECONDS);
}

function serverCacheKey_(key) {
  return [APP_CONFIG.name, APP_CONFIG.version, String(key || '')].join(':');
}
