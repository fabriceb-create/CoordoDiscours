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

  // Lors d'une première installation, le propriétaire devient administrateur.
  if (!activeUsers.length && email) {
    user = saveAccessUser({ email: email, name: '', role: 'ADMIN', active: true }, true);
  }

  const role = user ? user.role : 'CONSULTATION';
  return {
    email: email || 'Utilisateur Google',
    name: user ? user.name : '',
    role: role,
    roleLabel: ACCESS_ROLES[role].label,
    active: Boolean(user),
    canEdit: role === 'ADMIN' || role === 'COORDINATEUR',
    canAdminister: role === 'ADMIN'
  };
}

function listAccessUsers() {
  assertAccess_('ADMIN');
  return listAccessUsers_();
}

function saveAccessUser(payload, bootstrap) {
  if (!bootstrap) assertAccess_('ADMIN');
  const data = payload || {};
  const email = normalizeAccessEmail_(data.email);
  const role = String(data.role || 'CONSULTATION').toUpperCase();
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) throw new Error('Adresse e-mail invalide.');
  if (!ACCESS_ROLES[role]) throw new Error('Rôle utilisateur invalide.');

  const ss = getDatabase_();
  const sheet = ss.getSheetByName(APP_CONFIG.sheets.users);
  if (!sheet) throw new Error('La feuille UTILISATEURS est introuvable.');
  const rows = sheet.getLastRow() > 1 ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 6).getValues() : [];
  const index = rows.findIndex(row => normalizeAccessEmail_(row[0]) === email);
  const now = new Date();
  const values = [email, String(data.name || '').trim(), role, data.active === false ? false : true, now, Session.getActiveUser().getEmail() || 'Utilisateur'];
  if (index >= 0) sheet.getRange(index + 2, 1, 1, 6).setValues([values]);
  else sheet.appendRow(values);

  logAction_(index >= 0 ? 'MODIFICATION' : 'CREATION', 'UTILISATEUR', email, { role: role, active: values[3] });
  return { email: email, name: values[1], role: role, roleLabel: ACCESS_ROLES[role].label, active: values[3] };
}

function setAccessUserActive(email, active) {
  assertAccess_('ADMIN');
  const normalized = normalizeAccessEmail_(email);
  const current = getCurrentUserAccess();
  if (current.email === normalized && active === false) throw new Error('Tu ne peux pas désactiver ton propre accès administrateur.');
  const users = listAccessUsers_();
  const target = users.find(user => user.email === normalized);
  if (!target) throw new Error('Utilisateur introuvable.');
  return saveAccessUser({ ...target, active: Boolean(active) });
}

function assertAccess_(minimumRole) {
  const current = getCurrentUserAccess();
  const expected = ACCESS_ROLES[minimumRole] || ACCESS_ROLES.CONSULTATION;
  const actual = ACCESS_ROLES[current.role] || ACCESS_ROLES.CONSULTATION;
  if (!current.active || actual.level < expected.level) {
    throw new Error('Accès insuffisant pour effectuer cette opération.');
  }
  return current;
}

function listAccessUsers_() {
  const sheet = getDatabase_().getSheetByName(APP_CONFIG.sheets.users);
  if (!sheet || sheet.getLastRow() < 2) return [];
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, 6).getValues().map(row => {
    const role = ACCESS_ROLES[String(row[2] || '').toUpperCase()] ? String(row[2]).toUpperCase() : 'CONSULTATION';
    return {
      email: normalizeAccessEmail_(row[0]),
      name: String(row[1] || ''),
      role: role,
      roleLabel: ACCESS_ROLES[role].label,
      active: row[3] !== false,
      updatedAt: row[4] instanceof Date ? row[4].toISOString() : String(row[4] || ''),
      updatedBy: String(row[5] || '')
    };
  }).filter(user => user.email);
}

function normalizeAccessEmail_(value) {
  return String(value || '').trim().toLowerCase();
}
