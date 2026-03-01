# Spark Match MVP (React + Capacitor + Firebase)

This project is a Firebase-first MVP dating app:
- React frontend (Vite)
- Capacitor mobile build
- Firebase Authentication (Email/Password + Google + Apple)
- Firestore data model for users, personality scores, preferences, swipes
- Firebase Cloud Functions for matching, swiping, and daily swipe reset

## 1) Setup

```bash
npm install
cd functions && npm install && cd ..
```

Create `.env` in the root:

```bash
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

## 2) Firebase init/deploy

```bash
firebase login
firebase init firestore functions
firebase deploy --only firestore:rules
firebase deploy --only functions
```

## 3) Run app

```bash
npm run dev
```

## 4) Capacitor sync/build

```bash
npx cap sync
npx cap open ios
npx cap open android
```

## Firestore Collections

- `users/{uid}`
  - name, bio, age, gender, location(GeoPoint), geohash, onboardingCompleted
  - swipeRemaining, swipeResetAt
- `personalityScores/{uid}`
  - openness, conscientiousness, extraversion, agreeableness, neuroticism (0..100)
- `preferences/{uid}`
  - desiredOpenness, desiredConscientiousness, desiredExtraversion, desiredAgreeableness, desiredNeuroticism
  - priorityOrder, minAge, maxAge
- `swipes/{autoId}`
  - swiperId, targetId, direction, createdAt

## Cloud Functions

- `getMatches` (callable)
  - Gets current user, preferences, scores
  - Finds users within 25km (geohash query + distance check)
  - Excludes swiped users
  - Applies priority-stage algorithm
  - Computes weighted match score and returns max 25 safe fields only
- `swipeUser` (callable)
  - Decrements `swipeRemaining`
  - Stores swipe doc
- `resetSwipeQueues` (scheduled every 24h)
  - Resets all users to 25 swipes and bumps `swipeResetAt`
- `resetSwipeQueueForUser` (callable)
  - Manual test reset endpoint

## Questionnaire + Scoring

- 5 pages:
  1. Basic info (bio, age, gender, location)
  2-4. Big Five questions (Likert 1-5, 3 items each trait)
  5. Partner preference (Low/Medium/High + priority)

Scoring:

```text
RawScore = sum(3 items)     // min 3, max 15
Score = ((RawScore - 3) / 12) * 100
```

Desired mapping:
- Low = 25
- Medium = 50
- High = 75

## Security and Privacy

- Passwords handled by Firebase Auth.
- Firestore rules prevent users from reading others' raw `personalityScores`.
- Match API returns safe data only: name, age, bio, distance, matchScore.
