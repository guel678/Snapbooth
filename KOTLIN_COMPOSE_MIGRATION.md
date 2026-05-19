# SnapBooth Kotlin + Jetpack Compose Migration

## Current State

SnapBooth is currently a React 19 + Vite app packaged for Android with Capacitor.

- Web entry point: `src/main.jsx`
- Main app flow, camera capture, editor, export logic, and styles: `src/App.jsx`
- Android shell: `android/app/src/main/java/com/derit/snapbooth/MainActivity.java`
- Android package: `com.derit.snapbooth`
- Capacitor config: `capacitor.config.json`

The current Android app is not a native Kotlin or Jetpack Compose app. It is a native Android wrapper around the bundled web app.

## Existing Functional Areas

- Landing/upload flow
- Browser camera capture through `navigator.mediaDevices.getUserMedia`
- Photo retake flow
- Photo strip editor
- Strip colors, frame styles, effects, captions, and filters
- Canvas-based image export
- PDF generation
- Native save/share through Capacitor Filesystem and Share plugins

## Recommended Migration Strategy

Avoid replacing the whole app in one step. The current app builds successfully, so the safest path is to migrate by feature area while preserving the working Capacitor version as the baseline.

1. Create a separate native Kotlin/Compose app module or branch.
2. Rebuild the UI shell in Compose with Material 3 design tokens.
3. Add CameraX preview and capture.
4. Port photo strip state and editor controls to Kotlin data models.
5. Recreate image processing/export using Android `Bitmap`, `Canvas`, and `PdfDocument`.
6. Add native share/save flows with Android storage and share intents.
7. Compare output quality and user flows against the current React app.
8. Remove Capacitor only after the native app reaches feature parity.

## Native Architecture Target

Suggested package structure:

```text
com.derit.snapbooth
  MainActivity.kt
  ui/
    SnapBoothApp.kt
    screens/
      LandingScreen.kt
      CameraScreen.kt
      EditorScreen.kt
    components/
      PhotoStripPreview.kt
      EditorControls.kt
      ActionButtons.kt
    theme/
      Color.kt
      Theme.kt
      Type.kt
  camera/
    CameraController.kt
  editor/
    PhotoStripState.kt
    PhotoFilter.kt
    StripRenderer.kt
  export/
    ImageExporter.kt
    PdfExporter.kt
    ShareExporter.kt
```

## First Native Milestone

Implemented in `android/app/src/main/java/com/derit/snapbooth`:

- `MainActivity` is now Kotlin.
- Jetpack Compose and Material 3 are enabled.
- The launcher renders a native `SnapBoothApp`.
- Native landing, CameraX capture, and editor preview screens are in place.
- Captured photos are saved to app-private storage and passed into native editor state.
- The existing React/Capacitor implementation remains in the repo for feature parity reference.

Next milestone:

- Port the React editor controls into native Compose controls.
- Implement native image filtering and strip rendering in `editor/StripRenderer.kt`.
- Implement image, PDF, and share output in `export/`.

## Verification Baseline

Before migration work, keep these commands passing:

```bash
npm run build
cd android
gradlew.bat :app:assembleDebug
```
