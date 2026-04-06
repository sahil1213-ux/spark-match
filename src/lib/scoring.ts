export type TraitKey = 'openness' | 'conscientiousness' | 'extraversion' | 'agreeableness' | 'neuroticism';

export type PersonalityScores = Record<TraitKey, number>;

export type PreferenceLevels = Record<TraitKey, 'low' | 'medium' | 'high'>;
export type PersonaLabel = 'Explorer' | 'Planner' | 'Social Spark' | 'Heart-led' | 'Calm Anchor' | 'Balanced';

export const TRAITS: TraitKey[] = ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism'];


export function normalizeTraitScore(rawScore: number) {
  const score = ((rawScore - 3) / 12) * 100;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function computePersonalityScores(rawAnswers: Record<TraitKey, number[]>) {
  return TRAITS.reduce((acc, trait) => {
    const raw = (rawAnswers[trait] ?? []).reduce((sum, value) => sum + value, 0);
    acc[trait] = normalizeTraitScore(raw);
    return acc;
  }, {} as PersonalityScores);
}

export function mapDesiredLevel(level: 'low' | 'medium' | 'high') {
  if (level === 'low') return 25;
  if (level === 'medium') return 50;
  return 75;
}

export function rankWeights(priorityOrder: TraitKey[]) {
  const pairs = priorityOrder.map((trait, idx) => ({ trait, weight: 5 - idx }));
  const total = pairs.reduce((sum, pair) => sum + pair.weight, 0);
  return Object.fromEntries(pairs.map((pair) => [pair.trait, pair.weight / total])) as Record<TraitKey, number>;
}

export function similarityScore(
  desiredScores: Record<TraitKey, number>,
  candidateScores: Record<TraitKey, number>,
  priorityOrder: TraitKey[],
) {
  const weights = rankWeights(priorityOrder);
  const distance = TRAITS.reduce((sum, trait) => {
    return sum + weights[trait] * Math.abs((desiredScores[trait] ?? 0) - (candidateScores[trait] ?? 0));
  }, 0);
  return Math.max(0, Math.round(100 - distance));
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

export function cosineCompatibility(me: PersonalityScores, candidate: PersonalityScores) {
  const meVec = TRAITS.map((trait) => me[trait] ?? 0);
  const candVec = TRAITS.map((trait) => candidate[trait] ?? 0);

  const dot = meVec.reduce((sum, v, i) => sum + v * candVec[i], 0);
  const meMag = Math.sqrt(meVec.reduce((sum, v) => sum + v * v, 0));
  const candMag = Math.sqrt(candVec.reduce((sum, v) => sum + v * v, 0));

  if (meMag === 0 || candMag === 0) return 0;
  return clamp((dot / (meMag * candMag)) * 100);
}


export function derivePersona(scores: PersonalityScores): PersonaLabel {
  const ranked = [...TRAITS].sort((a, b) => (scores[b] ?? 0) - (scores[a] ?? 0));
  const dominant = ranked[0];
  const dominantScore = scores[dominant] ?? 0;
  const secondScore = scores[ranked[1]] ?? 0;

  if (dominantScore - secondScore < 8) return 'Balanced';
  if (dominant === 'openness') return 'Explorer';
  if (dominant === 'conscientiousness') return 'Planner';
  if (dominant === 'extraversion') return 'Social Spark';
  if (dominant === 'agreeableness') return 'Heart-led';
  if (dominant === 'neuroticism') return 'Calm Anchor';
  return 'Balanced';
}

type Vector = [number, number, number, number, number];

function toVector(scores: PersonalityScores): Vector {
  return TRAITS.map((trait) => scores[trait] ?? 0) as Vector;
}

function euclideanDistance(a: Vector, b: Vector) {
  return Math.sqrt(a.reduce((sum, val, idx) => sum + (val - b[idx]) ** 2, 0));
}

export function runKMeans(
  samples: Record<string, PersonalityScores>,
  requestedK = 3,
  maxIterations = 12,
) {
  const ids = Object.keys(samples);
  if (ids.length === 0) return { assignments: {} as Record<string, number>, centroids: [] as Vector[] };

  const k = Math.max(1, Math.min(requestedK, ids.length));
  let centroids = ids.slice(0, k).map((id) => toVector(samples[id]));
  let assignments: Record<string, number> = {};

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    const nextAssignments: Record<string, number> = {};

    ids.forEach((id) => {
      const vector = toVector(samples[id]);
      let bestIdx = 0;
      let bestDistance = Number.POSITIVE_INFINITY;
      centroids.forEach((centroid, idx) => {
        const distance = euclideanDistance(vector, centroid);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestIdx = idx;
        }
      });
      nextAssignments[id] = bestIdx;
    });

    const nextCentroids = centroids.map((centroid, idx) => {
      const members = ids.filter((id) => nextAssignments[id] === idx).map((id) => toVector(samples[id]));
      if (!members.length) return centroid;
      const mean = centroid.map((_, dim) => members.reduce((sum, v) => sum + v[dim], 0) / members.length) as Vector;
      return mean;
    });

    const stable =
      ids.every((id) => assignments[id] === nextAssignments[id]) &&
      centroids.every((centroid, idx) => euclideanDistance(centroid, nextCentroids[idx]) < 0.001);

    assignments = nextAssignments;
    centroids = nextCentroids;

    if (stable) break;
  }

  return { assignments, centroids };
}
