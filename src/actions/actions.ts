/**
 * Typed action/event contract.
 *
 * Both real XR input and desktop debug controls emit PlayerAction values.
 * Downstream systems (world state, rendering) must never inspect raw XR or DOM events.
 *
 * Coordinate space: all Vec3 values are in the viewer/local reference space,
 * measured in metres (WebXR standard: 1 unit = 1 metre).
 */

export type Vec3 = { x: number; y: number; z: number };

// ---------------------------------------------------------------------------
// Surface types — used in both world state and action targets
// ---------------------------------------------------------------------------

export type SurfaceRole = 'floor' | 'ceiling' | 'wall' | 'unknown';

export interface PhysicalSurface {
  /** Unique identifier for this detected surface, stable within a session. */
  readonly id: string;
  readonly role: SurfaceRole;
  /** World-space centroid in metres. */
  readonly centroid: Vec3;
  /** Normal vector pointing into the room (away from the wall/floor). */
  readonly normal: Vec3;
}

// ---------------------------------------------------------------------------
// Hand sample passed to gesture state machines
// ---------------------------------------------------------------------------

export type HandSide = 'left' | 'right';

export interface HandSample {
  readonly side: HandSide;
  /** Whether the hand tracking system is currently reporting valid data. */
  readonly tracked: boolean;
  /** Wrist position in viewer local space, metres. */
  readonly wrist: Vec3;
  /** Palm centre (midpoint of MCPs) in viewer local space. */
  readonly palm: Vec3;
  /** Direction the palm normal faces (from palm toward fingers or outward). */
  readonly palmNormal: Vec3;
  /** Timestamp in seconds (performance.now() / 1000). */
  readonly timestampSec: number;
}

// ---------------------------------------------------------------------------
// Player action discriminated union
// ---------------------------------------------------------------------------

/**
 * AwakeningBegin — player started holding both palms down.
 * The world state machine decides whether to accept it.
 */
export interface ActionAwakeningBegin {
  readonly type: 'awakening-begin';
}

/**
 * AwakeningProgress — periodic tick during a held awakening ritual.
 * progress ∈ [0, 1].
 */
export interface ActionAwakeningProgress {
  readonly type: 'awakening-progress';
  readonly progress: number;
  readonly elapsedSec: number;
}

/**
 * AwakeningComplete — ritual held for full duration without break.
 * targetSurface is the detected floor surface, or undefined in desktop mode.
 */
export interface ActionAwakeningComplete {
  readonly type: 'awakening-complete';
  readonly targetSurface?: PhysicalSurface;
}

/**
 * AwakeningCancelled — tracking lost or pose broken before completion.
 */
export interface ActionAwakeningCancelled {
  readonly type: 'awakening-cancelled';
  readonly reason: 'tracking-lost' | 'pose-broken' | 'debug-reset';
}

// Stubs for later systems — define integration point, no implementation yet.

/** Placeholder: wall-transform gesture will produce this action. */
export interface ActionWallTransformRequested {
  readonly type: 'wall-transform-requested';
  readonly targetSurface: PhysicalSurface;
  readonly material: 'cave' | 'stone';
}

/** Placeholder: torch-summon gesture. */
export interface ActionTorchSummon {
  readonly type: 'torch-summon';
  readonly hand: HandSide;
}

/** Placeholder: portal creation. */
export interface ActionPortalCreate {
  readonly type: 'portal-create';
  readonly targetSurface: PhysicalSurface;
  readonly hand: HandSide;
}

/** Placeholder: glyph drawn in air. */
export interface ActionGlyphDrawn {
  readonly type: 'glyph-drawn';
  readonly glyphId: string;
  readonly position: Vec3;
}

export type PlayerAction =
  | ActionAwakeningBegin
  | ActionAwakeningProgress
  | ActionAwakeningComplete
  | ActionAwakeningCancelled
  | ActionWallTransformRequested
  | ActionTorchSummon
  | ActionPortalCreate
  | ActionGlyphDrawn;

// ---------------------------------------------------------------------------
// Event bus — lightweight typed pub/sub
// ---------------------------------------------------------------------------

export type ActionHandler = (action: PlayerAction) => void;

export class ActionBus {
  private handlers: ActionHandler[] = [];

  subscribe(handler: ActionHandler): () => void {
    this.handlers.push(handler);
    return () => {
      this.handlers = this.handlers.filter((h) => h !== handler);
    };
  }

  emit(action: PlayerAction): void {
    for (const h of this.handlers) {
      h(action);
    }
  }
}
