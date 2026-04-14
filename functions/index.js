const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { defineString } = require('firebase-functions/params');
const admin = require('firebase-admin');
const geofire = require('geofire-common');
const nodemailer = require('nodemailer');

const smtpEmail = defineString('SMTP_EMAIL', { default: '' });
const smtpPassword = defineString('SMTP_PASSWORD', { default: '' });
const smtpHost = defineString('SMTP_HOST', { default: 'smtp.gmail.com' });
const smtpPort = defineString('SMTP_PORT', { default: '587' });

admin.initializeApp();
const db = admin.firestore();

const TRAITS = ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism'];
const MAX_QUEUE_SIZE = 25;
const RADIUS_METERS = 25000;
const QUEUE_TTL_MS = 23 * 60 * 60 * 1000;
const READ_CANDIDATE_CAP = 200;
const EARLY_STOP_CANDIDATE_CAP = 200;

function ensurePriorityOrder(priorityOrder) {
  const list = Array.isArray(priorityOrder) ? priorityOrder : [];
  const filtered = list.filter((trait) => TRAITS.includes(trait));
  const missing = TRAITS.filter((trait) => !filtered.includes(trait));
  return [...filtered, ...missing];
}

function desiredFromPreferences(pref = {}) {
  return {
    openness: Number(pref.desiredOpenness ?? 0),
    conscientiousness: Number(pref.desiredConscientiousness ?? 0),
    extraversion: Number(pref.desiredExtraversion ?? 0),
    agreeableness: Number(pref.desiredAgreeableness ?? 0),
    neuroticism: Number(pref.desiredNeuroticism ?? 0),
  };
}

function normalizedWeights(priorityOrder = TRAITS) {
  const order = ensurePriorityOrder(priorityOrder);
  const raw = order.map((trait, idx) => ({ trait, weight: 5 - idx }));
  const total = raw.reduce((sum, item) => sum + item.weight, 0);
  return Object.fromEntries(raw.map((item) => [item.trait, item.weight / total]));
}

function computeMatchScore(preferences, candidateScores) {
  const desired = desiredFromPreferences(preferences);
  const weights = normalizedWeights(preferences.priorityOrder);
  const weightedDiff = TRAITS.reduce((sum, trait) => {
    const delta = Math.abs((desired[trait] ?? 0) - Number(candidateScores[trait] ?? 0));
    return sum + (weights[trait] ?? 0) * delta;
  }, 0);

  return Math.max(0, Math.round((100 - weightedDiff) * 100) / 100);
}

