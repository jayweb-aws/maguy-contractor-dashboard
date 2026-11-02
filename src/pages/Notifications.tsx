import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, ClipboardList, FileWarning, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState, PageHeader, formatDateTime } from '@/components/shared';
import { DataTable, useTableState, type Column } from '@/components/table/DataTable';
import { ActiveFilters, FilterMenu, type FilterDef } from '@/components/table/FilterMenu';
import { BulkActionBar } from '@/components/table/BulkActionBar';
import { TableActionDropdownItem } from '@/components/table/TableActionDropdown';
import { useDemo } from '@/demo/store';
import type { AppNotification, NotificationType } from '@/demo/types';
import { cn } from '@/lib/utils';

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
const TYPE_LABEL: Record<NotificationType, string> = { ride: 'Rides', compliance: 'Compliance', pay: 'Pay', system: 'System' };

export function notificationLink(n: AppNotification) {
  if (n.rideId) return `/schedules?ride=${n.rideId}`;
  if (n.recurringId) return '/schedules/ride-request?tab=recurring-requests';
  if (n.type === 'compliance') return '/documents';
  if (n.type === 'pay') return '/pay-periods';
  return undefined;
}

export default function Notifications() {
  const { notifications, unread, markRead, markReadMany, markAllRead } = useDemo();
  const navigate = useNavigate();
  const [filters, setFilters] = useState<{ search?: string; type?: string; read?: string }>({});
  const table = useTableState(10);

  const rows = useMemo(() => {
    const needle = (filters.search ?? '').trim().toLowerCase();
    return notifications.filter(
      (n) =>
        (!filters.type || n.type === filters.type) &&
        (!filters.read || (filters.read === 'unread' ? !n.read : n.read)) &&
        (!needle || `${n.title} ${n.body}`.toLowerCase().includes(needle)),
    );
  }, [notifications, filters]);

  const setFilter = (key: string, val: string | undefined) => {
    setFilters((f) => ({ ...f, [key]: val }));
    table.setPage(1);
  };
  const filterDefs: FilterDef[] = [
    { key: 'type', label: 'Type', options: (Object.keys(TYPE_LABEL) as NotificationType[]).map((t) => ({ value: t, label: TYPE_LABEL[t] })) },
    { key: 'read', label: 'Read state', options: [{ value: 'unread', label: 'Unread' }, { value: 'read', label: 'Read' }] },
  ];
  const chips = Object.entries(filters)
    .filter(([, v]) => v)
    .map(([key, value]) => ({
      key,
      label: key === 'type' ? 'Type' : key === 'read' ? 'Read state' : 'Search',
      value: key === 'type' ? TYPE_LABEL[value as NotificationType] : value!,
    }));

  const openItem = (n: AppNotification) => {
    markRead(n.id);
    const to = notificationLink(n);
    if (to) navigate(to);
  };

  const columns: Column<AppNotification>[] = [
    {
      id: 'notification',
      header: 'Notification',
      className: 'whitespace-normal',
      cell: (n) => {
        const Icon = ICON[n.type];
        return (
          <div className="flex items-start gap-3">
            <span className={cn('flex-center h-9 w-9 shrink-0 rounded-full', TONE[n.type])}>
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
                <p className={cn('text-sm text-headingBlack', !n.read && 'font-semibold')}>{n.title}</p>
              </div>
              <p className="text-xs text-primaryGray">{n.body}</p>
            </div>
          </div>
        );
      },
    },
    { id: 'type', header: 'Type', cell: (n) => <Badge variant="grayish">{TYPE_LABEL[n.type]}</Badge> },
    { id: 'at', header: 'Received', className: 'text-primaryGray', cell: (n) => formatDateTime(n.at) },
    {
      id: 'link',
      header: 'Related',
      cell: (n) => {
        const to = notificationLink(n);
        return to ? (
          <Link to={to} onClick={() => markRead(n.id)} className="text-primary hover:underline">
            Open
          </Link>
        ) : (
          <span className="text-primaryGray">—</span>
        );
      },
    },
  ];

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
        <div className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between lg:px-6">
          <h2 className="card-title text-headingBlack">Inbox</h2>
          <div className="lg:w-[420px]">
            <FilterMenu
              search={filters.search}
              onSearch={(q) => setFilter('search', q || undefined)}
              searchPlaceholder="Search notifications"
              filters={filterDefs}
              value={filters}
              onChange={setFilter}
            />
          </div>
        </div>
        <ActiveFilters chips={chips} onRemove={(k) => setFilter(k, undefined)} onClearAll={() => setFilters({})} className="border-t border-[#E6EBF3] px-4 py-3 lg:px-6" />
        <BulkActionBar count={table.selected.size} onClear={table.clearSelection}>
          <Button
            variant="outline"
            className="h-8"
            onClick={() => {
              markReadMany([...table.selected]);
              table.clearSelection();
            }}
          >
            <CheckCheck className="h-3.5 w-3.5" /> Mark {table.selected.size} as read
          </Button>
        </BulkActionBar>
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(n) => n.id}
          table={table}
          onRowClick={openItem}
          rowClassName={(n) => (n.read ? undefined : 'bg-primary-muted')}
          actions={(n) => (
            <>
              <TableActionDropdownItem label="View" displayLabel="Open" onSelect={() => setTimeout(() => openItem(n), 0)} />
              <TableActionDropdownItem label="Mark As Read" disabled={n.read} onSelect={() => markRead(n.id)} />
            </>
          )}
          empty={<EmptyState title="No notifications" />}
        />
      </Card>
    </>
  );
}
