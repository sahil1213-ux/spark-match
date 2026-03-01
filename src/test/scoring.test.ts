import { describe, expect, it } from 'vitest';
import { computePersonalityScores, mapDesiredLevel, similarityScore } from '@/lib/scoring';

describe('scoring utilities', () => {
  it('normalizes trait scores from 3-question raw totals', () => {
    const scores = computePersonalityScores({
      openness: [5, 5, 5],
      conscientiousness: [1, 1, 1],
      extraversion: [3, 3, 3],
      agreeableness: [4, 4, 4],
      neuroticism: [2, 2, 2],
    });

    expect(scores.openness).toBe(100);
    expect(scores.conscientiousness).toBe(0);
    expect(scores.extraversion).toBe(50);
  });

  it('maps preference levels and computes weighted similarity', () => {
    expect(mapDesiredLevel('low')).toBe(25);
    expect(mapDesiredLevel('medium')).toBe(50);
    expect(mapDesiredLevel('high')).toBe(75);

    const score = similarityScore(
      { openness: 75, conscientiousness: 50, extraversion: 25, agreeableness: 50, neuroticism: 25 },
      { openness: 75, conscientiousness: 40, extraversion: 35, agreeableness: 50, neuroticism: 15 },
      ['openness', 'agreeableness', 'conscientiousness', 'extraversion', 'neuroticism'],
    );

    expect(score).toBeGreaterThan(80);
  });
});
