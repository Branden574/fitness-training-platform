import BiometricGate from '@/components/auth/BiometricGate';

export const dynamic = 'force-dynamic';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <BiometricGate>{children}</BiometricGate>;
}
