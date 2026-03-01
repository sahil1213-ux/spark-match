import {
  GoogleAuthProvider,
  OAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  GeoPoint,
  Timestamp,
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { PersonalityScores, TraitKey } from '@/lib/scoring';
import { geohashForLocation } from 'geofire-common';

const TRAITS: TraitKey[] = ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism'];
const MAX_MATCHES = 25;
const TRAIT_THRESHOLD = 80;
const QUEUE_TTL_MS = 23 * 60 * 60 * 1000;

// ── Types ──

export interface UserProfile {
  id: string;
  uid: string;
  email: string;
  name: string;
  bio: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  location?: GeoPoint;
  onboardingCompleted: boolean;
  createdAt?: Timestamp;
  swipeRemaining: number;
  swipeResetAt?: Timestamp;
  photos: string[];
  matchingScores?: PersonalityScores;
}

export interface MatchResult {
  uid: string;
  name: string;
  age: number;
  bio: string;
  photos?: string[];
  distance?: number;
  distanceMeters?: number;
  matchScore: number;
}

export interface Filters {
  ageMin: number;
  ageMax: number;
  gender: 'Male' | 'Female' | 'Any';
}

// ── Auth ──

async function ensureUserDoc(base: Partial<UserProfile> = {}) {
  const user = auth.currentUser;
  if (!user) return null;
  const userRef = doc(db, 'users', user.uid);
  const snapshot = await getDoc(userRef);
  if (!snapshot.exists()) {
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email ?? '',
      name: base.name ?? '',
      bio: base.bio ?? '',
      age: base.age ?? 18,
      gender: base.gender ?? 'Other',
      createdAt: serverTimestamp(),
      onboardingCompleted: false,
      swipeRemaining: 25,
      swipeResetAt: Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000)),
      photos: [],
    });
  }
  return user.uid;
}

export async function signupUser(payload: {
  email: string;
  password: string;
  name: string;
  age: number;
  gender: UserProfile['gender'];
  bio: string;
}) {
  await createUserWithEmailAndPassword(auth, payload.email, payload.password);
  await ensureUserDoc(payload);
}

export async function loginUser(email: string, password: string) {
  await signInWithEmailAndPassword(auth, email, password);
  await ensureUserDoc();
}

export async function loginWithGoogle() {
  const provider = new GoogleAuthProvider();
  await signInWithPopup(auth, provider);
  await ensureUserDoc();
}

export async function loginWithApple() {
  const provider = new OAuthProvider('apple.com');
  await signInWithPopup(auth, provider);
  await ensureUserDoc();
}

export async function logout() {
  await signOut(auth);
}

export function getCurrentUser() {
  return auth.currentUser;
}

export function getCurrentUserId() {
  return auth.currentUser?.uid ?? null;
}

// ── Profile ──

export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  const user = auth.currentUser;
  if (!user) return null;
  const snapshot = await getDoc(doc(db, 'users', user.uid));
  if (!snapshot.exists()) return null;
  return { id: user.uid, ...snapshot.data() } as UserProfile;
}

export async function getUserById(userId: string) {
  const snapshot = await getDoc(doc(db, 'users', userId));
  if (!snapshot.exists()) return null;
  return { id: userId, ...snapshot.data() } as UserProfile;
}

export async function saveProfileBio(userId: string, bio: string) {
  await updateDoc(doc(db, 'users', userId), { bio });
}

export async function uploadUserPhoto(userId: string, file: File) {
  const asDataUrl = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
  const userRef = doc(db, 'users', userId);
  const snapshot = await getDoc(userRef);
  const currentPhotos = (snapshot.data()?.photos ?? []) as string[];
  await updateDoc(userRef, { photos: [...currentPhotos, asDataUrl].slice(0, 6) });
  return asDataUrl;
}

// ── Location ──

export async function updateUserLocation(userId: string, lat: number, lon: number) {
  await updateDoc(doc(db, 'users', userId), {
    location: new GeoPoint(lat, lon),
    geohash: geohashForLocation([lat, lon]),
  });
}

// ── Questionnaire ──

