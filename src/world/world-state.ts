/**
 * World state and progression.
 *
 * Manages the game lifecycle and logical state of all world surfaces.
 * Has NO dependency on Three.js — rendering subscribes to events.
 * Has NO dependency on browser XR objects.
 *
 * Lifecycle:
 *   initializing → room-ready → awakening → world-active
 *
 * Each PhysicalSurface may have a FantasyTreatment applied.
 * The logical state (treatment type, parameters) lives here.
 * Three.js meshes live in the render layer, which reads this state.
 *
 * Stubs for later systems:
 *   - Wall transformation: add wall treatment map when Phase 2 lands.
 *   - Torches: store placed torch list here.
 *   - Portals: store portal list here.
 *   - Creatures: store creature state list here.
 *   - Event scheduler: seeded random event budget drives creature spawns.
 */

import type { PlayerAction, PhysicalSurface } from '../actions/actions.js';
import type { ActionBus } from '../actions/actions.js';
import { SeededRng } from '../util/rng.js';

// ---------------------------------------------------------------------------
// World lifecycle states
// ---------------------------------------------------------------------------

export type WorldPhase = 'initializing' | 'room-ready' | 'awakening' | 'world-active';

// ---------------------------------------------------------------------------
// Surface treatment — logical only, no Three.js
// ---------------------------------------------------------------------------

export type SurfaceTreatment =
  | { readonly kind: 'untransformed' }
  | { readonly kind: 'floor-awakened'; readonly awakenedAt: number }
  | { readonly kind: 'wall-cave' }    // stub for Phase 2
  | { readonly kind: 'wall-stone' };  // stub for Phase 2

// ---------------------------------------------------------------------------
// World state snapshot (serializable — no Three.js objects)
// ---------------------------------------------------------------------------

export interface WorldState {
  readonly phase: WorldPhase;
  readonly surfaceTreatments: ReadonlyMap<string, SurfaceTreatment>;
  readonly awakeningProgress: number; // 0–1 during awakening phase
  readonly sessionSeed: number;

  // Stub integration points — typed but empty until later milestones
  readonly torches: readonly never[];    // Phase 4
  readonly portals: readonly never[];    // Phase 3
  readonly creatures: readonly never[];  // Phase 5+
}

// ---------------------------------------------------------------------------
// World state machine
// ---------------------------------------------------------------------------

export type WorldEventType = 'phase-changed' | 'surface-transformed' | 'awakening-progress';

export interface WorldEvent {
  readonly type: WorldEventType;
  readonly state: WorldState;
}

export type WorldEventHandler = (event: WorldEvent) => void;

export class WorldStateMachine {
  private phase: WorldPhase = 'initializing';
  private surfaceTreatments = new Map<string, SurfaceTreatment>();
  private awakeningProgress = 0;
  private readonly sessionSeed: number;
  private readonly rng: SeededRng;
  private readonly handlers: WorldEventHandler[] = [];
  private unsubscribeActions?: () => void;

  constructor(sessionSeed: number) {
    this.sessionSeed = sessionSeed;
    this.rng = new SeededRng(sessionSeed);
  }

  /** Attach to the action bus to receive player-action events. */
  connect(bus: ActionBus): void {
    this.unsubscribeActions = bus.subscribe((action) => this.handleAction(action));
  }

  /** Subscribe to world events (for renderer, audio). */
  subscribe(handler: WorldEventHandler): () => void {
    this.handlers.push(handler);
    return () => {
      const idx = this.handlers.indexOf(handler);
      if (idx !== -1) this.handlers.splice(idx, 1);
    };
  }

  /** Called once surfaces are first available. */
  markRoomReady(surfaces: readonly PhysicalSurface[]): void {
    if (this.phase !== 'initializing') return;

    // Initialise all surfaces as untransformed
    for (const s of surfaces) {
      this.surfaceTreatments.set(s.id, { kind: 'untransformed' });
    }

    this.transitionTo('room-ready');
  }

  getSnapshot(): WorldState {
    return {
      phase: this.phase,
      surfaceTreatments: new Map(this.surfaceTreatments),
      awakeningProgress: this.awakeningProgress,
      sessionSeed: this.sessionSeed,
      torches: [],
      portals: [],
      creatures: [],
    };
  }

  dispose(): void {
    this.unsubscribeActions?.();
    this.handlers.length = 0;
  }

  // ---------------------------------------------------------------------------
  // Action handlers
  // ---------------------------------------------------------------------------

  private handleAction(action: PlayerAction): void {
    switch (action.type) {
      case 'awakening-begin':
        if (this.phase === 'room-ready') {
          this.transitionTo('awakening');
        }
        break;

      case 'awakening-progress':
        if (this.phase === 'awakening') {
          this.awakeningProgress = action.progress;
          this.emit('awakening-progress');
        }
        break;

      case 'awakening-complete':
        if (this.phase === 'awakening') {
          // Transform the floor surface
          const floorId = action.targetSurface?.id ?? this.findFloorId();
          if (floorId) {
            this.surfaceTreatments.set(floorId, {
              kind: 'floor-awakened',
              awakenedAt: this.rng.next(), // seeded variation in transition
            });
          }
          this.awakeningProgress = 1;
          this.transitionTo('world-active');
        }
        break;

      case 'awakening-cancelled':
        if (this.phase === 'awakening') {
          this.awakeningProgress = 0;
          this.transitionTo('room-ready');
        }
        break;

      // Stub handlers — log intent but do not act until phases implemented
      case 'wall-transform-requested':
      case 'torch-summon':
      case 'portal-create':
      case 'glyph-drawn':
        // Phase 2–5: implementation deferred.
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private transitionTo(next: WorldPhase): void {
    this.phase = next;
    this.emit('phase-changed');
  }

  private emit(type: WorldEventType): void {
    const event: WorldEvent = { type, state: this.getSnapshot() };
    for (const h of this.handlers) {
      h(event);
    }
  }

  private findFloorId(): string | undefined {
    for (const [id, t] of this.surfaceTreatments) {
      if (t.kind === 'untransformed') {
        // Heuristic: the first untransformed surface assumed to be floor in desktop mode
        return id;
      }
    }
    return undefined;
  }
}
