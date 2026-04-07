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
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  startAt,
  endAt,
  updateDoc,
  where,
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { cosineCompatibility, derivePersona, PersonalityScores, TraitKey } from '@/lib/scoring';
import { geohashForLocation } from 'geofire-common';

const TRAITS: TraitKey[] = ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism'];
const MAX_MATCHES = 25;
const TRAIT_THRESHOLD = 80;
const MAX_PROFILE_PHOTOS = 5;

// ── Types ──

export interface UserProfile {
  id: string;
  uid: string;
  email: string;
  name: string;
  bio: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  identity?: 'Male' | 'Female' | 'Non-binary' | 'Prefer not to say';
  interestedIn?: 'Men' | 'Women' | 'Everyone';
  dob?: string;
  phone?: string;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  location?: GeoPoint;
  onboardingCompleted: boolean;
  createdAt?: Timestamp;
  swipeRemaining: number;
  swipeResetAt?: Timestamp;
  photos: string[];
  matchingScores?: PersonalityScores;
  city?: string;
  relationshipGoal?: 'short-term' | 'long-term' | 'friends' | 'open to anything';
  wantsChildren?: 'yes' | 'no' | 'unsure';
  hasChildren?: 'yes' | 'no';
  smoking?: 'yes' | 'no' | 'prefer not to say';
  drinking?: 'yes' | 'no' | 'prefer not to say';
  exerciseFrequency?: 'never' | 'rarely' | 'daily';
  sleepHabits?: 'early bird' | 'night owl' | 'flexible';
  eatingPreference?: 'omnivore' | 'vegetarian' | 'vegan';
  occupation?: string;
  height?: string;
  languages?: string[];
  weekendPreference?: 'Going out' | 'With friends' | 'Working on goals' | 'Relaxing alone';
  fitnessImportance?: 'Low' | 'Moderate' | 'High';
  sleepType?: 'Night owl' | 'Early riser';
  diet?: 'Veg' | 'Non-veg' | 'Vegan';
  highestEducationLevel?: 'High School' | 'Diploma' | 'Graduate' | 'Postgraduate';
  collegeUniversity?: string;
  fieldOfStudy?: string;
  currentFocus?: 'Studying' | 'Job' | 'Business / Startup' | 'Exploring';
  relationshipStatus?: 'Single' | 'Divorced' | 'Prefer not to say';
  lookingFor?: 'Serious relationship' | 'Marriage' | 'Casual dating' | 'Not sure';
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
  ageMin: number | null;
  ageMax: number | null;
}