export async function saveQuestionnaire(userId: string, payload: {
  bio: string;
  age: number;
  gender: UserProfile['gender'];
  lat: number;
  lon: number;
  scores: PersonalityScores;
  priorityOrder: TraitKey[];
  minAge: number;
  maxAge: number;
}) {
  await updateDoc(doc(db, 'users', userId), {
    bio: payload.bio,
    age: payload.age,
    gender: payload.gender,
    location: new GeoPoint(payload.lat, payload.lon),
    geohash: geohashForLocation([payload.lat, payload.lon]),
    onboardingCompleted: true,
    matchingScores: payload.scores,
  });

  await setDoc(doc(db, 'personalityScores', userId), payload.scores);

  await setDoc(doc(db, 'preferences', userId), {
    desiredOpenness: TRAIT_THRESHOLD,
    desiredConscientiousness: TRAIT_THRESHOLD,
    desiredExtraversion: TRAIT_THRESHOLD,
    desiredAgreeableness: TRAIT_THRESHOLD,
    desiredNeuroticism: TRAIT_THRESHOLD,
    priorityOrder: payload.priorityOrder,
    minAge: payload.minAge,
    maxAge: payload.maxAge,
  });
}

// ── Matching (Firestore-only; Spark plan friendly) ──

function normalizedWeights(priorityOrder: TraitKey[]) {
  const pairs = priorityOrder.map((trait, idx) => ({ trait, weight: 5 - idx }));
  const total = pairs.reduce((sum, pair) => sum + pair.weight, 0);
  return Object.fromEntries(pairs.map((pair) => [pair.trait, pair.weight / total])) as Record<TraitKey, number>;
}

function computeMatchScore(candidate: Record<TraitKey, number>, priorityOrder: TraitKey[]) {
  const weights = normalizedWeights(priorityOrder);
  const diff = TRAITS.reduce(
    (sum, trait) => sum + weights[trait] * Math.abs(TRAIT_THRESHOLD - Number(candidate[trait] ?? 0)),
    0,
  );
  return Math.max(0, Math.round((100 - diff) * 100) / 100);
}

async function maybeResetSwipeCounter(uid: string, user: Record<string, unknown>) {
  const swipeResetAt = user.swipeResetAt as Timestamp | undefined;
  const now = Timestamp.now();
  if (swipeResetAt && swipeResetAt.toMillis() > now.toMillis()) {
    return Number(user.swipeRemaining ?? 0);
  }

  await updateDoc(doc(db, 'users', uid), {
    swipeRemaining: 25,
    swipeResetAt: Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000)),
  });
  return 25;
}

async function fetchCandidateUsers(currentUid: string, minAge: number, maxAge: number, swipedIds: Set<string>) {
  const snap = await getDocs(query(collection(db, 'users')));
  const candidates = new Map<string, MatchResult & { scores: Record<TraitKey, number> }>();

  snap.docs.forEach((d) => {
    const u = d.data() as Record<string, unknown>;
    if (d.id === currentUid || swipedIds.has(d.id)) return;
    if (!u.onboardingCompleted) return;
    const age = Number(u.age ?? 0);
    if (age < minAge || age > maxAge) return;

    const scores = (u.matchingScores ?? null) as Record<TraitKey, number> | null;
    if (!scores) return;

    candidates.set(d.id, {
      uid: d.id,
      name: String(u.name ?? ''),
      age,
      bio: String(u.bio ?? ''),
      photos: (u.photos as string[] | undefined) ?? [],
      matchScore: 0,
      scores,
    });
  });

  return [...candidates.values()];
}

