const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');
const geofire = require('geofire-common');

admin.initializeApp();
const db = admin.firestore();

const TRAITS = ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism'];

function desiredFromPreferences(pref) {
  return {
    openness: pref.desiredOpenness,
    conscientiousness: pref.desiredConscientiousness,
    extraversion: pref.desiredExtraversion,
    agreeableness: pref.desiredAgreeableness,
    neuroticism: pref.desiredNeuroticism,
  };
}

function normalizedWeights(priorityOrder) {
  const raw = priorityOrder.map((trait, idx) => ({ trait, weight: 5 - idx }));
  const total = raw.reduce((sum, item) => sum + item.weight, 0);
  return Object.fromEntries(raw.map((item) => [item.trait, item.weight / total]));
}

function matchScore(preferences, candidateScores) {
  const weights = normalizedWeights(preferences.priorityOrder || TRAITS);
  const desired = desiredFromPreferences(preferences);
  const distance = TRAITS.reduce((sum, trait) => {
    return sum + (weights[trait] || 0) * Math.abs((desired[trait] || 0) - (candidateScores[trait] || 0));
  }, 0);
  return Math.max(0, Math.round(100 - distance));
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

exports.getMatches = onCall(async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Sign-in required');
  const uid = req.auth.uid;

  const [userSnap, prefSnap, scoreSnap] = await Promise.all([
    db.collection('users').doc(uid).get(),
    db.collection('preferences').doc(uid).get(),
    db.collection('personalityScores').doc(uid).get(),
  ]);

  if (!userSnap.exists || !prefSnap.exists || !scoreSnap.exists) {
    return [];
  }

  const user = userSnap.data();
  const pref = prefSnap.data();
  if (!user.location) return [];

  const swipedQuery = await db.collection('swipes').where('swiperId', '==', uid).get();
  const swiped = new Set(swipedQuery.docs.map((d) => d.data().targetId));

  const center = [user.location.latitude, user.location.longitude];
  const radiusM = 25000;
  const bounds = geofire.geohashQueryBounds(center, radiusM);

  const snapshots = await Promise.all(bounds.map(([start, end]) =>
    db.collection('users').orderBy('geohash').startAt(start).endAt(end).limit(200).get()
  ));

  const allCandidates = [];
  for (const snap of snapshots) {
    for (const d of snap.docs) {
      if (d.id === uid || swiped.has(d.id)) continue;
      const c = d.data();
      if (!c.location) continue;
      if (c.age < pref.minAge || c.age > pref.maxAge) continue;
      const distance = haversineKm(center[0], center[1], c.location.latitude, c.location.longitude);
      if (distance > 25) continue;
      allCandidates.push({ id: d.id, ...c, distance });
    }
  }

  const uniqueCandidates = Object.values(Object.fromEntries(allCandidates.map((c) => [c.id, c])));

  const scoreDocs = await Promise.all(uniqueCandidates.map((c) => db.collection('personalityScores').doc(c.id).get()));
  const withScores = uniqueCandidates
    .map((candidate, idx) => ({ candidate, scores: scoreDocs[idx].data() }))
    .filter((x) => x.scores);

  let shortlisted = [];
  for (const trait of (pref.priorityOrder || TRAITS)) {
    const threshold = desiredFromPreferences(pref)[trait] || 0;
    const stage = withScores.filter((item) => item.scores[trait] >= threshold);
    if (stage.length > 0) {
      shortlisted = stage;
      break;
    }
  }
  if (shortlisted.length === 0) shortlisted = withScores;

  const ranked = shortlisted.map(({ candidate, scores }) => ({
    uid: candidate.uid,
    name: candidate.name,
    age: candidate.age,
    bio: candidate.bio,
    distance: candidate.distance,
    matchScore: matchScore(pref, scores),
  })).sort((a, b) => b.matchScore - a.matchScore || a.distance - b.distance).slice(0, 25);

  return ranked;
});

exports.swipeUser = onCall(async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Sign-in required');
  const uid = req.auth.uid;
  const { targetId, direction } = req.data || {};
  if (!targetId || !['left', 'right'].includes(direction)) throw new HttpsError('invalid-argument', 'Bad payload');

  const userRef = db.collection('users').doc(uid);
  await db.runTransaction(async (tx) => {
    const userSnap = await tx.get(userRef);
    const user = userSnap.data();
    const remaining = Math.max(0, (user.swipeRemaining || 0) - 1);
    tx.update(userRef, { swipeRemaining: remaining });
    tx.set(db.collection('swipes').doc(), { swiperId: uid, targetId, direction, createdAt: admin.firestore.FieldValue.serverTimestamp() });
  });

  const refreshed = await userRef.get();
  return { remaining: refreshed.data().swipeRemaining };
});

exports.resetSwipeQueues = onSchedule('every 24 hours', async () => {
  const users = await db.collection('users').get();
  const batch = db.batch();
  const resetAt = admin.firestore.Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000));
  users.docs.forEach((d) => batch.update(d.ref, { swipeRemaining: 25, swipeResetAt: resetAt }));
  await batch.commit();
});

exports.resetSwipeQueueForUser = onCall(async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Sign-in required');
  const uid = req.data?.userId || req.auth.uid;
  await db.collection('users').doc(uid).update({
    swipeRemaining: 25,
    swipeResetAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000)),
  });
  return { ok: true };
});
