function getDatabase_() {
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) {
    PropertiesService.getScriptProperties().setProperty(
      APP_CONFIG.spreadsheetProperty,
      active.getId()
    );
    return active;
  }

  const storedId = PropertiesService.getScriptProperties()
    .getProperty(APP_CONFIG.spreadsheetProperty);

  if (storedId) {
    return SpreadsheetApp.openById(storedId);
  }

  const created = SpreadsheetApp.create(
    APP_CONFIG.name + ' - Données'
  );
  PropertiesService.getScriptProperties().setProperty(
    APP_CONFIG.spreadsheetProperty,
    created.getId()
  );
  return created;
}

function ensureSheet_(spreadsheet, name, headers) {
  let sheet = spreadsheet.getSheetByName(name);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(name);
  }

  if (sheet.getLastRow() === 0 && headers && headers.length) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.autoResizeColumns(1, headers.length);
  }

  return sheet;
}

function setupDatabase_() {
  const ss = getDatabase_();

  ensureSheet_(ss, APP_CONFIG.sheets.settings, [
    'CLE', 'VALEUR', 'DESCRIPTION'
  ]);
  ensureSheet_(ss, APP_CONFIG.sheets.talks, [
    'NUMERO', 'TITRE', 'ACTIF', 'DATE_MISE_A_JOUR'
  ]);
  ensureSheet_(ss, APP_CONFIG.sheets.congregations, [
    'ID', 'NOM', 'COORDINATEUR', 'TELEPHONE', 'EMAIL',
    'ADRESSE', 'JOUR_REUNION', 'HEURE_REUNION', 'ACTIF'
  ]);
  ensureSheet_(ss, APP_CONFIG.sheets.speakers, [
    'ID', 'NOM', 'PRENOM', 'TYPE', 'ASSEMBLEE_ID',
    'TELEPHONE', 'EMAIL', 'ACTIF', 'NOTES'
  ]);
  ensureSheet_(ss, APP_CONFIG.sheets.speakerTalks, [
    'ORATEUR_ID', 'DISCOURS_NUMERO', 'FAVORI', 'DATE_AJOUT'
  ]);
  ensureSheet_(ss, APP_CONFIG.sheets.events, [
    'ID', 'DATE', 'HEURE', 'ORATEUR_ID', 'DISCOURS_NUMERO',
    'STATUT', 'ASSEMBLEE_ORIGINE_ID', 'NOTES'
  ]);
  ensureSheet_(ss, APP_CONFIG.sheets.hospitality, [
    'ID', 'PROGRAMMATION_ID', 'GROUPE', 'STATUT', 'CONTACT', 'NOTES'
  ]);
  ensureSheet_(ss, APP_CONFIG.sheets.invitations, [
    'ID', 'PROGRAMMATION_ID', 'DATE_ENVOI', 'STATUT', 'DESTINATAIRE', 'NOTES'
  ]);
  ensureSheet_(ss, APP_CONFIG.sheets.users, [
    'EMAIL', 'NOM', 'ROLE', 'ACTIF', 'DATE_MISE_A_JOUR', 'MODIFIE_PAR'
  ]);
  ensureSheet_(ss, APP_CONFIG.sheets.history, [
    'DATE_HEURE', 'UTILISATEUR', 'ACTION', 'ENTITE', 'ENTITE_ID', 'DETAILS'
  ]);

  seedSettings_(ss);
  seedInactiveTalks_(ss);

  return {
    spreadsheetId: ss.getId(),
    spreadsheetUrl: ss.getUrl(),
    sheets: Object.values(APP_CONFIG.sheets)
  };
}

function seedSettings_(ss) {
  const sheet = ss.getSheetByName(APP_CONFIG.sheets.settings);
  if (sheet.getLastRow() > 1) return;

  sheet.getRange(2, 1, 5, 3).setValues([
    ['ASSEMBLEE', 'Basse-Terre', 'Assemblée utilisatrice'],
    ['VERSION', APP_CONFIG.version, 'Version installée'],
    ['LANGUE_INTERFACE', 'fr', 'Langue utilisée dans l’interface'],
    ['ALERTE_REPETITION_MOIS', '12', 'Délai d’alerte de répétition'],
    ['ASSISTANT_LECTURE_SEULE', 'OUI', 'Droits de l’assistant']
  ]);
}

function seedInactiveTalks_(ss) {
  const sheet = ss.getSheetByName(APP_CONFIG.sheets.talks);
  const existing = sheet.getLastRow() > 1
    ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues().flat()
    : [];

  const rows = APP_CONFIG.inactiveTalks
    .filter(number => !existing.includes(number))
    .map(number => [number, '', false, new Date()]);

  if (rows.length) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, 4).setValues(rows);
  }
}