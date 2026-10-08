import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "co.lifeintheukprep.app",
  appName: "Life in the UK Prep",
  webDir: "dist",
  server: {
    // Load the live site in the native shell so Android Studio / Cursor
    // can run without a local `npm run cap:sync` (Node is often missing).
    // Bundled assets in android/.../assets/public remain as a fallback
    // when this URL is removed for offline / store builds.
    url: "https://www.lifeintheukprep.co",
    androidScheme: "https",
    iosScheme: "https",
  },
  android: {
    allowMixedContent: false,
    backgroundColor: "#071f4d",
  },
  ios: {
    backgroundColor: "#071f4d",
    contentInset: "automatic",
    preferredContentMode: "mobile",
  },
};

export default config;