function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const dPhi = ((lat2 - lat1) * Math.PI) / 180;
  const dLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dPhi / 2) * Math.sin(dPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) * Math.sin(dLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function getDesiredThreshold(preferences, trait) {
  const desired = desiredFromPreferences(preferences);
  return Number(desired[trait] ?? 0);
}

async function getAlreadySwipedIds(uid) {
  const swipedSnapshot = await db.collection('swipes').where('swiperId', '==', uid).get();
  return new Set(swipedSnapshot.docs.map((doc) => doc.data().targetId));
}

async function queryCandidatesWithin25km({ userLocation, uid, minAge, maxAge, swipedIds }) {
  const center = [userLocation.latitude, userLocation.longitude];
  const bounds = geofire.geohashQueryBounds(center, RADIUS_METERS);
  const candidatesMap = new Map();

  for (const [start, end] of bounds) {
    if (candidatesMap.size >= EARLY_STOP_CANDIDATE_CAP) {
      break;
    }

    const snapshot = await db
      .collection('users')
      .orderBy('geohash')
      .startAt(start)
      .endAt(end)
      .limit(READ_CANDIDATE_CAP)
      .get();

    for (const doc of snapshot.docs) {
      if (candidatesMap.size >= EARLY_STOP_CANDIDATE_CAP) {
        break;
      }

      if (doc.id === uid || swipedIds.has(doc.id) || candidatesMap.has(doc.id)) {
        continue;
      }

      const data = doc.data();
      if (!data?.onboardingCompleted || !data?.location) {
        continue;
      }

      const age = Number(data.age ?? 0);
      if (Number.isFinite(minAge) && age < minAge) {
        continue;
      }
      if (Number.isFinite(maxAge) && age > maxAge) {
        continue;
      }

      const distanceMeters = haversineMeters(
        center[0],
        center[1],
        data.location.latitude,
        data.location.longitude,
      );

      if (distanceMeters > RADIUS_METERS) {
        continue;
      }

      candidatesMap.set(doc.id, {
        uid: doc.id,
        name: data.name ?? '',
        age,
        bio: data.bio ?? '',
        distanceMeters: Math.round(distanceMeters),
      });
    }
  }

  return [...candidatesMap.values()];
}

async function buildRankedProfiles(candidates, preferences) {
  if (candidates.length === 0) {
    return [];
  }

  const scoreSnapshots = await Promise.all(
    candidates.map((candidate) => db.collection('personalityScores').doc(candidate.uid).get()),
  );

  return candidates
    .map((candidate, idx) => {
      const scoreSnap = scoreSnapshots[idx];
      if (!scoreSnap.exists) {
        return null;
      }

      const scores = scoreSnap.data();
      const matchScore = computeMatchScore(preferences, scores);
      return {
        ...candidate,
        matchScore,
        scores,
      };
    })
    .filter(Boolean);
}

function sortRankedProfiles(rankedProfiles) {
  return rankedProfiles.sort((a, b) => b.matchScore - a.matchScore || a.distanceMeters - b.distanceMeters);
}

async function hydrateProfilesByUid(uids, requesterPreferences, requesterLocation) {
  if (!uids.length) {
    return [];
  }

  const userSnapshots = await Promise.all(uids.map((id) => db.collection('users').doc(id).get()));
  const scoreSnapshots = await Promise.all(
    uids.map((id) => db.collection('personalityScores').doc(id).get()),
  );

  return uids
    .map((uid, idx) => {
      const userSnap = userSnapshots[idx];
      const scoreSnap = scoreSnapshots[idx];
      if (!userSnap.exists || !scoreSnap.exists) {
        return null;
      }

      const profile = userSnap.data();
      if (!profile?.location) {
        return null;
      }

      const distanceMeters = haversineMeters(
        requesterLocation.latitude,
        requesterLocation.longitude,
        profile.location.latitude,
        profile.location.longitude,
      );

      if (distanceMeters > RADIUS_METERS) {
        return null;
      }

      return {
        uid,
        name: profile.name ?? '',
        age: Number(profile.age ?? 0),
        bio: profile.bio ?? '',
        distanceMeters: Math.round(distanceMeters),
        matchScore: computeMatchScore(requesterPreferences, scoreSnap.data()),
      };
    })
    .filter(Boolean);
}

exports.getMatches = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign-in required');
  }

  const uid = request.auth.uid;
  const userRef = db.collection('users').doc(uid);
  const prefRef = db.collection('preferences').doc(uid);

  const [userSnap, prefSnap] = await Promise.all([userRef.get(), prefRef.get()]);

  if (!userSnap.exists || !prefSnap.exists) {
    throw new HttpsError('failed-precondition', 'Complete onboarding first');
  }

  const user = userSnap.data();
  const preferences = prefSnap.data();

  if (!user?.onboardingCompleted) {
    throw new HttpsError('failed-precondition', 'Complete onboarding first');
  }

  if (!user?.location) {
    throw new HttpsError('failed-precondition', 'location_required');
  }

  const swipeRemaining = Number(user.swipeRemaining ?? 0);
  if (swipeRemaining <= 0) {
    return { matches: [], remaining: 0, message: 'no_swipes_remaining' };
  }

  const queueRef = db.collection('swipeQueues').doc(uid);
  const queueSnap = await queueRef.get();

  if (queueSnap.exists) {
    const queueData = queueSnap.data();
    const generatedAtMs = queueData.generatedAt?.toMillis?.() ?? 0;
    const queueAge = Date.now() - generatedAtMs;
    const queue = Array.isArray(queueData.queue) ? queueData.queue : [];
    const lastCandidateIndex = Number(queueData.lastCandidateIndex ?? 0);

    if (queueAge <= QUEUE_TTL_MS && lastCandidateIndex < queue.length) {
      const sliceSize = Math.min(MAX_QUEUE_SIZE, swipeRemaining);
      const queuedIds = queue.slice(lastCandidateIndex, lastCandidateIndex + sliceSize);
      const matches = await hydrateProfilesByUid(queuedIds, preferences, user.location);

      return { matches, remaining: swipeRemaining };
    }
  }

  const swipedIds = await getAlreadySwipedIds(uid);
  const baseCandidates = await queryCandidatesWithin25km({
    userLocation: user.location,
    uid,
    minAge: Number(preferences.minAge ?? 18),
    maxAge: Number(preferences.maxAge ?? 99),
    swipedIds,
  });

  const rankedCandidates = await buildRankedProfiles(baseCandidates, preferences);
  const priorityOrder = ensurePriorityOrder(preferences.priorityOrder);

  let prioritizedSet = [];

  for (const trait of priorityOrder) {
    const threshold = getDesiredThreshold(preferences, trait);
    const candidatesForTrait = rankedCandidates.filter((candidate) =>
      Number(candidate.scores?.[trait] ?? -1) >= threshold,
    );

    if (candidatesForTrait.length > 0) {
      prioritizedSet = candidatesForTrait;
      break;
    }
  }

  if (!prioritizedSet.length) {
    prioritizedSet = rankedCandidates;
  }

  const queueProfiles = sortRankedProfiles(prioritizedSet).slice(0, MAX_QUEUE_SIZE).map((profile) => ({
    uid: profile.uid,
    name: profile.name,
    age: profile.age,
    bio: profile.bio,
    distanceMeters: profile.distanceMeters,
    matchScore: profile.matchScore,
  }));

  await queueRef.set({
    queue: queueProfiles.map((profile) => profile.uid),
    generatedAt: admin.firestore.FieldValue.serverTimestamp(),
    lastCandidateIndex: 0,
  });

  return {
    matches: queueProfiles.slice(0, Math.min(MAX_QUEUE_SIZE, swipeRemaining)),
    remaining: swipeRemaining,
  };
});

