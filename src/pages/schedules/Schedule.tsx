/* Schedules → Schedule (Assigned Rides): every ride Maguy dispatch has assigned to the
   contractor, with the Medtransport contractor-schedule columns. */
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Building2, Car, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs } from '@/components/ui/tabs';
import { EmptyState, PageHeader, RideStatusBadge, formatDate } from '@/components/shared';
import { DataTable, useTableState, type Column } from '@/components/table/DataTable';
import { TableTabsList, TableTabsTrigger } from '@/components/table/TableTabs';
import { ActiveFilters, FilterMenu, type FilterDef } from '@/components/table/FilterMenu';
import { BulkActionBar } from '@/components/table/BulkActionBar';
import { AssignDriverSelect, RejectDialog, RideMenuItems, RideRowActions } from '@/components/ride-actions';
import { RideDetailsSheet } from '@/components/RideDetailsSheet';
import { useDemo } from '@/demo/store';
import {
  RIDE_SORT_OPTIONS,
  activeFilterEntries,
  applyRideFilters,
  canAccept,
  canAssignDriver,
  canReject,
  countRides,
  driverCanBeAssigned,
  filterByTab,
  formatMoney,
  formatTime12,
  fullName,
  type RideFilters,
  type RideSort,
  type RideTab,
} from '@/demo/logic';
import type { Ride, Vehicle } from '@/demo/types';

const TABS: { key: RideTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'assigned', label: 'Assigned' },
  { key: 'in-progress', label: 'In Progress' },
  { key: 'completed', label: 'Completed' },
  { key: 'rejected', label: 'Rejected' },
];

const FILTER_LABEL: Record<string, string> = {
  search: 'Search',
  driverId: 'Driver',
  accountName: 'Account',
  patientName: 'Patient',
  vehicleType: 'Vehicle Type',
  sort: 'Sort By',
};

