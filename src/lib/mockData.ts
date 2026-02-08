import { User, setCurrentUser, getAllUsers } from './store';

const MOCK_PHOTOS = [
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=500&fit=crop',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=500&fit=crop',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=500&fit=crop',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=500&fit=crop',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=500&fit=crop',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=500&fit=crop',
];

const mockUsers: User[] = [
  {
    id: 'mock_1',
    email: 'emma@example.com',
    displayName: 'Emma',
    birthdate: '1998-06-15',
    gender: 'Female',
    preference: 'Male',
    bio: 'Coffee lover ☕ | Yoga enthusiast | Always planning my next adventure 🌍',
    photos: [MOCK_PHOTOS[0], MOCK_PHOTOS[2]],
    questionnaire: { q1: 'coffee', q2: 'outing', q3: 'travel', q4: 'dogs', q5: 'morning' },
    lastSeen: '2026-02-08T08:00:00Z',
  },
  {
    id: 'mock_2',
    email: 'james@example.com',
    displayName: 'James',
    birthdate: '1995-11-02',
    gender: 'Male',
    preference: 'Female',
    bio: 'Photographer 📸 | Mountain hiker | Looking for someone to share sunsets with',
    photos: [MOCK_PHOTOS[1], MOCK_PHOTOS[3]],
    questionnaire: { q1: 'tea', q2: 'outing', q3: 'sports', q4: 'dogs', q5: 'night' },
    lastSeen: '2026-02-08T07:30:00Z',
  },
  {
    id: 'mock_3',
    email: 'sofia@example.com',
    displayName: 'Sofia',
    birthdate: '2000-03-22',
    gender: 'Female',
    preference: 'Any',
    bio: 'Art student 🎨 | Vinyl collector | Let\'s grab tacos sometime 🌮',
    photos: [MOCK_PHOTOS[4], MOCK_PHOTOS[0]],
    questionnaire: { q1: 'coffee', q2: 'netflix', q3: 'movies', q4: 'cats', q5: 'night' },
    lastSeen: '2026-02-08T06:00:00Z',
  },
  {
    id: 'mock_4',
    email: 'alex@example.com',
    displayName: 'Alex',
    birthdate: '1997-08-10',
    gender: 'Male',
    preference: 'Female',
    bio: 'Software dev by day, guitarist by night 🎸 | Foodie | Dog dad',
    photos: [MOCK_PHOTOS[5], MOCK_PHOTOS[3]],
    questionnaire: { q1: 'coffee', q2: 'netflix', q3: 'reading', q4: 'dogs', q5: 'night' },
    lastSeen: '2026-02-08T07:00:00Z',
  },
  {
    id: 'mock_5',
    email: 'mia@example.com',
    displayName: 'Mia',
    birthdate: '1999-01-28',
    gender: 'Female',
    preference: 'Male',
    bio: 'Dance teacher 💃 | Plant mom 🌿 | Believe in good vibes only',
    photos: [MOCK_PHOTOS[2], MOCK_PHOTOS[4]],
    questionnaire: { q1: 'tea', q2: 'outing', q3: 'travel', q4: 'cats', q5: 'morning' },
    lastSeen: '2026-02-08T05:00:00Z',
  },
];

export function seedMockData() {
  const existing = getAllUsers();
  const mockIds = mockUsers.map(u => u.id);
  const needsSeed = !mockIds.some(id => existing.some(e => e.id === id));
  if (needsSeed) {
    mockUsers.forEach(u => {
      // Use setCurrentUser to add to users list, then clear current
      const current = localStorage.getItem('flame_current_user');
      setCurrentUser(u);
      if (current) {
        localStorage.setItem('flame_current_user', current);
      } else {
        localStorage.removeItem('flame_current_user');
      }
    });
  }
}

export { mockUsers };
