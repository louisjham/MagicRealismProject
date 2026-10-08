# MagicRealism Invoker - Session Memory & Context

This file serves as an unambiguous record of all actions taken in the codebase. Agents should read this file to instantly recover context without re-reading the entire chat history.

## Project Goal
Build "Magical Realism Invoker", an immersive WebXR experience using hand-tracking and procedural audio, packaged for the Meta Quest Store.

## Architecture
- **Web App (`web/`)**: XR Blocks (TypeScript + Vite). Rapid iteration layer.
- **Store Wrapper (`twa/`)**: Trusted Web Activity (TWA) via `@meta-quest/bubblewrap-cli`. Wraps the WebXR app into an ARM64 APK.

## Actions Taken (To Date)
1. **Scaffolding**: Initialized XR Blocks Vite TypeScript template in `web/`.
2. **Dependency Resolution**: Downgraded `three` and `@types/three` to `0.184.0` in `package.json` to resolve an `xrblocks` peer dependency conflict. Installed missing `lit` peer dependency.
3. **Keystore Generation**: Created permanent release keystore at `release.keystore` (Alias: `my-key-alias`, Pass: `MetaStart2026!`). **CRITICAL: NEVER LOSE THIS FILE.**
4. **TWA Configuration**: 
   - Created `twa/twa-manifest.json` configured for immersive WebXR (`horizonOSAppMode: "immersive"`).
   - Set Package ID to `com.magicrealism.invoker` and placeholder domain `magicrealism-invoker.vercel.app`.
5. **PWA Integration**: 
   - Added `manifest.webmanifest`, `icons/` folder, and `assetlinks.json` (signed with the keystore's SHA-256 fingerprint) to `web/public/`.
   - Updated `web/index.html` to include PWA meta tags.
   - Updated `web/vite.config.ts` with `base: "./"`.
6. **Code Porting (Phase 1)**: 
   - Replaced `web/src/main.ts` boilerplate with a port of the original raw `index.html`.
   - Reimplemented raw Three.js WebXR hand-tracking (getting joint poses via `xb.core.renderer.xr.getSession()`) and procedural Web Audio API sounds (crackling / roaring).
   - Added TWA-specific auto-enter logic: gated by `getDigitalGoodsService` to bypass the "Enter VR" browser button when launched from the Meta Quest home screen.
7. **Validation**: Confirmed `npm run build` succeeds inside `web/`.

## Current State & Stop Point
- **Status**: The pipeline architecture is complete. The app builds.
- **Progress**: Phase 1 (Scene Setup & Hand-Tracking Flame) is functionally ported to XR Blocks.
- **Next Steps**: 
  1. Complete Vercel deployment (refer to `TODO.md`) to secure a public domain.
  2. Proceed to **Phase 2 (Ritual World-Building & Surface Gestures)** from `PROJECT_PHASES.md` (palm-down raycast, surface material swaps, flash-paper particles).
