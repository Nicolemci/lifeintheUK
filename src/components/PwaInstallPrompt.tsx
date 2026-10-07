import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const DISMISS_KEY = "life-in-the-uk-prep-pwa-install-dismissed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const mediaStandalone = window.matchMedia("(display-mode: standalone)").matches;
  const iosStandalone = Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  return mediaStandalone || iosStandalone;
}

function isIosDevice(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }

  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua);
  const iPadOs = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return iOS || iPadOs;
}

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [iosHelp, setIosHelp] = useState(false);

  useEffect(() => {
    if (isStandaloneDisplay()) {
      return;
    }

    try {
      if (window.localStorage.getItem(DISMISS_KEY) === "1") {
        return;
      }
    } catch {
      // Ignore private browsing / storage failures.
    }

    if (isIosDevice()) {
      setIosHelp(true);
      setVisible(true);
      return;
    }

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  if (!visible) {
    return null;
  }

  const dismiss = () => {
    setVisible(false);
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Ignore storage failures.
    }
  };

  const install = async () => {
    if (!deferredPrompt) {
      return;
    }

    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    dismiss();
  };

  return (
    <aside className="pwa-install-prompt" aria-label="Install app">
      <div className="pwa-install-prompt-copy">
        <strong>Install Life in the UK Prep</strong>
        {iosHelp ? (
          <p>
            On iPhone/iPad: open in Safari, tap <strong>Share</strong>, then{" "}
            <strong>Add to Home Screen</strong>.
          </p>
        ) : (
          <p>Add the app to your home screen for quick access and a full-screen study experience.</p>
        )}
      </div>
      <div className="pwa-install-prompt-actions">
        {deferredPrompt ? (
          <button className="primary-button" type="button" onClick={() => void install()}>
            Install app
          </button>
        ) : (
          <Link className="primary-button" to="/install">
            How to install
          </Link>
        )}
        <button className="ghost-button" type="button" onClick={dismiss}>
          Not now
        </button>
      </div>
    </aside>
  );
}
