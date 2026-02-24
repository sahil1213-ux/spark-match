const STORAGE_KEYS = {
  auth: 'spark_auth',
};

const FIREBASE_API_KEY = import.meta.env.VITE_FIREBASE_API_KEY as string;
const FIREBASE_PROJECT_ID = import.meta.env.VITE_FIREBASE_PROJECT_ID as string;

const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  preference: 'Male' | 'Female' | 'Any';
  bio: string;
  questionnaire: Record<string, string>;
  photos: string[];
}

export interface MatchDoc {
  id: string;
  users: string[];
}

export interface MessageDoc {
  id: string;
  matchId: string;
  senderId: string;
  text: string;
  createdAt?: string;
}

type AuthState = { localId: string; email: string; idToken: string };

function getAuthState(): AuthState | null {
  const raw = localStorage.getItem(STORAGE_KEYS.auth);
  return raw ? (JSON.parse(raw) as AuthState) : null;
}

function setAuthState(state: AuthState) {
  localStorage.setItem(STORAGE_KEYS.auth, JSON.stringify(state));
}

function clearAuthState() {
  localStorage.removeItem(STORAGE_KEYS.auth);
}

function toFirestoreValue(value: any): any {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'number') return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toFirestoreValue) } };
  if (typeof value === 'object') {
    return {
      mapValue: {
        fields: Object.fromEntries(Object.entries(value).map(([k, v]) => [k, toFirestoreValue(v)])),
      },
    };
  }
  return { stringValue: String(value) };
}

function fromFirestoreValue(value: any): any {
  if (!value) return null;
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return Number(value.doubleValue);
  if ('booleanValue' in value) return value.booleanValue;
  if ('nullValue' in value) return null;
  if ('arrayValue' in value) return (value.arrayValue.values ?? []).map(fromFirestoreValue);
  if ('mapValue' in value) {
    const fields = value.mapValue.fields ?? {};
    return Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, fromFirestoreValue(v)]));
  }
  if ('timestampValue' in value) return value.timestampValue;
  return null;
}

function decodeDocument(doc: any) {
  const fields = doc.fields ?? {};
  return Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, fromFirestoreValue(v)]));
}

async function authedFetch(url: string, init: RequestInit = {}) {
  const auth = getAuthState();
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(init.headers as Record<string, string> ?? {}) };
  if (auth?.idToken) headers.Authorization = `Bearer ${auth.idToken}`;
  return fetch(url, { ...init, headers });
}

async function setDocument(path: string, data: Record<string, any>) {
  await authedFetch(`${FIRESTORE_BASE}/${path}`, {
    method: 'PATCH',
    body: JSON.stringify({ fields: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, toFirestoreValue(v)])) }),
  });
}

async function getDocument(path: string) {
  const res = await authedFetch(`${FIRESTORE_BASE}/${path}`);
  if (!res.ok) return null;
  const data = await res.json();
  return decodeDocument(data);
}

async function queryDocuments(fromCollectionId: string, filters: Array<{ field: string; op: string; value: any }>) {
  const body: any = {
    structuredQuery: {
      from: [{ collectionId: fromCollectionId }],
    },
  };

  if (filters.length === 1) {
    body.structuredQuery.where = {
      fieldFilter: {
        field: { fieldPath: filters[0].field },
        op: filters[0].op,
        value: toFirestoreValue(filters[0].value),
      },
    };
  } else if (filters.length > 1) {
    body.structuredQuery.where = {
      compositeFilter: {
        op: 'AND',
        filters: filters.map(f => ({
          fieldFilter: { field: { fieldPath: f.field }, op: f.op, value: toFirestoreValue(f.value) },
        })),
      },
    };
  }

  const res = await authedFetch(`${FIRESTORE_BASE}:runQuery`, { method: 'POST', body: JSON.stringify(body) });
  if (!res.ok) return [];
  const rows = await res.json();
  return rows.filter((r: any) => r.document).map((r: any) => {
    const id = r.document.name.split('/').pop();
    return { id, ...decodeDocument(r.document) };
  });
}

export async function signupUser(payload: {
  email: string;
  password: string;
  name: string;
  age: number;
  gender: UserProfile['gender'];
  preference: UserProfile['preference'];
  bio: string;
}) {
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: payload.email, password: payload.password, returnSecureToken: true }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Signup failed');

  setAuthState({ localId: data.localId, email: data.email, idToken: data.idToken });

  const profile: UserProfile = {
    id: data.localId,
    email: data.email,
    name: payload.name,
    age: payload.age,
    gender: payload.gender,
    preference: payload.preference,
    bio: payload.bio,
    questionnaire: {},
    photos: [],
  };
  await setDocument(`users/${data.localId}`, profile as unknown as Record<string, any>);
  return profile;
}

