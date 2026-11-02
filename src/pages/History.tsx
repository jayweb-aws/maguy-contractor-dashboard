/* Past rides — mirrors Medtransport contractor "past-rides" columns. */
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Download, User } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState, PageHeader, RideStatusBadge, StatCard, formatDate } from '@/components/shared';
import { DataTable, useTableState, type Column } from '@/components/table/DataTable';
import { ActiveFilters, FilterMenu, type FilterDef } from '@/components/table/FilterMenu';
import { BulkActionBar } from '@/components/table/BulkActionBar';
import { TableActionDropdownItem } from '@/components/table/TableActionDropdown';
import { RideDetailsSheet } from '@/components/RideDetailsSheet';
import { useDemo } from '@/demo/store';
import { RIDE_STATUS_LABEL, formatMoney, formatTime12, fullName, searchRides, sumPayable } from '@/demo/logic';
import type { Ride, RideStatus } from '@/demo/types';

export default function History() {
  const { rides, drivers, driverById, vehicleById, today } = useDemo();
  const [params] = useSearchParams();
  const [filters, setFilters] = useState<{ search?: string; driverId?: string; status?: string }>(() => ({
    driverId: params.get('driver') ?? undefined,
  }));
  const [openRide, setOpenRide] = useState<string | null>(null);
  const table = useTableState(10);

  const past = useMemo(
    () =>
      searchRides(
        rides
          .filter((r) => ['completed', 'rejected', 'cancelled'].includes(r.status) || r.date < today)
          .filter((r) => !filters.driverId || r.driverId === filters.driverId)
          .filter((r) => !filters.status || r.status === filters.status),
        filters.search ?? '',
        drivers,
      ).sort((a, b) => `${b.date} ${b.pickupTime}`.localeCompare(`${a.date} ${a.pickupTime}`)),
    [rides, filters, today, drivers],
  );
  const completed = past.filter((r) => r.status === 'completed');
  const miles = completed.reduce((s, r) => s + r.billableMiles, 0);
  const responded = rides.filter((r) => r.status !== 'pending');
  const acceptance = Math.round((responded.filter((r) => r.status !== 'rejected').length / Math.max(1, responded.length)) * 100);

  const setFilter = (key: string, val: string | undefined) => {
    setFilters((f) => ({ ...f, [key]: val }));
    table.setPage(1);
  };
  const filterDefs: FilterDef[] = [
    { key: 'driverId', label: 'Driver', icon: User, options: drivers.map((d) => ({ value: d.id, label: fullName(d) })) },
    {
      key: 'status',
      label: 'Status',
      options: (['completed', 'rejected', 'cancelled'] as RideStatus[]).map((s) => ({ value: s, label: RIDE_STATUS_LABEL[s] })),
    },
  ];
  const chips = Object.entries(filters)
    .filter(([, v]) => v)
    .map(([key, value]) => ({
      key,
      label: key === 'driverId' ? 'Driver' : key === 'status' ? 'Status' : 'Search',
      value: key === 'driverId' ? fullName(driverById(value)) : key === 'status' ? RIDE_STATUS_LABEL[value as RideStatus] : value!,
    }));

  const columns: Column<Ride>[] = [
    {
      id: 'rideNo',
      header: 'Ride ID',
      cell: (r) => (
        <button className="font-medium text-primary hover:underline" onClick={() => setOpenRide(r.id)}>
          {r.rideNo}
        </button>
      ),
    },
    { id: 'patient', header: 'Patient', cell: (r) => r.patient.name },
    { id: 'driver', header: 'Driver', cell: (r) => fullName(driverById(r.driverId)) },
    { id: 'vehicle', header: 'Vehicle', className: 'text-primaryGray', cell: (r) => vehicleById(r.vehicleId)?.plate ?? '—' },
    {
      id: 'route',
      header: 'Pickup / Drop-off',
      className: 'min-w-[220px] whitespace-normal',
      cell: (r) => (
        <>
          <p className="line-clamp-1">{r.pickup}</p>
          <p className="line-clamp-1 text-primaryGray">{r.dropoff}</p>
        </>
      ),
    },
    {
      id: 'date',
      header: 'Date',
      cell: (r) => (
        <>
          {formatDate(r.date)}
          <p className="text-primaryGray">{formatTime12(r.pickupTime)}</p>
        </>
      ),
    },
    { id: 'actualPickup', header: 'Actual Pickup', cell: (r) => (r.actualPickupTime ? formatTime12(r.actualPickupTime) : '—') },
    { id: 'actualDrop', header: 'Actual Drop-off', cell: (r) => (r.actualDropoffTime ? formatTime12(r.actualDropoffTime) : '—') },
    { id: 'miles', header: 'Miles', headClassName: 'text-right', className: 'text-right', cell: (r) => r.billableMiles.toFixed(1) },
    {
      id: 'payable',
      header: 'Payable',
      headClassName: 'text-right',
      className: 'text-right',
      cell: (r) => (r.status === 'completed' ? formatMoney(r.payableAmount) : <span className="text-primaryGray">—</span>),
    },
    {
      id: 'status',
      header: 'Status',
      cell: (r) => (
        <>
          <RideStatusBadge status={r.status} />
          {r.rejectReason && <p className="mt-1 max-w-[180px] whitespace-normal text-[11px] text-primaryGray">{r.rejectReason}</p>}
        </>
      ),
    },
  ];

  const stub = (what: string) => toast(`${what} is not part of this prototype`);

  return (
    <>
      <PageHeader
        title="Ride History"
        description="Completed, rejected and cancelled rides."
        actions={
          <Button variant="outline" size="boosted" onClick={() => stub('Export CSV')}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
        <StatCard label="Completed" value={completed.length} tone="success" />
        <StatCard label="Billable miles" value={miles.toFixed(1)} />
        <StatCard label="Payable (completed)" value={formatMoney(sumPayable(completed, () => true))} />
        <StatCard label="Acceptance rate" value={`${acceptance}%`} hint="Non-rejected ÷ responded" />
      </div>

      <Card className="mt-4 p-0 lg:p-0">
        <div className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between lg:px-6">
          <h2 className="card-title text-headingBlack">Past rides</h2>
          <div className="lg:w-[420px]">
            <FilterMenu
              search={filters.search}
              onSearch={(q) => setFilter('search', q || undefined)}
              searchPlaceholder="Search ride, patient, address"
              filters={filterDefs}
              value={filters}
              onChange={setFilter}
            />
          </div>
        </div>
        <ActiveFilters chips={chips} onRemove={(k) => setFilter(k, undefined)} onClearAll={() => setFilters({})} className="border-t border-[#E6EBF3] px-4 py-3 lg:px-6" />
        <BulkActionBar count={table.selected.size} onClear={table.clearSelection}>
          <Button variant="outline" className="h-8" onClick={() => stub('Export selected')}>
            <Download className="h-3.5 w-3.5" /> Export {table.selected.size}
          </Button>
        </BulkActionBar>
        <DataTable
          columns={columns}
          rows={past}
          rowKey={(r) => r.id}
          table={table}
          actions={(r) => (
            <>
              <TableActionDropdownItem label="View" link={`/schedules/rides/${r.id}`} />
              <TableActionDropdownItem label="Details" displayLabel="Quick View" onSelect={() => setTimeout(() => setOpenRide(r.id), 0)} />
              <TableActionDropdownItem label="Download" displayLabel="Trip Report (PDF)" onSelect={() => stub('Trip report download')} />
            </>
          )}
          empty={<EmptyState title="No past rides" />}
        />
      </Card>
      <RideDetailsSheet rideId={openRide} onOpenChange={(o) => !o && setOpenRide(null)} />
    </>
  );
}
