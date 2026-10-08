/**
 * Unit tests: AwakeningGesture state machine.
 *
 * Tests:
 *   - Timing: must hold for full dwellDurationSec to complete
 *   - Cancellation: tracking loss during hold cancels correctly
 *   - Pose failure: breaking pose cancels with 'pose-broken'
 *   - Single activation: completing once enters cooldown, not re-activated
 *   - State transitions: idle → candidate → holding → activated → cooldown → idle
 *   - Progress events: emitted at pulseIntervalSec
 *
 * All tests use synthetic HandSample values — no browser globals required.
 */

import { describe, it, expect, vi } from 'vitest';
import { AwakeningGesture } from '../../src/gesture/awakening.js';
import type { PlayerAction, HandSample } from '../../src/actions/actions.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CFG = {
  dwellDurationSec: 5,
  palmDownThreshold: -0.5,
  pulseIntervalSec: 1,
  cooldownSec: 3,
  reacquireHysteresisSec: 0,
};

/** Hand sample with palm explicitly facing down (Y = -1). */
function palmDownHand(side: 'left' | 'right', t = 0): HandSample {
  return {
    side,
    tracked: true,
    wrist: { x: 0, y: 1, z: 0 },
    palm: { x: 0, y: 1, z: 0 },
    palmNormal: { x: 0, y: -1, z: 0 }, // perfectly palm-down
    timestampSec: t,
  };
}

/** Hand sample with palm facing up (Y = +1) — not palm-down. */
function palmUpHand(side: 'left' | 'right', t = 0): HandSample {
  return {
    ...palmDownHand(side, t),
    palmNormal: { x: 0, y: 1, z: 0 },
  };
}

/** Untracked hand. */
function untrackedHand(side: 'left' | 'right', t = 0): HandSample {
  return {
    side,
    tracked: false,
    wrist: { x: 0, y: 0, z: 0 },
    palm: { x: 0, y: 0, z: 0 },
    palmNormal: { x: 0, y: 0, z: 0 },
    timestampSec: t,
  };
}

function bothDown(t = 0): HandSample[] {
  return [palmDownHand('left', t), palmDownHand('right', t)];
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AwakeningGesture – state transitions', () => {
  it('starts in idle', () => {
    const emit = vi.fn<(action: PlayerAction) => void>();
    const g = new AwakeningGesture(emit, CFG);
    expect(g.currentState).toBe('idle');
  });

  it('transitions idle → holding when both palms down', () => {
    const emit = vi.fn<(action: PlayerAction) => void>();
    const g = new AwakeningGesture(emit, CFG);

    g.update(bothDown(0), 0);   // idle → candidate
    g.update(bothDown(0.1), 0.1); // candidate → holding

    expect(g.currentState).toBe('holding');
    expect(emit).toHaveBeenCalledWith({ type: 'awakening-begin' });
  });

  it('stays idle when only one hand is palm-down', () => {
    const emit = vi.fn<(action: PlayerAction) => void>();
    const g = new AwakeningGesture(emit, CFG);
    g.update([palmDownHand('left'), palmUpHand('right')], 0);
    expect(g.currentState).toBe('idle');
  });
});

describe('AwakeningGesture – timing', () => {
  it('completes after dwellDurationSec', () => {
    const emit = vi.fn<(action: PlayerAction) => void>();
    const g = new AwakeningGesture(emit, CFG);

    g.update(bothDown(0), 0);     // idle → candidate
    g.update(bothDown(0.1), 0.1); // → holding

    // Advance past the dwell duration
    g.update(bothDown(5.1), 5.1);

    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'awakening-complete' }),
    );
  });

  it('does NOT complete before dwellDurationSec', () => {
    const emit = vi.fn<(action: PlayerAction) => void>();
    const g = new AwakeningGesture(emit, CFG);

    g.update(bothDown(0), 0);
    g.update(bothDown(0.1), 0.1);
    g.update(bothDown(4.9), 4.9); // just under threshold

    const completions = emit.mock.calls.filter(
      ([a]) => a.type === 'awakening-complete',
    );
    expect(completions).toHaveLength(0);
  });
});

