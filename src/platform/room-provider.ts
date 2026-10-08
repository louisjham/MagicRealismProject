/**
 * Room/surface provider interface.
 *
 * Abstractions over physical room surfaces detected by the platform.
 * Two implementations exist:
 *   1. SyntheticRoomProvider — for desktop development; generates a clearly
 *      marked synthetic room so tests and iteration work without a headset.
 *   2. WebXRRoomProvider — uses WebXR plane-detection (XRPlane) to populate
 *      surfaces from actual room scan data.
 *
 * Coordinate space: viewer/local-floor reference space, metres (WebXR standard).
 *
 * IMPORTANT: Do not treat synthetic geometry as detected physical geometry.
 * WorldState must know which provider is active.
 */

import type { PhysicalSurface, SurfaceRole, Vec3 } from '../actions/actions.js';

// ---------------------------------------------------------------------------
// Interface contract
// ---------------------------------------------------------------------------

export interface RoomProvider {
  /** Whether this provider is using real detected room data. */
  readonly isSynthetic: boolean;

  /** Returns current known surfaces. May grow over time as more are detected. */
  getSurfaces(): readonly PhysicalSurface[];

  /** Returns the best-candidate floor surface, or undefined if none detected yet. */
  getFloor(): PhysicalSurface | undefined;

  /**
   * Called each XR frame to allow the provider to update its surface list.
   * @param frame XRFrame or null (desktop mode).
   * @param refSpace Reference space or null.
   */
  update(frame: XRFrame | null, refSpace: XRReferenceSpace | null): void;
}

// ---------------------------------------------------------------------------
// Synthetic provider — desktop development mode
// ---------------------------------------------------------------------------

/** A synthetic room laid out around the origin. */
export class SyntheticRoomProvider implements RoomProvider {
  readonly isSynthetic = true;
  private readonly surfaces: PhysicalSurface[];

  constructor() {
    this.surfaces = buildSyntheticRoom();
  }

  getSurfaces(): readonly PhysicalSurface[] {
    return this.surfaces;
  }

  getFloor(): PhysicalSurface | undefined {
    return this.surfaces.find((s) => s.role === 'floor');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  update(_frame: XRFrame | null, _refSpace: XRReferenceSpace | null): void {
    // Synthetic — no live updates needed.
  }
}

function buildSyntheticRoom(): PhysicalSurface[] {
  const surfaces: PhysicalSurface[] = [];

  // Floor at Y=0, 4m × 4m
  surfaces.push(makeSurface('synth-floor', 'floor', { x: 0, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }));

  // Walls — an irregular room to avoid the "exactly 4 walls" assumption
  surfaces.push(makeSurface('synth-wall-north', 'wall', { x: 0, y: 1.2, z: -2 }, { x: 0, y: 0, z: 1 }));
  surfaces.push(makeSurface('synth-wall-south', 'wall', { x: 0, y: 1.2, z: 2 }, { x: 0, y: 0, z: -1 }));
  surfaces.push(makeSurface('synth-wall-east', 'wall', { x: 2, y: 1.2, z: 0 }, { x: -1, y: 0, z: 0 }));
  surfaces.push(makeSurface('synth-wall-west', 'wall', { x: -2, y: 1.2, z: 0 }, { x: 1, y: 0, z: 0 }));

  // Ceiling
  surfaces.push(makeSurface('synth-ceiling', 'ceiling', { x: 0, y: 2.4, z: 0 }, { x: 0, y: -1, z: 0 }));

  return surfaces;
}

function makeSurface(id: string, role: SurfaceRole, centroid: Vec3, normal: Vec3): PhysicalSurface {
  return { id, role, centroid, normal };
}

// ---------------------------------------------------------------------------
// WebXR plane-detection provider
// ---------------------------------------------------------------------------

/**
 * Builds PhysicalSurface records from XRPlane instances detected by the browser.
 *
 * Requirements:
 *   - XRSession must have been started with the 'plane-detection' optional feature.
 *   - User must have completed Room Setup on the device.
 *   - XRPlane orientation attribute: 'horizontal' → floor/ceiling, 'vertical' → wall.
 *
 * LIMITATION: XRPlane does not expose a semantic role (floor vs ceiling vs table).
 * We classify by Y position relative to head: below → floor, above → ceiling.
 * This is approximate and may misclassify raised platforms.
 */
export class WebXRRoomProvider implements RoomProvider {
  readonly isSynthetic = false;
  private readonly surfaceMap = new Map<XRPlane, PhysicalSurface>();

  getSurfaces(): readonly PhysicalSurface[] {
    return [...this.surfaceMap.values()];
  }

  getFloor(): PhysicalSurface | undefined {
    // The largest horizontal surface at approximately Y=0 in local-floor space
    return [...this.surfaceMap.values()]
      .filter((s) => s.role === 'floor')
      .sort((a, b) => Math.abs(a.centroid.y) - Math.abs(b.centroid.y))[0];
  }

  update(frame: XRFrame | null, refSpace: XRReferenceSpace | null): void {
    if (!frame || !refSpace) return;

    // XRFrame.detectedPlanes may not exist if feature wasn't granted
    const detectedPlanes = (frame as unknown as { detectedPlanes?: XRPlaneSet }).detectedPlanes;
    if (!detectedPlanes) return;

    // Remove planes that are no longer detected
    for (const [plane] of this.surfaceMap) {
      if (!detectedPlanes.has(plane)) {
        this.surfaceMap.delete(plane);
      }
    }

    // Add / update detected planes
    for (const plane of detectedPlanes) {
      const pose = frame.getPose(plane.planeSpace, refSpace);
      if (!pose) continue;

      const centroid: Vec3 = {
        x: pose.transform.position.x,
        y: pose.transform.position.y,
        z: pose.transform.position.z,
      };

      const role = classifyPlane(plane.orientation, centroid.y);

      const surface: PhysicalSurface = {
        id: `xrplane-${this.surfaceMap.size}`, // stable within map iteration
        role,
        centroid,
        normal: planeNormal(plane.orientation, centroid.y),
      };

      this.surfaceMap.set(plane, surface);
    }
  }
}

function classifyPlane(orientation: XRPlaneOrientation, y: number): SurfaceRole {
  if (orientation === 'vertical') return 'wall';
  // Horizontal planes below viewer (approximately) are floors
  return y < 0.5 ? 'floor' : 'ceiling';
}

function planeNormal(orientation: XRPlaneOrientation, y: number): Vec3 {
  if (orientation === 'vertical') return { x: 0, y: 0, z: 1 }; // approximate
  return y < 0.5 ? { x: 0, y: 1, z: 0 } : { x: 0, y: -1, z: 0 };
}
