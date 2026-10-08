# MagicRealism Invoker - Store Submission TODO

This document tracks the remaining requirements to get the app packaged and published to the Meta Horizon Store via the Trusted Web Activity (TWA) pipeline.

## 1. Domain & PWA Hosting
- [ ] **Deploy to Vercel**: Run `npx vercel deploy --prod` inside the `web/` directory to get a public HTTPS domain.
- [ ] **Update TWA Manifest**: Open `twa/twa-manifest.json` and replace the placeholder `magicrealism-invoker.vercel.app` with your actual Vercel domain.
- [ ] **Generate PWA Icons**: Create real icon PNGs and place them in `web/public/icons/`. (Required: `icon-192.png`, `icon-512.png`, `icon-512-maskable.png` - maskable must be full-bleed with no transparency).
- [ ] **Redeploy**: Deploy to Vercel again so the icons, manifest, and `assetlinks.json` are live on your domain.

## 2. Meta Developer Dashboard
- [ ] **Create App**: Go to [developer.meta.com](https://developer.meta.com/) and create a new App.
- [ ] **Get Horizon App ID**: Copy the numeric App ID from the dashboard and set it as `"applicationId"` in `twa/twa-manifest.json` (replacing `"0"`).
- [ ] **Sign DDA**: Have the organization admin sign the Developer Distribution Agreement (required before first upload).

## 3. Store Assets
- [ ] **App Icon**: 1024x1024 px PNG/JPEG (square, no rounded corners).
- [ ] **Hero Art**: 2560x1440 px PNG/JPEG (landscape, keep text in inner 80% safe area).
- [ ] **Screenshots**: At least 3 screenshots (2560x1440 px) captured directly from the Meta Quest headset.
- [ ] **Descriptions & Metadata**: Write a short description (150 chars max), long description, and provide a Privacy Policy URL.

## 4. Build & Upload
- [ ] **Build APK**: 
  ```bash
  cd twa/
  export BUBBLEWRAP_KEYSTORE_PASSWORD="MetaStart2026!"
  export BUBBLEWRAP_KEY_PASSWORD="MetaStart2026!"
  bubblewrap update
  bubblewrap build
  ```
- [ ] **Sanity Check**: Install the APK to your headset `metavr app install app-release-signed.apk` and ensure it auto-enters the immersive session.
- [ ] **Upload**: Upload using `ovr-platform-util upload-quest-build --app-id <ID> --app-secret <SECRET> --apk app-release-signed.apk --channel ALPHA --age-group MIXED_AGES`.

## 5. VRC (Virtual Reality Check) Compliance
- [ ] **Performance**: Sustained 72 Hz on Quest 2 / 90 Hz on Quest 3.
- [ ] **Permissions**: Ensure no unused Android permissions are requested in the final APK.
- [ ] **Stability**: No crashes or App Not Responding (ANR) during first load or rapid scene transitions.
- [ ] **Entitlement**: App must pass the Meta entitlement check within 10 seconds of launch (handled automatically if `applicationId` is correct).
