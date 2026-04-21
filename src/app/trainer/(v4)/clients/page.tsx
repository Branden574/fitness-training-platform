import { redirect } from 'next/navigation';

// Nav previously pointed at /trainer/clients without an index page, so the
// "Client Detail" sidebar entry 404'd. Roster view (at /trainer) is the
// canonical clients list — send bookmarks + stale links there instead of
// making a second listing page that'd drift from the real one.
export default function TrainerClientsIndexPage() {
  redirect('/trainer');
}
