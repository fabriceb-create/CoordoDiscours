const ACCESS_ROLES = Object.freeze({
  ADMIN: { label: 'Administrateur', level: 30 },
  COORDINATEUR: { label: 'Coordinateur', level: 20 },
  CONSULTATION: { label: 'Consultation seule', level: 10 }
});

function getCurrentUserAccess() {
  const email = normalizeAccessEmail_(Session.getActiveUser().getEmail());
  const users = listAccessUsers_();
  const activeUsers = users.filter(user => user.active);
  let user = users.find(item => item.email === email && item.active);
  if (!activeUsers.length && email) user = saveAccessUser({ email: email, name: '', role: 'ADMIN', active: true }, true);
  const role = user ? user.role : 'CONSULTATION';
  return { email: email || 'Utilisateur Google', name: user ? user.name : '', role: role, roleLabel: ACCESS_ROLES[role].label, active: Boolean(user), canEdit: role === 'ADMIN' || role === 'COORDINATEUR', canAdminister: role === 'ADMIN' };
}

function listAccessUsers() { assertAdminAccess_(); return listAccessUsers_(); }

function saveAccessUser(payload, bootstrap) {
  if (!bootstrap) assertAdminAccess_();
  const data = payload || {};
  const email = normalizeAccessEmail_(data.email);
  const role = String(data.role || 'CONSULTATION').toUpperCase();
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) throw new Error('Adresse e-mail invalide.');
  if (!ACCESS_ROLES[role]) throw new Error('Rôle utilisateur invalide.');
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getDatabase_().getSheetByName(APP_CONFIG.sheets.users);
    if (!sheet) throw new Error('La feuille UTILISATEURS est introuvable.');
    const rows = sheet.getLastRow() > 1 ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 6).getValues() : [];
    const index = rows.findIndex(row => normalizeAccessEmail_(row[0]) === email);
    if (index >= 0 && !bootstrap) assertEntityVersion_('UTILISATEUR', email, data.version);
    const before = index >= 0 ? listAccessUsers_().find(function (user) { return user.email === email; }) || {} : {};
    const active = data.active == null ? (index >= 0 ? before.active : true) : data.active !== false && String(data.active).toLowerCase() !== 'false';
    const values = [email, String(data.name || '').trim(), role, active, new Date(), Session.getActiveUser().getEmail() || 'Utilisateur'];
    if (index >= 0) sheet.getRange(index + 2, 1, 1, 6).setValues([values]); else sheet.appendRow(values);
    advanceEntityVersion_('UTILISATEUR', email);
    const after = listAccessUsers_().find(function (user) { return user.email === email; }) || { email: email, name: values[1], role: role, active: values[3] };
    logAction_(index >= 0 ? 'MODIFICATION' : 'CREATION', 'UTILISATEUR', email, buildAuditDetails_(before, after, { bootstrap: Boolean(bootstrap) }));
    return after;
  } finally {
    lock.releaseLock();
  }
}

function setAccessUserActive(email, active, expectedVersion) {
  assertAdminAccess_();
  const normalized = normalizeAccessEmail_(email);
  const enabled = Boolean(active);
  const current = getCurrentUserAccess();
  if (current.email === normalized && !enabled) throw new Error('Tu ne peux pas désactiver ton propre accès administrateur.');
  const target = listAccessUsers_().find(user => user.email === normalized);
  if (!target) throw new Error('Utilisateur introuvable.');
  return saveAccessUser(Object.assign({}, target, { active: enabled, version: expectedVersion || target.version }));
}

function assertAccess_(minimumRole) {
  const current = getCurrentUserAccess();
  const expected = ACCESS_ROLES[minimumRole] || ACCESS_ROLES.CONSULTATION;
  const actual = ACCESS_ROLES[current.role] || ACCESS_ROLES.CONSULTATION;
  if (!current.active || actual.level < expected.level) { logDeniedAccess_(current, minimumRole); throw new Error('Accès insuffisant pour effectuer cette opération.'); }
  return current;
}
function assertEditAccess_() { return assertAccess_('COORDINATEUR'); }
function assertAdminAccess_() { return assertAccess_('ADMIN'); }

function logDeniedAccess_(current, minimumRole) {
  try { logAction_('ACCES_REFUSE', 'SECURITE', current.email || 'INCONNU', { role: current.role || 'INCONNU', minimumRole: minimumRole }); }
  catch (error) { console.warn('Impossible de journaliser le refus d’accès : ' + error.message); }
}

function listAccessUsers_() {
  const sheet = getDatabase_().getSheetByName(APP_CONFIG.sheets.users);
  if (!sheet || sheet.getLastRow() < 2) return [];
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, 6).getValues().map(row => {
    const email = normalizeAccessEmail_(row[0]);
    const role = ACCESS_ROLES[String(row[2] || '').toUpperCase()] ? String(row[2]).toUpperCase() : 'CONSULTATION';
    const metadata = getEntityVersion_('UTILISATEUR', email);
    return {
      email: email,
      name: String(row[1] || ''),
      role: role,
      roleLabel: ACCESS_ROLES[role].label,
      active: row[3] !== false,
      recordUpdatedAt: row[4] instanceof Date ? row[4].toISOString() : String(row[4] || ''),
      recordUpdatedBy: String(row[5] || ''),
      version: metadata.version,
      updatedAt: metadata.updatedAt,
      updatedBy: metadata.updatedBy
    };
  }).filter(user => user.email);
}
function normalizeAccessEmail_(value) { return String(value || '').trim().toLowerCase(); }
