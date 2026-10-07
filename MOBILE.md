# Mobile apps (Capacitor)

This Vite + React site is wrapped for the **Google Play Store** and **Apple App Store** with Capacitor.

| | |
|---|---|
| App ID | `co.lifeintheukprep.app` |
| App name | Life in the UK Prep |
| Android project | `/android` |
| iOS project | `/ios` |

## Scripts

| Command | What it does |
|---|---|
| `npm run cap:sync` | Build the website into `dist/`, then copy it into Android + iOS |
| `npm run cap:android` | Open the Android project in Android Studio |
| `npm run cap:ios` | Open the iOS project in Xcode (**Mac only**) |
| `npm run cap:build:android` | Sync + build a debug APK |

## One-time machine setup

### Android (Windows, Mac, or Linux)

1. Install [Android Studio](https://developer.android.com/studio) with an Android SDK and an emulator (or use a USB phone with USB debugging).
2. In this repo (from the project root, not only the `android/` folder):

```bash
npm install
npm run cap:sync
npm run cap:android
```

3. In Android Studio: wait for Gradle sync → choose emulator/device → **Run**.

If Android Studio shows **“Web assets have not been copied to Android assets yet”**, the website build was never synced into `android/`. Close the app, run `npm run cap:sync` from the repo root, then **Run** again. After this change, a fresh pull also includes those assets so Studio can open without a sync first — but you still need sync after any website change.

### iOS (Mac only)

Apple requires a Mac with Xcode to build and submit iOS apps.

1. Install [Xcode](https://developer.apple.com/xcode/) from the Mac App Store and open it once to accept the license.
2. Install CocoaPods if needed: `sudo gem install cocoapods`
3. In this repo:

```bash
npm install
npm run cap:sync
npm run cap:ios
```

4. In Xcode: select a simulator or your iPhone → **Run**.

## After any website change

```bash
npm run cap:sync
```

Then Run again from Android Studio / Xcode.

## Debug APK (Android)

```bash
npm run cap:build:android
```

APK path:

`android/app/build/outputs/apk/debug/app-debug.apk`

```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

## Store release checklist

### Both platforms

- Build with production env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SITE_URL=https://www.lifeintheukprep.co`, etc.) because Capacitor ships the built `dist/` files.
- In Supabase **Authentication → URL Configuration**, keep:
  - Site URL: `https://www.lifeintheukprep.co`
  - Redirect URLs including `https://www.lifeintheukprep.co/reset-password`
- Test login, password reset, Stripe Checkout, and Premium unlock inside the native app.

### Google Play

1. Create a Play Console app for `co.lifeintheukprep.app`.
2. In Android Studio: **Build → Generate Signed Bundle / APK** → Android App Bundle (`.aab`).
3. Create a release keystore (keep it safe; not committed to git).
4. Upload the `.aab`, complete store listing, content rating, and privacy policy (`https://www.lifeintheukprep.co/privacy`).

### Apple App Store

1. Enroll in the [Apple Developer Program](https://developer.apple.com/programs/).
2. In App Store Connect, create an app with bundle id `co.lifeintheukprep.app`.
3. In Xcode: set your Team signing → **Product → Archive** → Distribute to App Store Connect.
4. Complete listing, privacy nutrition labels, and review screenshots.

## Notes

- `android/local.properties` is machine-specific (SDK path) and is gitignored.
- iOS cannot be compiled on this cloud Linux environment; generate/sync the `ios/` folder here, then open it on a Mac.
- The website PWA (“Add to Home Screen”) still works separately and does not replace store apps.
