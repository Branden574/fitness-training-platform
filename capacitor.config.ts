import type { CapacitorConfig } from '@capacitor/cli';

// Martinez/Fitness ships to iOS + Android by wrapping the live Next.js web
// app in a Capacitor WebView. The native shell provides: push notifications,
// camera access for progress photos, biometric sign-in, and the app-store
// distribution channel. Application logic and UI stay in Next.js on Railway
// — updates deploy instantly without a store re-review.
//
// mobile-shell/ holds a minimal offline splash rendered only when the device
// can't reach the remote server; otherwise the WebView loads server.url.

const isDev = process.env.CAPACITOR_DEV === '1';

const config: CapacitorConfig = {
  appId: 'com.martinezfitness.app',
  appName: 'Martinez Fitness',
  webDir: 'mobile-shell',
  bundledWebRuntime: false,
  server: {
    // Live web app. Swap to http://localhost:3000 via CAPACITOR_DEV=1 for
    // in-simulator dev. cleartext is only allowed in dev so localhost works.
    url: isDev ? 'http://localhost:3000' : 'https://martinezfitness559.com',
    cleartext: isDev,
    // Allowed external URLs the WebView is permitted to navigate to outside
    // the primary origin (Stripe checkout, YouTube embeds, trainer-pasted
    // form-video URLs). iOS/Android treat everything else as external and
    // open it in the system browser.
    allowNavigation: [
      'martinezfitness559.com',
      '*.martinezfitness559.com',
      'checkout.stripe.com',
      '*.stripe.com',
      'www.youtube.com',
      'youtube.com',
      'www.youtube-nocookie.com',
      'cdn.jsdelivr.net',
    ],
  },
  ios: {
    contentInset: 'always',
    limitsNavigationsToAppBoundDomains: false,
    // Allow swiping from the left edge to go back — matches native UX
    // expectations. The WebView's history is what the user navigates.
    allowsLinkPreview: false,
    scheme: 'martinezfitness',
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: isDev,
  },
};

export default config;