export interface AdvancedFilters extends Filters {
  distanceKm: number;
  educationLevel: 'High School' | 'Diploma' | 'Graduate' | 'Postgraduate' | null;
  lifestylePreference: 'Non-smoker' | 'Non-drinker' | 'Vegetarian' | 'Vegan' | 'Active' | null;
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
      identity: base.identity ?? 'Prefer not to say',
      interestedIn: base.interestedIn ?? 'Everyone',
      dob: base.dob ?? '',
      phone: base.phone ?? '',
      city: base.city ?? '',
      emailVerified: Boolean(base.emailVerified),
      phoneVerified: Boolean(base.phoneVerified),
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
  identity: NonNullable<UserProfile['identity']>;
  interestedIn: NonNullable<UserProfile['interestedIn']>;
  dob: string;
  phone: string;
  city: string;
  emailVerified: boolean;
  phoneVerified: boolean;
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

export async function saveUserPhotos(userId: string, photos: string[]) {
  const nextPhotos = photos.filter(Boolean).slice(0, MAX_PROFILE_PHOTOS);
  await updateDoc(doc(db, 'users', userId), { photos: nextPhotos });
  return nextPhotos;
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
  await saveUserPhotos(userId, [...currentPhotos, asDataUrl]);
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
  city: string;
  relationshipGoal: NonNullable<UserProfile['relationshipGoal']>;
  wantsChildren: NonNullable<UserProfile['wantsChildren']>;
  hasChildren: NonNullable<UserProfile['hasChildren']>;
  smoking: NonNullable<UserProfile['smoking']>;
  drinking: NonNullable<UserProfile['drinking']>;
  exerciseFrequency: NonNullable<UserProfile['exerciseFrequency']>;
  sleepHabits: NonNullable<UserProfile['sleepHabits']>;
  eatingPreference: NonNullable<UserProfile['eatingPreference']>;
  occupation: string;
  height: string;
  relationshipStatus: NonNullable<UserProfile['relationshipStatus']>;
  lookingFor: NonNullable<UserProfile['lookingFor']>;
}) {
  await updateDoc(doc(db, 'users', userId), {
    bio: payload.bio,
    age: payload.age,
    gender: payload.gender,
    location: new GeoPoint(payload.lat, payload.lon),
    geohash: geohashForLocation([payload.lat, payload.lon]),
    onboardingCompleted: true,
    matchingScores: payload.scores,
    city: payload.city,
    relationshipGoal: payload.relationshipGoal,
    wantsChildren: payload.wantsChildren,
    hasChildren: payload.hasChildren,
    smoking: payload.smoking,
    drinking: payload.drinking,
    exerciseFrequency: payload.exerciseFrequency,
    sleepHabits: payload.sleepHabits,
    eatingPreference: payload.eatingPreference,
    occupation: payload.occupation,
    height: payload.height,
    relationshipStatus: payload.relationshipStatus,
    lookingFor: payload.lookingFor,
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
    relationshipGoal: payload.relationshipGoal,
    wantsChildren: payload.wantsChildren,
    hasChildren: payload.hasChildren,
    smoking: payload.smoking,
    drinking: payload.drinking,
    exerciseFrequency: payload.exerciseFrequency,
    sleepHabits: payload.sleepHabits,
    eatingPreference: payload.eatingPreference,
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
    return { matches: [], remaining: 0, message: 'no_more_cards_today' };
  }

  const swipedSnap = await getDocs(query(collection(db, 'swipes'), where('swiperId', '==', uid)));
  const swipedIds = new Set(swipedSnap.docs.map((d) => String(d.data().targetId)));

  const candidates = await fetchCandidateUsers(uid, Number(pref.minAge ?? 18), Number(pref.maxAge ?? 99), swipedIds);

  const priorityOrder = (Array.isArray(pref.priorityOrder) ? pref.priorityOrder : TRAITS).filter(
    (t): t is TraitKey => TRAITS.includes(t as TraitKey),
  );
  const completedPriorityOrder = [...priorityOrder, ...TRAITS.filter((t) => !priorityOrder.includes(t))];
  let prioritizedPool: (MatchResult & { scores: Record<TraitKey, number> })[] = [];

  for (const trait of completedPriorityOrder) {
    const filtered = candidates.filter((candidate) => Number(candidate.scores[trait] ?? -1) >= TRAIT_THRESHOLD);
    if (filtered.length > 0) {
      prioritizedPool = filtered;
      break;
    }
  }

  const ranked = prioritizedPool
    .map((candidate) => ({
      uid: candidate.uid,
      name: candidate.name,
      age: candidate.age,
      bio: candidate.bio,
      photos: candidate.photos,
      matchScore: computeMatchScore(candidate.scores, completedPriorityOrder),
    }))
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, Math.min(MAX_MATCHES, remaining));

  if (!ranked.length) {
    return {
      matches: [],
      remaining,
      message: 'no_profiles_for_priority_order',
    };
  }

  return { matches: ranked, remaining };
}

