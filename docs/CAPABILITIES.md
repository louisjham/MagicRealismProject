# Platform Capabilities — Magical Realism Invoker

## Target Platform

**Quest Browser** (Meta Quest 3 / Quest 3S primary; Quest 2 secondary)
WebXR immersive-ar mode served over HTTPS.

Evidence source: Web search verified Oct 2026; Meta developer documentation.

---

## Verified Supported Features

| Feature | WebXR Feature String | Status | Notes |
|---------|---------------------|--------|-------|
| Immersive AR | `immersive-ar` | ✅ Supported | Requires HTTPS or localhost |
| Hand tracking | `hand-tracking` | ✅ Supported | 25-joint XRHand skeleton (WebXR Hand Input spec) |
| Plane detection | `plane-detection` | ✅ Supported | Requires user to have completed Room Setup |
| Anchors (session-local) | `anchors` | ✅ Supported | Session-local only — objects world-locked during session |
| Hit test | `hit-test` | ✅ Supported | Useful for surface placement |
| Local-floor reference space | `local-floor` | ✅ Supported | Y=0 at tracked floor level |
| DOM overlay | `dom-overlay` | ✅ Supported | Renders 2D HTML over the XR view |

---

## NOT Available in WebXR on Quest

| Capability | Status | Notes |
|-----------|--------|-------|
| **Camera texture access** | ❌ Not available | Passthrough frames are not exposed to JavaScript. Cannot read camera pixels. |
| **Persistent anchors** | ❌ Not available | `XRAnchor.save()` / persistent spatial anchors are not in the WebXR spec as of this date. Objects reset on session end. |
| **Native Meta Scene API / MRUK** | ❌ Not available | MRUK is an Android SDK API, not a WebXR API. Cannot call it from a web app. |
| **Bare-hand haptic feedback** | ❌ Not available | WebXR Haptic Actuator only works with controllers, not bare hands. |
| **Furniture semantic detection** | ❌ Not available | `XRPlane` provides orientation ('horizontal'/'vertical') but not semantic labels ('table', 'sofa', 'desk'). |
| **Mesh detection** | ⚠️ Partial | `XRMesh` (WebXR Mesh Detection API) is experimental; not guaranteed on Quest Browser. |
| **Room guarantee of exactly 4 walls** | ❌ Assumption invalid | Room shapes are arbitrary. Do not assume 4 walls. |

---

## Known Limitations with Fallback Behavior

### Plane Detection Requires Room Setup
- If the user has not completed Quest Room Setup, `detectedPlanes` will be empty.
- **Fallback:** `SyntheticRoomProvider` provides placeholder geometry so the experience
  remains runnable. The world state machine is notified of real surfaces only when they arrive.

### Hand Tracking Occlusion
- Hands occluded by the body or each other lose tracking briefly.
- **Mitigation:** `AwakeningGesture` cancels the ritual on tracking loss, preventing
  partial-state corruption. `reacquireHysteresisSec` can be increased to add tolerance.

### Palm-Normal Computation (UNVERIFIED)
- The palm-down classifier uses the cross product of MCP joint vectors.
- **Direction may need negation for left hand** due to chirality differences.
- **Status:** Tested only with synthetic samples. Must be validated on headset.
- **Fallback:** Pinch-based activation can substitute if palm-down is unreliable.

### XRSession.enabledFeatures
- Not all Quest Browser versions expose `XRSession.enabledFeatures`.
- **Mitigation:** `buildCapabilityReport()` guards this with a feature check.

---

## Deployment Requirements

- **HTTPS required** — WebXR is a secure context feature.
- **Recommended:** Vercel deployment (existing `twa-manifest.json` references `magicrealism-invoker.vercel.app`).
- **Development:** `localhost` is a secure context in Chrome/Quest Browser; use `vite` dev server.
- **CORS:** No external APIs in milestone 1 — not a concern yet.

---

## Unverified Claims (Do Not Assert Until Tested on Device)

- Palm-down gesture recognition accuracy on real Quest hand tracking data.
- `XRPlane.orientation` reliably distinguishing table surfaces (horizontal) from floor on Quest 3.
- Performance at 90 Hz sustained with current scene complexity.
- `local-floor` reference space Y-alignment matching real floor position after Room Setup.

---

## Competition / Submission (OPEN — Not Confirmed)

> **Do not invent these values.** Record them here when confirmed by the player.

| Item | Status |
|------|--------|
| Competition name | ❓ Unknown |
| Competition URL | ❓ Unknown |
| Submission deadline | ❓ Unknown |
| Target headset | ❓ Unknown (Quest 3 presumed) |
| Submission format (APK / web URL) | ❓ Unknown |
| Judging criteria | ❓ Unknown |
