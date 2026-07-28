const APP_CONFIG = Object.freeze({
  name: 'CoordoDiscours',
  version: '1.9 Stable',
  spreadsheetProperty: 'COORDODISCOURS_SPREADSHEET_ID',
  sheets: {
    settings: 'PARAMETRES',
    talks: 'DISCOURS',
    congregations: 'ASSEMBLEES',
    speakers: 'ORATEURS',
    speakerTalks: 'ORATEUR_DISCOURS',
    speakerAvailability: 'ORATEUR_DISPONIBILITES',
    events: 'PROGRAMMATIONS',
    hospitality: 'HOSPITALITE',
    invitations: 'INVITATIONS',
    users: 'UTILISATEURS',
    history: 'HISTORIQUE'
  },
  inactiveTalks: [59, 82, 122, 123]
});
