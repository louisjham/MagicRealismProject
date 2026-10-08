# Architecture — Magical Realism Invoker

## Design Principles

1. **Layered separation** — five layers, each depending only on layers below it.
2. **Typed action contract** — the only data that crosses layer boundaries downward
   is a `PlayerAction` emitted through `ActionBus`.
3. **Testable core** — world state, gesture state machines, and utilities have zero
   Three.js or browser-XR dependencies and are fully unit-tested.
4. **Elapsed time everywhere** — no frame-count-based timing.
5. **Concise boundaries** — each module has one responsibility stated in its header.

## Layer Diagram

```
┌───────────────────────────────────────────────────────────────────┐
│  5. Rendering / Audio                                             │
│     scene-renderer.ts   audio-system.ts                          │
│     (Three.js, WebAudio — reacts to world events)                │
├───────────────────────────────────────────────────────────────────┤
│  4. World / Simulation State                                      │
│     world-state.ts                                                │
│     (pure TS, no Three.js — holds canonical logical state)        │
├───────────────────────────────────────────────────────────────────┤
│  3. Semantic Player Actions                                       │
│     actions/actions.ts  (ActionBus, PlayerAction union type)      │
├───────────────────────────────────────────────────────────────────┤
│  2. Gesture Interpretation                                        │
│     gesture/awakening.ts  (+ future: wall, torch, portal, glyph) │
│     (pure TS, accepts HandSample[], emits PlayerAction)           │
├───────────────────────────────────────────────────────────────────┤
│  1. Platform / Input Acquisition                                  │
│     platform/capabilities.ts  room-provider.ts  hand-sampler.ts  │
│     debug/debug-ui.ts  (desktop debug controls)                   │
└───────────────────────────────────────────────────────────────────┘
```

## Coordinate Space

- **Reference space:** `local-floor` (WebXR)
- **Units:** metres (1 unit = 1 metre), enforced by WebXR standard
- All `Vec3` values in `actions.ts` are in this space
- Camera/viewer starts at approximately Y=1.6m in desktop mode

## Module Responsibilities

| Module | Responsibility | Dependencies |
|--------|---------------|--------------|
| `actions/actions.ts` | PlayerAction types, ActionBus | none |
| `platform/capabilities.ts` | WebXR feature detection, session lifecycle | WebXR |
| `platform/room-provider.ts` | RoomProvider interface, Synthetic + WebXR impls | WebXR (optional) |
| `platform/hand-sampler.ts` | XRHand → HandSample conversion | WebXR, actions |
| `gesture/awakening.ts` | Floor-awakening gesture state machine | actions, util/time |
| `world/world-state.ts` | World lifecycle, surface treatments, seeded RNG | actions, util/rng |
| `render/scene-renderer.ts` | Three.js setup, AR passthrough, visual effects | Three.js |
| `audio/audio-system.ts` | Procedural Web Audio | Web Audio API |
| `debug/debug-ui.ts` | Desktop development overlay | actions, DOM |
| `util/rng.ts` | Seeded PRNG (Mulberry32) | none |
| `util/time.ts` | Elapsed-time clock | none |
| `src/main.ts` | Bootstrap, system wiring, animation loop | all above |

## Integration Points for Later Systems

These systems are NOT implemented yet. Stub types exist in `actions.ts`.

| System | Action type | World state field | Render hook | Phase |
|--------|-------------|-------------------|-------------|-------|
| Wall transform | `wall-transform-requested` | `surfaceTreatments` wall entries | Surface mesh swap | 2 |
| Torch | `torch-summon` | `torches: TorchState[]` | Torch mesh + point light | 4 |
| Portal | `portal-create` | `portals: PortalState[]` | Stencil/alpha cutout mesh | 3 |
| Glyph | `glyph-drawn` | triggers creature/feature spawn | Glyph trail particles | 5 |
| Creatures | spawned by glyph/event scheduler | `creatures: CreatureState[]` | Animated low-poly mesh | 5+ |
| Event scheduler | internal (seeded random) | drives creature spawns | — | 5+ |

## Randomness Contract

- `SeededRng` (Mulberry32) is the sole randomness source for game logic.
- Session seed: `Date.now()` — different every run.
- Debug seed: fixed number passed to `makeSeed()`.
- Player-choice influence: mix player parameters into seed before construction.
- Bounded: all spawning respects entity limits and cooldowns (defined in config, not hard-coded).

## Desktop vs XR Mode

Desktop and XR mode invoke identical `PlayerAction` events through `ActionBus`.
- Desktop: `DebugUI` buttons emit `awakening-begin/progress/complete`.
- XR: `AwakeningGesture.update()` emits the same events.
- World state machine and renderer are unaware of which mode is active.

## Physical vs Logical State Separation

```
PhysicalSurface (id, role, centroid, normal)    ← from RoomProvider, session-local
SurfaceTreatment (kind, parameters)             ← in WorldState, serializable
Three.js Mesh                                   ← in SceneRenderer, not persisted
```

Never store Three.js objects in WorldState.
Never derive game logic from Three.js object state.
