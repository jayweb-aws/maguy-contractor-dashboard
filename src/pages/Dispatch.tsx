/* Dispatch board — Medtransport's admin Dispatch page as the contractor sees it: the same tabs
   (Live / Incoming / Scheduled / Arrived / Picked Up / Completed / Canceled / Open Runs), the
   same top actions, the driver + "no ride in next N min" controls, the Filter menu with
   Account / Patient / Driver / Status / Vehicle Type + Sort, active-filter chips and the same
   column set. Contractor actions (Accept / Reject / Assign) replace Maguy's status select. */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Activity, Building2, Car, Download, FileInput, Maximize2, Minimize2, User } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { EmptyState, PageHeader, RideStatusBadge, formatDate } from '@/components/shared';
import { DataTable, useTableState, type Column } from '@/components/table/DataTable';
import { TableTabsList, TableTabsTrigger } from '@/components/table/TableTabs';
import { ActiveFilters, FilterMenu, type FilterDef } from '@/components/table/FilterMenu';
import { BulkActionBar } from '@/components/table/BulkActionBar';
import { AssignDriverSelect, RejectDialog, RideMenuItems } from '@/components/ride-actions';
import { RideDetailsSheet } from '@/components/RideDetailsSheet';
import { useDemo } from '@/demo/store';
import {
  DISPATCH_TABS,
  RIDE_SORT_OPTIONS,
  RIDE_STATUS_LABEL,
  activeFilterEntries,
  applyRideFilters,
  canAccept,
  canAssignDriver,
  canReject,
  dispatchCounts,
  dispatchTabRides,
  driverCanBeAssigned,
  driversFreeInNext,
  formatTime12,
  fullName,
  type DispatchTab,
  type RideFilters,
  type RideSort,
} from '@/demo/logic';
import type { Ride, RideStatus, Vehicle } from '@/demo/types';
import { NOW_ISO } from '@/demo/data';
import { cn } from '@/lib/utils';

const FILTER_LABEL: Record<keyof RideFilters, string> = {
  search: 'Search',
  driverId: 'Driver',
  accountName: 'Account',
  patientName: 'Patient',
  status: 'Status',
  vehicleType: 'Vehicle Type',
  sort: 'Sort By',
};

