/**
 * Seeded pseudo-random number generator (Mulberry32).
 *
 * Deterministic for debugging — pass a fixed seed.
 * Different across normal sessions — pass Date.now() as the seed.
 * Player-choice influence — mix player-specific values into the seed before constructing.
 *
 * Coordinate space: none (pure numeric utility).
 */
export class SeededRng {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0; // uint32
  }

  /** Returns a float in [0, 1). */
  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000;
  }

  /** Returns an integer in [min, max) — both inclusive lower, exclusive upper. */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min)) + min;
  }

  /** Returns a float in [min, max). */
  nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }

  /** Shuffles an array in-place using Fisher-Yates. */
  shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i + 1);
      const tmp = arr[i]!;
      arr[i] = arr[j]!;
      arr[j] = tmp;
    }
    return arr;
  }
}

/**
 * Derive a per-session seed that is different every normal run
 * but reproducible when a fixed override is supplied (for debug).
 */
export function makeSeed(debugOverride?: number): number {
  return debugOverride !== undefined ? debugOverride : Date.now();
}
