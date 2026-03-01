const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');
const geofire = require('geofire-common');

admin.initializeApp();
const db = admin.firestore();

const TRAITS = ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism'];
const QUEUE_TTL_MS = 23 * 60 * 60 * 1000; // 23 hours

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
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── helpers ──

async function getCandidatesWithin25km(userLocation, uid, pref) {
  const center = [userLocation.latitude, userLocation.longitude];
  const radiusM = 25000;
  const bounds = geofire.geohashQueryBounds(center, radiusM);

  const snapshots = await Promise.all(
    bounds.map(([start, end]) =>
      db.collection('users').orderBy('geohash').startAt(start).endAt(end).limit(200).get(),
    ),
  );

  const swipedQuery = await db.collection('swipes').where('swiperId', '==', uid).get();
  const swiped = new Set(swipedQuery.docs.map((d) => d.data().targetId));

  const candidates = [];
  const seen = new Set();
  for (const snap of snapshots) {
    for (const d of snap.docs) {
      if (d.id === uid || swiped.has(d.id) || seen.has(d.id)) continue;
      seen.add(d.id);
      const c = d.data();
      if (!c.location || !c.onboardingCompleted) continue;
      if (c.age < pref.minAge || c.age > pref.maxAge) continue;
      const distance = haversineKm(center[0], center[1], c.location.latitude, c.location.longitude);
      if (distance > 25) continue;
      candidates.push({ id: d.id, ...c, distance });
    }
  }
  return candidates;
}

// ── getMatches ──

exports.getMatches = onCall(async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Sign-in required');
  const uid = req.auth.uid;

  const [userSnap, prefSnap, scoreSnap] = await Promise.all([
    db.collection('users').doc(uid).get(),
    db.collection('preferences').doc(uid).get(),
    db.collection('personalityScores').doc(uid).get(),
  ]);

  if (!userSnap.exists || !prefSnap.exists || !scoreSnap.exists) {
    throw new HttpsError('failed-precondition', 'Complete onboarding first');
  }

  const user = userSnap.data();
  if (!user.onboardingCompleted) {
    throw new HttpsError('failed-precondition', 'Complete onboarding first');
  }
  if (!user.location) {
    throw new HttpsError('failed-precondition', 'location_required');
  }

  const remaining = user.swipeRemaining ?? 0;
  if (remaining <= 0) {
    return { matches: [], remaining: 0, message: 'no_swipes_remaining' };
  }

  const pref = prefSnap.data();

  // ── Check cached queue ──
  const queueRef = db.collection('swipeQueues').doc(uid);
  const queueSnap = await queueRef.get();

  if (queueSnap.exists) {
    const qData = queueSnap.data();
    const age = Date.now() - (qData.generatedAt?.toMillis?.() || 0);
    const idx = qData.lastCandidateIndex || 0;
    const queue = qData.queue || [];
    if (age < QUEUE_TTL_MS && idx < queue.length) {
      const slice = queue.slice(idx, idx + Math.min(25, remaining));
      // Fetch profile summaries for the slice
      const profiles = await buildProfileSummaries(slice, user.location, pref);
      return { matches: profiles, remaining };
    }
  }

  // ── Generate new queue ──
  const candidates = await getCandidatesWithin25km(user.location, uid, pref);

  // Fetch personality scores for all candidates
  const scoreDocs = await Promise.all(
    candidates.map((c) => db.collection('personalityScores').doc(c.id).get()),
  );
  const withScores = candidates
    .map((candidate, idx) => ({ candidate, scores: scoreDocs[idx].exists ? scoreDocs[idx].data() : null }))
    .filter((x) => x.scores);

  // ── Strict priority loop ──
  const priorityOrder = pref.priorityOrder || TRAITS;
  const desired = desiredFromPreferences(pref);
  let finalSet = null;

  for (const trait of priorityOrder) {
    const threshold = desired[trait] || 0;
    const filtered = withScores.filter((item) => (item.scores[trait] || 0) >= threshold);
    if (filtered.length > 0) {
      finalSet = filtered;
      break;
    }
  }

  if (!finalSet) {
    finalSet = withScores;
  }

  // Score, sort, limit
  const ranked = finalSet
    .map(({ candidate, scores }) => ({
      uid: candidate.id,
      name: candidate.name,
      age: candidate.age,
      bio: candidate.bio || '',
      photos: candidate.photos || [],
      distance: Math.round(candidate.distance * 10) / 10,
      matchScore: matchScore(pref, scores),
    }))
    .sort((a, b) => b.matchScore - a.matchScore || a.distance - b.distance)
    .slice(0, 25);

  // Save queue
  const queueUids = ranked.map((r) => r.uid);
  await queueRef.set({
    queue: queueUids,
    generatedAt: admin.firestore.FieldValue.serverTimestamp(),
    lastCandidateIndex: 0,
  });

  const returnSlice = ranked.slice(0, Math.min(25, remaining));
  return { matches: returnSlice, remaining };
});

