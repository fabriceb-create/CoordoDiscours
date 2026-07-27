function listHistory(filters) {
  filters = filters || {};
  const ss = getDatabase_();
  const sheet = ss.getSheetByName(APP_CONFIG.sheets.history);
  if (!sheet || sheet.getLastRow() < 2) return [];

  const query = normalizeText_(filters.query);
  const action = String(filters.action || '').trim().toUpperCase();
  const entity = String(filters.entity || '').trim().toUpperCase();
  const startDate = parseHistoryDate_(filters.startDate, false);
  const endDate = parseHistoryDate_(filters.endDate, true);
  const limit = Math.min(Math.max(Number(filters.limit) || 250, 1), 1000);

  return sheet.getRange(2, 1, sheet.getLastRow() - 1, 6).getValues()
    .map(function (row, index) {
      const date = row[0] instanceof Date ? row[0] : new Date(row[0]);
      const details = parseHistoryDetails_(row[5]);
      return {
        row: index + 2,
        timestamp: isNaN(date.getTime()) ? '' : date.toISOString(),
        displayDate: isNaN(date.getTime()) ? '' : Utilities.formatDate(date, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm'),
        user: String(row[1] || 'Utilisateur'),
        action: String(row[2] || '').toUpperCase(),
        entity: String(row[3] || '').toUpperCase(),
        entityId: String(row[4] || ''),
        details: details,
        detailsText: historyDetailsText_(details)
      };
    })
    .filter(function (item) {
      const date = item.timestamp ? new Date(item.timestamp) : null;
      if (action && item.action !== action) return false;
      if (entity && item.entity !== entity) return false;
      if (startDate && (!date || date < startDate)) return false;
      if (endDate && (!date || date > endDate)) return false;
      if (!query) return true;
      return normalizeText_([
        item.displayDate, item.user, item.action, item.entity,
        item.entityId, item.detailsText
      ].join(' ')).includes(query);
    })
    .sort(function (a, b) { return String(b.timestamp).localeCompare(String(a.timestamp)); })
    .slice(0, limit);
}

function getHistoryFilterOptions() {
  const rows = listHistory({ limit: 1000 });
  return {
    actions: Array.from(new Set(rows.map(function (item) { return item.action; }).filter(Boolean))).sort(),
    entities: Array.from(new Set(rows.map(function (item) { return item.entity; }).filter(Boolean))).sort()
  };
}

function parseHistoryDetails_(value) {
  if (value === null || value === undefined || value === '') return {};
  if (typeof value === 'object') return value;
  try { return JSON.parse(String(value)); }
  catch (error) { return { information: String(value) }; }
}

function historyDetailsText_(details) {
  if (!details || typeof details !== 'object') return String(details || '');
  return Object.keys(details).map(function (key) {
    const value = details[key];
    return key + ': ' + (typeof value === 'object' ? JSON.stringify(value) : String(value));
  }).join(' · ');
}

function parseHistoryDate_(value, endOfDay) {
  const text = String(value || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const date = new Date(text + (endOfDay ? 'T23:59:59.999' : 'T00:00:00.000'));
  return isNaN(date.getTime()) ? null : date;
}
