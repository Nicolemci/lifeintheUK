# Mobile app (PWA)

**Recommended:** install Life in the UK Prep as a **Progressive Web App** from the website. No Android Studio, Xcode, or app-store account needed.

Open: [https://www.lifeintheukprep.co/install](https://www.lifeintheukprep.co/install)

## Android (Chrome)

1. Open [www.lifeintheukprep.co](https://www.lifeintheukprep.co) in **Chrome**.
2. Tap the menu (**⋮**) → **Install app** or **Add to Home screen**.
3. Confirm. Use the new home-screen icon like a normal app.

## iPhone / iPad (Safari)

1. Open [www.lifeintheukprep.co](https://www.lifeintheukprep.co) in **Safari** (not Chrome).
2. Tap **Share** (square with arrow).
3. Tap **Add to Home Screen** → **Add**.

## What you get

- Full-screen study experience (standalone display)
- Mock tests, topics, progress and Premium on your phone
- Icons and offline caching for built static assets (auth/payments stay online)

## Capacitor / store builds (optional)

Native Play Store / App Store shells still live under `/android` and `/ios` for a future store release. Prefer the PWA above unless you specifically need store distribution.

| Command | What it does |
|---|---|
| `npm run cap:sync` | Build the site and copy it into Android + iOS |
| `npm run cap:android` | Open the Android project in Android Studio |
| `npm run cap:ios` | Open the iOS project in Xcode (**Mac only**) |

See earlier commits / `ANDROID.md` if you resume store packaging later.