describe('AwakeningGesture – cancellation', () => {
  it('cancels with tracking-lost when hand loses tracking during hold', () => {
    const emit = vi.fn<(action: PlayerAction) => void>();
    const g = new AwakeningGesture(emit, CFG);

    g.update(bothDown(0), 0);
    g.update(bothDown(0.1), 0.1); // → holding

    // Left hand loses tracking
    g.update([untrackedHand('left', 2), palmDownHand('right', 2)], 2);

    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'awakening-cancelled', reason: 'tracking-lost' }),
    );
    expect(g.currentState).toBe('idle');
  });

  it('cancels with pose-broken when both hands tracked but one tilts up', () => {
    const emit = vi.fn<(action: PlayerAction) => void>();
    const g = new AwakeningGesture(emit, CFG);

    g.update(bothDown(0), 0);
    g.update(bothDown(0.1), 0.1); // → holding

    // Right hand tilts palm up
    g.update([palmDownHand('left', 2), palmUpHand('right', 2)], 2);

    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'awakening-cancelled', reason: 'pose-broken' }),
    );
  });

  it('resets to idle after cancellation', () => {
    const emit = vi.fn<(action: PlayerAction) => void>();
    const g = new AwakeningGesture(emit, CFG);

    g.update(bothDown(0), 0);
    g.update(bothDown(0.1), 0.1);
    g.update([untrackedHand('left', 1), palmDownHand('right', 1)], 1);

    expect(g.currentState).toBe('idle');
  });
});

describe('AwakeningGesture – single activation (cooldown)', () => {
  it('does not re-activate during cooldown period', () => {
    const emit = vi.fn<(action: PlayerAction) => void>();
    const g = new AwakeningGesture(emit, CFG);

    // Complete once
    g.update(bothDown(0), 0);
    g.update(bothDown(0.1), 0.1);
    g.update(bothDown(5.1), 5.1); // activates → cooldown

    // Immediately try again
    g.update([], 5.2);             // hands removed
    g.update(bothDown(5.3), 5.3); // pose re-established during cooldown

    const completions = emit.mock.calls.filter(
      ([a]) => a.type === 'awakening-complete',
    );
    expect(completions).toHaveLength(1); // only one completion
  });

  it('allows re-activation after cooldown expires', () => {
    const emit = vi.fn<(action: PlayerAction) => void>();
    const g = new AwakeningGesture(emit, CFG);

    // Complete once at t=0 → t=5.1
    g.update(bothDown(0), 0);
    g.update(bothDown(0.1), 0.1);
    g.update(bothDown(5.1), 5.1); // activated → cooldown starts

    // cooldownSec = 3; wait past t = 5.1 + 3 = 8.1
    g.update([], 8.1);             // still in cooldown
    g.update([], 8.2);             // cooldown expires at 8.1

    // Re-activate
    g.update(bothDown(8.3), 8.3);
    g.update(bothDown(8.4), 8.4);
    g.update(bothDown(13.5), 13.5); // hold full 5s

    const completions = emit.mock.calls.filter(
      ([a]) => a.type === 'awakening-complete',
    );
    expect(completions).toHaveLength(2);
  });
});

describe('AwakeningGesture – progress events', () => {
  it('emits progress approximately every pulseIntervalSec', () => {
    const emit = vi.fn<(action: PlayerAction) => void>();
    const g = new AwakeningGesture(emit, CFG);

    g.update(bothDown(0), 0);
    g.update(bothDown(0.1), 0.1); // → holding; lastPulse = 0.1

    // Advance 1 second past lastPulse
    g.update(bothDown(1.2), 1.2); // should emit progress
    g.update(bothDown(2.3), 2.3); // second pulse
    g.update(bothDown(3.4), 3.4); // third

    const pulses = emit.mock.calls.filter(([a]) => a.type === 'awakening-progress');
    expect(pulses.length).toBeGreaterThanOrEqual(3);
  });

  it('progress value is between 0 and 1', () => {
    const emit = vi.fn<(action: PlayerAction) => void>();
    const g = new AwakeningGesture(emit, CFG);

    g.update(bothDown(0), 0);
    g.update(bothDown(0.1), 0.1);
    g.update(bothDown(2.5), 2.5); // midway

    const pulses = emit.mock.calls
      .filter(([a]) => a.type === 'awakening-progress')
      .map(([a]) => a as { type: 'awakening-progress'; progress: number });

    for (const p of pulses) {
      expect(p.progress).toBeGreaterThanOrEqual(0);
      expect(p.progress).toBeLessThanOrEqual(1);
    }
  });
});

describe('AwakeningGesture – forceReset', () => {
  it('emits cancelled when reset during hold', () => {
    const emit = vi.fn<(action: PlayerAction) => void>();
    const g = new AwakeningGesture(emit, CFG);

    g.update(bothDown(0), 0);
    g.update(bothDown(0.1), 0.1); // holding
    g.forceReset(0.2);

    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'awakening-cancelled' }),
    );
    expect(g.currentState).toBe('idle');
  });
});
