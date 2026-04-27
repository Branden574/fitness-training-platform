import { requireTrainerSession, getRoster, getTrainerRosterStats } from '@/lib/trainer-data';
import WeeklyDigestWidget from '@/components/trainer/WeeklyDigestWidget';
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
      <WeeklyDigestWidget trainerId={session.user.id} />
      <RosterMobile roster={roster} stats={stats} />
      <RosterDesktop roster={roster} stats={stats} />
    </>
  );
}
