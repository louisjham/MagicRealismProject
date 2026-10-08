import * as THREE from 'three';
import * as xb from 'xrblocks';

class MainScript extends xb.Script {
  private flameGeo!: THREE.ConeGeometry;
  private flameMat!: THREE.MeshBasicMaterial;
  private flameMesh!: THREE.Mesh;
  
  private audioCtx: AudioContext | null = null;
  private triggerCounter = 0;

  override init() {
    this.add(new THREE.HemisphereLight(0xffffff, 0x444444, 3.0));

    const directionalLight = new THREE.DirectionalLight(0xffffff, 2.0);
    directionalLight.position.set(1, 3, 2);
    this.add(directionalLight);

    // Flame mesh setup
    this.flameGeo = new THREE.ConeGeometry(0.04, 0.12, 8);
    this.flameMat = new THREE.MeshBasicMaterial({ color: 0xffaa00, wireframe: true });
    this.flameMesh = new THREE.Mesh(this.flameGeo, this.flameMat);
    this.flameMesh.visible = false;
    this.add(this.flameMesh);

    // Removed UICard
  }

  private getAudioContext() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  private playCrackling() {
    const ctx = this.getAudioContext();
    const bufferSize = ctx.sampleRate * 0.15;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1200;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start();
  }

  private playRoaring() {
    const ctx = this.getAudioContext();
    const bufferSize = ctx.sampleRate * 0.6;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(200, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.3);
    filter.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.6);
    filter.Q.value = 3;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start();
  }

  override update() {
    const renderer = xb.core.renderer;
    const session = renderer?.xr?.getSession();
    
    this.flameMesh.visible = false;
    
    if (session) {
      const frame = renderer.xr.getFrame();
      if (frame) {
        for (const source of session.inputSources) {
          if (source.hand) {
            const indexTip = source.hand.get('index-finger-tip');
            if (indexTip && typeof frame.getJointPose === 'function') {
              const refSpace = renderer.xr.getReferenceSpace();
              if (refSpace) {
                const jointPose = frame.getJointPose(indexTip, refSpace);
                if (jointPose) {
                  this.flameMesh.position.copy(jointPose.transform.position as unknown as THREE.Vector3);
                  this.flameMesh.visible = true;
                
                  this.triggerCounter++;
                  if (this.triggerCounter % 180 === 0) {
                      this.playCrackling();
                  } else if (this.triggerCounter % 360 === 0) {
                      this.playRoaring();
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  override dispose() {
    this.flameGeo.dispose();
    this.flameMat.dispose();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const options = new xb.Options({ formFactor: 'auto' });
  options.setAppTitle('MagicRealism Invoker');
  options.setAppDescription('Flame, Spark, and Fireball');
  
  xb.add(new MainScript());

  // TWA auto-enter session if installed as a Meta VR App
  const nav = navigator as Navigator & { xr?: { isSessionSupported?: (m:string)=>Promise<boolean> } };
  if ("getDigitalGoodsService" in window && nav.xr?.isSessionSupported) {
    nav.xr.isSessionSupported("immersive-vr").then(supported => {
      if (supported) {
        // Init XR Blocks (it may auto-request session if already in a user gesture or PWA context)
        void xb.init(options);
      }
    }).catch(console.error);
  } else {
    // Normal browser / Simulator init
    void xb.init(options);
  }
});