async function buildProfileSummaries(uids, userLocation, pref) {
  if (uids.length === 0) return [];
  const docs = await Promise.all(uids.map((id) => db.collection('users').doc(id).get()));
  const scoreDocs = await Promise.all(uids.map((id) => db.collection('personalityScores').doc(id).get()));
  const center = [userLocation.latitude, userLocation.longitude];

  return docs
    .map((d, idx) => {
      if (!d.exists) return null;
      const u = d.data();
      const scores = scoreDocs[idx].exists ? scoreDocs[idx].data() : null;
      const dist = u.location
        ? haversineKm(center[0], center[1], u.location.latitude, u.location.longitude)
        : 999;
      return {
        uid: d.id,
        name: u.name,
        age: u.age,
        bio: u.bio || '',
        photos: u.photos || [],
        distance: Math.round(dist * 10) / 10,
        matchScore: scores ? matchScore(pref, scores) : 0,
      };
    })
    .filter(Boolean);
}

// ── swipe ──

exports.swipeUser = onCall(async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Sign-in required');
  const uid = req.auth.uid;
  const { targetId, direction } = req.data || {};
  if (!targetId || !['left', 'right'].includes(direction)) {
    throw new HttpsError('invalid-argument', 'Bad payload');
  }

  const userRef = db.collection('users').doc(uid);

  let newRemaining;
  await db.runTransaction(async (tx) => {
    const userSnap = await tx.get(userRef);
    const user = userSnap.data();
    if ((user.swipeRemaining || 0) <= 0) {
      throw new HttpsError('resource-exhausted', 'no_swipes');
    }
    newRemaining = Math.max(0, (user.swipeRemaining || 0) - 1);
    tx.update(userRef, { swipeRemaining: newRemaining });
    tx.set(db.collection('swipes').doc(), {
      swiperId: uid,
      targetId,
      direction,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  // Update queue pointer
  const queueRef = db.collection('swipeQueues').doc(uid);
  const queueSnap = await queueRef.get();
  if (queueSnap.exists) {
    const qData = queueSnap.data();
    const idx = (qData.lastCandidateIndex || 0) + 1;
    await queueRef.update({ lastCandidateIndex: idx });
  }

  // Check for mutual match
  let matched = false;
  if (direction === 'right') {
    const reciprocal = await db
      .collection('swipes')
      .where('swiperId', '==', targetId)
      .where('targetId', '==', uid)
      .where('direction', '==', 'right')
      .limit(1)
      .get();
    if (!reciprocal.empty) {
      matched = true;
      // Create match document
      const users = [uid, targetId].sort();
      const matchId = users.join('_');
      const matchRef = db.collection('matches').doc(matchId);
      const existing = await matchRef.get();
      if (!existing.exists) {
        await matchRef.set({
          users,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }
  }

  return { remaining: newRemaining, matched };
});

// ── Scheduled reset every 24h ──

exports.resetSwipeQueues = onSchedule('every 24 hours', async () => {
  const users = await db.collection('users').get();
  const batch = db.batch();
  const resetAt = admin.firestore.Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000));
  users.docs.forEach((d) => {
    batch.update(d.ref, { swipeRemaining: 25, swipeResetAt: resetAt });
  });
  await batch.commit();

  // Delete all swipeQueues to force regeneration
  const queues = await db.collection('swipeQueues').get();
  const qBatch = db.batch();
  queues.docs.forEach((d) => qBatch.delete(d.ref));
  await qBatch.commit();
});

// ── Manual reset for testing ──

exports.resetSwipeQueueForUser = onCall(async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Sign-in required');
  const uid = req.data?.userId || req.auth.uid;
  await db.collection('users').doc(uid).update({
    swipeRemaining: 25,
    swipeResetAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000)),
  });
  // Clear queue
  await db.collection('swipeQueues').doc(uid).delete().catch(() => {});
  return { ok: true };
});
