/* Schedules → Recurring Ride: the recurring series Maguy assigned to the contractor
   (Medtransport "Approved Recurring Rides" columns) plus the default-driver assignment. */
import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs } from '@/components/ui/tabs';
import { EmptyState, PageHeader, StatCard, formatDate, formatDateLong } from '@/components/shared';
import { DataTable, useTableState, type Column } from '@/components/table/DataTable';
import { TableTabsList, TableTabsTrigger } from '@/components/table/TableTabs';
import { TableActionDropdownItem } from '@/components/table/TableActionDropdown';
import { BulkActionBar } from '@/components/table/BulkActionBar';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RejectDialog } from '@/components/ride-actions';
import { RecurringDetailsSheet, RecurringDriverSelect, RecurringStatusBadge } from '@/components/RecurringDetailsSheet';
import { useDemo } from '@/demo/store';
import {
  canAcceptRecurring,
  canAssignRecurringDriver,
  canRejectRecurring,
  driverCanBeAssigned,
  formatMoney,
  formatRecurrence,
  fullName,
  nextOccurrence,
  occurrencesPerWeek,
} from '@/demo/logic';
import type { RecurringRide } from '@/demo/types';

type Tab = 'active' | 'pending' | 'paused' | 'ended' | 'all';
const TABS: { key: Tab; label: string }[] = [
  { key: 'active', label: 'Active' },
  { key: 'pending', label: 'Pending' },
  { key: 'paused', label: 'Paused' },
  { key: 'ended', label: 'Ended / Rejected' },
  { key: 'all', label: 'All' },
];

