import { redirect } from 'next/navigation';

// The old /register-with-code page was a 321-line purple-gradient component
// that pre-dated the v4 design system + had its own copy of auth / invite-
// validation logic. It's been replaced by the unified /auth/signup flow,
// which already accepts invite codes and ships with the current design.
// Redirect so any bookmarked links + any stale in-app link still lands users
// on the right page.
//
// Deleting outright would 404 redeemers mid-onboarding — redirecting is
// safer. When 30 days of traffic logs show this route has no direct visits,
// the file can be deleted.
export default function RegisterWithCodeLegacyRedirect() {
  redirect('/auth/signup');
}
