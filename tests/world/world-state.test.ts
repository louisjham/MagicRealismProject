/**
 * Unit tests: WorldStateMachine lifecycle and state transitions.
 *
 * Tests:
 *   - Phase progression: initializing → room-ready → awakening → world-active
 *   - Surface treatment application on awakening-complete
 *   - Cancellation reverts to room-ready
 *   - Phase events emitted correctly
 *   - Snapshot is serializable (no live objects)
 */

import { describe, it, expect, vi } from 'vitest';
import { WorldStateMachine } from '../../src/world/world-state.js';
import { ActionBus } from '../../src/actions/actions.js';
import type { PhysicalSurface } from '../../src/actions/actions.js';

function makeSurface(id: string, role: PhysicalSurface['role'] = 'floor'): PhysicalSurface {
  return {
    id,
    role,
    centroid: { x: 0, y: 0, z: 0 },
    normal: { x: 0, y: 1, z: 0 },
  };
}

describe('WorldStateMachine – lifecycle', () => {
  it('starts in initializing', () => {
    const w = new WorldStateMachine(0);
    expect(w.getSnapshot().phase).toBe('initializing');
  });

  it('transitions to room-ready after markRoomReady', () => {
    const w = new WorldStateMachine(0);
    w.markRoomReady([makeSurface('floor')]);
    expect(w.getSnapshot().phase).toBe('room-ready');
  });

  it('ignores markRoomReady when already past initializing', () => {
    const bus = new ActionBus();
    const w = new WorldStateMachine(0);
    w.connect(bus);
    w.markRoomReady([makeSurface('floor')]);

    // Send awakening-begin to advance to awakening
    bus.emit({ type: 'awakening-begin' });
    expect(w.getSnapshot().phase).toBe('awakening');

    // markRoomReady again should be a no-op
    w.markRoomReady([makeSurface('floor2')]);
    expect(w.getSnapshot().phase).toBe('awakening');
  });

  it('transitions room-ready → awakening on awakening-begin', () => {
    const bus = new ActionBus();
    const w = new WorldStateMachine(0);
    w.connect(bus);
    w.markRoomReady([makeSurface('f')]);

    bus.emit({ type: 'awakening-begin' });
    expect(w.getSnapshot().phase).toBe('awakening');
  });

  it('transitions awakening → world-active on awakening-complete', () => {
    const bus = new ActionBus();
    const w = new WorldStateMachine(0);
    w.connect(bus);
    w.markRoomReady([makeSurface('f')]);

    bus.emit({ type: 'awakening-begin' });
    bus.emit({ type: 'awakening-complete' });
    expect(w.getSnapshot().phase).toBe('world-active');
  });

  it('transitions awakening → room-ready on awakening-cancelled', () => {
    const bus = new ActionBus();
    const w = new WorldStateMachine(0);
    w.connect(bus);
    w.markRoomReady([makeSurface('f')]);

    bus.emit({ type: 'awakening-begin' });
    bus.emit({ type: 'awakening-cancelled', reason: 'tracking-lost' });
    expect(w.getSnapshot().phase).toBe('room-ready');
  });

  it('resets awakeningProgress to 0 on cancellation', () => {
    const bus = new ActionBus();
    const w = new WorldStateMachine(0);
    w.connect(bus);
    w.markRoomReady([makeSurface('f')]);

    bus.emit({ type: 'awakening-begin' });
    bus.emit({ type: 'awakening-progress', progress: 0.7, elapsedSec: 3.5 });
    expect(w.getSnapshot().awakeningProgress).toBe(0.7);

    bus.emit({ type: 'awakening-cancelled', reason: 'pose-broken' });
    expect(w.getSnapshot().awakeningProgress).toBe(0);
  });
});

describe('WorldStateMachine – surface treatments', () => {
  it('all surfaces start as untransformed', () => {
    const w = new WorldStateMachine(0);
    const surfaces = [makeSurface('f'), makeSurface('w1', 'wall'), makeSurface('w2', 'wall')];
    w.markRoomReady(surfaces);
    const snap = w.getSnapshot();
    for (const s of surfaces) {
      expect(snap.surfaceTreatments.get(s.id)?.kind).toBe('untransformed');
    }
  });

  it('floor surface becomes floor-awakened after awakening-complete with target', () => {
    const bus = new ActionBus();
    const w = new WorldStateMachine(0);
    w.connect(bus);
    const floor = makeSurface('floor-1', 'floor');
    w.markRoomReady([floor, makeSurface('wall-1', 'wall')]);

    bus.emit({ type: 'awakening-begin' });
    bus.emit({ type: 'awakening-complete', targetSurface: floor });

    const snap = w.getSnapshot();
    expect(snap.surfaceTreatments.get('floor-1')?.kind).toBe('floor-awakened');
    // Walls should remain untransformed
    expect(snap.surfaceTreatments.get('wall-1')?.kind).toBe('untransformed');
  });
});

describe('WorldStateMachine – event emission', () => {
  it('emits phase-changed events to subscribers', () => {
    const bus = new ActionBus();
    const w = new WorldStateMachine(0);
    w.connect(bus);

    const events: string[] = [];
    w.subscribe((evt) => events.push(evt.type));

    w.markRoomReady([makeSurface('f')]);
    bus.emit({ type: 'awakening-begin' });
    bus.emit({ type: 'awakening-complete' });

    expect(events).toContain('phase-changed');
  });

  it('subscriber can be unsubscribed', () => {
    const bus = new ActionBus();
    const w = new WorldStateMachine(0);
    w.connect(bus);

    const events: string[] = [];
    const unsub = w.subscribe((evt) => events.push(evt.type));

    w.markRoomReady([makeSurface('f')]);
    unsub();
    bus.emit({ type: 'awakening-begin' });

    // Should have received room-ready phase-changed, but NOT awakening
    const phaseChanges = events.filter((e) => e === 'phase-changed');
    expect(phaseChanges).toHaveLength(1); // only the room-ready transition
  });
});

describe('WorldStateMachine – snapshot serialisability', () => {
  it('snapshot can be JSON-serialized (no live objects)', () => {
    const bus = new ActionBus();
    const w = new WorldStateMachine(42);
    w.connect(bus);
    w.markRoomReady([makeSurface('f')]);

    const snap = w.getSnapshot();
    // Convert Map for JSON
    const serializable = {
      ...snap,
      surfaceTreatments: [...snap.surfaceTreatments.entries()],
    };
    expect(() => JSON.stringify(serializable)).not.toThrow();
  });
});
