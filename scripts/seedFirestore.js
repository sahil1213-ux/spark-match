#!/usr/bin/env node
/**
 * Seed Firestore with 200 randomized test users near a city center.
 *
 * Usage:
 *   1. Set GOOGLE_APPLICATION_CREDENTIALS env var to your service account key JSON
 *   2. Run: node scripts/seedFirestore.js
 *
 * Adjust CENTER_LAT / CENTER_LON to your test city.
 */

const admin = require('firebase-admin');
const geofire = require('geofire-common');

admin.initializeApp();
const db = admin.firestore();

const CENTER_LAT = 40.7128; // New York City
const CENTER_LON = -74.006;
const RADIUS_KM = 20;
const USER_COUNT = 200;

const FIRST_NAMES = [
  'Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Quinn', 'Avery',
  'Charlie', 'Dakota', 'Emery', 'Finley', 'Harper', 'Hayden', 'Jamie',
  'Kendall', 'Logan', 'Marley', 'Oakley', 'Peyton', 'Reese', 'Sage',
  'Skyler', 'Sydney', 'Tatum',
];

const BIOS = [
  'Love hiking and coffee ☕', 'Dog person 🐕', 'Bookworm & traveler',
  'Foodie who loves to cook', 'Gym + Netflix = balance', 'Music lover 🎶',
  'Adventure seeker', 'Cat parent 🐱', 'Photography enthusiast',
  'Looking for genuine connections',
];

function randomInRange(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max) {
  return Math.random() * (max - min) + min;
}

function randomOffset(kmRadius) {
  const degPerKm = 1 / 111.32;
  return (Math.random() - 0.5) * 2 * kmRadius * degPerKm;
}

async function seed() {
  console.log(`Seeding ${USER_COUNT} users near [${CENTER_LAT}, ${CENTER_LON}]...`);

  for (let i = 0; i < USER_COUNT; i++) {
    const uid = `test_user_${String(i).padStart(3, '0')}`;
    const lat = CENTER_LAT + randomOffset(RADIUS_KM);
    const lon = CENTER_LON + randomOffset(RADIUS_KM);
    const geohash = geofire.geohashForLocation([lat, lon]);
    const age = randomInRange(20, 45);
    const gender = ['Male', 'Female', 'Other'][randomInRange(0, 2)];

    // User document
    await db.collection('users').doc(uid).set({
      uid,
      email: `${uid}@test.local`,
      name: FIRST_NAMES[randomInRange(0, FIRST_NAMES.length - 1)],
      bio: BIOS[randomInRange(0, BIOS.length - 1)],
      age,
      gender,
      location: new admin.firestore.GeoPoint(lat, lon),
      geohash,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      onboardingCompleted: true,
      swipeRemaining: 25,
      swipeResetAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 86400000)),
      photos: [],
    });

    // Personality scores (0-100)
    await db.collection('personalityScores').doc(uid).set({
      openness: randomInRange(10, 95),
      conscientiousness: randomInRange(10, 95),
      extraversion: randomInRange(10, 95),
      agreeableness: randomInRange(10, 95),
      neuroticism: randomInRange(10, 95),
    });

    // Preferences
    const traits = ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism'];
    const shuffled = [...traits].sort(() => Math.random() - 0.5);
    await db.collection('preferences').doc(uid).set({
      desiredOpenness: [25, 50, 75][randomInRange(0, 2)],
      desiredConscientiousness: [25, 50, 75][randomInRange(0, 2)],
      desiredExtraversion: [25, 50, 75][randomInRange(0, 2)],
      desiredAgreeableness: [25, 50, 75][randomInRange(0, 2)],
      desiredNeuroticism: [25, 50, 75][randomInRange(0, 2)],
      priorityOrder: shuffled,
      minAge: Math.max(18, age - 5),
      maxAge: age + 10,
    });

    if ((i + 1) % 50 === 0) console.log(`  Created ${i + 1} users...`);
  }

  console.log('✅ Seeding complete!');
}

seed().catch(console.error);