export default function Dispatch() {
  const { rides, drivers, vehicles, driverById, vehicleById, today, acceptMany, rejectMany, assignMany } = useDemo();
  const [params, setParams] = useSearchParams();
  const tab = (DISPATCH_TABS.some((t) => t.key === params.get('tab')) ? params.get('tab') : 'live') as DispatchTab;
  const [filters, setFilters] = useState<RideFilters>({});
  const [freeInNext, setFreeInNext] = useState<string | undefined>();
  const [fullscreen, setFullscreen] = useState(false);
  const [openRide, setOpenRide] = useState<string | null>(params.get('ride'));
  const [rejecting, setRejecting] = useState<Ride | null>(null);
  const [bulkRejectOpen, setBulkRejectOpen] = useState(false);
  const table = useTableState(10);

  useEffect(() => {
    const r = params.get('ride');
    if (r) setOpenRide(r);
  }, [params]);

  const counts = useMemo(() => dispatchCounts(rides, today), [rides, today]);
  const rows = useMemo(() => {
    const out = applyRideFilters(dispatchTabRides(rides, tab, today), filters, drivers, vehicles);
    // no explicit sort: finished tabs read newest first, working tabs soonest first
    return !filters.sort && (tab === 'completed' || tab === 'canceled') ? out.reverse() : out;
  }, [rides, tab, today, filters, drivers, vehicles]);

  const setTab = (next: string) => {
    const p = new URLSearchParams(params);
    if (next === 'live') p.delete('tab');
    else p.set('tab', next);
    p.delete('ride');
    setParams(p, { replace: true });
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
    {
      key: 'status',
      label: 'Status',
      icon: Activity,
      options: (Object.keys(RIDE_STATUS_LABEL) as RideStatus[]).map((s) => ({ value: s, label: RIDE_STATUS_LABEL[s] })),
    },
    { key: 'vehicleType', label: 'Vehicle Type', icon: Car, options: vehicleTypes.map((t) => ({ value: t, label: t })) },
  ];

  const chips = activeFilterEntries(filters).map(({ key, value }) => ({
    key,
    label: FILTER_LABEL[key],
    value:
      key === 'driverId'
        ? fullName(driverById(value))
        : key === 'status'
          ? RIDE_STATUS_LABEL[value as RideStatus]
          : key === 'sort'
            ? (RIDE_SORT_OPTIONS.find((o) => o.value === value)?.label ?? value)
            : value,
  }));

  const nowHHMM = NOW_ISO.slice(11, 16);
  const freeDrivers = freeInNext ? driversFreeInNext(drivers, rides, today, nowHHMM, Number(freeInNext)) : [];

  const selectedRides = rows.filter((r) => table.selected.has(r.id));
  const selPending = selectedRides.filter(canAccept).length;
  const selRejectable = selectedRides.filter(canReject).length;
  const selAssignable = selectedRides.filter(canAssignDriver).length;

  const columns: Column<Ride>[] = [
    {
      id: 'account',
      header: 'Account Name',
      className: 'whitespace-normal',
      cell: (r) => <div className="w-[158px] font-medium text-headingBlack">{r.billingAccount}</div>,
    },
    {
      id: 'patient',
      header: 'Patient Name',
      cell: (r) => (
        <button className="text-left font-medium text-primary hover:underline" onClick={() => setOpenRide(r.id)}>
          {r.patient.name}
          <span className="block text-[11px] font-normal text-primaryGray">
            {r.rideNo} · {r.patient.mobility}
          </span>
        </button>
      ),
    },
    {
      id: 'driver',
      header: 'Driver',
      cell: (r) =>
        canAssignDriver(r) ? (
          <AssignDriverSelect ride={r} />
        ) : (
          <span className={r.driverId ? 'text-headingBlack' : 'text-primaryGray'}>{fullName(driverById(r.driverId))}</span>
        ),
    },
    { id: 'status', header: 'Status', cell: (r) => <RideStatusBadge status={r.status} /> },
    {
      id: 'pickup',
      header: <div className="text-center">Pick address</div>,
      className: 'whitespace-normal',
      cell: (r) => (
        <div className="flex min-w-[180px] flex-col items-center text-center">
          <span className="text-primaryBlack">{r.pickup}</span>
          <span className="text-[0.6rem] font-medium text-primary">ODO —</span>
        </div>
      ),
    },
    {
      id: 'drop',
      header: <div className="text-center">Drop address</div>,
      className: 'whitespace-normal',
      cell: (r) => (
        <div className="flex min-w-[180px] flex-col items-center text-center">
          <span className="text-primaryBlack">{r.dropoff}</span>
          <span className="text-[0.6rem] font-medium text-primary">ODO —</span>
        </div>
      ),
    },
    {
      id: 'pickupTime',
      header: 'Pickup time',
      cell: (r) => (
        <div>
          {formatTime12(r.pickupTime)}
          <span className="block text-[11px] text-primaryGray">{formatDate(r.date)}</span>
        </div>
      ),
    },
    { id: 'appt', header: 'Appointment Time', cell: (r) => (r.appointmentTime ? formatTime12(r.appointmentTime) : '-') },
    { id: 'dropTime', header: 'Drop time', cell: (r) => (r.actualDropoffTime ? formatTime12(r.actualDropoffTime) : '-') },
    { id: 'miles', header: 'Miles', cell: (r) => r.billableMiles.toFixed(1) },
    { id: 'vehicleType', header: 'Vehicle type', cell: (r) => vehicleById(r.vehicleId)?.type ?? <span className="text-primaryGray">—</span> },
  ];

  const stub = (what: string) => toast(`${what} is not part of this prototype`, { description: 'Available in the Maguy web app.' });

  return (
    <>
      <PageHeader
        title="Dispatch"
        description="Your copy of Maguy's dispatch board — rides assigned to your company, grouped by status."
      />

      <TooltipProvider delayDuration={200}>
        <div className="mb-6 flex justify-end space-x-4">
          <IconAction label="Full Screen" onClick={() => setFullscreen((f) => !f)}>
            {fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </IconAction>
          <IconAction label="Import CSV" onClick={() => stub('Import CSV')}>
            <FileInput size={16} />
          </IconAction>
          <IconAction label="Export CSV" onClick={() => stub('Export CSV')}>
            <Download size={16} />
          </IconAction>
          <Button className="h-11 rounded-lg text-sm font-medium lg:px-6" onClick={() => stub('Time Slot')}>
            Time Slot
          </Button>
        </div>
      </TooltipProvider>

      <div className="mb-6 items-center justify-between max-xl:space-y-5 xl:flex xl:gap-5">
        <div className="flex-1 items-center justify-between md:order-2 md:flex md:space-x-4">
          <div className="lg:min-w-[200px] xl:min-w-[280px]">
            <Select value={filters.driverId ?? '__all'} onValueChange={(v) => setFilter('driverId', v === '__all' ? undefined : v)}>
              <SelectTrigger className="!min-h-[44px]" aria-label="Select Driver">
                <SelectValue placeholder="Select Driver" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">All drivers</SelectItem>
                {drivers.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {fullName(d)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="items-center gap-3 max-md:mt-4 md:flex">
            <p className="text-primaryGray max-md:mb-2">Drivers No Ride Scheduled in Next:</p>
            <Select value={freeInNext ?? ''} onValueChange={setFreeInNext}>
              <SelectTrigger className="h-11 min-w-[149px] gap-2 md:w-auto" aria-label="Drivers free in next">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="60">60 min</SelectItem>
                <SelectItem value="45">45 min</SelectItem>
                <SelectItem value="30">30 min</SelectItem>
                <SelectItem value="25">25 min</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="items-center justify-between max-md:space-y-5 md:flex md:gap-5">
          <FilterMenu
            search={filters.search}
            onSearch={(q) => setFilter('search', q || undefined)}
            filters={filterDefs}
            value={filters as Record<string, string | undefined>}
            onChange={setFilter}
            sortOptions={RIDE_SORT_OPTIONS}
            sortValue={filters.sort}
            onSortChange={(v) => setFilter('sort', v as RideSort | undefined)}
          />
        </div>
      </div>

      {freeInNext && (
        <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-primaryGray">Free in the next {freeInNext} min:</span>
          {freeDrivers.length === 0 ? (
            <span className="text-primaryGray">no driver</span>
          ) : (
            freeDrivers.map((d) => (
              <Badge key={d.id} variant={driverCanBeAssigned(d) ? 'greenish' : 'grayish'} className="whitespace-nowrap">
                {fullName(d)}
              </Badge>
            ))
          )}
          <button className="text-xs text-primary hover:underline" onClick={() => setFreeInNext(undefined)}>
            clear
          </button>
        </div>
      )}

      <div className={cn(fullscreen && 'fixed inset-0 z-50 overflow-auto bg-gray-50 p-4 md:p-6')}>
        {fullscreen && (
          <div className="mb-4 flex justify-end">
            <Button variant="outline" onClick={() => setFullscreen(false)}>
              <Minimize2 size={16} /> Exit full screen
            </Button>
          </div>
        )}
        <Card className="p-0 lg:p-0">
          <div className="px-4 pt-3 lg:px-6">
            <Tabs value={tab} onValueChange={setTab}>
              <TableTabsList containerClassName="mb-0 md:mb-0">
                {DISPATCH_TABS.map((t) => (
                  <TableTabsTrigger key={t.key} label={t.label} value={t.key} documentCount={counts[t.key]} />
                ))}
              </TableTabsList>
            </Tabs>
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
            <Button variant="outline" className="h-8" onClick={() => stub('Export selected')}>
              <Download className="h-3.5 w-3.5" /> Export {table.selected.size}
            </Button>
          </BulkActionBar>
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(r) => r.id}
            table={table}
            actions={(r) => <RideMenuItems ride={r} onView={setOpenRide} onReject={setRejecting} />}
            empty={
              <EmptyState
                title={chips.length ? 'No rides match these filters' : `Nothing in ${DISPATCH_TABS.find((t) => t.key === tab)?.label}`}
                body={tab === 'incoming' ? 'New assignments from Maguy dispatch will appear here.' : undefined}
              />
            }
            footerNote="Amounts and addresses are sample values set per ride by Maguy dispatch."
          />
        </Card>
      </div>

      <RejectDialog
        open={!!rejecting}
        onOpenChange={(o) => !o && setRejecting(null)}
        title={rejecting ? `Reject ride ${rejecting.rideNo}?` : ''}
        description={rejecting ? `${rejecting.patient.name} · ${rejecting.pickup}` : undefined}
        onConfirm={(reason) => rejecting && rejectMany([rejecting.id], reason)}
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
      <RideDetailsSheet
        rideId={openRide}
        onOpenChange={(o) => {
          if (!o) {
            setOpenRide(null);
            if (params.get('ride')) {
              const p = new URLSearchParams(params);
              p.delete('ride');
              setParams(p, { replace: true });
            }
          }
        }}
      />
    </>
  );
}

function IconAction({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button className="h-11 w-11 text-primary" variant="icon" onClick={onClick} aria-label={label}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
