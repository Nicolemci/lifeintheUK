# iOS (Capacitor) readiness

Bundle id: `co.lifeintheukprep.app`  
Open on a Mac: `npm run cap:sync && npm run cap:ios`

## Done in-repo

- `@capacitor/ios` installed; `ios/` project synced
- Safe-area CSS (`viewport-fit=cover` + `env(safe-area-inset-*)`)
- Edge-swipe back enabled via `BridgeViewController` (`allowsBackForwardNavigationGestures`)
- Relative `/api/*` checkout calls rewritten to absolute `https://www.lifeintheukprep.co/api/...`
- API CORS + Stripe return URLs ignore Capacitor `https://localhost`
- App icons / splash generated into `ios/App/App/Assets.xcassets`

## Env vars baked in at `cap sync`

`vite build` (inside `npm run cap:sync`) embeds:

| Variable | Required |
|---|---|
| `VITE_SUPABASE_URL` | yes |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | yes |
| `VITE_SITE_URL` | yes (`https://www.lifeintheukprep.co`) |

Use `.env.production.local` (or Vercel production env) **before** sync. Server-only Stripe / service-role keys stay on Vercel — they are not `VITE_*`.

## Sign in with Apple

Auth is **email + password only** (no Google/Facebook OAuth in the app).  
Apple’s “Sign in with Apple” rule does **not** apply unless you add Google/Facebook login later.

## Icon source warning

`public/icon-512.png` is **512×512**. Apple’s App Store icon needs **1024×1024**.  
We upscaled into `assets/icon.png` for `capacitor-assets`. Replace with a true 1024×1024 master before App Store submission, then:

```bash
npx capacitor-assets generate --ios --iconBackgroundColor '#071f4d' --splashBackgroundColor '#071f4d' --assetPath assets
```

## You still need on a Mac

1. Apple Developer Program membership  
2. Xcode signing (Team) for `co.lifeintheukprep.app`  
3. CocoaPods / SPM resolve once in Xcode  
4. Archive → App Store Connect listing, privacy labels, screenshots  
