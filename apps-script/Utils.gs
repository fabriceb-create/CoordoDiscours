function newId_() {
  return Utilities.getUuid();
}

function normalizeText_(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function sheetRowsAsObjects_(sheet) {
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();
  if (lastRow < 2 || lastColumn === 0) return [];

  const values = sheet.getRange(1, 1, lastRow, lastColumn).getValues();
  const headers = values.shift().map(String);
  return values.map(function (row, index) {
    const item = { _row: index + 2 };
    headers.forEach(function (header, columnIndex) {
      item[header] = row[columnIndex];
    });
    return item;
  });
}

function findRowById_(sheet, id) {
  if (!id || sheet.getLastRow() < 2) return 0;
  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
  const index = values.findIndex(function (row) {
    return String(row[0]) === String(id);
  });
  return index === -1 ? 0 : index + 2;
}

function booleanValue_(value) {
  return value === true || String(value).toUpperCase() === 'OUI' || String(value).toUpperCase() === 'TRUE';
}

function requiredText_(value, label) {
  const text = String(value || '').trim();
  if (!text) throw new Error(label + ' est obligatoire.');
  return text;
}

function sanitizeEmail_(value) {
  const email = String(value || '').trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Adresse e-mail invalide.');
  }
  return email;
}

function buildAuditDetails_(before, after, extra) {
  const previous = auditPlainObject_(before);
  const current = auditPlainObject_(after);
  const ignored = { displayDate: true, fullName: true, congregationName: true, roleLabel: true, updatedAt: true, updatedBy: true };
  const keys = Array.from(new Set(Object.keys(previous).concat(Object.keys(current))))
    .filter(function (key) { return !ignored[key] && key.charAt(0) !== '_'; })
    .sort();
  const changes = {};
  const changedFields = [];

  keys.forEach(function (key) {
    const oldValue = auditComparableValue_(previous[key]);
    const newValue = auditComparableValue_(current[key]);
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changes[key] = { before: oldValue, after: newValue };
      changedFields.push(key);
    }
  });

  return Object.assign({}, extra || {}, {
    before: previous,
    after: current,
    changes: changes,
    changedFields: changedFields
  });
}

function auditPlainObject_(value) {
  if (!value || typeof value !== 'object') return {};
  return Object.keys(value).reduce(function (result, key) {
    if (typeof value[key] !== 'function') result[key] = auditComparableValue_(value[key]);
    return result;
  }, {});
}

function auditComparableValue_(value) {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(auditComparableValue_);
  if (value && typeof value === 'object') return auditPlainObject_(value);
  if (value === undefined) return null;
  return value;
}
