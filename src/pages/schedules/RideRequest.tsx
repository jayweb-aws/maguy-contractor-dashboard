/* Schedules → Ride Request: what Maguy has sent and is waiting on. Two tabs like Medtransport's
   ride-request layout — Trip Requests (single rides) and Recurring Ride Request (series). */
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs } from '@/components/ui/tabs';
import { EmptyState, PageHeader, RideStatusBadge, StatCard, formatDate, formatDateLong, formatDateTime } from '@/components/shared';
import { DataTable, useTableState, type Column } from '@/components/table/DataTable';
import { TableTabsList, TableTabsTrigger } from '@/components/table/TableTabs';
import { TableActionDropdownItem } from '@/components/table/TableActionDropdown';
import { BulkActionBar } from '@/components/table/BulkActionBar';
import { RejectDialog, RideMenuItems } from '@/components/ride-actions';
import { RideDetailsSheet } from '@/components/RideDetailsSheet';
import { RecurringDetailsSheet, RecurringStatusBadge } from '@/components/RecurringDetailsSheet';
import { useDemo } from '@/demo/store';
import {
  canAcceptRecurring,
  canRejectRecurring,
  formatMoney,
  formatRecurrence,
  formatTime12,
  occurrencesPerWeek,
  pendingByDeadline,
  sumPayable,
} from '@/demo/logic';
import type { RecurringRide, Ride } from '@/demo/types';

type Tab = 'trip-requests' | 'recurring-requests';