export async function getMatches(): Promise<{ matches: MatchResult[]; remaining: number; message?: string }> {
  const uid = getCurrentUserId();
  if (!uid) throw new Error('Unauthenticated');

  const userSnap = await getDoc(doc(db, 'users', uid));
  const prefSnap = await getDoc(doc(db, 'preferences', uid));
  if (!userSnap.exists() || !prefSnap.exists()) throw new Error('Complete onboarding first');

  const user = userSnap.data() as Record<string, unknown>;
  const pref = prefSnap.data() as Record<string, unknown>;

  if (!user.onboardingCompleted) throw new Error('Complete onboarding first');
  const remaining = await maybeResetSwipeCounter(uid, user);
  if (remaining <= 0) {
    return { matches: [], remaining: 0, message: 'no_more_profiles_today' };
  }

  const swipedSnap = await getDocs(query(collection(db, 'swipes'), where('swiperId', '==', uid)));
  const swipedIds = new Set(swipedSnap.docs.map((d) => String(d.data().targetId)));

  const queueRef = doc(db, 'swipeQueues', uid);
  const queueSnap = await getDoc(queueRef);

  if (queueSnap.exists()) {
    const queueData = queueSnap.data() as { queue?: MatchResult[]; generatedAt?: Timestamp; lastCandidateIndex?: number };
    const generatedAtMs = queueData.generatedAt?.toMillis() ?? 0;
    const ageMs = Date.now() - generatedAtMs;
    const pointer = Number(queueData.lastCandidateIndex ?? 0);
    const queue = Array.isArray(queueData.queue)
      ? queueData.queue.filter((candidate) => !swipedIds.has(candidate.uid))
      : [];

    if (ageMs <= QUEUE_TTL_MS && pointer < queue.length) {
      return { matches: queue.slice(pointer, pointer + Math.min(MAX_MATCHES, remaining)), remaining };
    }
  }

  const candidates = await fetchCandidateUsers(uid, Number(pref.minAge ?? 18), Number(pref.maxAge ?? 99), swipedIds);
  const priorityOrder = (Array.isArray(pref.priorityOrder) ? pref.priorityOrder : TRAITS).filter((t): t is TraitKey => TRAITS.includes(t as TraitKey));
  const completePriorityOrder = [...priorityOrder, ...TRAITS.filter((t) => !priorityOrder.includes(t))];

  let pool: (MatchResult & { scores: Record<TraitKey, number> })[] = [];

  for (const trait of completePriorityOrder) {
    const filtered = candidates.filter((candidate) => Number(candidate.scores[trait] ?? -1) >= TRAIT_THRESHOLD);
    if (filtered.length > 0) {
      pool = filtered;
      break;
    }
  }

  if (pool.length === 0) {
    pool = candidates;
  }

  const ranked = pool
    .map((candidate) => ({
      uid: candidate.uid,
      name: candidate.name,
      age: candidate.age,
      bio: candidate.bio,
      photos: candidate.photos,
      matchScore: computeMatchScore(candidate.scores, completePriorityOrder),
    }))
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, MAX_MATCHES);

  await setDoc(queueRef, {
    queue: ranked,
    generatedAt: serverTimestamp(),
    lastCandidateIndex: 0,
  });

  return {
    matches: ranked.slice(0, Math.min(MAX_MATCHES, remaining)),
    remaining,
    message:
      ranked.length === 0
        ? 'No candidates found nearby matching your current top priorities. Try updating priorities or expanding filters.'
        : undefined,
  };
}

