# Requirements — Magical Realism Invoker

## Source-of-Truth Hierarchy

1. Player preferences stated in `CONVERSATION_LOG.md` — confirmed requirements.
2. This document — curated from confirmed sources.
3. Assistant proposals in `CONVERSATION_LOG.md` — proposals only, not auto-approved.
4. `PROJECT_PHASES.md` — draft roadmap, may need reconciliation.

---

## Non-Negotiable Experiential Requirements

These are confirmed from `CONVERSATION_LOG.md` player statements:

1. **The player starts in their real, visually unmodified room.**
   - No pre-built fantasy environment at session start.
   - Real room surfaces are detected but visually passthrough.

2. **Creation is gradual and ritualistic.**
   - The room is built piece by piece through deliberate gestures.
   - The player earns the space before creatures appear.

3. **Floor-awakening ritual:**
   - Both hands extended, palms down, held for 5 seconds.
   - Floor pulses once per second during the hold.
   - Tracking loss or pose failure cancels the ritual.
   - Completion transforms only the floor (walls remain untransformed).
   - Flash-paper visual transition effect.

4. **Wall transformation (Phase 2):**
   - Pointing at a wall for a few seconds transforms it.
   - Two material choices: cave walls or stone walls.
   - Modifier gesture distinguishes the two (left vs right hand, or gesture variant).

5. **Torch summoning (Phase 4):**
   - Sideways fist gesture summons a magical torch.
   - Can be thrown (sticks to wall as basic sconce) or placed (fancy sconce).
   - Placing assigns a random light color parameter that affects ambient shader tint.
   - Dropping fades to sparks.

6. **Portals (Phase 3):**
   - Palm-out, fingers-spread gesture on a wall surface.
   - Visual: glowing "tear in reality" with heavy white vapor/fog settling to floor.
   - Can be moved with same palm-out gesture; resized by pinch-stretch.

7. **Randomness:**
   - Seeded RNG — different every session, reproducible for debugging.
   - Some events rise unexpectedly from chance (not all from player choices).
   - Bounded by entity limits, cooldowns, event budgets.

8. **Emergent ecosystem (Phase 5+):**
   - Creatures emerge from player choices (glyph drawing, torch color, environment).
   - Creatures interact autonomously with each other.
   - No two sessions are identical.
   - **The centaur/goblin/dragon scenario is an EXAMPLE of emergence**, not a required scripted sequence.

9. **No LLM-based creature system in bootstrap.**
   - Behavior trees or FSMs only at this stage.

10. **No traditional UI menus.**
    - All player interaction through hand gestures.
    - Debug UI is development-only and hidden in XR.

---

## Confirmed Requirements vs Proposals

| Item | Status | Source |
|------|--------|--------|
| Player starts in unmodified room | ✅ Confirmed | CONVERSATION_LOG player statement |
| 5-second floor awakening ritual | ✅ Confirmed | CONVERSATION_LOG player statement |
| Once-per-second pulse during ritual | ✅ Confirmed | CONVERSATION_LOG player statement |
| Flash-paper transition | ✅ Confirmed | CONVERSATION_LOG player statement |
| Wall gesture with material choice | ✅ Confirmed | CONVERSATION_LOG player statement |
| Torch sideways fist gesture | ✅ Confirmed | CONVERSATION_LOG player statement |
| Portal palm-out gesture | ✅ Confirmed | CONVERSATION_LOG player statement |
| Portal vapor/fog is heavy (settles to floor) | ✅ Confirmed | CONVERSATION_LOG player statement |
| Session-to-session randomness | ✅ Confirmed | CONVERSATION_LOG player statement |
| Low-poly art style | ✅ Confirmed | CONVERSATION_LOG + Concept Images |
| Glyph drawing seeds creatures | ✅ Confirmed | CONVERSATION_LOG player statement |
| "Homestead" / "Terrarium" framing | ❓ Proposal | Assistant suggestion — not player-confirmed |
| Palm-up = green flame terrain | ❓ Proposal | Assistant suggestion — not adopted in confirmed spec |
| Fist = fireball/shockwave | ❓ Proposal | Prototype behavior — not confirmed for new design |
| Haptic rumble during awakening | ❓ Proposal | Assistant suggestion — bare-hand haptics not available in WebXR |
| Furniture detection / coffee table island | ❓ Proposal | Not available in WebXR plane detection |
| Specific creature types (centaur, goblin, dragon) | ❓ Example | Player example of emergence intent, not required roster |

---

## Open Questions (Record, Do Not Invent)

- **Competition details:** Name, URL, deadline, target headset, submission format — UNKNOWN.
- **Store submission path:** Is the XR Blocks + TWA pipeline in `MagicRealismProject/` the intended production path, or does this new scaffold replace it? — PENDING player decision.
- **Persistent state:** Should surface treatments and placed torches persist across sessions? WebXR persistent anchors are NOT available (limitation). — OPEN.
- **Wall gesture modifier:** Left vs right hand, or index curl vs flat? — Design TBD in Phase 2.
- **Creature roster:** What creature types exist? — Design TBD in Phase 5.
- **Audio design:** Music track or pure procedural? — Design TBD.
