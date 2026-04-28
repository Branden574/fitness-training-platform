import AuthShell from '@/components/auth/v4/AuthShell';
import SignInFormClient from '@/components/auth/v4/SignInFormClient';

export const metadata = {
  title: 'Sign in · RepLab',
};

export default function SignInPage() {
  return (
    <AuthShell
      eyebrow="WELCOME BACK"
      title="Sign in."
      footer="© REPLAB · V4"
    >
      <SignInFormClient />
    </AuthShell>
  );
}
