/**
 * Hand pose sampler — bridges WebXR XRHand joint data to HandSample values.
 *
 * Coordinate space: viewer local reference space, metres.
 *
 * XRHand joint indices (WebXR Hand Input spec):
 *   - wrist: 'wrist'
 *   - index-finger-metacarpal … index-finger-tip: 5 joints
 *   - middle-finger-metacarpal … etc.
 *   - ring-, little-finger joints
 *   Total: 25 joints
 *
 * Palm normal is approximated by the cross product of:
 *   (middle-finger-metacarpal − wrist) × (index-finger-metacarpal − ring-finger-metacarpal)
 * This is an approximation; validated result needs headset testing.
 *
 * PALM-NORMAL COMPUTATION STATUS: ⚠ UNVERIFIED on headset hardware.
 * Synthetic hand samples in debug mode set palmNormal explicitly.
 */

import type { HandSample, HandSide, Vec3 } from '../actions/actions.js';
import { nowSec } from '../util/time.js';

const WRIST = 'wrist' as XRHandJoint;
const INDEX_MCP = 'index-finger-metacarpal' as XRHandJoint;
const MIDDLE_MCP = 'middle-finger-metacarpal' as XRHandJoint;
const RING_MCP = 'ring-finger-metacarpal' as XRHandJoint;

/**
 * Extract a HandSample from a live XRFrame for a given input source.
 * Returns null if the hand is not tracked or joints are unavailable.
 */
export function sampleHand(
  frame: XRFrame,
  source: XRInputSource,
  refSpace: XRReferenceSpace,
  side: HandSide,
): HandSample | null {
  const hand = source.hand;
  if (!hand) return null;

  const wristJoint = hand.get(WRIST);
  const idxMcp = hand.get(INDEX_MCP);
  const midMcp = hand.get(MIDDLE_MCP);
  const ringMcp = hand.get(RING_MCP);

  if (!wristJoint || !idxMcp || !midMcp || !ringMcp) {
    return { side, tracked: false, wrist: zero(), palm: zero(), palmNormal: zero(), timestampSec: nowSec() };
  }

  if (typeof frame.getJointPose !== 'function') {
    return { side, tracked: false, wrist: zero(), palm: zero(), palmNormal: zero(), timestampSec: nowSec() };
  }

  const wristPose = frame.getJointPose(wristJoint, refSpace);
  const idxPose = frame.getJointPose(idxMcp, refSpace);
  const midPose = frame.getJointPose(midMcp, refSpace);
  const ringPose = frame.getJointPose(ringMcp, refSpace);

  if (!wristPose || !idxPose || !midPose || !ringPose) {
    return { side, tracked: false, wrist: zero(), palm: zero(), palmNormal: zero(), timestampSec: nowSec() };
  }

  const wrist = posToVec3(wristPose.transform.position);
  const idxV = posToVec3(idxPose.transform.position);
  const midV = posToVec3(midPose.transform.position);
  const ringV = posToVec3(ringPose.transform.position);

  // Palm centre = midpoint of wrist and middle MCP
  const palm: Vec3 = {
    x: (wrist.x + midV.x) / 2,
    y: (wrist.y + midV.y) / 2,
    z: (wrist.z + midV.z) / 2,
  };

  // Palm normal ≈ (mid−wrist) × (idx−ring)  [right-hand rule, then normalize]
  // UNVERIFIED — direction may need negation depending on hand chirality in XR space.
  const palmNormal = cross(subtract(midV, wrist), subtract(idxV, ringV));
  normalize(palmNormal);

  return { side, tracked: true, wrist, palm, palmNormal, timestampSec: nowSec() };
}

/** Sample all hands from the current XRSession inputSources. */
export function sampleAllHands(
  frame: XRFrame,
  session: XRSession,
  refSpace: XRReferenceSpace,
): HandSample[] {
  const samples: HandSample[] = [];
  for (const source of session.inputSources) {
    if (!source.hand) continue;
    const side: HandSide = source.handedness === 'left' ? 'left' : 'right';
    const sample = sampleHand(frame, source, refSpace, side);
    if (sample) samples.push(sample);
  }
  return samples;
}

// ---------------------------------------------------------------------------
// Math helpers (no Three.js dependency)
// ---------------------------------------------------------------------------

function posToVec3(pos: DOMPointReadOnly): Vec3 {
  return { x: pos.x, y: pos.y, z: pos.z };
}

function zero(): Vec3 {
  return { x: 0, y: 0, z: 0 };
}

function subtract(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function normalize(v: Vec3): void {
  const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  if (len > 0.0001) {
    v.x /= len;
    v.y /= len;
    v.z /= len;
  }
}
