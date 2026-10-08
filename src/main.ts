/**
 * Application entry point and lifecycle coordinator.
 *
 * Wires together:
 *   1. Platform capability detection
 *   2. Room provider (synthetic in desktop, WebXR in AR)
 *   3. World state machine
 *   4. Scene renderer (Three.js)
 *   5. Gesture state machines
 *   6. Audio system
 *   7. Debug UI (desktop only)
 *
 * Desktop mode: synthetic room, debug UI, no XR session.
 * AR mode: transparent scene, real room provider, hand pose sampling.
 *
 * Both modes emit PlayerAction through the shared ActionBus.
 * The world state machine and renderer react to ActionBus events — they
 * do not inspect XR or DOM events directly.
 */

import * as THREE from 'three';
import { ActionBus } from './actions/actions.js';
import { detectCapabilities, XRSessionManager, buildCapabilityReport } from './platform/capabilities.js';
import { SyntheticRoomProvider, WebXRRoomProvider } from './platform/room-provider.js';
import type { RoomProvider } from './platform/room-provider.js';
import { sampleAllHands } from './platform/hand-sampler.js';
import { AwakeningGesture, DEFAULT_AWAKENING_CONFIG } from './gesture/awakening.js';
import { WorldStateMachine } from './world/world-state.js';
import type { WorldState } from './world/world-state.js';
import { SceneRenderer } from './render/scene-renderer.js';
import { AudioSystem } from './audio/audio-system.js';
import { DebugUI } from './debug/debug-ui.js';
import { makeSeed } from './util/rng.js';
import { nowSec } from './util/time.js';

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  // --- DOM scaffolding ---
  const container = document.createElement('div');
  document.body.appendChild(container);

  const debugRoot = document.getElementById('debug-ui');
  if (!debugRoot) throw new Error('debug-ui element missing from index.html');

  // --- Core systems ---
  const bus = new ActionBus();
  const seed = makeSeed(); // random per session; pass a fixed number for debugging
  const world = new WorldStateMachine(seed);
  world.connect(bus);

  const audio = new AudioSystem();
  const sceneRenderer = new SceneRenderer({ container, debugUI: debugRoot });
  const debugUI = new DebugUI(debugRoot);
  debugUI.connect(bus);

  // --- Capability detection ---
  const caps = await detectCapabilities();
  debugUI.updateCapabilities({ caps, grantedFeatures: [], missingFeatures: [] });

  // --- Room provider ---
  let roomProvider: RoomProvider;
  let xrRefSpace: XRReferenceSpace | null = null;
  const sessionMgr = new XRSessionManager(() => {
    // XR session ended — revert to desktop mode
    debugUI.showForDesktop();
    xrRefSpace = null;
  });

  if (caps.arSupported) {
    roomProvider = new WebXRRoomProvider();
  } else {
    roomProvider = new SyntheticRoomProvider();
  }

  // --- Gesture state machine ---
  const awakeningGesture = new AwakeningGesture((action) => bus.emit(action), DEFAULT_AWAKENING_CONFIG);

  // --- World event → render/audio bridge ---
  world.subscribe((evt) => {
    debugUI.updateState(evt.state);

    switch (evt.type) {
      case 'phase-changed':
        handlePhaseChange(evt.state);
        break;
      case 'awakening-progress':
        sceneRenderer.onAwakeningProgress(evt.state.awakeningProgress);
        audio.playAwakeningPulse();
        break;
      case 'surface-transformed':
        sceneRenderer.triggerFlashTransition();
        audio.playAwakeningComplete();
        break;
    }
  });

  // --- Build initial desktop scene ---
  if (roomProvider.isSynthetic) {
    sceneRenderer.buildSyntheticRoom(roomProvider);
    // Mark room ready immediately with synthetic surfaces
    world.markRoomReady(roomProvider.getSurfaces());
    debugUI.updateState(world.getSnapshot());
  }

  // --- AR button (only if supported) ---
  if (caps.arSupported) {
    const arBtn = createARButton(async () => {
      audio.playCrackling(); // user gesture — safe to init AudioContext here
      try {
        const session = await sessionMgr.requestARSession(debugRoot);
        xrRefSpace = await sceneRenderer.attachXRSession(session);

        // Build capability report now that session is active
        const report = buildCapabilityReport(caps, session);
        debugUI.updateCapabilities(report);
        debugUI.hideForXR();

        // Switch to real room provider
        roomProvider = new WebXRRoomProvider();
      } catch (err) {
        console.error('Failed to start AR session', err);
      }
    });
    document.body.appendChild(arBtn);
  }

  // --- Animation loop ---
  let lastTime = nowSec();

  sceneRenderer.renderer.setAnimationLoop((_timestamp: number, frame: XRFrame | null) => {
    const now = nowSec();
    const deltaTime = Math.min(now - lastTime, 0.1); // cap at 100ms to handle tab suspension
    lastTime = now;

    // Update room surfaces from XR plane detection
    roomProvider.update(frame, xrRefSpace);

    // If WebXR provider and we haven't told world about surfaces yet, do so now
    if (!roomProvider.isSynthetic && world.getSnapshot().phase === 'initializing') {
      const surfaces = roomProvider.getSurfaces();
      if (surfaces.length > 0) {
        world.markRoomReady(surfaces);
      }
    }

    // Sample hands and feed gesture state machine
    if (frame && xrRefSpace) {
      const session = sceneRenderer.renderer.xr.getSession();
      if (session) {
        const hands = sampleAllHands(frame, session, xrRefSpace);
        awakeningGesture.update(hands, now);
      }
    }

    // Renderer update (flash-paper fade, etc.)
    sceneRenderer.update(deltaTime);
    sceneRenderer.render();
  });

  // --- Cleanup on page unload ---
  window.addEventListener('beforeunload', () => {
    world.dispose();
    audio.dispose();
    sceneRenderer.dispose();
    debugUI.dispose();
  });

  console.log('[MRI] Bootstrap complete. Session seed:', seed);
}

// ---------------------------------------------------------------------------
// Phase change handler
// ---------------------------------------------------------------------------

function handlePhaseChange(state: WorldState): void {
  console.log(`[MRI] World phase: ${state.phase}`);
  // Renderer updates based on phase are handled via the surface treatment map
  // (world-active phase triggers floor visual update, etc.)
}

// ---------------------------------------------------------------------------
// AR Button builder
// ---------------------------------------------------------------------------

function createARButton(onClick: () => void): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.textContent = 'Enter AR';
  btn.style.cssText = `
    position: absolute;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    padding: 12px 28px;
    font-size: 16px;
    font-family: system-ui, sans-serif;
    background: #1a0f2e;
    color: #cc99ff;
    border: 2px solid #cc99ff;
    border-radius: 8px;
    cursor: pointer;
    z-index: 100;
    letter-spacing: 0.05em;
  `;
  btn.addEventListener('click', onClick);
  return btn;
}

// ---------------------------------------------------------------------------
// Entry
// ---------------------------------------------------------------------------

void main();
