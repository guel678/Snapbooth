# SnapBooth Google Play Publishing Notes

## Android Build

- App name: SnapBooth
- Package name: `com.derit.snapbooth`
- Web build directory: `dist`
- Android project: `android`
- Minimum SDK: 24
- Target SDK: 36
- Build App Bundle: `npm run android:bundle`
- Release AAB output: `android/app/build/outputs/bundle/release/app-release.aab`

## Store Assets Included

- App icon source: `store-assets/icon-512.png`
- Feature graphic draft: `store-assets/feature-graphic-1024x500.png`

## Play Console Text Draft

Short description:

```text
Create custom photo strips from your camera or gallery.
```

Full description:

```text
SnapBooth is a simple photo strip studio for creating custom photobooth-style strips on your phone.

Take photos with your camera or choose images from your gallery, then customize the strip with colors, filters, frames, captions, and decorative effects. Export your finished strip as an image or PDF and share it with friends.

SnapBooth stores your work locally on your device. Photos are only shared when you choose a share option.
```

## Still Required Before Release

- Create a real public privacy policy URL from `PRIVACY_POLICY.md`.
- Generate real Play Store screenshots from the Android app, not browser screenshots.
- Enroll in Google Play App Signing and configure a release upload key.
- Run closed testing with at least 20 testers for 14 consecutive days.
- Complete the Play Console Data Safety and Content Rating forms.
- Test the full camera to editor to image/PDF share flow on physical Android devices.
