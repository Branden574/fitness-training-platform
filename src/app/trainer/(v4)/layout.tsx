import { requireTrainerSession } from '@/lib/trainer-data';
import BiometricGate from '@/components/auth/BiometricGate';

export const dynamic = 'force-dynamic';

export default async function TrainerV4Layout({ children }: { children: React.ReactNode }) {
  await requireTrainerSession();
  return <BiometricGate>{children}</BiometricGate>;
}
