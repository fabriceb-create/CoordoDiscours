function runSmokeTests() {
  const results = [];

  function test_(name, callback) {
    try {
      callback();
      results.push({ test: name, success: true, message: 'OK' });
    } catch (error) {
      results.push({ test: name, success: false, message: error.message });
    }
  }

  test_('Base de données accessible', function () {
    const ss = getDatabase_();
    if (!ss || !ss.getId()) throw new Error('Base inaccessible.');
  });

  test_('Toutes les feuilles existent', function () {
    const ss = getDatabase_();
    Object.values(APP_CONFIG.sheets).forEach(function (name) {
      if (!ss.getSheetByName(name)) throw new Error('Feuille manquante : ' + name);
    });
  });

  test_('Répertoire des assemblées lisible', function () {
    const rows = listCongregations('', true);
    if (!Array.isArray(rows)) throw new Error('Résultat invalide.');
  });

  test_('Répertoire des orateurs lisible', function () {
    const rows = listSpeakers('', true);
    if (!Array.isArray(rows)) throw new Error('Résultat invalide.');
  });

  const success = results.every(function (item) { return item.success; });
  logAction_('DIAGNOSTIC', 'APPLICATION', APP_CONFIG.version, results);
  return { success: success, results: results };
}
