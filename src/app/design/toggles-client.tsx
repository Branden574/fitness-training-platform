'use client';

import { useState } from 'react';
import { Toggle } from '@/components/ui/mf';

export default function TogglesClient() {
  const [notif, setNotif] = useState(true);
  const [autoSwitch, setAutoSwitch] = useState(false);
  return (
    <div className="flex gap-4 items-center">
      <Toggle checked={notif} onChange={setNotif} label="Notifications" />
      <Toggle checked={autoSwitch} onChange={setAutoSwitch} label="Dark auto-switch" />
    </div>
  );
}
