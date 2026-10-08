# Magical Realism Invoker — Agent Instructions

This is the primary agent instruction file for the Magical Realism Invoker project.

## What This Project Is

A mixed-reality WebXR experience where the player progressively transforms their
real room into a low-poly fantasy environment through deliberate hand gestures,
then watches an autonomous creature ecosystem emerge from their choices.

**The experience is player-created, not pre-scripted.**

## Repository Layout

```
index.html              New project entry point (Vite + TypeScript)
src/
  main.ts               Application bootstrap and lifecycle coordinator
  actions/actions.ts    Typed PlayerAction contract (the only bridge between input and game)
  platform/
    capabilities.ts     WebXR feature detection and session management
    room-provider.ts    RoomProvider interface: Synthetic (desktop) + WebXR implementations
    hand-sampler.ts     XRHand → HandSample conversion
  gesture/
    awakening.ts        Floor-awakening gesture state machine
  world/
    world-state.ts      World lifecycle and surface treatment state (no Three.js)
  render/
    scene-renderer.ts   Three.js renderer, AR passthrough setup, visual effects
  audio/
    audio-system.ts     Procedural Web Audio (reused from prototype)
  debug/
    debug-ui.ts         Development overlay (hidden in XR, fires same actions as gestures)
  util/
    rng.ts              Seeded pseudo-random number generator (Mulberry32)
    time.ts             Elapsed-time clock utilities
tests/                  Vitest unit tests (pure logic, no browser globals)
docs/                   Project documentation (see below)
legacy/index.html       Preserved original prototype — do not overwrite
MagicRealismProject/    Existing XR Blocks + TWA store pipeline — do not delete or alter
```

## Source-of-Truth Hierarchy

1. This prompt (and the user's stated preferences) — final authority on experience intent.
2. Player preferences in `CONVERSATION_LOG.md` — confirmed requirements.
3. `docs/REQUIREMENTS.md` — curated confirmed requirements.
4. `docs/ARCHITECTURE.md` — module responsibilities.
5. `docs/CAPABILITIES.md` — platform evidence and limitations.
6. `PROJECT_PHASES.md` — draft roadmap (may need reconciliation with confirmed reqs).
7. `index.html` (prototype) — implementation evidence only; not product requirements.

## Commands

```bash
# Install dependencies
npm install

# Development server (desktop mode)
npm run dev

# Type check
npm run typecheck

# Unit tests
npm test

# Production build
npm run build
```

## Critical Rules for Future Agent Sessions

1. **Read all docs before editing.** Start with this file, then `docs/STATUS.md`.
2. **Never conflate synthetic and real geometry.** `RoomProvider.isSynthetic` must be checked.
3. **All player actions go through `ActionBus`** — no direct XR event handling in world/render.
4. **All timing must use elapsed seconds**, not frame counts.
5. **Palm-down classifier is UNVERIFIED on headset** — do not claim it works on device.
6. **Do not assume exactly 4 walls** — room geometry is arbitrary.
7. **Persistent anchors are NOT supported in WebXR** — do not use `XRAnchor.save()`.
8. **Camera texture access is NOT available in WebXR** — do not attempt it.
9. **MagicRealismProject/** is a separate TWA store pipeline — do not merge or alter it.
10. **The centaur/goblin/dragon sequence is an example of emergence**, not a scripted story to implement.

## Skills Available for This Project

- `.agent/skills/project-intent/SKILL.md` — source reconciliation and design intent
- `.agent/skills/webxr-capability/SKILL.md` — platform verification checklist
- `.agent/skills/gesture-testing/SKILL.md` — gesture state machine testing guidance
- `.agent/skills/vr-ar/SKILL.md` — general VR/AR principles

## Open Questions (Record, Do Not Invent)

- Competition name, URL, submission deadline, headset target: **unknown — not confirmed**
- Whether `XRPlane.orientation === 'horizontal'` reliably distinguishes floor from table on Quest 3: **unverified**
- Whether palm-normal Y computation from MCPs is chirality-correct for both hands: **unverified**
- Whether XR Blocks (MagicRealismProject/) should be maintained alongside or replaced by this scaffold: **pending player decision**

## Next Milestone

**Phase 1 complete.** See `docs/STATUS.md` for the recommended next step.
