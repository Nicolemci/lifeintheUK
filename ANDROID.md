# Android setup (Capacitor)

This project wraps the Vite web app in a native Android shell with Capacitor.

## What’s already done

- Capacitor installed (`@capacitor/core`, `@capacitor/cli`, `@capacitor/android`)
- Android project in `/android`
- App ID: `co.lifeintheukprep.app`
- Scripts:
  - `npm run cap:sync` — build web app + sync into Android
  - `npm run cap:open` — open project in Android Studio
  - `npm run cap:build:android` — sync + build a debug APK

## On your computer (Android Studio)

1. Install [Android Studio](https://developer.android.com/studio) with Android SDK + an emulator (or use a phone).
2. In the project folder:

```bash
npm install
npm run cap:sync
npm run cap:open
```

3. In Android Studio:
   - Let Gradle sync finish
   - Pick an emulator or USB device
   - Press **Run**

## Rebuild after website changes

```bash
npm run cap:sync
```

Then Run again in Android Studio.

## Build a debug APK from the terminal

```bash
npm run cap:build:android
```

APK path:

`android/app/build/outputs/apk/debug/app-debug.apk`

Install on a phone:

```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

## Notes

- `android/local.properties` is machine-specific (SDK path) and is gitignored.
- Release builds for Play Store need a signing keystore (not included here).
- Env vars used by Vite (`VITE_*`) must be present when you run `cap:sync`, because Capacitor ships the built `dist/` files.
