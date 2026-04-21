'use client';

import { useEffect } from 'react';
import { registerNativePush } from '@/lib/nativePushClient';

// Mount-once registrar for Capacitor push notifications. Renders nothing.
// On iOS/Android, fires the permission prompt + registration listener and
// POSTs the resulting FCM/APNS token to /api/device-tokens. On plain
// browsers, `registerNativePush` returns immediately.
//
// Separate from PushNotificationPrompt (the web-push prompt UI) because the
// native OS handles its own permission dialog — we don't want a redundant
// in-app rationale on mobile, and on web we do because Chrome's "Allow
// notifications" bubble alone doesn't explain the value prop.

export default function NativePushRegistrar() {
  useEffect(() => {
    void registerNativePush();
  }, []);
  return null;
}
