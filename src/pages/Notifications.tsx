import { Link } from 'react-router-dom';
import { Bell, CheckCheck, ClipboardList, FileWarning, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState, PageHeader, formatDateTime } from '@/components/shared';
import { useDemo } from '@/demo/store';
import type { NotificationType } from '@/demo/types';

const ICON: Record<NotificationType, typeof Bell> = {
  ride: ClipboardList,
  compliance: FileWarning,
  pay: Receipt,
  system: Bell,
};
const TONE: Record<NotificationType, string> = {
  ride: 'bg-primaryHoverMenu text-primary',
  compliance: 'bg-[#FFFACC] text-[#726D41]',
  pay: 'bg-[#DEFFCF] text-[#547544]',
  system: 'bg-gray-100 text-primaryGray',
};

export default function Notifications() {
  const { notifications, unread, markRead, markAllRead } = useDemo();

  return (
    <>
      <PageHeader
        title="Notifications"
        description={unread > 0 ? `${unread} unread` : 'All caught up'}
        actions={
          <Button variant="outline" size="boosted" onClick={markAllRead} disabled={unread === 0}>
            <CheckCheck className="h-4 w-4" /> Mark all as read
          </Button>
        }
      />
      <Card className="p-0 lg:p-0">
        {notifications.length === 0 ? (
          <div className="p-6">
            <EmptyState title="No notifications" />
          </div>
        ) : (
          <ul className="divide-y divide-[#E6EBF3]">
            {notifications.map((n) => {
              const Icon = ICON[n.type];
              const inner = (
                <>
                  <span className={`flex-center h-10 w-10 shrink-0 rounded-full ${TONE[n.type]}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
                      <p className={`truncate text-sm ${n.read ? 'text-headingBlack' : 'font-semibold text-headingBlack'}`}>{n.title}</p>
                    </div>
                    <p className="text-xs text-primaryGray">{n.body}</p>
                  </div>
                  <span className="shrink-0 text-xs text-primaryGray">{formatDateTime(n.at)}</span>
                </>
              );
              return (
                <li key={n.id} className={n.read ? '' : 'bg-primary-muted'}>
                  {n.rideId ? (
                    <Link
                      to={`/rides?ride=${n.rideId}`}
                      onClick={() => markRead(n.id)}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 lg:px-6"
                    >
                      {inner}
                    </Link>
                  ) : (
                    <button
                      onClick={() => markRead(n.id)}
                      className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 lg:px-6"
                    >
                      {inner}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
}
