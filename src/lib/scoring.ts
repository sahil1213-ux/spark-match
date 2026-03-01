export type TraitKey = 'openness' | 'conscientiousness' | 'extraversion' | 'agreeableness' | 'neuroticism';

export type PersonalityScores = Record<TraitKey, number>;

export type PreferenceLevels = Record<TraitKey, 'low' | 'medium' | 'high'>;

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