export async function swipeUser(targetId: string, direction: 'left' | 'right') {
  const uid = getCurrentUserId();
  if (!uid) throw new Error('Unauthenticated');

  const userRef = doc(db, 'users', uid);
  const queueRef = doc(db, 'swipeQueues', uid);

  const remaining = await runTransaction(db, async (tx) => {
    const userSnap = await tx.get(userRef);
    if (!userSnap.exists()) throw new Error('User profile not found');

    const user = userSnap.data() as Record<string, unknown>;
    const resetAt = user.swipeResetAt as Timestamp | undefined;
    let available = Number(user.swipeRemaining ?? 0);
    if (!resetAt || resetAt.toMillis() <= Date.now()) {
      available = 25;
      tx.update(userRef, {
        swipeRemaining: 25,
        swipeResetAt: Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000)),
      });
    }

    if (available <= 0) throw new Error('no_swipes');

    tx.set(doc(collection(db, 'swipes')), {
      swiperId: uid,
      targetId,
      direction,
      createdAt: serverTimestamp(),
    });

    const next = available - 1;
    tx.update(userRef, { swipeRemaining: next });

    const queueSnap = await tx.get(queueRef);
    if (queueSnap.exists()) {
      const data = queueSnap.data() as { queue?: MatchResult[]; lastCandidateIndex?: number };
      const queue = Array.isArray(data.queue) ? data.queue : [];
      const pointer = Number(data.lastCandidateIndex ?? 0);
      const current = queue[pointer];
      if (current?.uid === targetId) {
        tx.update(queueRef, { lastCandidateIndex: pointer + 1 });
      } else {
        const filtered = queue.filter((candidate) => candidate.uid !== targetId);
        tx.set(queueRef, { queue: filtered, lastCandidateIndex: Math.min(pointer, filtered.length) }, { merge: true });
      }
    }

    return next;
  });

  let matched = false;
  if (direction === 'right') {
    const reciprocal = await getDocs(
      query(
        collection(db, 'swipes'),
        where('swiperId', '==', targetId),
        where('targetId', '==', uid),
        where('direction', '==', 'right'),
        limit(1),
      ),
    );

    matched = !reciprocal.empty;

    if (matched) {
      const users = [uid, targetId].sort();
      await setDoc(doc(db, 'matches', users.join('_')), { users, createdAt: serverTimestamp() }, { merge: true });
    }
  }

  return { remaining, matched };
}

// ── Matches & Messages ──

export async function getMatchesForUser(userId: string) {
  const matchesQuery = query(collection(db, 'matches'), where('users', 'array-contains', userId));
  const snapshots = await getDocs(matchesQuery);
  return snapshots.docs.map((d) => ({ id: d.id, ...d.data() })) as Array<{ id: string; users: string[] }>;
}

export async function listMessages(matchId: string) {
  const q = query(collection(db, 'messages'), where('matchId', '==', matchId));
  const snapshots = await getDocs(q);
  return snapshots.docs
    .map((d) => ({ id: d.id, ...d.data() } as Record<string, unknown> & { id: string }))
    .sort((a, b) => String(a['createdAt'] ?? '').localeCompare(String(b['createdAt'] ?? '')));
}

export async function sendMessage(matchId: string, senderId: string, text: string) {
  await addDoc(collection(db, 'messages'), { matchId, senderId, text, createdAt: serverTimestamp() });
}


export async function getUserPriorityOrder(): Promise<TraitKey[]> {
  const uid = getCurrentUserId();
  if (!uid) return [...TRAITS];

  const prefSnap = await getDoc(doc(db, 'preferences', uid));
  if (!prefSnap.exists()) return [...TRAITS];

  const data = prefSnap.data() as { priorityOrder?: string[] };
  const order = (data.priorityOrder ?? []).filter((trait): trait is TraitKey =>
    TRAITS.includes(trait as TraitKey),
  );
  return [...order, ...TRAITS.filter((trait) => !order.includes(trait))];
}

export async function saveUserPriorityOrder(priorityOrder: TraitKey[]) {
  const uid = getCurrentUserId();
  if (!uid) throw new Error('Unauthenticated');

  const normalized = priorityOrder.filter((trait, index) =>
    TRAITS.includes(trait) && priorityOrder.indexOf(trait) === index,
  );
  const completed = [...normalized, ...TRAITS.filter((trait) => !normalized.includes(trait))];

  await setDoc(
    doc(db, 'preferences', uid),
    {
      priorityOrder: completed,
      desiredOpenness: TRAIT_THRESHOLD,
      desiredConscientiousness: TRAIT_THRESHOLD,
      desiredExtraversion: TRAIT_THRESHOLD,
      desiredAgreeableness: TRAIT_THRESHOLD,
      desiredNeuroticism: TRAIT_THRESHOLD,
    },
    { merge: true },
  );
}

// ── Filters (local) ──

const FILTERS_KEY = 'spark_filters';

export function getFilters(): Filters {
  const raw = localStorage.getItem(FILTERS_KEY);
  return raw ? JSON.parse(raw) : { ageMin: 18, ageMax: 99, gender: 'Any' };
}

export function setFilters(filters: Filters) {
  localStorage.setItem(FILTERS_KEY, JSON.stringify(filters));
}