exports.swipe = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign-in required');
  }

  const uid = request.auth.uid;
  const { targetId, direction } = request.data || {};

  if (!targetId || !['left', 'right'].includes(direction)) {
    throw new HttpsError('invalid-argument', 'Expected { targetId, direction: "left"|"right" }');
  }

  const userRef = db.collection('users').doc(uid);
  const queueRef = db.collection('swipeQueues').doc(uid);

  const swipeRemaining = await db.runTransaction(async (transaction) => {
    const [userSnap, queueSnap] = await Promise.all([transaction.get(userRef), transaction.get(queueRef)]);

    if (!userSnap.exists) {
      throw new HttpsError('failed-precondition', 'User profile not found');
    }

    const currentRemaining = Number(userSnap.data().swipeRemaining ?? 0);
    if (currentRemaining <= 0) {
      throw new HttpsError('resource-exhausted', 'no_swipes');
    }

    transaction.set(db.collection('swipes').doc(), {
      swiperId: uid,
      targetId,
      direction,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const nextRemaining = currentRemaining - 1;
    transaction.update(userRef, { swipeRemaining: nextRemaining });

    if (queueSnap.exists) {
      const queueData = queueSnap.data();
      const queue = Array.isArray(queueData.queue) ? queueData.queue : [];
      const lastCandidateIndex = Number(queueData.lastCandidateIndex ?? 0);
      const currentPointerId = queue[lastCandidateIndex];

      if (currentPointerId === targetId) {
        transaction.update(queueRef, { lastCandidateIndex: lastCandidateIndex + 1 });
      } else {
        const filteredQueue = queue.filter((candidateUid) => candidateUid !== targetId);
        transaction.set(
          queueRef,
          {
            ...queueData,
            queue: filteredQueue,
            lastCandidateIndex: Math.min(lastCandidateIndex, filteredQueue.length),
          },
          { merge: true },
        );
      }
    }

    return nextRemaining;
  });

  let matched = false;
  if (direction === 'right') {
    const reciprocal = await db
      .collection('swipes')
      .where('swiperId', '==', targetId)
      .where('targetId', '==', uid)
      .where('direction', '==', 'right')
      .limit(1)
      .get();
    matched = !reciprocal.empty;
  }

  return { swipeRemaining, matched };
});

