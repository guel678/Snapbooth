# SnapBooth

SnapBooth is a custom photo strip studio for capturing, editing, exporting, and sharing photobooth-style strips.

The project currently includes:

- A React 19 + Vite web app
- A Capacitor Android wrapper
- A native Kotlin + Jetpack Compose migration slice with CameraX capture

## Features

- Capture photos from the camera
- Upload image files
- Build a multi-frame photo strip
- Customize strip color, border style, rounded corners, effects, caption, font, and filters
- Export as image or PDF
- Save and share through native Android integrations
- Native Compose prototype with CameraX preview/capture and editor preview

## Tech Stack

- React 19
- Vite 8
- Capacitor 8
- Android Gradle Plugin 8.13
- Kotlin 2.2
- Jetpack Compose Material 3
- CameraX

## Project Structure

```text
src/
  App.jsx              React app, photo editor, camera, export logic
  main.jsx             Web entry point

android/
  app/                 Android app wrapper and native migration code

public/
  backgrounds/         Web background assets
  fonts/               Web font assets
  logo/                App logo assets

store-assets/          Play Store artwork
```

## Getting Started

Install dependencies:

```bash
npm install
```

Run the web app locally:

```bash
npm run dev
```

Build the web app:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Android

Sync the web build into Android:

```bash
npm run android:sync
```

Build a debug APK:

```bash
cd android
gradlew.bat :app:assembleDebug
```

Build a release bundle:

```bash
npm run android:bundle
```

## Native Kotlin + Compose Migration

The native Android migration has started. The app now includes a Kotlin `MainActivity`, Compose screens, Material 3 theme tokens, and CameraX capture that saves photos to app-private storage.

See [KOTLIN_COMPOSE_MIGRATION.md](KOTLIN_COMPOSE_MIGRATION.md) for the migration plan and current milestone status.

## Play Store Docs

- [Play Store Notes](PLAY_STORE.md)
- [Privacy Policy](PRIVACY_POLICY.md)

## Repository Notes

Generated folders such as `node_modules`, `dist`, Android build outputs, local SDK settings, and generated Capacitor assets are ignored.
