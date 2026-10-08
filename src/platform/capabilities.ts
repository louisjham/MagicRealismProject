/**
 * Platform capability detection and session management.
 *
 * Verified capabilities (Quest Browser, Oct 2026):
 *   - immersive-ar session mode: supported
 *   - hand-tracking feature: supported (25-joint XRHand skeleton)
 *   - plane-detection feature: supported (requires Room Setup to have been run)
 *   - anchors feature: supported (session-local; persistent anchors are NOT
 *     supported in WebXR on Quest as of this date — do not use XRAnchor.save())
 *   - hit-test feature: supported
 *
 * NOT supported in WebXR on Quest:
 *   - Camera texture access (passthrough frames are not exposed to JS)
 *   - Native Meta Scene API (MRUK) — that is an Android SDK API, not WebXR
 *   - Bare-hand haptic feedback
 *   - Persistent anchors across sessions
 *   - Room does not necessarily have exactly 4 walls (do not assume)
 *   - Furniture anchors (plane-detection returns flat planes, not semantic furniture)
 *
 * Reference: https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API
 *            Meta Quest Browser WebXR support (confirmed via web search, Oct 2026)
 */

export interface XRCapabilities {
  readonly arSupported: boolean;
  readonly handTrackingAvailable: boolean;
  readonly planeDetectionAvailable: boolean;
  readonly anchorsAvailable: boolean;
  readonly hitTestAvailable: boolean;
}

/** Probe what the current UA can do before requesting a session. */
export async function detectCapabilities(): Promise<XRCapabilities> {
  if (!navigator.xr) {
    return {
      arSupported: false,
      handTrackingAvailable: false,
      planeDetectionAvailable: false,
      anchorsAvailable: false,
      hitTestAvailable: false,
    };
  }

  const arSupported = await navigator.xr
    .isSessionSupported('immersive-ar')
    .catch(() => false);

  // Feature availability is only known after session start.
  // We optimistically report them if AR is supported, then validate at session-start.
  return {
    arSupported,
    handTrackingAvailable: arSupported,
    planeDetectionAvailable: arSupported,
    anchorsAvailable: arSupported,
    hitTestAvailable: arSupported,
  };
}

/** Features required to start an AR session. */
export const AR_REQUIRED_FEATURES: string[] = [
  'local-floor',
];

/** Optional features — session will start even if these are unavailable. */
export const AR_OPTIONAL_FEATURES: string[] = [
  'hand-tracking',
  'plane-detection',
  'anchors',
  'hit-test',
  'dom-overlay',
];

/**
 * XR Session lifecycle wrapper.
 * Handles session end and allows clean re-entry.
 */
export class XRSessionManager {
  private session: XRSession | null = null;
  private readonly onSessionEnd: () => void;

  constructor(onSessionEnd: () => void) {
    this.onSessionEnd = onSessionEnd;
  }

  get active(): boolean {
    return this.session !== null;
  }

  async requestARSession(domOverlayRoot?: HTMLElement): Promise<XRSession> {
    if (this.session) {
      throw new Error('XR session already active');
    }

    const opts: XRSessionInit = {
      requiredFeatures: AR_REQUIRED_FEATURES,
      optionalFeatures: [
        ...AR_OPTIONAL_FEATURES,
        ...(domOverlayRoot ? ['dom-overlay'] : []),
      ],
    };

    if (domOverlayRoot) {
      (opts as Record<string, unknown>)['domOverlay'] = { root: domOverlayRoot };
    }

    const session = await navigator.xr!.requestSession('immersive-ar', opts);
    this.session = session;

    session.addEventListener('end', () => {
      this.session = null;
      this.onSessionEnd();
    });

    return session;
  }

  async endSession(): Promise<void> {
    if (this.session) {
      await this.session.end();
    }
  }
}

/** Diagnostic report for the dev/debug UI. */
export interface CapabilityReport {
  readonly caps: XRCapabilities;
  readonly grantedFeatures: string[];
  readonly missingFeatures: string[];
}

/** Compare expected optional features against what was granted. */
export function buildCapabilityReport(
  caps: XRCapabilities,
  session: XRSession,
): CapabilityReport {
  // XRSession.enabledFeatures is not always available — guard it.
  const enabled: readonly string[] =
    'enabledFeatures' in session
      ? (session as unknown as { enabledFeatures: string[] }).enabledFeatures
      : [];

  const granted = AR_OPTIONAL_FEATURES.filter((f) => enabled.includes(f));
  const missing = AR_OPTIONAL_FEATURES.filter((f) => !enabled.includes(f));

  return { caps, grantedFeatures: granted, missingFeatures: missing };
}
