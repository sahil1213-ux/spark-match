import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';

import { db } from './firebase';
import { getMatches as getMatchesFromStore, swipeUser } from './store';

type SwipeDirection = 'left' | 'right';

export interface MatchSummary {
  uid: string;
  name: string;
  age: number;
  bio: string;
  distanceMeters: number;
  matchScore: number;
}

interface GetMatchesResponse {
  matches: MatchSummary[];
  remaining: number;
  message?: string;
}

interface SwipeResponse {
  swipeRemaining: number;
  matched: boolean;
}

export async function ensureUserLocation(uid: string): Promise<void> {
  const coords = await getCurrentPosition();

  await updateDoc(doc(db, 'users', uid), {
    location: {
      latitude: coords.latitude,
      longitude: coords.longitude,
    },
    geohash: await geohashForCoords(coords.latitude, coords.longitude),
    locationUpdatedAt: serverTimestamp(),
  });
}

export async function updatePersonalityTraitAnswer(
  uid: string,
  trait: string,
  answer: 'yes' | 'no',
): Promise<void> {
  await updateDoc(doc(db, 'users', uid), {
    [`personalityTraitAnswers.${trait}`]: answer,
    personalityTraitAnswersUpdatedAt: serverTimestamp(),
  });
}

export async function getMatches(): Promise<GetMatchesResponse> {
  const result = await getMatchesFromStore();
  return {
    matches: result.matches.map((match) => ({
      uid: match.uid,
      name: match.name,
      age: match.age,
      bio: match.bio,
      distanceMeters:
        match.distanceMeters ?? Math.round(((match.distance ?? 0) * 1000)),
      matchScore: match.matchScore,
    })),
    remaining: result.remaining,
    message: result.message,
  };
}

export async function swipe(targetId: string, direction: SwipeDirection): Promise<SwipeResponse> {
  const result = await swipeUser(targetId, direction);
  return {
    swipeRemaining: result.remaining,
    matched: result.matched,
  };
}

async function geohashForCoords(latitude: number, longitude: number): Promise<string> {
  const geofire = await import('geofire-common');
  return geofire.geohashForLocation([latitude, longitude]);
}

function getCurrentPosition(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => reject(error),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  });
}