export async function loginUser(email: string, password: string) {
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Login failed');
  setAuthState({ localId: data.localId, email: data.email, idToken: data.idToken });
}

export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  const auth = getAuthState();
  if (!auth) return null;
  return getDocument(`users/${auth.localId}`);
}

export function getCurrentUserId() {
  return getAuthState()?.localId ?? null;
}

export async function saveQuestionnaire(userId: string, answers: Record<string, string>) {
  const user = await getDocument(`users/${userId}`);
  if (!user) return;
  await setDocument(`users/${userId}`, { ...user, questionnaire: answers });
}

export async function uploadUserPhoto(userId: string, file: File) {
  const asDataUrl = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
  const user = await getDocument(`users/${userId}`);
  const photos = [...(user?.photos ?? []), asDataUrl].slice(0, 6);
  await setDocument(`users/${userId}`, { ...user, photos });
  return asDataUrl;
}

export async function saveProfileBio(userId: string, bio: string) {
  const user = await getDocument(`users/${userId}`);
  if (!user) return;
  await setDocument(`users/${userId}`, { ...user, bio });
}

export async function getAllOtherUsers(userId: string): Promise<UserProfile[]> {
  const res = await authedFetch(`${FIRESTORE_BASE}/users`);
  if (!res.ok) return [];
  const data = await res.json();
  const docs = data.documents ?? [];
  return docs.map((d: any) => decodeDocument(d) as UserProfile).filter((u: UserProfile) => u.id !== userId);
}

function extractJsonArray(input: string): string {
  const start = input.indexOf('[');
  const end = input.lastIndexOf(']');
  if (start === -1 || end === -1 || end <= start) return '[]';
  return input.slice(start, end + 1);
}

export async function rankCandidatesWithAI(currentUser: UserProfile, candidates: UserProfile[]) {
  const prompt = `You are a dating compatibility engine.\nRank candidates from best to worst match.\nReturn only strict JSON:\n[\n  {\n    "userId": "",\n    "score": 85\n  }\n]\nSort highest score first.\nDo not return explanation text.`;
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${import.meta.env.VITE_GOOGLE_AI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: `${prompt}\n\nInput data:\n${JSON.stringify({ currentUser, candidates })}` }] }] }),
  });

  if (!response.ok) return candidates;
  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]';
  const parsed = JSON.parse(extractJsonArray(text)) as Array<{ userId: string; score: number }>;
  const ordered = parsed.map(item => candidates.find(c => c.id === item.userId)).filter(Boolean) as UserProfile[];
  return ordered.length > 0 ? ordered : candidates;
}

export async function swipeUser(fromUserId: string, toUserId: string, action: 'like' | 'dislike') {
  await setDocument(`swipes/${fromUserId}_${toUserId}`, { fromUserId, toUserId, action });
  if (action !== 'like') return { isMatch: false, matchId: null as string | null };

  const reverse = await getDocument(`swipes/${toUserId}_${fromUserId}`);
  if (reverse?.action === 'like') {
    const matchId = [fromUserId, toUserId].sort().join('_');
    await setDocument(`matches/${matchId}`, { users: [fromUserId, toUserId] });
    return { isMatch: true, matchId };
  }
  return { isMatch: false, matchId: null as string | null };
}

export async function getMatchesForUser(userId: string) {
  return queryDocuments('matches', [{ field: 'users', op: 'ARRAY_CONTAINS', value: userId }]) as Promise<MatchDoc[]>;
}

export async function getUserById(userId: string) {
  return getDocument(`users/${userId}`) as Promise<UserProfile | null>;
}

export async function listMessages(matchId: string) {
  const msgs = await queryDocuments('messages', [{ field: 'matchId', op: 'EQUAL', value: matchId }]);
  return (msgs as MessageDoc[]).sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
}

export async function sendMessage(matchId: string, senderId: string, text: string) {
  const docId = `msg_${Date.now()}`;
  await setDocument(`messages/${docId}`, { matchId, senderId, text, createdAt: new Date().toISOString() });
}

export async function logout() {
  clearAuthState();
}


export interface Filters {
  ageMin: number;
  ageMax: number;
  gender: 'Male' | 'Female' | 'Any';
}

export function getFilters(): Filters {
  const raw = localStorage.getItem('spark_filters');
  return raw ? JSON.parse(raw) : { ageMin: 18, ageMax: 99, gender: 'Any' };
}

export function setFilters(filters: Filters) {
  localStorage.setItem('spark_filters', JSON.stringify(filters));
}

export function getCurrentUser() {
  return getAuthState();
}
