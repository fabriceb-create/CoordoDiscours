const RECOMMENDATION_ENGINE_VERSION = '1.1.0';

function getSpeakerRecommendations(payload) {
  const request = payload || {};
  const date = String(request.date || '').trim();
  const talkNumber = Number(request.talkNumber);
  const currentPlanningId = String(request.id || '').trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(talkNumber)) {
    return { ready: false, recommendations: [], message: 'Sélectionne une date et un discours pour obtenir des recommandations.' };
  }

  const talk = listTalks('', true).find(function (item) { return Number(item.number) === talkNumber; });
  if (!talk || !talk.active) {
    return { ready: true, recommendations: [], message: 'Ce discours est introuvable ou inactif.' };
  }

  const weights = getRecommendationWeights_();
  const eventDate = new Date(date + 'T12:00:00');
  const monthKey = date.slice(0, 7);
  const plannings = listPlannings('', true).filter(function (item) {
    return item.id !== currentPlanningId && item.status !== 'ANNULE' && item.date;
  });
  const speakerCounts = plannings.reduce(function (map, item) {
    map[item.speakerId] = (map[item.speakerId] || 0) + 1;
    return map;
  }, {});
  const maxCount = Math.max.apply(null, [1].concat(Object.keys(speakerCounts).map(function (id) { return speakerCounts[id]; })));

  const recommendations = listSpeakers('', false).map(function (speaker) {
    return scoreSpeakerRecommendation_(speaker, talkNumber, eventDate, monthKey, plannings, speakerCounts, maxCount, weights);
  }).filter(function (item) {
    return item.eligible;
  }).sort(function (a, b) {
    return b.score - a.score || a.speakerName.localeCompare(b.speakerName, 'fr');
  }).slice(0, 12);

  return {
    ready: true,
    version: RECOMMENDATION_ENGINE_VERSION,
    date: date,
    talkNumber: talkNumber,
    weights: weights,
    recommendations: recommendations,
    message: recommendations.length ? '' : 'Aucun orateur actif ne peut actuellement présenter ce discours.'
  };
}

function getRecommendationWeights_() {
  const weights = {
    talk: recommendationWeight_('RECO_POIDS_DISCOURS', 40),
    recency: recommendationWeight_('RECO_POIDS_ANCIENNETE', 30),
    month: recommendationWeight_('RECO_POIDS_MOIS', 15),
    local: recommendationWeight_('RECO_POIDS_LOCAL', 10),
    balance: recommendationWeight_('RECO_POIDS_EQUILIBRE', 5)
  };
  weights.total = weights.talk + weights.recency + weights.month + weights.local + weights.balance;
  if (weights.total <= 0) {
    weights.talk = 40;
    weights.recency = 30;
    weights.month = 15;
    weights.local = 10;
    weights.balance = 5;
    weights.total = 100;
  }
  return weights;
}

function recommendationWeight_(key, fallback) {
  const value = Number(getSetting_(key));
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function scoreSpeakerRecommendation_(speaker, talkNumber, eventDate, monthKey, plannings, speakerCounts, maxCount, weights) {
  const reasons = [];
  const cautions = [];
  let rawScore = 0;
  let eligible = true;

  const authorizedTalks = speaker.type === 'EXTERIEUR' ? getSpeakerTalkNumbers_(speaker.id) : [];
  if (speaker.type === 'EXTERIEUR' && authorizedTalks.indexOf(talkNumber) === -1) {
    eligible = false;
    cautions.push('Discours absent de sa liste déclarée.');
  } else {
    rawScore += weights.talk;
    reasons.push(speaker.type === 'EXTERIEUR' ? 'Discours déclaré par l’orateur.' : 'Orateur local disponible pour ce discours.');
  }

  const speakerPlannings = plannings.filter(function (item) { return item.speakerId === speaker.id; });
  const previous = speakerPlannings.map(function (item) {
    return { item: item, date: new Date(item.date + 'T12:00:00') };
  }).filter(function (entry) {
    return entry.date <= eventDate;
  }).sort(function (a, b) { return b.date - a.date; })[0];

  if (!previous) {
    rawScore += weights.recency;
    reasons.push('Aucun passage antérieur enregistré.');
  } else {
    const days = Math.max(0, Math.floor((eventDate - previous.date) / 86400000));
    const months = Math.floor(days / 30.44);
    const recencyRatio = Math.min(1, Math.max(0, months / 12));
    rawScore += weights.recency * recencyRatio;
    if (months >= 6) reasons.push('Dernier passage il y a environ ' + months + ' mois.');
    else cautions.push('Dernier passage il y a environ ' + months + ' mois.');
  }

  const sameMonthCount = speakerPlannings.filter(function (item) { return String(item.date).slice(0, 7) === monthKey; }).length;
  if (!sameMonthCount) {
    rawScore += weights.month;
    reasons.push('Aucune autre programmation ce mois-ci.');
  } else {
    rawScore += Math.max(0, weights.month * (1 - sameMonthCount * 0.5));
    cautions.push('Déjà programmé ' + sameMonthCount + ' fois ce mois-ci.');
  }

  if (speaker.type === 'LOCAL') {
    rawScore += weights.local;
    reasons.push('Pas de déplacement extérieur à organiser.');
  } else {
    rawScore += weights.local * 0.5;
    cautions.push('Déplacement et accueil à prévoir.');
  }

  const count = speakerCounts[speaker.id] || 0;
  const balanceRatio = Math.max(0, 1 - count / maxCount);
  rawScore += weights.balance * balanceRatio;
  if (count === 0) reasons.push('Orateur encore peu sollicité dans le planning.');

  const score = Math.max(0, Math.min(100, Math.round((rawScore / weights.total) * 100)));
  return {
    speakerId: speaker.id,
    speakerName: speaker.fullName || speaker.lastName,
    congregationName: speaker.congregationName || '',
    type: speaker.type,
    eligible: eligible,
    score: score,
    label: score >= 85 ? 'Recommandé' : score >= 70 ? 'Très bon choix' : score >= 55 ? 'Choix possible' : 'À examiner',
    reasons: reasons,
    cautions: cautions,
    lastPlanningDate: previous ? previous.item.displayDate : ''
  };
}