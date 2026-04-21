import { requireTrainerSession, getRoster, getTrainerRosterStats } from '@/lib/trainer-data';
import RosterDesktop from './roster-desktop';
import RosterMobile from './roster-mobile';

export const dynamic = 'force-dynamic';

export default async function TrainerRosterPage() {
  const session = await requireTrainerSession();
  const [roster, stats] = await Promise.all([
    getRoster(session.user.id),
    getTrainerRosterStats(session.user.id),
  ]);

  return (
    <>
      <RosterMobile roster={roster} stats={stats} />
      <RosterDesktop roster={roster} stats={stats} />
    </>
  );
}
