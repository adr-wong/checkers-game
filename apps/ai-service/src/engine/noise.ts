import type { Difficulty } from "../types";

/**
 * Returns the noise range for a given difficulty level.
 * Exported for use in tests.
 *
 * Noise ranges by difficulty:
 *   easy   : ±80
 *   medium : ±20
 *   hard   : 0  (no noise — fully deterministic)
 */
export function getNoiseRange(difficulty: Difficulty): number {
  switch (difficulty) {
    case "easy":
      return 80;
    case "medium":
      return 20;
    case "hard":
      return 0;
  }
}

/**
 * Applies difficulty-based noise to an evaluation score.
 *
 * Noise is a random integer in the range [-noiseRange, +noiseRange]
 * added to the score before comparison. This makes lower difficulty
 * levels play imperfectly without looking obviously random.
 *
 * Uses Math.random() — not seeded. Noise is intentionally non-reproducible.
 * When noiseRange is 0, this function returns score unchanged without
 * calling Math.random() so that hard difficulty remains deterministic.
 */
export function applyNoise(score: number, difficulty: Difficulty): number {
  const range = getNoiseRange(difficulty);
  if (range === 0) return score;
  const offset = Math.floor(Math.random() * (range * 2 + 1)) - range;
  return score + offset;
}
