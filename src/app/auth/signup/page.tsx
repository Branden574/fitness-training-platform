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
      <SignUpFormClient />
    </AuthShell>
  );
}
