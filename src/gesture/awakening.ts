/**
 * Gesture state machine: floor-awakening ritual.
 *
 * REQUIREMENTS (from player preferences in CONVERSATION_LOG.md):
 *   - Both hands extended, palms down for 5 seconds.
 *   - Visible progress (pulse) approximately once per second.
 *   - Tracking loss or pose failure cancels the ritual.
 *   - Completion transforms only the selected floor surface.
 *   - Protection against repeated triggers from a continuous pose hold.
 *
 * STATE MACHINE:
 *   idle → candidate (both hands detected, palm-down pose)
 *        → holding (dwell timer running, progress events emitted)
 *        → activated (completion emitted, cooldown entered)
 *        → cooldown → idle
 *   Any tracking loss or pose failure from candidate/holding → idle (cancelled)
 *
 * This module has NO dependency on Three.js or browser XR objects.
 * It accepts HandSample[] and emits PlayerActions through a callback.
 *
 * PALM-DOWN CLASSIFIER STATUS: ⚠ UNVERIFIED on headset.
 *   The palmNormal.y < threshold check is a reasonable synthetic heuristic
 *   but has not been validated against real Quest hand-tracking output.
 *   See docs/CAPABILITIES.md for details.
 */

import type { HandSample, PlayerAction } from '../actions/actions.js';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export interface AwakeningGestureConfig {
  /** Total dwell time required, seconds. Default 5. */
  readonly dwellDurationSec: number;
  /**
   * Palm-normal Y component must be less than this to count as "palm down".
   * Y = -1 is perfectly palm-down; threshold of -0.5 allows ±60° tilt.
   * UNVERIFIED — tune after headset testing.
   */
  readonly palmDownThreshold: number;
  /** How often (seconds) to emit a progress pulse. Default 1. */
  readonly pulseIntervalSec: number;
  /** After activation, ignore the gesture for this long. Prevents re-trigger. */
  readonly cooldownSec: number;
  /**
   * Hysteresis: pose must be re-established for this long after a gap
   * before the holding timer resumes. Prevents jitter from breaking progress.
   * Currently 0 (hard cancel on any loss) — configurable for future tuning.
   */
  readonly reacquireHysteresisSec: number;
}

export const DEFAULT_AWAKENING_CONFIG: AwakeningGestureConfig = {
  dwellDurationSec: 5,
  palmDownThreshold: -0.5,
  pulseIntervalSec: 1,
  cooldownSec: 3,
  reacquireHysteresisSec: 0,
};

// ---------------------------------------------------------------------------
// State types
// ---------------------------------------------------------------------------

type GestureState = 'idle' | 'candidate' | 'holding' | 'cooldown';

// ---------------------------------------------------------------------------
// Gesture state machine
// ---------------------------------------------------------------------------

export class AwakeningGesture {
  private state: GestureState = 'idle';
  private holdStartSec = 0;
  private cooldownStartSec = 0;
  private lastPulseSec = 0;
  private readonly config: AwakeningGestureConfig;
  private readonly emit: (action: PlayerAction) => void;

  constructor(
    emit: (action: PlayerAction) => void,
    config: AwakeningGestureConfig = DEFAULT_AWAKENING_CONFIG,
  ) {
    this.emit = emit;
    this.config = config;
  }

  /**
   * Call once per animation frame.
   * @param hands All available hand samples for this frame (0–2 entries).
   * @param nowSec Current time in seconds (from performance.now() / 1000).
   */
  update(hands: readonly HandSample[], nowSec: number): void {
    switch (this.state) {
      case 'idle':
        this.tickIdle(hands, nowSec);
        break;
      case 'candidate':
        this.tickCandidate(hands, nowSec);
        break;
      case 'holding':
        this.tickHolding(hands, nowSec);
        break;
      case 'cooldown':
        this.tickCooldown(nowSec);
        break;
    }
  }

  get currentState(): GestureState {
    return this.state;
  }

  // ---------------------------------------------------------------------------
  // Private state handlers
  // ---------------------------------------------------------------------------

  private tickIdle(hands: readonly HandSample[], nowSec: number): void {
    if (this.bothHandsPalmDown(hands)) {
      this.state = 'candidate';
      this.holdStartSec = nowSec;
      this.lastPulseSec = nowSec;
    }
  }

  private tickCandidate(hands: readonly HandSample[], nowSec: number): void {
    if (!this.bothHandsPalmDown(hands)) {
      this.state = 'idle';
      return;
    }
    // Advance to holding after one frame of confirmation (instant for now)
    this.state = 'holding';
    this.emit({ type: 'awakening-begin' });
  }

  private tickHolding(hands: readonly HandSample[], nowSec: number): void {
    if (!this.bothHandsPalmDown(hands)) {
      const reason = this.anyHandLostTracking(hands) ? 'tracking-lost' : 'pose-broken';
      this.state = 'idle';
      this.emit({ type: 'awakening-cancelled', reason });
      return;
    }

    const elapsed = nowSec - this.holdStartSec;
    const progress = Math.min(elapsed / this.config.dwellDurationSec, 1);

    // Emit pulse approximately every pulseIntervalSec
    if (nowSec - this.lastPulseSec >= this.config.pulseIntervalSec) {
      this.lastPulseSec = nowSec;
      this.emit({ type: 'awakening-progress', progress, elapsedSec: elapsed });
    }

    if (elapsed >= this.config.dwellDurationSec) {
      this.state = 'cooldown';
      this.cooldownStartSec = nowSec;
      this.emit({ type: 'awakening-complete' });
    }
  }

  private tickCooldown(nowSec: number): void {
    if (nowSec - this.cooldownStartSec >= this.config.cooldownSec) {
      this.state = 'idle';
    }
  }

  // ---------------------------------------------------------------------------
  // Pose classification
  // ---------------------------------------------------------------------------

  /**
   * Both hands must be tracked and their palm normals pointing downward.
   *
   * UNVERIFIED CLASSIFIER — see module header.
   * In desktop/synthetic mode, HandSample is constructed by DebugInputProvider
   * with an explicitly set palmNormal so this path is exercised in tests.
   */
  private bothHandsPalmDown(hands: readonly HandSample[]): boolean {
    const left = hands.find((h) => h.side === 'left');
    const right = hands.find((h) => h.side === 'right');
    if (!left || !right) return false;
    return (
      left.tracked &&
      right.tracked &&
      this.isPalmDown(left) &&
      this.isPalmDown(right)
    );
  }

  private anyHandLostTracking(hands: readonly HandSample[]): boolean {
    const left = hands.find((h) => h.side === 'left');
    const right = hands.find((h) => h.side === 'right');
    return !left?.tracked || !right?.tracked;
  }

  /**
   * Palm is "down" when the palm normal's Y component is sufficiently negative.
   * In WebXR viewer space: Y+ is up, Y- is down.
   *
   * A palm facing the floor has its normal pointing downward → palmNormal.y ≈ -1.
   * Threshold of -0.5 allows roughly ±60° tilt tolerance.
   */
  private isPalmDown(hand: HandSample): boolean {
    return hand.palmNormal.y < this.config.palmDownThreshold;
  }

  // ---------------------------------------------------------------------------
  // Debug / test helpers
  // ---------------------------------------------------------------------------

  /** Force reset to idle, emitting a cancel if currently holding. */
  forceReset(nowSec: number): void {
    if (this.state === 'holding') {
      this.emit({ type: 'awakening-cancelled', reason: 'debug-reset' });
    }
    this.state = 'idle';
    this.holdStartSec = nowSec;
    this.cooldownStartSec = nowSec;
    this.lastPulseSec = nowSec;
  }
}
