# Roadmap — Magical Realism Invoker

> This roadmap reconciles `PROJECT_PHASES.md` with confirmed player requirements.
> Phases are milestones, not strict sequential gates — some work can overlap.

---

## Milestone 0 — Bootstrap Foundation (THIS MILESTONE) ✅

**Acceptance criteria:**
- [x] Legacy prototype preserved at `legacy/index.html`
- [x] Vite + TypeScript + Three.js scaffold
- [x] Desktop mode: synthetic room, debug UI, no headset required
- [x] AR entry: transparent scene, `immersive-ar` session
- [x] Runtime capability diagnostics in debug UI
- [x] `RoomProvider` interface with synthetic and WebXR implementations
- [x] World lifecycle: initializing → room-ready → awakening → world-active
- [x] 5-second floor-awakening gesture state machine
- [x] Progress pulses (1/sec) during ritual
- [x] Tracking-loss / pose-failure cancellation
- [x] Floor surface transformed on completion; walls remain untransformed
- [x] Flash-paper placeholder transition
- [x] Desktop debug button firing same `PlayerAction` as real gesture
- [x] Unit tests: RNG, gesture timing, cancellation, single-activation, world state
- [x] AGENTS.md, docs/ suite created

**What is NOT in this milestone:**
- Wall transformation
- Torch mechanics
- Portals
- Glyph drawing
- Creatures or event scheduler
- Production art or audio

---

## Milestone 1 — Wall Transformation (Phase 2)

**Acceptance criteria:**
- [ ] Point-and-hold gesture on a detected vertical surface
- [ ] Two material choices: cave vs stone (gesture modifier TBD)
- [ ] Low-poly stone / cave placeholder material
- [ ] Particle veil transition on wall transform
- [ ] Walls remain independently transformable
- [ ] Unit tests: wall gesture state machine

**Platform dependency:**
- `plane-detection` must return vertical planes for real walls.
- In desktop: synthetic wall surfaces used.

---

## Milestone 2 — Torch Mechanics (Phase 4)

**Acceptance criteria:**
- [ ] Sideways-fist gesture detection
- [ ] Low-poly torch spawns in hand position
- [ ] Throw gesture: torch sticks to wall as basic sconce
- [ ] Place gesture: torch attaches as fancy sconce with random light color
- [ ] Drop: torch dissolves to sparks
- [ ] Point light from placed torch affects scene ambient tint
- [ ] Entity limit enforced (max torches configurable)

---

## Milestone 3 — Portal Mechanics (Phase 3)

**Acceptance criteria:**
- [ ] Palm-out, fingers-spread gesture on vertical surface
- [ ] Portal render: glowing cutout (stencil or alpha) in wall
- [ ] Vapor/fog particles that settle downward
- [ ] Portal can be moved: same gesture applied to existing portal
- [ ] Portal can be resized: pinch-stretch interaction
- [ ] Real passthrough visible through portal (uses transparent alpha — not camera texture)

**Limitation:** True "window into real space" via camera texture is NOT possible in WebXR.
The portal will show the underlying passthrough through an alpha cutout, which
achieves the visual effect without camera API access.

---

## Milestone 4 — Glyph Drawing & Creature Seeds (Phase 5)

**Acceptance criteria:**
- [ ] Index-finger draw tracking (air drawing)
- [ ] Glyph pattern matching (against small dictionary of shapes)
- [ ] Successful glyph → spawn point created at drawn location
- [ ] Short delay before entity materializes
- [ ] At least 2 creature types (visual placeholder: low-poly mesh + idle animation)
- [ ] Seeded randomness influences which creature appears

---

## Milestone 5 — Autonomous Ecosystem

**Acceptance criteria:**
- [ ] Creature FSM: wander, forage, react to player gestures, interact with other creatures
- [ ] Event scheduler: seeded random events injected on budget (bounded by config)
- [ ] Creature interactions produce emergent narrative (not scripted)
- [ ] Entity limits enforced globally (no unbounded spawning)
- [ ] Different creatures per session (randomness confirmed)

---

## Reconciliation Notes: PROJECT_PHASES.md vs Confirmed Requirements

| PROJECT_PHASES.md item | Status |
|------------------------|--------|
| Phase 1: "Replace floor mesh with low-poly stone block, convert all 4 room walls" | ⚠️ Reconciled: Do not assume 4 walls. Floor starts untransformed, awakened by gesture. |
| Phase 2: "Palm-down raycast detects flat surfaces to swap materials" | ✅ Aligned with confirmed awakening ritual |
| Phase 3: Portal grab-and-resize via pinch | ✅ Aligned |
| Phase 4: Torch spawn/place/throw | ✅ Aligned |
| Phase 5: Rune drawing | ✅ Aligned (renamed "glyph" in confirmed requirements) |
| Phase 1 note: "Maintain existing room furniture anchors" | ❌ Not applicable — furniture anchors not available in WebXR |