export async function swipeUser(targetId: string, direction: 'left' | 'right') {
  const uid = getCurrentUserId();
  if (!uid) throw new Error('Unauthenticated');

  const userRef = doc(db, 'users', uid);
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



const DISCOVER_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const DISCOVER_SWIPE_LIMIT = 15;

export interface DiscoverProfile {
  id: string;
  name: string;
  age: number;
  gender?: string;
  bio?: string;
  photos: string[];
  location?: { latitude: number; longitude: number };
  city?: string;
  relationshipGoal?: string;
  wantsChildren?: string;
  hasChildren?: string;
  smoking?: string;
  drinking?: string;
  exerciseFrequency?: string;
  sleepHabits?: string;
  eatingPreference?: string;
  occupation?: string;
  educationLevel?: string;
  height?: string;
  matchingScores?: Partial<Record<TraitKey, number>>;
  persona?: string;
  compatibilityScore: number;
}

export type DiscoverSwipeStatus = {
  remaining: number;
  limitReached: boolean;
  resetAt: number;
};

function toRad(value: number) {
  return (value * Math.PI) / 180;
}

function distanceKmBetween(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const R = 6371;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const x = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return R * c;
}

function discoverStorageKey(uid: string) {
  return `spark_discover_profiles_${uid}`;
}

function discoverFetchAtKey(uid: string) {
  return `spark_discover_last_fetch_${uid}`;
}

function discoverSwipedKey(uid: string) {
  return `spark_discover_swiped_${uid}`;
}

function discoverLikedKey(uid: string) {
  return `spark_discover_liked_${uid}`;
}

function discoverDislikedKey(uid: string) {
  return `spark_discover_disliked_${uid}`;
}

function discoverSwipeStateKey(uid: string) {
  return `spark_discover_swipe_state_${uid}`;
}

function getLocalSwipedIds(uid: string): string[] {
  const raw = localStorage.getItem(discoverSwipedKey(uid));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function setLocalSwipedIds(uid: string, ids: string[]) {
  localStorage.setItem(discoverSwipedKey(uid), JSON.stringify(ids));
}

function getLocalDirectionIds(uid: string, direction: 'left' | 'right') {
  const key = direction === 'right' ? discoverLikedKey(uid) : discoverDislikedKey(uid);
  const raw = localStorage.getItem(key);
  if (!raw) return [] as string[];
  try {
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [] as string[];
  }
}

function setLocalDirectionIds(uid: string, direction: 'left' | 'right', ids: string[]) {
  const key = direction === 'right' ? discoverLikedKey(uid) : discoverDislikedKey(uid);
  localStorage.setItem(key, JSON.stringify(ids));
}

function getStoredDiscoverProfiles(uid: string) {
  const raw = localStorage.getItem(discoverStorageKey(uid));
  if (!raw) return [] as DiscoverProfile[];
  try {
    const parsed = JSON.parse(raw) as DiscoverProfile[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [] as DiscoverProfile[];
  }
}

function setStoredDiscoverProfiles(uid: string, profiles: DiscoverProfile[]) {
  localStorage.setItem(discoverStorageKey(uid), JSON.stringify(profiles));
}

function getCompleteTraitScores(raw?: Partial<Record<TraitKey, number>>) {
  if (!raw) return null;
  const completed = TRAITS.reduce((acc, trait) => {
    const score = Number(raw[trait]);
    acc[trait] = Number.isFinite(score) ? score : 0;
    return acc;
  }, {} as Record<TraitKey, number>);
  return completed;
}

function matchPreferredGender(profile: DiscoverProfile, me: UserProfile) {
  const interested = me.interestedIn ?? 'Everyone';
  if (interested === 'Everyone') return true;
  if (!profile.gender) return true;
  if (interested === 'Men') return profile.gender === 'Male';
  if (interested === 'Women') return profile.gender === 'Female';
  return true;
}

function withinDistanceRange(profile: DiscoverProfile, me: UserProfile, distanceKm: number) {
  if (!me.location || !profile.location) return true;
  const distance = distanceKmBetween(
    { latitude: me.location.latitude, longitude: me.location.longitude },
    profile.location,
  );
  return distance <= distanceKm;
}

function filterByUserFilters(profile: DiscoverProfile, me: UserProfile, filters: AdvancedFilters) {
  if (filters.ageMin != null && profile.age < filters.ageMin) return false;
  if (filters.ageMax != null && profile.age > filters.ageMax) return false;
  if (!withinDistanceRange(profile, me, filters.distanceKm)) return false;

  if (filters.educationLevel && profile.educationLevel && profile.educationLevel !== filters.educationLevel) return false;

  if (filters.lifestylePreference === 'Non-smoker' && profile.smoking && profile.smoking !== 'no') return false;
  if (filters.lifestylePreference === 'Non-drinker' && profile.drinking && profile.drinking !== 'no') return false;
  if (filters.lifestylePreference === 'Vegetarian' && profile.eatingPreference && profile.eatingPreference !== 'vegetarian') return false;
  if (filters.lifestylePreference === 'Vegan' && profile.eatingPreference && profile.eatingPreference !== 'vegan') return false;
  if (filters.lifestylePreference === 'Active' && profile.exerciseFrequency && profile.exerciseFrequency !== 'daily') return false;

  return true;
}

function sortByCompatibilityDesc(profiles: DiscoverProfile[]) {
  return [...profiles].sort((a, b) => b.compatibilityScore - a.compatibilityScore);
}

function getDiscoverSwipeStatusForUid(uid: string): DiscoverSwipeStatus {
  const now = Date.now();
  const raw = localStorage.getItem(discoverSwipeStateKey(uid));

  if (!raw) {
    return {
      remaining: DISCOVER_SWIPE_LIMIT,
      limitReached: false,
      resetAt: now + DISCOVER_CACHE_TTL_MS,
    };
  }

  try {
    const parsed = JSON.parse(raw) as { count?: number; resetAt?: number };
    const resetAt = Number(parsed.resetAt ?? now + DISCOVER_CACHE_TTL_MS);
    const count = Number(parsed.count ?? 0);

    if (now >= resetAt) {
      return {
        remaining: DISCOVER_SWIPE_LIMIT,
        limitReached: false,
        resetAt: now + DISCOVER_CACHE_TTL_MS,
      };
    }

    const remaining = Math.max(0, DISCOVER_SWIPE_LIMIT - count);
    return {
      remaining,
      limitReached: remaining <= 0,
      resetAt,
    };
  } catch {
    return {
      remaining: DISCOVER_SWIPE_LIMIT,
      limitReached: false,
      resetAt: now + DISCOVER_CACHE_TTL_MS,
    };
  }
}

function saveDiscoverSwipeStatusForUid(uid: string, count: number, resetAt: number) {
  localStorage.setItem(discoverSwipeStateKey(uid), JSON.stringify({ count, resetAt }));
}

function incrementDiscoverSwipeForUid(uid: string) {
  const now = Date.now();
  const status = getDiscoverSwipeStatusForUid(uid);
  const windowResetAt = status.resetAt > now ? status.resetAt : now + DISCOVER_CACHE_TTL_MS;
  const nextCount = DISCOVER_SWIPE_LIMIT - status.remaining + 1;
  saveDiscoverSwipeStatusForUid(uid, Math.min(nextCount, DISCOVER_SWIPE_LIMIT), windowResetAt);
  return getDiscoverSwipeStatusForUid(uid);
}

export function getDiscoverSwipeStatus(): DiscoverSwipeStatus {
  const uid = getCurrentUserId();
  if (!uid) {
    return {
      remaining: DISCOVER_SWIPE_LIMIT,
      limitReached: false,
      resetAt: Date.now() + DISCOVER_CACHE_TTL_MS,
    };
  }

  const status = getDiscoverSwipeStatusForUid(uid);
  if (Date.now() >= status.resetAt || (status.remaining === DISCOVER_SWIPE_LIMIT && status.limitReached)) {
    saveDiscoverSwipeStatusForUid(uid, 0, status.resetAt);
    return getDiscoverSwipeStatusForUid(uid);
  }
  return status;
}

async function fetchProfilesFromBackend(uid: string): Promise<DiscoverProfile[]> {
  const me = await getCurrentUserProfile();
  if (!me) return [];

  const filters = await getAdvancedFilters();
  const meScores = getCompleteTraitScores(me.matchingScores);
  if (!meScores) {
    setStoredDiscoverProfiles(uid, []);
    localStorage.setItem(discoverFetchAtKey(uid), String(Date.now()));
    return [];
  }

  const snap = await getDocs(query(collection(db, 'users')));

  const scored = snap.docs
    .filter((d) => d.id !== uid)
    .map((d) => {
      const u = d.data() as Record<string, unknown>;
      const loc = u.location as GeoPoint | undefined;
      const location = loc ? { latitude: loc.latitude, longitude: loc.longitude } : undefined;
      const traitScores = getCompleteTraitScores((u.matchingScores as Partial<Record<TraitKey, number>> | undefined) ?? undefined);
      if (!traitScores) return null;

      const candidateProfile = {
        id: d.id,
        name: String(u.name ?? ''),
        age: Number(u.age ?? 0),
        gender: String(u.gender ?? ''),
        bio: String(u.bio ?? ''),
        photos: ((u.photos as string[] | undefined) ?? []).slice(0, 6),
        location,
        city: String(u.city ?? ''),
        relationshipGoal: String(u.relationshipGoal ?? ''),
        wantsChildren: String(u.wantsChildren ?? ''),
        hasChildren: String(u.hasChildren ?? ''),
        smoking: String(u.smoking ?? ''),
        drinking: String(u.drinking ?? ''),
        exerciseFrequency: String(u.exerciseFrequency ?? ''),
        sleepHabits: String(u.sleepHabits ?? ''),
        eatingPreference: String(u.eatingPreference ?? ''),
        occupation: String(u.occupation ?? ''),
        educationLevel: String(u.highestEducationLevel ?? u.educationLevel ?? ''),
        height: String(u.height ?? ''),
        matchingScores: traitScores,
        persona: derivePersona(traitScores as PersonalityScores),
        compatibilityScore: Math.round(cosineCompatibility(meScores as PersonalityScores, traitScores as PersonalityScores)),
      } as DiscoverProfile;

      return candidateProfile;
    })
    .filter((profile): profile is DiscoverProfile => Boolean(profile))
    .filter((profile) => profile.age >= 18)
    .filter((profile) => matchPreferredGender(profile, me))
    .filter((profile) => withinDistanceRange(profile, me, filters.distanceKm))
    ;

  const sortedProfiles = sortByCompatibilityDesc(scored);
  setStoredDiscoverProfiles(uid, sortedProfiles);
  localStorage.setItem(discoverFetchAtKey(uid), String(Date.now()));

  return sortedProfiles;
}

function toMatchResult(profile: DiscoverProfile): MatchResult {
  return {
    uid: profile.id,
    name: profile.name,
    age: profile.age,
    bio: profile.bio ?? '',
    photos: profile.photos,
    matchScore: profile.compatibilityScore,
  };
}

export function getLocalDiscoverSwipedCount() {
  const status = getDiscoverSwipeStatus();
  return DISCOVER_SWIPE_LIMIT - status.remaining;
}

export async function getDiscoverProfiles(options?: { forceRefresh?: boolean }): Promise<{ matches: MatchResult[]; fromCache: boolean }> {
  const uid = getCurrentUserId();
  if (!uid) throw new Error('Unauthenticated');

  const forceRefresh = Boolean(options?.forceRefresh);
  const lastFetch = Number(localStorage.getItem(discoverFetchAtKey(uid)) ?? 0);
  const within24h = Date.now() - lastFetch < DISCOVER_CACHE_TTL_MS;

  let profiles: DiscoverProfile[] = [];
  let fromCache = false;

  if (!forceRefresh && within24h) {
    profiles = getStoredDiscoverProfiles(uid);
    fromCache = true;
  } else {
    profiles = await fetchProfilesFromBackend(uid);
    fromCache = false;
  }

  const filters = await getAdvancedFilters();
  const me = await getCurrentUserProfile();
  if (!me) return { matches: [], fromCache };

  const swipedIds = new Set(getLocalSwipedIds(uid));
  const filtered = sortByCompatibilityDesc(
    profiles
      .filter((profile) => !swipedIds.has(profile.id))
      .filter((profile) => filterByUserFilters(profile, me, filters)),
  );

  return { matches: filtered.map(toMatchResult), fromCache };
}

export function getDiscoverProfileById(profileId: string) {
  const uid = getCurrentUserId();
  if (!uid) return null;
  return getStoredDiscoverProfiles(uid).find((profile) => profile.id === profileId) ?? null;
}

export function markDiscoverProfileSwiped(profileId: string, direction: 'left' | 'right') {
  const uid = getCurrentUserId();
  if (!uid) {
    return {
      allowed: false,
      status: {
        remaining: 0,
        limitReached: true,
        resetAt: Date.now() + DISCOVER_CACHE_TTL_MS,
      },
    };
  }

  const currentStatus = getDiscoverSwipeStatusForUid(uid);
  if (currentStatus.limitReached) {
    return { allowed: false, status: currentStatus };
  }

  const swipedIds = getLocalSwipedIds(uid);
  if (!swipedIds.includes(profileId)) {
    swipedIds.push(profileId);
    setLocalSwipedIds(uid, swipedIds);
  }

  const directionIds = getLocalDirectionIds(uid, direction);
  if (!directionIds.includes(profileId)) {
    directionIds.push(profileId);
    setLocalDirectionIds(uid, direction, directionIds);
  }

  const profiles = getStoredDiscoverProfiles(uid);
  const next = profiles.filter((profile) => profile.id !== profileId);
  setStoredDiscoverProfiles(uid, next);

  return { allowed: true, status: incrementDiscoverSwipeForUid(uid) };
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
  return raw ? JSON.parse(raw) : { ageMin: null, ageMax: null };
}

export function setFilters(filters: Filters) {
  localStorage.setItem(FILTERS_KEY, JSON.stringify(filters));
}


function defaultAdvancedFilters(): AdvancedFilters {
  return {
    ageMin: null,
    ageMax: null,
    distanceKm: 25,
    educationLevel: null,
    lifestylePreference: null,
  };
}

export async function getAdvancedFilters(): Promise<AdvancedFilters> {
  const uid = getCurrentUserId();
  const fallback = defaultAdvancedFilters();
  const local = getFilters();

  if (!uid) {
    return { ...fallback, ...local };
  }

  const prefSnap = await getDoc(doc(db, 'preferences', uid));
  if (!prefSnap.exists()) {
    return { ...fallback, ...local };
  }

  const pref = prefSnap.data() as Record<string, unknown>;

  return {
    ageMin: pref.minAge == null ? (local.ageMin ?? fallback.ageMin) : Number(pref.minAge),
    ageMax: pref.maxAge == null ? (local.ageMax ?? fallback.ageMax) : Number(pref.maxAge),
    distanceKm: Number(pref.distanceKm ?? fallback.distanceKm),
    educationLevel: (pref.educationLevel as AdvancedFilters['educationLevel']) ?? fallback.educationLevel,
    lifestylePreference: (pref.lifestylePreference as AdvancedFilters['lifestylePreference']) ?? fallback.lifestylePreference,
  };
}

export function clearDiscoverLocalCache() {
  const uid = getCurrentUserId();
  if (!uid) return;
  localStorage.removeItem(discoverStorageKey(uid));
  localStorage.removeItem(discoverFetchAtKey(uid));
  localStorage.removeItem(discoverSwipedKey(uid));
  localStorage.removeItem(discoverLikedKey(uid));
  localStorage.removeItem(discoverDislikedKey(uid));
}

export async function saveAdvancedFilters(filters: AdvancedFilters) {
  const uid = getCurrentUserId();

  setFilters({ ageMin: filters.ageMin, ageMax: filters.ageMax });
  clearDiscoverLocalCache();

  if (!uid) return;

  await setDoc(
    doc(db, 'preferences', uid),
    {
      minAge: filters.ageMin,
      maxAge: filters.ageMax,
      distanceKm: filters.distanceKm,
      educationLevel: filters.educationLevel,
      lifestylePreference: filters.lifestylePreference,
    },
    { merge: true },
  );
}

export async function updateUserProfileDetails(
  userId: string,
  payload: Partial<
    Pick<
      UserProfile,
      | 'bio'
      | 'height'
      | 'city'
      | 'relationshipStatus'
      | 'lookingFor'
      | 'photos'
      | 'languages'
      | 'weekendPreference'
      | 'fitnessImportance'
      | 'sleepType'
      | 'smoking'
      | 'drinking'
      | 'diet'
      | 'highestEducationLevel'
      | 'collegeUniversity'
      | 'fieldOfStudy'
      | 'currentFocus'
    >
  >,
) {
  await updateDoc(doc(db, 'users', userId), payload);
}
