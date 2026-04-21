import { requireTrainerSession, getRoster, getTrainerRosterStats } from '@/lib/trainer-data';
import RosterDesktop from './roster-desktop';
import RosterMobile from './roster-mobile';

export const dynamic = 'force-dynamic';

export default async function TrainerRosterPage() {
  const session = await requireTrainerSession();

  // Wrap each data call so the first query to fail surfaces a specific
  // error in Railway logs instead of a generic "Server Components render"
  // digest. Returning empty-state defaults keeps the page rendering for
  // fresh trainers (no clients yet) even if one of the nested prisma
  // includes regresses — trainer UX stays usable while we fix the cause.
  let roster: Awaited<ReturnType<typeof getRoster>> = [];
  let stats: Awaited<ReturnType<typeof getTrainerRosterStats>> = {
    totalClients: 0,
    loggedToday: 0,
    avgAdherence: 0,
    prsThisWeek: 0,
  };
  try {
    roster = await getRoster(session.user.id);
  } catch (err) {
    console.error('[/trainer] getRoster failed for userId=%s:', session.user.id, err);
  }
  try {
    stats = await getTrainerRosterStats(session.user.id);
  } catch (err) {
    console.error(
      '[/trainer] getTrainerRosterStats failed for userId=%s:',
      session.user.id,
      err,
    );
  }

  return (
    <>
      <RosterMobile roster={roster} stats={stats} />
      <RosterDesktop roster={roster} stats={stats} />
    </>
  );
}
