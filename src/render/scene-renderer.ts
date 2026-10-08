/**
 * Three.js renderer setup and AR session integration.
 *
 * Responsibilities:
 *   - WebGLRenderer with alpha:true (transparent background for passthrough)
 *   - XR session setup and reference space acquisition
 *   - Animation loop (setAnimationLoop)
 *   - Synthetic room geometry (desktop mode — clearly marked)
 *
 * Coordinate space: viewer/local-floor reference space, 1 unit = 1 metre.
 */

import * as THREE from 'three';
import type { RoomProvider } from '../platform/room-provider.js';

export interface RendererOptions {
  readonly container: HTMLElement;
  readonly debugUI: HTMLElement;
}

export class SceneRenderer {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;

  // Synthetic room mesh group — only added in desktop mode
  private syntheticRoomGroup: THREE.Group | null = null;

  // Floor mesh for visual transformation feedback
  private floorMesh: THREE.Mesh | null = null;
  private floorOriginalMaterial: THREE.Material | null = null;
  private floorAwakenedMaterial: THREE.Material | null = null;

  // Flash-paper transition objects
  private flashOpacity = 0;
  private flashPlane: THREE.Mesh | null = null;

  constructor(opts: RendererOptions) {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,           // CRITICAL: transparent canvas for AR passthrough
      premultipliedAlpha: false,
    });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.xr.enabled = true;
    this.renderer.setClearAlpha(0);   // Transparent clear for passthrough
    this.renderer.setClearColor(0x000000, 0);

    opts.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.01,
      50,
    );
    this.camera.position.set(0, 1.6, 0); // Standing eye height for desktop

    // Ambient lighting — low intensity to not overpower passthrough
    const ambient = new THREE.AmbientLight(0x404040, 0.5);
    this.scene.add(ambient);

    // Directional light approximating torchlight
    const dirLight = new THREE.DirectionalLight(0xffcc88, 1.0);
    dirLight.position.set(1, 3, 2);
    this.scene.add(dirLight);

    window.addEventListener('resize', this.onResize);
  }

  /**
   * Build synthetic room geometry for desktop development.
   * Meshes are clearly identifiable as synthetic (bright wire grid) and
   * MUST NOT be confused with detected physical surfaces.
   *
   * SYNTHETIC — not physical geometry.
   */
  buildSyntheticRoom(provider: RoomProvider): void {
    if (!provider.isSynthetic) return; // Safety: only build for synthetic provider

    this.syntheticRoomGroup = new THREE.Group();

    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x4488ff,
      wireframe: true,
      opacity: 0.3,
      transparent: true,
    });

    // Floor
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), wireMat.clone());
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    this.floorMesh = floor;
    this.floorOriginalMaterial = floor.material as THREE.Material;
    this.syntheticRoomGroup.add(floor);

    // Walls
    const wallPositions: [number, number, number, number][] = [
      [0, 1.2, -2, 0],
      [0, 1.2, 2, Math.PI],
      [2, 1.2, 0, -Math.PI / 2],
      [-2, 1.2, 0, Math.PI / 2],
    ];
    for (const [x, y, z, ry] of wallPositions) {
      const wall = new THREE.Mesh(new THREE.PlaneGeometry(4, 2.4), wireMat.clone());
      wall.position.set(x, y, z);
      wall.rotation.y = ry;
      this.syntheticRoomGroup.add(wall);
    }

    // Label visible in desktop mode
    const labelGeo = new THREE.PlaneGeometry(1.5, 0.15);
    const labelMat = new THREE.MeshBasicMaterial({ color: 0xffaa00, side: THREE.DoubleSide });
    const label = new THREE.Mesh(labelGeo, labelMat);
    label.position.set(0, 0.5, -1.5);
    this.syntheticRoomGroup.add(label);

    this.scene.add(this.syntheticRoomGroup);

    // Prepare awakened floor material (low-poly stone placeholder)
    this.floorAwakenedMaterial = new THREE.MeshStandardMaterial({
      color: 0x664422,
      roughness: 0.9,
      metalness: 0.1,
      wireframe: false,
    });

    this.buildFlashPlane();
  }

  /** Build the flash-paper transition plane (above the floor, facing camera). */
  private buildFlashPlane(): void {
    const geo = new THREE.PlaneGeometry(4, 4);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.flashPlane = new THREE.Mesh(geo, mat);
    this.flashPlane.rotation.x = -Math.PI / 2;
    this.flashPlane.position.y = 0.01; // just above floor
    this.scene.add(this.flashPlane);
  }

  /** Called when awakening progress updates (0–1). */
  onAwakeningProgress(progress: number): void {
    // Pulse the floor mesh colour
    if (this.floorMesh) {
      const mat = this.floorMesh.material as THREE.MeshBasicMaterial;
      const pulse = 0.3 + Math.abs(Math.sin(progress * Math.PI * 5)) * 0.7;
      mat.color.setRGB(pulse * 0.3, pulse * 0.5, pulse);
    }
  }

  /** Called on awakening-complete to trigger the flash-paper transition. */
  triggerFlashTransition(): void {
    this.flashOpacity = 1.0;
    // Apply awakened material to floor
    if (this.floorMesh && this.floorAwakenedMaterial) {
      this.floorMesh.material = this.floorAwakenedMaterial;
    }
  }

  /** Must be called each frame (from setAnimationLoop callback). */
  update(deltaTime: number): void {
    // Fade out flash-paper effect
    if (this.flashOpacity > 0) {
      this.flashOpacity = Math.max(0, this.flashOpacity - deltaTime * 2);
      if (this.flashPlane) {
        (this.flashPlane.material as THREE.MeshBasicMaterial).opacity = this.flashOpacity;
      }
    }
  }

  /** Render a frame. */
  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  /** Connect this renderer to an active XR session. */
  async attachXRSession(session: XRSession): Promise<XRReferenceSpace> {
    await this.renderer.xr.setSession(session);
    this.renderer.xr.setReferenceSpaceType('local-floor');
    return await session.requestReferenceSpace('local-floor');
  }

  dispose(): void {
    window.removeEventListener('resize', this.onResize);
    this.renderer.dispose();
    if (this.floorOriginalMaterial) this.floorOriginalMaterial.dispose();
    if (this.floorAwakenedMaterial) this.floorAwakenedMaterial.dispose();
  }

  private onResize = (): void => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };
}
