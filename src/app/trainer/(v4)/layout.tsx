import { requireTrainerSession } from '@/lib/trainer-data';

export const dynamic = 'force-dynamic';

export default async function TrainerV4Layout({ children }: { children: React.ReactNode }) {
  await requireTrainerSession();
  return <>{children}</>;
}
