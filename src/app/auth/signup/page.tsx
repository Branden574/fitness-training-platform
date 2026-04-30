import { Suspense } from 'react';
import AuthShell from '@/components/auth/v4/AuthShell';
import SignUpFormClient from '@/components/auth/v4/SignUpFormClient';

export const metadata = {
  title: 'Sign up · RepLab',
};

export default function SignUpPage() {
  return (
    <AuthShell
      eyebrow="NEW ACCOUNT"
      title="Claim your spot."
      footer="INVITE-ONLY · CODE REQUIRED"
    >
      {/* Suspense boundary required because SignUpFormClient reads ?code=
          via useSearchParams; otherwise the page can't be statically prerendered. */}
      <Suspense fallback={null}>
        <SignUpFormClient />
      </Suspense>
    </AuthShell>
  );
}
