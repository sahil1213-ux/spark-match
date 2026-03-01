#!/usr/bin/env node
/**
 * Seed Firestore with 200 randomized test users near a city center.
 *
 * Usage:
 *   1. Set GOOGLE_APPLICATION_CREDENTIALS env var to your service account key JSON
 *   2. Run: node scripts/seedFirestore.js
 */

const admin = require('firebase-admin');
const geofire = require('geofire-common');

admin.initializeApp();
const db = admin.firestore();

const CENTER_LAT = 40.7128; // New York City
const CENTER_LON = -74.006;
const RADIUS_KM = 20;
const USER_COUNT = 200;
const TRAITS = ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism'];

const FIRST_NAMES = [
  'Alex',
  'Jordan',
  'Taylor',
  'Morgan',
  'Casey',
  'Riley',
  'Quinn',
  'Avery',
  'Charlie',
  'Dakota',
  'Emery',
  'Finley',
  'Harper',
  'Hayden',
  'Jamie',
  'Kendall',
  'Logan',
  'Marley',
  'Oakley',
  'Peyton',
  'Reese',
  'Sage',
  'Skyler',
  'Sydney',
  'Tatum',
];

const BIOS = [
  'Love hiking and coffee ☕',
  'Dog person 🐕',
  'Bookworm & traveler',
  'Foodie who loves to cook',
  'Gym + Netflix = balance',
  'Music lover 🎶',
  'Adventure seeker',
  'Cat parent 🐱',
  'Photography enthusiast',
  'Looking for genuine connections',
];

function randomInRange(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomOffset(kmRadius) {
  const degPerKm = 1 / 111.32;
  return (Math.random() - 0.5) * 2 * kmRadius * degPerKm;
}

function shuffledTraits() {
  return [...TRAITS]
    .map((trait) => ({ trait, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map((item) => item.trait);
}

async function seed() {
  console.log(`Seeding ${USER_COUNT} users near [${CENTER_LAT}, ${CENTER_LON}]...`);

  for (let i = 0; i < USER_COUNT; i += 1) {
    const uid = `test_user_${String(i).padStart(3, '0')}`;
    const lat = CENTER_LAT + randomOffset(RADIUS_KM);
    const lon = CENTER_LON + randomOffset(RADIUS_KM);
    const geohash = geofire.geohashForLocation([lat, lon]);
    const age = randomInRange(20, 45);

    const personalityScores = {
      openness: randomInRange(0, 100),
      conscientiousness: randomInRange(0, 100),
      extraversion: randomInRange(0, 100),
      agreeableness: randomInRange(0, 100),
      neuroticism: randomInRange(0, 100),
    };

    const personalityTraitAnswers = Object.fromEntries(
      TRAITS.map((trait) => [trait, personalityScores[trait] >= 50 ? 'yes' : 'no']),
    );

    await db.collection('users').doc(uid).set({
      name: FIRST_NAMES[randomInRange(0, FIRST_NAMES.length - 1)],
      bio: BIOS[randomInRange(0, BIOS.length - 1)],
      age,
      location: new admin.firestore.GeoPoint(lat, lon),
      geohash,
      onboardingCompleted: true,
      swipeRemaining: 25,
      swipeResetAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 86400000)),
      personalityTraitAnswers,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await db.collection('personalityScores').doc(uid).set(personalityScores);

    await db.collection('preferences').doc(uid).set({
      desiredOpenness: randomInRange(0, 100),
      desiredConscientiousness: randomInRange(0, 100),
      desiredExtraversion: randomInRange(0, 100),
      desiredAgreeableness: randomInRange(0, 100),
      desiredNeuroticism: randomInRange(0, 100),
      priorityOrder: shuffledTraits(),
      minAge: Math.max(18, age - 5),
      maxAge: age + 10,
    });

    if ((i + 1) % 50 === 0) {
      console.log(`  Created ${i + 1} users...`);
    }
  }

  console.log('✅ Seeding complete!');
}

seed().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
