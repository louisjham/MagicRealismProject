Phase 1: Scene Setup & Low-Poly Geometry
Prompt for Agent:
Initialize a Three.js WebXR boilerplate with hand-tracking support (XRHandSpace). Replace the default pass-through floor mesh with a low-poly stone block material and convert all 4 room boundary walls into low-poly stone geometry (no runes/mushrooms yet). Maintain existing room furniture anchors.

Phase 2: Ritual World-Building & Surface Gestures
Prompt for Agent:
Implement gesture recognition for room scanning and surface transformation:

Palm-down raycast: Detects flat surfaces to swap standard materials for low-poly stone variants.

Flash-paper particle effect: Trigger a brief, high-contrast flash and particle burst at the intersection point right before the texture changes.

Phase 3: Portal Mechanics
Prompt for Agent:
Implement the portal creation mechanic:

Gesture: Palm-out, spread-fingers on any vertical wall surface.

Visuals: Render a heavy, vapor-emitting "tear in reality" with swirling purple/blue energy and depth pass-through.

Interaction: Allow grab-and-resize manipulation via pinch-distance between index fingers and thumbs.

Phase 4: Dynamic Lighting & Torch Mechanics
Prompt for Agent:
Add item spawning and placement logic for torches:

Spawn: Sideways-fist gesture spawns a low-poly torch in the player's closed hand featuring light purple fire and low-poly smoke particles.

Drop: Releasing/dropping in mid-air dissolves the torch into fading sparks.

Throw/Place: Hitting a wall anchors a basic sconce. Carefully placing it attaches a fancy sconce that assigns a random light color parameter, dynamically adjusting the room's ambient shader tint.

Phase 5: Rune Drawing & Generative Trigger Loop
Prompt for Agent:
Implement the rune-crafting loop:

Track air-drawing vectors with the index finger.

Match drawn input against a predefined rune geometry dictionary.

Upon a successful match, initiate a short delay before spawning the corresponding environmental feature or object in the targeted spatial zone.