/**
 * Elapsed-time clock utilities.
 *
 * Uses performance.now() when available; falls back to Date.now().
 * All time values are in seconds unless the variable name says "Ms".
 *
 * Never use frame counters for timing — frame rate is variable.
 */
export function nowSec(): number {
  return (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;
}

/** A simple stopwatch that can be paused and resumed. */
export class Stopwatch {
  private _start: number;
  private _elapsed = 0;
  private _running = false;

  constructor() {
    this._start = nowSec();
  }

  start(): void {
    if (!this._running) {
      this._start = nowSec();
      this._running = true;
    }
  }

  pause(): void {
    if (this._running) {
      this._elapsed += nowSec() - this._start;
      this._running = false;
    }
  }

  reset(): void {
    this._elapsed = 0;
    this._running = false;
    this._start = nowSec();
  }

  get elapsed(): number {
    return this._running ? this._elapsed + (nowSec() - this._start) : this._elapsed;
  }

  get running(): boolean {
    return this._running;
  }
}
