const BACKUP_FORMAT_VERSION = 1;

function getBackupSummary() {
  const ss = getDatabase_();
  const sheets = Object.values(APP_CONFIG.sheets).map(name => {
    const sheet = ss.getSheetByName(name);
    return {
      name,
      exists: Boolean(sheet),
      rows: sheet ? Math.max(0, sheet.getLastRow() - 1) : 0,
      columns: sheet ? sheet.getLastColumn() : 0
    };
  });
  return {
    databaseName: ss.getName(),
    spreadsheetUrl: ss.getUrl(),
    generatedAt: new Date().toISOString(),
    sheets,
    totalRows: sheets.reduce((sum, item) => sum + item.rows, 0)
  };
}

function createApplicationBackup() {
  const payload = buildBackupPayload_();
  const json = JSON.stringify(payload, null, 2);
  const fileName = buildBackupFileName_();
  logAction_('SAUVEGARDE', 'APPLICATION', fileName, {
    sheets: payload.sheets.length,
    rows: payload.sheets.reduce((sum, item) => sum + Math.max(0, item.values.length - 1), 0)
  });
  return { fileName, mimeType: 'application/json', content: json, summary: backupSummaryFromPayload_(payload) };
}

function inspectApplicationBackup(content) {
  const payload = parseAndValidateBackup_(content);
  return backupSummaryFromPayload_(payload);
}

function restoreApplicationBackup(content, confirmation) {
  if (String(confirmation || '').trim().toUpperCase() !== 'RESTAURER') {
    throw new Error('La confirmation RESTAURER est obligatoire.');
  }

  const payload = parseAndValidateBackup_(content);
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const safetyCopy = createDriveSafetyBackup_();
    const ss = getDatabase_();
    const allowedSheets = new Set(Object.values(APP_CONFIG.sheets));

    payload.sheets.forEach(item => {
      if (!allowedSheets.has(item.name)) return;
      const sheet = ss.getSheetByName(item.name) || ss.insertSheet(item.name);
      sheet.clearContents();
      if (item.values.length && item.values[0].length) {
        sheet.getRange(1, 1, item.values.length, item.values[0].length).setValues(item.values);
        sheet.setFrozenRows(1);
      }
    });

    setupDatabase_();
    logAction_('RESTAURATION', 'APPLICATION', payload.createdAt || 'SAUVEGARDE', {
      sourceVersion: payload.applicationVersion,
      formatVersion: payload.formatVersion,
      safetyBackupFileId: safetyCopy.id
    });

    return {
      ok: true,
      message: 'Restauration terminée.',
      safetyBackupName: safetyCopy.name,
      summary: getBackupSummary()
    };
  } finally {
    lock.releaseLock();
  }
}

function buildBackupPayload_() {
  const ss = getDatabase_();
  return {
    product: APP_CONFIG.name,
    formatVersion: BACKUP_FORMAT_VERSION,
    applicationVersion: APP_CONFIG.version,
    createdAt: new Date().toISOString(),
    spreadsheetId: ss.getId(),
    spreadsheetName: ss.getName(),
    sheets: Object.values(APP_CONFIG.sheets).map(name => {
      const sheet = ss.getSheetByName(name);
      if (!sheet || !sheet.getLastRow() || !sheet.getLastColumn()) return { name, values: [] };
      return { name, values: sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn()).getValues() };
    })
  };
}

function parseAndValidateBackup_(content) {
  let payload;
  try {
    payload = typeof content === 'string' ? JSON.parse(content) : content;
  } catch (error) {
    throw new Error('Le fichier de sauvegarde n’est pas un JSON valide.');
  }
  if (!payload || payload.product !== APP_CONFIG.name) throw new Error('Cette sauvegarde ne correspond pas à CoordoDiscours.');
  if (Number(payload.formatVersion) !== BACKUP_FORMAT_VERSION) throw new Error('Version de sauvegarde non prise en charge.');
  if (!Array.isArray(payload.sheets)) throw new Error('La liste des feuilles est absente.');

  const allowed = new Set(Object.values(APP_CONFIG.sheets));
  const names = new Set();
  let totalCells = 0;
  payload.sheets.forEach(item => {
    if (!item || !allowed.has(item.name)) throw new Error('Feuille inconnue dans la sauvegarde : ' + (item && item.name));
    if (names.has(item.name)) throw new Error('Feuille dupliquée dans la sauvegarde : ' + item.name);
    names.add(item.name);
    if (!Array.isArray(item.values)) throw new Error('Données invalides pour la feuille ' + item.name + '.');
    const width = item.values.length ? item.values[0].length : 0;
    item.values.forEach(row => {
      if (!Array.isArray(row) || row.length !== width) throw new Error('Largeur incohérente dans la feuille ' + item.name + '.');
      totalCells += row.length;
    });
  });
  if (totalCells > 500000) throw new Error('La sauvegarde dépasse la limite de sécurité de 500 000 cellules.');
  return payload;
}

function backupSummaryFromPayload_(payload) {
  return {
    product: payload.product,
    formatVersion: payload.formatVersion,
    applicationVersion: payload.applicationVersion,
    createdAt: payload.createdAt,
    spreadsheetName: payload.spreadsheetName,
    sheets: payload.sheets.map(item => ({
      name: item.name,
      rows: Math.max(0, item.values.length - 1),
      columns: item.values.length ? item.values[0].length : 0
    }))
  };
}

function createDriveSafetyBackup_() {
  const payload = buildBackupPayload_();
  const name = buildBackupFileName_().replace('.json', '-avant-restauration.json');
  const file = DriveApp.createFile(name, JSON.stringify(payload, null, 2), MimeType.PLAIN_TEXT);
  return { id: file.getId(), name: file.getName() };
}

function buildBackupFileName_() {
  const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd-HHmmss');
  const congregation = String(getSetting_('ASSEMBLEE') || 'assemblee').replace(/[^a-zA-Z0-9_-]+/g, '-');
  return 'CoordoDiscours-' + congregation + '-' + stamp + '.json';
}