export default function RecurringRides() {
  const { recurring, drivers, driverById, today, acceptRecurring, rejectRecurring, assignRecurringDriver } = useDemo();
  const [tab, setTab] = useState<Tab>('active');
  const [openSeries, setOpenSeries] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<RecurringRide | null>(null);
  const table = useTableState(10);

  const byTab = (t: Tab) =>
    recurring.filter((s) =>
      t === 'all' ? true : t === 'ended' ? s.status === 'ended' || s.status === 'rejected' : s.status === t,
    );
  const rows = useMemo(() => byTab(tab).sort((a, b) => a.startDate.localeCompare(b.startDate)), [recurring, tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const active = recurring.filter((s) => s.status === 'active');
  const perWeek = active.reduce((s, x) => s + occurrencesPerWeek(x), 0);
  const weeklyPayable = active.reduce((s, x) => s + occurrencesPerWeek(x) * x.payableAmount, 0);
  const needsDriver = active.filter((s) => !s.driverId).length;

  const selected = rows.filter((s) => table.selected.has(s.id));
  const selAssignable = selected.filter(canAssignRecurringDriver).length;
  const selPending = selected.filter(canAcceptRecurring).length;
  const defer = (fn: () => void) => setTimeout(fn, 0);

  const columns: Column<RecurringRide>[] = [
    {
      id: 'id',
      header: 'Request ID',
      cell: (s) => (
        <button className="font-medium text-primary hover:underline" onClick={() => setOpenSeries(s.id)}>
          {s.requestId}
        </button>
      ),
    },
    {
      id: 'client',
      header: 'Client Name',
      cell: (s) => (
        <>
          <p className="text-headingBlack">{s.patient.name}</p>
          <p className="text-primaryGray">{s.patient.mobility}</p>
        </>
      ),
    },
    {
      id: 'recurrence',
      header: 'Recurrence',
      cell: (s) => (
        <>
          <p className="text-headingBlack">{formatRecurrence(s.days, s.pickupTime)}</p>
          <p className="text-primaryGray">
            {s.tripType} · {occurrencesPerWeek(s)} rides / week
          </p>
        </>
      ),
    },
    { id: 'start', header: 'Start Date', cell: (s) => formatDateLong(s.startDate) },
    { id: 'end', header: 'End Date', cell: (s) => formatDateLong(s.endDate) },
    { id: 'pickup', header: 'Pickup (leg A)', className: 'min-w-[200px] whitespace-normal', cell: (s) => s.pickup },
    { id: 'drop', header: 'Drop off', className: 'min-w-[200px] whitespace-normal', cell: (s) => s.dropoff },
    {
      id: 'driver',
      header: 'Default Driver',
      cell: (s) =>
        canAssignRecurringDriver(s) ? (
          <RecurringDriverSelect series={s} />
        ) : (
          <span className={s.driverId ? 'text-headingBlack' : 'text-primaryGray'}>{fullName(driverById(s.driverId))}</span>
        ),
    },
    {
      id: 'next',
      header: 'Next Ride',
      cell: (s) => {
        const n = nextOccurrence(s, today);
        return n ? formatDate(n) : <span className="text-primaryGray">—</span>;
      },
    },
    {
      id: 'payable',
      header: 'Payable / ride',
      headClassName: 'text-right',
      className: 'text-right font-medium text-brand-green',
      cell: (s) => formatMoney(s.payableAmount),
    },
    { id: 'status', header: 'Status', cell: (s) => <RecurringStatusBadge status={s.status} /> },
  ];

  return (
    <>
      <PageHeader
        title="Recurring Ride"
        description="Standing rides Maguy dispatch assigns to your company on a weekly pattern. Accept the series once and set a default driver; each occurrence lands on your Schedule and Calendar."
      />
      <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
        <StatCard label="Active series" value={active.length} tone="success" />
        <StatCard label="Rides per week" value={perWeek} hint="From active series" />
        <StatCard label="Payable per week" value={formatMoney(weeklyPayable)} hint="Sample values · not a rate card" />
        <StatCard
          label="Series without a driver"
          value={needsDriver}
          tone={needsDriver > 0 ? 'warning' : 'default'}
        />
      </div>

      <Card className="mt-4 p-0 lg:p-0">
        <div className="px-4 pt-3 lg:px-6">
          <Tabs
            value={tab}
            onValueChange={(v) => {
              setTab(v as Tab);
              table.setPage(1);
              table.clearSelection();
            }}
          >
            <TableTabsList containerClassName="mb-0 md:mb-0">
              {TABS.map((t) => (
                <TableTabsTrigger key={t.key} label={t.label} value={t.key} documentCount={byTab(t.key).length} />
              ))}
            </TableTabsList>
          </Tabs>
        </div>
        <BulkActionBar count={table.selected.size} onClear={table.clearSelection}>
          {selPending > 0 && (
            <Button
              variant="greenish"
              className="h-8"
              onClick={() => {
                selected.filter(canAcceptRecurring).forEach((s) => acceptRecurring(s.id));
                table.clearSelection();
              }}
            >
              Accept {selPending}
            </Button>
          )}
          {selAssignable > 0 && (
            <Select
              onValueChange={(v) => {
                selected.filter(canAssignRecurringDriver).forEach((s) => assignRecurringDriver(s.id, v));
                table.clearSelection();
              }}
            >
              <SelectTrigger className="h-8 w-[240px] text-xs" aria-label="Set default driver for selected">
                <SelectValue placeholder={`Set default driver for ${selAssignable} series`} />
              </SelectTrigger>
              <SelectContent>
                {drivers
                  .filter((d) => d.status === 'active')
                  .map((d) => (
                    <SelectItem key={d.id} value={d.id} disabled={!driverCanBeAssigned(d)}>
                      {fullName(d)}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          )}
        </BulkActionBar>
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(s) => s.id}
          table={table}
          actions={(s) => (
            <>
              <TableActionDropdownItem label="View" onSelect={() => defer(() => setOpenSeries(s.id))} />
              <TableActionDropdownItem label="Occurrences" displayLabel="Open in Calendar" link="/schedules/calendar" />
              {canAcceptRecurring(s) && <TableActionDropdownItem label="Accept" onSelect={() => acceptRecurring(s.id)} />}
              {canAssignRecurringDriver(s) && (
                <TableActionDropdownItem
                  label={s.driverId ? 'Reassign' : 'Assign'}
                  displayLabel={s.driverId ? 'Change Default Driver' : 'Assign Default Driver'}
                  onSelect={() => defer(() => setOpenSeries(s.id))}
                />
              )}
              {canRejectRecurring(s) && (
                <TableActionDropdownItem
                  label="Reject"
                  displayLabel={s.status === 'active' ? 'Stop Series' : 'Reject'}
                  destructive
                  onSelect={() => defer(() => setRejecting(s))}
                />
              )}
            </>
          )}
          empty={<EmptyState title="No recurring rides in this view" />}
          footerNote="Per-ride amounts are sample values set by Maguy dispatch; weekly totals multiply them by the recurrence."
        />
      </Card>

      <RejectDialog
        open={!!rejecting}
        onOpenChange={(o) => !o && setRejecting(null)}
        title={rejecting ? `${rejecting.status === 'active' ? 'Stop' : 'Reject'} recurring ride ${rejecting.requestId}?` : ''}
        description={rejecting ? `${rejecting.patient.name} · ${formatRecurrence(rejecting.days, rejecting.pickupTime)}` : undefined}
        onConfirm={(reason) => rejecting && rejectRecurring(rejecting.id, reason)}
      />
      <RecurringDetailsSheet seriesId={openSeries} onOpenChange={(o) => !o && setOpenSeries(null)} />
    </>
  );
}
