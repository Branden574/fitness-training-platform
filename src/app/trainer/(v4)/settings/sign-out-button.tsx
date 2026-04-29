'use client';

import { signOut } from 'next-auth/react';

// One-click sign out matching DesktopShell's existing pattern. The plain
// /api/auth/signout GET link lands on NextAuth's "are you sure?" confirmation
// page and forces a second click, which is inconsistent with every other
// sign-out site in this codebase.
export default function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: '/auth/signin' })}
      className="mf-btn"
      style={{
        height: 36,
        alignItems: 'center',
        display: 'inline-flex',
      }}
    >
      Sign out
    </button>
  );
}
