/**
 * Desktop debug controls and diagnostics overlay.
 *
 * IMPORTANT: This UI is separate from the intended gesture-first player UX.
 * It is NEVER shown in XR sessions. Its sole purpose is development iteration.
 *
 * Provides:
 *   - World phase display
 *   - Capability report (AR supported, features granted/missing)
 *   - "Trigger Awakening" button → emits the same awakening action as real gestures
 *   - "Reset" button → cancels current state
 *   - Synthetic hand sample controls (for gesture state machine testing without a headset)
 */

import type { ActionBus } from '../actions/actions.js';
import type { CapabilityReport } from '../platform/capabilities.js';
import type { WorldState } from '../world/world-state.js';

export class DebugUI {
  private readonly root: HTMLElement;
  private phaseEl!: HTMLElement;
  private capEl!: HTMLElement;
  private actionBus: ActionBus | null = null;
  private simulatePalmDown = false;

  // Timer for synthetic awakening simulation
  private awakeningTimer: ReturnType<typeof setInterval> | null = null;
  private awakeningElapsed = 0;
  private readonly AWAKENING_DURATION_SEC = 5;

  constructor(root: HTMLElement) {
    this.root = root;
    this.buildUI();
  }

  connect(bus: ActionBus): void {
    this.actionBus = bus;
  }

  updateState(state: WorldState): void {
    this.phaseEl.textContent = `Phase: ${state.phase} | Progress: ${(state.awakeningProgress * 100).toFixed(0)}%`;
  }

  updateCapabilities(report: CapabilityReport): void {
    const lines = [
      `AR: ${report.caps.arSupported ? '✅' : '❌'}`,
      `Granted: ${report.grantedFeatures.join(', ') || 'none'}`,
      `Missing: ${report.missingFeatures.join(', ') || 'none'}`,
    ];
    this.capEl.textContent = lines.join(' | ');
  }

  /** Hide when XR session starts. */
  hideForXR(): void {
    this.root.classList.add('xr-active');
  }

  /** Show when XR session ends. */
  showForDesktop(): void {
    this.root.classList.remove('xr-active');
  }

  /** Whether the debug UI is currently simulating palm-down pose. */
  get isPalmDownSimulated(): boolean {
    return this.simulatePalmDown;
  }

  dispose(): void {
    if (this.awakeningTimer !== null) {
      clearInterval(this.awakeningTimer);
    }
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private buildUI(): void {
    this.root.style.cssText = `
      font-family: monospace;
      font-size: 11px;
      color: #00ffcc;
      background: rgba(0,0,0,0.7);
      padding: 8px 12px;
      border-radius: 4px;
      pointer-events: auto;
      position: absolute;
      top: 8px;
      left: 8px;
      max-width: 420px;
      z-index: 100;
    `;

    const title = document.createElement('div');
    title.textContent = '🧪 DEBUG — SYNTHETIC ROOM — NOT HEADSET OUTPUT';
    title.style.cssText = 'color: #ff6633; font-weight: bold; margin-bottom: 6px;';
    this.root.appendChild(title);

    this.phaseEl = document.createElement('div');
    this.phaseEl.textContent = 'Phase: initializing';
    this.root.appendChild(this.phaseEl);

    this.capEl = document.createElement('div');
    this.capEl.textContent = 'Capabilities: detecting…';
    this.capEl.style.marginBottom = '8px';
    this.root.appendChild(this.capEl);

    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display: flex; gap: 8px; flex-wrap: wrap;';

    const awakeBtn = this.makeButton('▶ Trigger Awakening', () => this.startSyntheticAwakening());
    const cancelBtn = this.makeButton('✖ Cancel', () => this.cancelSyntheticAwakening());
    const resetBtn = this.makeButton('↺ Reset', () => this.resetWorld());

    btnRow.append(awakeBtn, cancelBtn, resetBtn);
    this.root.appendChild(btnRow);

    const note = document.createElement('div');
    note.style.cssText = 'color: #888; margin-top: 6px; font-size: 10px;';
    note.textContent = 'Desktop controls emit the same PlayerAction events as real hand gestures.';
    this.root.appendChild(note);
  }

  private makeButton(label: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.style.cssText = `
      background: #1a2233;
      color: #00ffcc;
      border: 1px solid #00ffcc;
      border-radius: 3px;
      padding: 4px 10px;
      cursor: pointer;
      font-family: monospace;
      font-size: 11px;
    `;
    btn.addEventListener('click', onClick);
    return btn;
  }

  /** Synthetic awakening — fires the same sequence as real gesture recognition. */
  private startSyntheticAwakening(): void {
    if (this.awakeningTimer !== null) return;
    const bus = this.actionBus;
    if (!bus) return;

    this.awakeningElapsed = 0;
    bus.emit({ type: 'awakening-begin' });

    this.awakeningTimer = setInterval(() => {
      this.awakeningElapsed += 1;
      const progress = Math.min(this.awakeningElapsed / this.AWAKENING_DURATION_SEC, 1);
      bus.emit({ type: 'awakening-progress', progress, elapsedSec: this.awakeningElapsed });

      if (this.awakeningElapsed >= this.AWAKENING_DURATION_SEC) {
        bus.emit({ type: 'awakening-complete' });
        this.clearTimer();
      }
    }, 1000);
  }

  private cancelSyntheticAwakening(): void {
    const bus = this.actionBus;
    if (bus && this.awakeningTimer !== null) {
      bus.emit({ type: 'awakening-cancelled', reason: 'debug-reset' });
    }
    this.clearTimer();
  }

  private resetWorld(): void {
    this.cancelSyntheticAwakening();
    // Re-emit a cancel to ensure world snaps back — world state machine ignores if not awakening
    this.actionBus?.emit({ type: 'awakening-cancelled', reason: 'debug-reset' });
  }

  private clearTimer(): void {
    if (this.awakeningTimer !== null) {
      clearInterval(this.awakeningTimer);
      this.awakeningTimer = null;
    }
    this.awakeningElapsed = 0;
  }
}
