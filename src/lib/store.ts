// Local-first data store for the dating app prototype

export interface User {
  id: string;
  email: string;
  displayName: string;
  birthdate: string;
  gender: 'Male' | 'Female' | 'Other';
  preference: 'Male' | 'Female' | 'Any';
  bio: string;
  photos: string[];
  questionnaire: Record<string, string>;
  lastSeen: string;
}

export interface Message {
  id: string;
  chatId: string;
  from: string;
  to: string;
  text: string;
  createdAt: string;
}

export interface Filters {
  ageMin: number;
  ageMax: number;
  gender: 'Male' | 'Female' | 'Any';
}

const STORAGE_KEYS = {
  currentUser: 'flame_current_user',
  users: 'flame_users',
  messages: 'flame_messages',
  matches: 'flame_matches',
  swipedLeft: 'flame_swiped_left',
  filters: 'flame_filters',
};

function getItem<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setItem(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

// Current user
export function getCurrentUser(): User | null {
  return getItem<User | null>(STORAGE_KEYS.currentUser, null);
}

export function setCurrentUser(user: User) {
  setItem(STORAGE_KEYS.currentUser, user);
  // Also update in users list
  const users = getAllUsers();
  const idx = users.findIndex(u => u.id === user.id);
  if (idx >= 0) users[idx] = user;
  else users.push(user);
  setItem(STORAGE_KEYS.users, users);
}

export function logout() {
  localStorage.removeItem(STORAGE_KEYS.currentUser);
}

// Users
export function getAllUsers(): User[] {
  return getItem<User[]>(STORAGE_KEYS.users, []);
}

export function getUserById(id: string): User | undefined {
  return getAllUsers().find(u => u.id === id);
}

// Auth
export function loginUser(email: string, _password: string): User | null {
  const users = getAllUsers();
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (user) {
    setItem(STORAGE_KEYS.currentUser, user);
    return user;
  }
  return null;
}

export function signupUser(data: Omit<User, 'id' | 'photos' | 'questionnaire' | 'lastSeen'>): User {
  const user: User = {
    ...data,
    id: 'user_' + Date.now(),
    photos: [],
    questionnaire: {},
    lastSeen: new Date().toISOString(),
  };
  setCurrentUser(user);
  return user;
}

// Matches
export function getMatches(): string[] {
  return getItem<string[]>(STORAGE_KEYS.matches, []);
}

export function addMatch(userId: string) {
  const matches = getMatches();
  if (!matches.includes(userId)) {
    matches.push(userId);
    setItem(STORAGE_KEYS.matches, matches);
  }
}

// Swiped left
export function getSwipedLeft(): string[] {
  return getItem<string[]>(STORAGE_KEYS.swipedLeft, []);
}

export function addSwipedLeft(userId: string) {
  const swiped = getSwipedLeft();
  if (!swiped.includes(userId)) {
    swiped.push(userId);
    setItem(STORAGE_KEYS.swipedLeft, swiped);
  }
}

// Messages
export function getMessages(chatId: string): Message[] {
  const all = getItem<Message[]>(STORAGE_KEYS.messages, []);
  return all.filter(m => m.chatId === chatId).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export function sendMessage(from: string, to: string, text: string) {
  const chatId = getChatId(from, to);
  const all = getItem<Message[]>(STORAGE_KEYS.messages, []);
  all.push({
    id: 'msg_' + Date.now(),
    chatId,
    from,
    to,
    text,
    createdAt: new Date().toISOString(),
  });
  setItem(STORAGE_KEYS.messages, all);
}

export function getChatId(a: string, b: string): string {
  return [a, b].sort().join('_');
}

export function getLastMessage(chatId: string): Message | undefined {
  const msgs = getMessages(chatId);
  return msgs[msgs.length - 1];
}

// Filters
export function getFilters(): Filters {
  return getItem<Filters>(STORAGE_KEYS.filters, { ageMin: 18, ageMax: 50, gender: 'Any' });
}

export function setFilters(filters: Filters) {
  setItem(STORAGE_KEYS.filters, filters);
}

// Age calc
export function getAge(birthdate: string): number {
  const today = new Date();
  const birth = new Date(birthdate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}
