import ContentPage from "./ContentPage";

export default function InstallAppPage() {
  return (
    <ContentPage
      eyebrow="On your phone"
      title="Install Life in the UK Prep"
      introduction="Add the app to your home screen. No App Store or Play Store needed — it installs from the website in under a minute."
      metaDescription="Install Life in the UK Prep on your phone as a Progressive Web App. Add to Home Screen on Android Chrome or iPhone Safari."
      sections={[
        {
          id: "android",
          title: "Android (Chrome)",
          bullets: [
            "Open https://www.lifeintheukprep.co in Chrome.",
            "Tap the menu (⋮) in the top-right.",
            "Tap Install app or Add to Home screen.",
            "Confirm — the app icon appears on your home screen.",
          ],
        },
        {
          id: "iphone",
          title: "iPhone / iPad (Safari)",
          bullets: [
            "Open https://www.lifeintheukprep.co in Safari (not Chrome).",
            "Tap the Share button (square with an arrow).",
            "Scroll and tap Add to Home Screen.",
            "Tap Add — open it from your home screen like any other app.",
          ],
        },
        {
          id: "why-pwa",
          title: "Why this way?",
          paragraphs: [
            "The site is already an installable Progressive Web App (PWA). You get mock tests, progress tracking and Premium on your phone without Android Studio, Xcode, or store review.",
            "Open the home-screen icon anytime for a full-screen study experience.",
          ],
        },
      ]}
    />
  );
}
