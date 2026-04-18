import { DesktopShell } from '@/components/ui/mf';
import TrainerInboxClient from './inbox-client';

export interface InboxDesktopRailItem {
  id: string;
  name: string | null;
  email: string;
  initials: string;
  lastPreview: string | null;
  unreadFromClient: number;
  lastAt: string | null;
}

export interface InboxDesktopMessage {
  id: string;
  content: string;
  fromMe: boolean;
  at: string;
}

export interface InboxDesktopProps {
  selfId: string;
  rail: InboxDesktopRailItem[];
  activeId: string | null;
  activeName: string | null;
  activeInitials: string;
  initialThread: InboxDesktopMessage[];
  totalUnread: number;
}

export default function InboxDesktop({
  selfId,
  rail,
  activeId,
  activeName,
  activeInitials,
  initialThread,
  totalUnread,
}: InboxDesktopProps) {
  return (
    <div className="hidden md:block">
      <DesktopShell
        role="trainer"
        active="messages"
        title="Inbox"
        breadcrumbs="TRAINER / MESSAGES"
        nav={undefined}
      >
        <TrainerInboxClient
          selfId={selfId}
          rail={rail}
          activeId={activeId}
          activeName={activeName}
          activeInitials={activeInitials}
          initialThread={initialThread}
          totalUnread={totalUnread}
        />
      </DesktopShell>
    </div>
  );
}
