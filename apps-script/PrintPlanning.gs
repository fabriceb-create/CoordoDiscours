function getPrintablePlanning(startMonth, durationMonths) {
  const months = [3, 6].includes(Number(durationMonths)) ? Number(durationMonths) : 3;
  const start = parseMonthStart_(startMonth);
  const end = new Date(start.getFullYear(), start.getMonth() + months, 1);
  const congregation = getSetting_('ASSEMBLEE') || 'Basse-Terre';
  const items = listPlannings('', false)
    .filter(item => item.status !== 'ANNULE' && item.date)
    .filter(item => {
      const date = new Date(item.date + 'T12:00:00');
      return date >= start && date < end;
    });

  const grouped = [];
  for (let index = 0; index < months; index += 1) {
    const monthDate = new Date(start.getFullYear(), start.getMonth() + index, 1);
    const key = Utilities.formatDate(monthDate, Session.getScriptTimeZone(), 'yyyy-MM');
    grouped.push({
      key: key,
      label: monthDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
      items: items.filter(item => String(item.date).slice(0, 7) === key)
    });
  }

  return {
    congregation: congregation,
    startMonth: Utilities.formatDate(start, Session.getScriptTimeZone(), 'yyyy-MM'),
    durationMonths: months,
    generatedAt: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm'),
    months: grouped
  };
}

function parseMonthStart_(value) {
  const text = String(value || '').trim();
  if (/^\d{4}-\d{2}$/.test(text)) {
    const parts = text.split('-').map(Number);
    return new Date(parts[0], parts[1] - 1, 1);
  }
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}
