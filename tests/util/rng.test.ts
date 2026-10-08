/**
 * Unit tests: SeededRng
 *
 * Tests seeded reproducibility, range, shuffle behaviour.
 * No browser globals required.
 */

import { describe, it, expect } from 'vitest';
import { SeededRng, makeSeed } from '../../src/util/rng.js';

describe('SeededRng', () => {
  it('produces values in [0, 1)', () => {
    const rng = new SeededRng(42);
    for (let i = 0; i < 1000; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('is reproducible with the same seed', () => {
    const a = new SeededRng(12345);
    const b = new SeededRng(12345);
    for (let i = 0; i < 50; i++) {
      expect(a.next()).toBe(b.next());
    }
  });

  it('produces different sequences for different seeds', () => {
    const a = new SeededRng(1);
    const b = new SeededRng(2);
    let different = false;
    for (let i = 0; i < 20; i++) {
      if (a.next() !== b.next()) { different = true; break; }
    }
    expect(different).toBe(true);
  });

  it('nextInt produces values in [min, max)', () => {
    const rng = new SeededRng(99);
    for (let i = 0; i < 500; i++) {
      const v = rng.nextInt(5, 10);
      expect(v).toBeGreaterThanOrEqual(5);
      expect(v).toBeLessThan(10);
    }
  });

  it('nextFloat produces values in [min, max)', () => {
    const rng = new SeededRng(77);
    for (let i = 0; i < 200; i++) {
      const v = rng.nextFloat(2.5, 7.5);
      expect(v).toBeGreaterThanOrEqual(2.5);
      expect(v).toBeLessThan(7.5);
    }
  });

  it('shuffle permutes an array', () => {
    const rng = new SeededRng(7);
    const arr = [1, 2, 3, 4, 5];
    const shuffled = rng.shuffle([...arr]);
    expect(shuffled.sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5]);
  });

  it('shuffle is deterministic with same seed', () => {
    const a = new SeededRng(999);
    const b = new SeededRng(999);
    const r1 = a.shuffle([1, 2, 3, 4, 5]);
    const r2 = b.shuffle([1, 2, 3, 4, 5]);
    expect(r1).toEqual(r2);
  });
});

describe('makeSeed', () => {
  it('returns a fixed value when override is supplied', () => {
    expect(makeSeed(42)).toBe(42);
    expect(makeSeed(0)).toBe(0);
  });

  it('returns a number when no override supplied', () => {
    expect(typeof makeSeed()).toBe('number');
  });
});
