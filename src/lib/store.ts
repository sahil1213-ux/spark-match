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
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth, db, functions } from '@/lib/firebase';
import { PreferenceLevels, PersonalityScores, TraitKey, mapDesiredLevel } from '@/lib/scoring';
import { geohashForLocation } from 'geofire-common';

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
}

export interface MatchResult {
  uid: string;
  name: string;
  age: number;
  bio: string;
  distance: number;
  matchScore: number;
}

const FILTERS_KEY = 'spark_filters';

export interface Filters {
  ageMin: number;
  ageMax: number;
  gender: 'Male' | 'Female' | 'Any';
}

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
      ...(base.location ? { location: base.location } : {}),
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

export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  const user = auth.currentUser;
  if (!user) return null;
  const snapshot = await getDoc(doc(db, 'users', user.uid));
  if (!snapshot.exists()) return null;
  return { id: user.uid, ...snapshot.data() } as UserProfile;
}

export function getCurrentUserId() {
  return auth.currentUser?.uid ?? null;
}

export async function saveQuestionnaire(userId: string, payload: {
  bio: string;
  age: number;
  gender: UserProfile['gender'];
  lat: number;
  lon: number;
  scores: PersonalityScores;
  preferenceLevels: PreferenceLevels;
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
  });

  await setDoc(doc(db, 'personalityScores', userId), payload.scores);

  await setDoc(doc(db, 'preferences', userId), {
    desiredOpenness: mapDesiredLevel(payload.preferenceLevels.openness),
    desiredConscientiousness: mapDesiredLevel(payload.preferenceLevels.conscientiousness),
    desiredExtraversion: mapDesiredLevel(payload.preferenceLevels.extraversion),
    desiredAgreeableness: mapDesiredLevel(payload.preferenceLevels.agreeableness),
    desiredNeuroticism: mapDesiredLevel(payload.preferenceLevels.neuroticism),
    priorityOrder: payload.priorityOrder,
    minAge: payload.minAge,
    maxAge: payload.maxAge,
  });
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

export async function saveProfileBio(userId: string, bio: string) {
  await updateDoc(doc(db, 'users', userId), { bio });
}

export async function getMatches(): Promise<MatchResult[]> {
  const call = httpsCallable(functions, 'getMatches');
  const result = await call();
  return (result.data ?? []) as MatchResult[];
}

export async function swipeUser(targetId: string, direction: 'left' | 'right') {
  const call = httpsCallable(functions, 'swipeUser');
  const result = await call({ targetId, direction });
  return result.data as { remaining: number };
}

export async function getMatchesForUser(userId: string) {
  const matchesQuery = query(collection(db, 'matches'), where('users', 'array-contains', userId));
  const snapshots = await getDocs(matchesQuery);
  return snapshots.docs.map((d) => ({ id: d.id, ...d.data() })) as Array<{ id: string; users: string[] }>;
}

export async function getUserById(userId: string) {
  const snapshot = await getDoc(doc(db, 'users', userId));
  if (!snapshot.exists()) return null;
  return { id: userId, ...snapshot.data() } as UserProfile;
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

export async function logout() {
  await signOut(auth);
}

export function getFilters(): Filters {
  const raw = localStorage.getItem(FILTERS_KEY);
  return raw ? JSON.parse(raw) : { ageMin: 18, ageMax: 99, gender: 'Any' };
}

export function setFilters(filters: Filters) {
  localStorage.setItem(FILTERS_KEY, JSON.stringify(filters));
}

export function getCurrentUser() {
  return auth.currentUser;
}