export default function Schedule() {
  const { rides, drivers, vehicles, driverById, vehicleById, acceptAllPending, rejectAllPending, acceptMany, rejectMany, assignMany } =
    useDemo();
  const [params, setParams] = useSearchParams();
  const tab = (TABS.some((t) => t.key === params.get('tab')) ? params.get('tab') : 'all') as RideTab;
  const [filters, setFilters] = useState<RideFilters>({});
  const [rejectAllOpen, setRejectAllOpen] = useState(false);
  const [bulkRejectOpen, setBulkRejectOpen] = useState(false);
  const [rejecting, setRejecting] = useState<Ride | null>(null);
  const [openRide, setOpenRide] = useState<string | null>(params.get('ride'));
  const table = useTableState(10);

  useEffect(() => {
    const r = params.get('ride');
    if (r) setOpenRide(r);
  }, [params]);

  const counts = useMemo(() => countRides(rides), [rides]);
  const rows = useMemo(() => {
    const out = applyRideFilters(filterByTab(rides, tab), filters, drivers, vehicles);
    // no explicit sort: history-heavy tabs read newest first, working tabs soonest first
    return !filters.sort && (tab === 'all' || tab === 'completed' || tab === 'rejected') ? out.reverse() : out;
  }, [rides, tab, filters, drivers, vehicles]);

  const tabCount = (key: RideTab) =>
    ({
      all: counts.total,
      pending: counts.pending,
      accepted: counts.accepted,
      assigned: counts.assigned,
      'in-progress': counts.inProgress,
      completed: counts.completed,
      rejected: counts.rejected + counts.cancelled,
    })[key];

  const setTab = (v: string) => {
    const next = new URLSearchParams(params);
    if (v === 'all') next.delete('tab');
    else next.set('tab', v);
    next.delete('ride');
    setParams(next, { replace: true });
    table.setPage(1);
    table.clearSelection();
  };
  const setFilter = (key: string, val: string | undefined) => {
    setFilters((f) => ({ ...f, [key]: val }));
    table.setPage(1);
  };

  const accounts = useMemo(() => [...new Set(rides.map((r) => r.billingAccount))].sort(), [rides]);
  const patients = useMemo(() => [...new Set(rides.map((r) => r.patient.name))].sort(), [rides]);
  const vehicleTypes = useMemo(() => [...new Set(vehicles.map((v) => v.type))].sort() as Vehicle['type'][], [vehicles]);
  const filterDefs: FilterDef[] = [
    { key: 'accountName', label: 'Account Name', icon: Building2, options: accounts.map((a) => ({ value: a, label: a })) },
    { key: 'patientName', label: 'Patient Name', icon: User, options: patients.map((p) => ({ value: p, label: p })) },
    { key: 'driverId', label: 'Driver', icon: User, options: drivers.map((d) => ({ value: d.id, label: fullName(d) })) },
    { key: 'vehicleType', label: 'Vehicle Type', icon: Car, options: vehicleTypes.map((t) => ({ value: t, label: t })) },
  ];
  const chips = activeFilterEntries(filters).map(({ key, value }) => ({
    key,
    label: FILTER_LABEL[key] ?? key,
    value:
      key === 'driverId'
        ? fullName(driverById(value))
        : key === 'sort'
          ? (RIDE_SORT_OPTIONS.find((o) => o.value === value)?.label ?? value)
          : value,
  }));

  const selectedRides = rows.filter((r) => table.selected.has(r.id));
  const selPending = selectedRides.filter(canAccept).length;
  const selRejectable = selectedRides.filter(canReject).length;
  const selAssignable = selectedRides.filter(canAssignDriver).length;

  const columns: Column<Ride>[] = [
    {
      id: 'rideNo',
      header: 'Ride ID',
      cell: (r) => (
        <>
          <button className="font-medium text-primary hover:underline" onClick={() => setOpenRide(r.id)}>
            {r.rideNo}
          </button>
          {r.tripType === 'Round trip' && <p className="text-[11px] text-primaryGray">Round trip</p>}
          {r.recurringId && <p className="text-[11px] text-primaryGray">Recurring</p>}
        </>
      ),
    },
    {
      id: 'when',
      header: 'Date / Time',
      cell: (r) => (
        <>
          <p className="text-headingBlack">{formatDate(r.date)}</p>
          <p className="text-primaryGray">{formatTime12(r.pickupTime)}</p>
        </>
      ),
    },
    {
      id: 'client',
      header: 'Client',
      cell: (r) => (
        <>
          <p className="text-headingBlack">{r.patient.name}</p>
          <p className="text-primaryGray">{r.patient.mobility}</p>
        </>
      ),
    },
    {
      id: 'route',
      header: 'Pickup → Drop-off',
      className: 'min-w-[240px] whitespace-normal',
      cell: (r) => (
        <>
          <p className="line-clamp-1 text-headingBlack">{r.pickup}</p>
          <p className="line-clamp-1 text-primaryGray">{r.dropoff}</p>
        </>
      ),
    },
    {
      id: 'driver',
      header: 'Driver',
      cell: (r) => {
        const drv = driverById(r.driverId);
        return canAssignDriver(r) ? (
          <AssignDriverSelect ride={r} />
        ) : (
          <span className={drv ? 'text-headingBlack' : 'text-primaryGray'}>{fullName(drv)}</span>
        );
      },
    },
    { id: 'vehicle', header: 'Vehicle', className: 'text-primaryGray', cell: (r) => vehicleById(r.vehicleId)?.plate ?? '—' },
    { id: 'miles', header: 'Billable Miles', headClassName: 'text-right', className: 'text-right', cell: (r) => r.billableMiles.toFixed(1) },
    { id: 'billable', header: 'Billable Amt', headClassName: 'text-right', className: 'text-right', cell: (r) => formatMoney(r.billableAmount) },
    { id: 'commission', header: 'Commission', headClassName: 'text-right', className: 'text-right', cell: (r) => `${r.commissionPct}%` },
    { id: 'pickupCharge', header: 'Pick Up Charge', headClassName: 'text-right', className: 'text-right', cell: (r) => formatMoney(r.pickUpCharge) },
    {
      id: 'payable',
      header: 'Payable Amt',
      headClassName: 'text-right',
      className: 'text-right font-medium text-brand-green',
      cell: (r) => formatMoney(r.payableAmount),
    },
    {
      id: 'account',
      header: 'Billing Account',
      cell: (r) => (
        <>
          <p className="text-headingBlack">{r.billingAccount}</p>
          <p className="text-primaryGray">{r.fundingSource}</p>
        </>
      ),
    },
    { id: 'status', header: 'Status', cell: (r) => <RideStatusBadge status={r.status} /> },
    { id: 'action', header: 'Action', cell: (r) => <RideRowActions ride={r} compact /> },
  ];

  return (
    <>
      <PageHeader
        title="Schedule"
        description="Assigned Rides — every ride Maguy dispatch has assigned to your company. Accept or reject each one, then assign your driver."
        actions={
          counts.pending > 0 && (
            <>
              <Button variant="outline-reddish" size="boosted" onClick={() => setRejectAllOpen(true)}>
                Reject All
              </Button>
              <Button variant="greenish" size="boosted" onClick={acceptAllPending}>
                Accept All ({counts.pending})
              </Button>
            </>
          )
        }
      />

      <Card className="p-0 lg:p-0">
        <div className="flex flex-col gap-3 px-4 pt-3 lg:px-6">
          <Tabs value={tab} onValueChange={setTab}>
            <TableTabsList containerClassName="mb-0 md:mb-0">
              {TABS.map((t) => (
                <TableTabsTrigger key={t.key} label={t.label} value={t.key} documentCount={tabCount(t.key)} />
              ))}
            </TableTabsList>
          </Tabs>
          <div className="pb-3 lg:ml-auto lg:w-[480px]">
            <FilterMenu
              search={filters.search}
              onSearch={(q) => setFilter('search', q || undefined)}
              searchPlaceholder="Search ride, patient, driver, address"
              filters={filterDefs}
              value={filters as Record<string, string | undefined>}
              onChange={setFilter}
              sortOptions={RIDE_SORT_OPTIONS}
              sortValue={filters.sort}
              onSortChange={(v) => setFilter('sort', v as RideSort | undefined)}
            />
          </div>
        </div>
        <ActiveFilters
          chips={chips}
          onRemove={(k) => setFilter(k, undefined)}
          onClearAll={() => setFilters({})}
          className="border-t border-[#E6EBF3] px-4 py-3 lg:px-6"
        />
        <BulkActionBar count={table.selected.size} onClear={table.clearSelection}>
          {selPending > 0 && (
            <Button
              variant="greenish"
              className="h-8"
              onClick={() => {
                acceptMany([...table.selected]);
                table.clearSelection();
              }}
            >
              Accept {selPending}
            </Button>
          )}
          {selRejectable > 0 && (
            <Button variant="outline-reddish" className="h-8" onClick={() => setBulkRejectOpen(true)}>
              Reject {selRejectable}
            </Button>
          )}
          {selAssignable > 0 && (
            <Select
              onValueChange={(v) => {
                assignMany([...table.selected], v);
                table.clearSelection();
              }}
            >
              <SelectTrigger className="h-8 w-[220px] text-xs" aria-label="Assign driver to selected">
                <SelectValue placeholder={`Assign driver to ${selAssignable} ride${selAssignable === 1 ? '' : 's'}`} />
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
          rowKey={(r) => r.id}
          table={table}
          actions={(r) => <RideMenuItems ride={r} onView={setOpenRide} onReject={setRejecting} />}
          empty={
            <EmptyState
              title={chips.length ? 'No rides match these filters' : 'No rides in this view'}
              body={tab === 'pending' ? 'New assignments from Maguy dispatch will appear here.' : undefined}
            />
          }
          footerNote="Amounts are sample values set per ride by Maguy dispatch."
        />
      </Card>

      <RejectDialog
        open={rejectAllOpen}
        onOpenChange={setRejectAllOpen}
        title={`Reject all ${counts.pending} pending rides?`}
        description="The same reason is sent to Maguy dispatch for every ride."
        onConfirm={rejectAllPending}
      />
      <RejectDialog
        open={bulkRejectOpen}
        onOpenChange={setBulkRejectOpen}
        title={`Reject ${selRejectable} selected ride${selRejectable === 1 ? '' : 's'}?`}
        description="The same reason is sent to Maguy dispatch for every ride."
        onConfirm={(reason) => {
          rejectMany([...table.selected], reason);
          table.clearSelection();
        }}
      />
      <RejectDialog
        open={!!rejecting}
        onOpenChange={(o) => !o && setRejecting(null)}
        title={rejecting ? `Reject ride ${rejecting.rideNo}?` : ''}
        description={rejecting ? `${rejecting.patient.name} · ${rejecting.pickup}` : undefined}
        onConfirm={(reason) => rejecting && rejectMany([rejecting.id], reason)}
      />
      <RideDetailsSheet
        rideId={openRide}
        onOpenChange={(o) => {
          if (!o) {
            setOpenRide(null);
            if (params.get('ride')) {
              const next = new URLSearchParams(params);
              next.delete('ride');
              setParams(next, { replace: true });
            }
          }
        }}
      />
    </>
  );
}