exports.resetSwipes = onSchedule('every 24 hours', async () => {
  const usersSnapshot = await db.collection('users').get();
  const resetAt = admin.firestore.Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000));

  let batch = db.batch();
  let opCount = 0;

  for (const userDoc of usersSnapshot.docs) {
    batch.update(userDoc.ref, {
      swipeRemaining: MAX_QUEUE_SIZE,
      swipeResetAt: resetAt,
    });
    opCount += 1;

    if (opCount === 450) {
      await batch.commit();
      batch = db.batch();
      opCount = 0;
    }
  }

  if (opCount > 0) {
    await batch.commit();
  }

  const queueSnapshot = await db.collection('swipeQueues').get();
  let deleteBatch = db.batch();
  let deleteCount = 0;

  for (const queueDoc of queueSnapshot.docs) {
    deleteBatch.delete(queueDoc.ref);
    deleteCount += 1;

    if (deleteCount === 450) {
      await deleteBatch.commit();
      deleteBatch = db.batch();
      deleteCount = 0;
    }
  }

  if (deleteCount > 0) {
    await deleteBatch.commit();
  }
});

// ── Email OTP Functions ──

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function getTransporter() {
  const email = smtpEmail.value();
  const password = smtpPassword.value();
  const host = smtpHost.value();
  const port = parseInt(smtpPort.value(), 10);

  if (!email || !password) {
    throw new HttpsError('failed-precondition', 'SMTP credentials not configured. Set SMTP_EMAIL and SMTP_PASSWORD in Firebase environment.');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user: email, pass: password },
  });
}

exports.sendEmailOtp = onCall(async (request) => {
  const { email } = request.data || {};
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    throw new HttpsError('invalid-argument', 'Valid email is required');
  }

  const otp = generateOtp();
  const expiresAt = admin.firestore.Timestamp.fromDate(new Date(Date.now() + 10 * 60 * 1000));

  await db.collection('emailOtps').doc(email.toLowerCase()).set({
    otp,
    expiresAt,
    attempts: 0,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  const transporter = getTransporter();
  await transporter.sendMail({
    from: `"EliteSync" <${smtpEmail.value()}>`,
    to: email,
    subject: 'Your EliteSync verification code',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 400px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #1a1a1a; margin-bottom: 8px;">Verify your email</h2>
        <p style="color: #555; font-size: 14px;">Use this code to verify your email on EliteSync:</p>
        <div style="background: #f5f5f5; border-radius: 12px; padding: 20px; text-align: center; margin: 16px 0;">
          <span style="font-size: 32px; letter-spacing: 8px; font-weight: bold; color: #1a1a1a;">${otp}</span>
        </div>
        <p style="color: #999; font-size: 12px;">This code expires in 10 minutes. If you didn't request this, you can ignore this email.</p>
      </div>
    `,
  });

  return { sent: true };
});

exports.verifyEmailOtp = onCall(async (request) => {
  const { email, otp } = request.data || {};
  if (!email || !otp) {
    throw new HttpsError('invalid-argument', 'Email and OTP are required');
  }

  const ref = db.collection('emailOtps').doc(email.toLowerCase());
  const snap = await ref.get();

  if (!snap.exists) {
    return { verified: false, reason: 'no_otp_found' };
  }

  const data = snap.data();

  if ((data.attempts ?? 0) >= 5) {
    await ref.delete();
    return { verified: false, reason: 'too_many_attempts' };
  }

  const now = admin.firestore.Timestamp.now();
  if (data.expiresAt && data.expiresAt.toMillis() < now.toMillis()) {
    await ref.delete();
    return { verified: false, reason: 'expired' };
  }

  if (data.otp !== otp) {
    await ref.update({ attempts: (data.attempts ?? 0) + 1 });
    return { verified: false, reason: 'invalid' };
  }

  await ref.delete();
  return { verified: true };
});