export default function RideRequest() {
  const { rides, recurring, acceptAllPending, rejectAllPending, acceptMany, rejectMany, acceptRecurring, rejectRecurring } = useDemo();
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get('tab') === 'recurring-requests' ? 'recurring-requests' : 'trip-requests';
  const tripTable = useTableState(10);
  const recTable = useTableState(10);
  const [openRide, setOpenRide] = useState<string | null>(null);
  const [openSeries, setOpenSeries] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<Ride | null>(null);
  const [rejectingSeries, setRejectingSeries] = useState<RecurringRide | null>(null);
  const [bulkOpen, setBulkOpen] = useState<'trip' | 'recurring' | 'all' | null>(null);

  const tripRows = useMemo(() => pendingByDeadline(rides), [rides]);
  const recRows = useMemo(
    () => recurring.filter((s) => s.status === 'pending').sort((a, b) => (a.respondBy ?? '').localeCompare(b.respondBy ?? '')),
    [recurring],
  );
  const payableIfAccepted = sumPayable(tripRows, () => true);

  const setTab = (v: string) => {
    const p = new URLSearchParams(params);
    if (v === 'trip-requests') p.delete('tab');
    else p.set('tab', v);
    setParams(p, { replace: true });
  };

  const tripColumns: Column<Ride>[] = [
    {
      id: 'id',
      header: 'Request ID',
      cell: (r) => (
        <button className="font-medium text-primary hover:underline" onClick={() => setOpenRide(r.id)}>
          {r.rideNo}
        </button>
      ),
    },
    {
      id: 'client',
      header: 'Client Name',
      cell: (r) => (
        <>
          <p className="text-headingBlack">{r.patient.name}</p>
          <p className="text-primaryGray">
            {r.patient.mobility}
            {r.tripType === 'Round trip' && ' · Round trip'}
          </p>
        </>
      ),
    },
    {
      id: 'appt',
      header: 'Appointment date/time',
      cell: (r) => (
        <>
          <p className="text-headingBlack">{formatDate(r.date)}</p>
          <p className="text-primaryGray">
            Pickup {formatTime12(r.pickupTime)}
            {r.appointmentTime && ` · Appt ${formatTime12(r.appointmentTime)}`}
          </p>
        </>
      ),
    },
    { id: 'pickup', header: 'Pick address', className: 'min-w-[200px] whitespace-normal', cell: (r) => r.pickup },
    { id: 'dest', header: 'Destination', className: 'min-w-[200px] whitespace-normal', cell: (r) => r.dropoff },
    { id: 'phone', header: 'Phone', cell: (r) => r.patient.phone },
    {
      id: 'payable',
      header: 'Payable Amt',
      headClassName: 'text-right',
      className: 'text-right font-medium text-brand-green',
      cell: (r) => formatMoney(r.payableAmount),
    },
    { id: 'respond', header: 'Respond By', className: 'text-[#726D41]', cell: (r) => formatDateTime(r.respondBy) },
    { id: 'status', header: 'Status', cell: (r) => <RideStatusBadge status={r.status} /> },
  ];

  const recColumns: Column<RecurringRide>[] = [
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
      id: 'payable',
      header: 'Payable / ride',
      headClassName: 'text-right',
      className: 'text-right font-medium text-brand-green',
      cell: (s) => formatMoney(s.payableAmount),
    },
    { id: 'respond', header: 'Respond By', className: 'text-[#726D41]', cell: (s) => (s.respondBy ? formatDateTime(s.respondBy) : '—') },
    { id: 'status', header: 'Status', cell: (s) => <RecurringStatusBadge status={s.status} /> },
  ];

  const selTrip = [...tripTable.selected];
  const selRec = [...recTable.selected];
  const defer = (fn: () => void) => setTimeout(fn, 0);

  return (
    <>
      <PageHeader
        title="Ride Request"
        description="Rides and recurring series Maguy dispatch has offered your company. Accept to add them to your schedule, or reject with a reason."
        actions={
          tab === 'trip-requests' && tripRows.length > 0 ? (
            <>
              <Button variant="outline-reddish" size="boosted" onClick={() => setBulkOpen('all')}>
                Reject All
              </Button>
              <Button variant="greenish" size="boosted" onClick={acceptAllPending}>
                Accept All ({tripRows.length})
              </Button>
            </>
          ) : undefined
        }
      />

      <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
        <StatCard label="Trip requests" value={tripRows.length} tone={tripRows.length > 0 ? 'warning' : 'default'} hint="Respond before the deadline" />
        <StatCard label="Recurring requests" value={recRows.length} tone={recRows.length > 0 ? 'warning' : 'default'} />
        <StatCard label="Payable if all accepted" value={formatMoney(payableIfAccepted)} hint="Trip requests only" />
        <StatCard
          label="Earliest deadline"
          value={tripRows[0] ? formatDateTime(tripRows[0].respondBy).replace(',', '') : '—'}
          hint={tripRows[0]?.rideNo}
        />
      </div>

      <Card className="mt-4 p-0 lg:p-0">
        <div className="px-4 pt-3 lg:px-6">
          <Tabs value={tab} onValueChange={setTab}>
            <TableTabsList containerClassName="mb-0 md:mb-0">
              <TableTabsTrigger label="Trip Requests" value="trip-requests" documentCount={tripRows.length} />
              <TableTabsTrigger label="Recurring Ride Request" value="recurring-requests" documentCount={recRows.length} />
            </TableTabsList>
          </Tabs>
        </div>

        {tab === 'trip-requests' ? (
          <>
            <BulkActionBar count={tripTable.selected.size} onClear={tripTable.clearSelection}>
              <Button
                variant="greenish"
                className="h-8"
                onClick={() => {
                  acceptMany(selTrip);
                  tripTable.clearSelection();
                }}
              >
                Accept {selTrip.length}
              </Button>
              <Button variant="outline-reddish" className="h-8" onClick={() => setBulkOpen('trip')}>
                Reject {selTrip.length}
              </Button>
            </BulkActionBar>
            <DataTable
              columns={tripColumns}
              rows={tripRows}
              rowKey={(r) => r.id}
              table={tripTable}
              actions={(r) => <RideMenuItems ride={r} onView={setOpenRide} onReject={setRejecting} />}
              empty={<EmptyState title="No trip requests waiting" body="New assignments from Maguy dispatch will appear here." />}
            />
          </>
        ) : (
          <>
            <BulkActionBar count={recTable.selected.size} onClear={recTable.clearSelection}>
              <Button
                variant="greenish"
                className="h-8"
                onClick={() => {
                  selRec.forEach(acceptRecurring);
                  recTable.clearSelection();
                }}
              >
                Accept {selRec.length}
              </Button>
              <Button variant="outline-reddish" className="h-8" onClick={() => setBulkOpen('recurring')}>
                Reject {selRec.length}
              </Button>
            </BulkActionBar>
            <DataTable
              columns={recColumns}
              rows={recRows}
              rowKey={(s) => s.id}
              table={recTable}
              actions={(s) => (
                <>
                  <TableActionDropdownItem label="View" link={`/schedules/recurring-rides/${s.id}`} />
                  <TableActionDropdownItem label="Details" displayLabel="Quick View" onSelect={() => defer(() => setOpenSeries(s.id))} />
                  {canAcceptRecurring(s) && <TableActionDropdownItem label="Accept" onSelect={() => acceptRecurring(s.id)} />}
                  {canRejectRecurring(s) && (
                    <TableActionDropdownItem label="Reject" destructive onSelect={() => defer(() => setRejectingSeries(s))} />
                  )}
                </>
              )}
              empty={<EmptyState title="No recurring ride requests" body="Series Maguy dispatch offers your company will appear here." />}
            />
          </>
        )}
      </Card>

      <RejectDialog
        open={!!rejecting}
        onOpenChange={(o) => !o && setRejecting(null)}
        title={rejecting ? `Reject ride ${rejecting.rideNo}?` : ''}
        description={rejecting ? `${rejecting.patient.name} · ${rejecting.pickup}` : undefined}
        onConfirm={(reason) => rejecting && rejectMany([rejecting.id], reason)}
      />
      <RejectDialog
        open={!!rejectingSeries}
        onOpenChange={(o) => !o && setRejectingSeries(null)}
        title={rejectingSeries ? `Reject recurring ride ${rejectingSeries.requestId}?` : ''}
        description={rejectingSeries ? `${rejectingSeries.patient.name} · ${formatRecurrence(rejectingSeries.days, rejectingSeries.pickupTime)}` : undefined}
        onConfirm={(reason) => rejectingSeries && rejectRecurring(rejectingSeries.id, reason)}
      />
      <RejectDialog
        open={bulkOpen !== null}
        onOpenChange={(o) => !o && setBulkOpen(null)}
        title={
          bulkOpen === 'all'
            ? `Reject all ${tripRows.length} trip requests?`
            : bulkOpen === 'trip'
              ? `Reject ${selTrip.length} selected request${selTrip.length === 1 ? '' : 's'}?`
              : `Reject ${selRec.length} selected recurring request${selRec.length === 1 ? '' : 's'}?`
        }
        description="The same reason is sent to Maguy dispatch for every request."
        onConfirm={(reason) => {
          if (bulkOpen === 'all') rejectAllPending(reason);
          else if (bulkOpen === 'trip') {
            rejectMany(selTrip, reason);
            tripTable.clearSelection();
          } else {
            selRec.forEach((id) => rejectRecurring(id, reason));
            recTable.clearSelection();
          }
        }}
      />
      <RideDetailsSheet rideId={openRide} onOpenChange={(o) => !o && setOpenRide(null)} />
      <RecurringDetailsSheet seriesId={openSeries} onOpenChange={(o) => !o && setOpenSeries(null)} />
    </>
  );
}
