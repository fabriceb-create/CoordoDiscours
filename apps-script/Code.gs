function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle(APP_CONFIG.name)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  const content = HtmlService.createHtmlOutputFromFile(filename).getContent();
  if (filename === 'Scripts') {
    return content + '\n' + HtmlService.createHtmlOutputFromFile('I18nScripts').getContent();
  }
  return content;
}

function setupApplication() {
  const result = setupDatabase_();
  logAction_('INSTALLATION', 'APPLICATION', APP_CONFIG.version, result);
  return result;
}

function getAppBootstrap() {
  const ss = getDatabase_();
  return {
    appName: APP_CONFIG.name,
    version: APP_CONFIG.version,
    congregation: getSetting_('ASSEMBLEE') || 'Basse-Terre',
    language: getInterfaceLanguage(),
    spreadsheetUrl: ss.getUrl(),
    installed: Boolean(ss)
  };
}

function getSetting_(key) {
  const ss = getDatabase_();
  const sheet = ss.getSheetByName(APP_CONFIG.sheets.settings);
  if (!sheet || sheet.getLastRow() < 2) return '';

  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues();
  const row = values.find(item => String(item[0]) === String(key));
  return row ? row[1] : '';
}

function logAction_(action, entity, entityId, details) {
  const ss = getDatabase_();
  const sheet = ss.getSheetByName(APP_CONFIG.sheets.history);
  if (!sheet) return;

  sheet.appendRow([
    new Date(),
    Session.getActiveUser().getEmail() || 'Utilisateur',
    action,
    entity,
    entityId,
    JSON.stringify(details || {})
  ]);
}
