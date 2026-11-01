/* Dispatch board — same columns as Medtransport's contractor schedule table. */
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState, PageHeader, RideStatusBadge, formatDate } from '@/components/shared';
import { AssignDriverSelect, RejectDialog, RideRowActions } from '@/components/ride-actions';
import { RideDetailsSheet } from '@/components/RideDetailsSheet';
import { useDemo } from '@/demo/store';
import {
  countRides,
  filterByTab,
  formatMoney,
  formatTime12,
  fullName,
  searchRides,
  type RideTab,
} from '@/demo/logic';

const TABS: { key: RideTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'assigned', label: 'Assigned' },
  { key: 'in-progress', label: 'In Progress' },
  { key: 'completed', label: 'Completed' },
  { key: 'rejected', label: 'Rejected' },
];

export default function Rides() {
  const { rides, drivers, driverById, vehicleById, acceptAllPending, rejectAllPending } = useDemo();
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as RideTab) || 'all';
  const [q, setQ] = useState('');
  const [rejectAllOpen, setRejectAllOpen] = useState(false);
  const [openRide, setOpenRide] = useState<string | null>(params.get('ride'));

  useEffect(() => {
    const r = params.get('ride');
    if (r) setOpenRide(r);
  }, [params]);

  const counts = useMemo(() => countRides(rides), [rides]);
  const visible = useMemo(() => {
    const open = filterByTab(rides, tab).filter((r) => tab !== 'all' || !['completed', 'rejected', 'cancelled'].includes(r.status) || true);
    return searchRides(open, q, drivers).sort((a, b) =>
      `${a.date} ${a.pickupTime}`.localeCompare(`${b.date} ${b.pickupTime}`),
    );
  }, [rides, tab, q, drivers]);

  const tabCount = (key: RideTab) => {
    switch (key) {
      case 'all':
        return counts.total;
      case 'pending':
        return counts.pending;
      case 'accepted':
        return counts.accepted;
      case 'assigned':
        return counts.assigned;
      case 'in-progress':
        return counts.inProgress;
      case 'completed':
        return counts.completed;
      case 'rejected':
        return counts.rejected + counts.cancelled;
    }
  };

  return (
    <>
      <PageHeader
        title="Rides"
        description="Rides Maguy dispatch has assigned to your company. Accept or reject each one, then assign your driver."
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
        <div className="flex flex-col gap-3 border-b border-[#E6EBF3] px-4 pt-3 lg:flex-row lg:items-center lg:justify-between lg:px-6">
          <Tabs
            value={tab}
            onValueChange={(v) => {
              const next = new URLSearchParams(params);
              if (v === 'all') next.delete('tab');
              else next.set('tab', v);
              next.delete('ride');
              setParams(next, { replace: true });
            }}
          >
            <TabsList className="flex-wrap gap-4">
              {TABS.map((t) => (
                <TabsTrigger key={t.key} value={t.key} className="gap-1.5">
                  {t.label}
                  <span className="rounded-full bg-gray-100 px-1.5 text-[11px] text-primaryGray">{tabCount(t.key)}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="relative pb-3 lg:w-72">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-primaryGray" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search ride, patient, driver, address"
              className="pl-9"
              aria-label="Search rides"
            />
          </div>
        </div>

        {visible.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title={q ? 'No rides match your search' : 'No rides in this view'}
              body={tab === 'pending' ? 'New assignments from Maguy dispatch will appear here.' : undefined}
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">Ride ID</TableHead>
                <TableHead className="whitespace-nowrap">Date / Time</TableHead>
                <TableHead>Client</TableHead>
                <TableHead className="min-w-[240px]">Pickup → Drop-off</TableHead>
                <TableHead className="whitespace-nowrap">Driver</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead className="whitespace-nowrap text-right">Billable Miles</TableHead>
                <TableHead className="whitespace-nowrap text-right">Billable Amt</TableHead>
                <TableHead className="whitespace-nowrap text-right">Commission</TableHead>
                <TableHead className="whitespace-nowrap text-right">Pick Up Charge</TableHead>
                <TableHead className="whitespace-nowrap text-right">Payable Amt</TableHead>
                <TableHead className="whitespace-nowrap">Billing Account</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((r) => {
                const drv = driverById(r.driverId);
                const veh = vehicleById(r.vehicleId);
                return (
                  <TableRow key={r.id} className="text-xs md:text-sm">
                    <TableCell className="whitespace-nowrap">
                      <button className="font-medium text-primary hover:underline" onClick={() => setOpenRide(r.id)}>
                        {r.rideNo}
                      </button>
                      {r.tripType === 'Round trip' && <p className="text-[11px] text-primaryGray">Round trip</p>}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <p className="text-headingBlack">{formatDate(r.date)}</p>
                      <p className="text-primaryGray">{formatTime12(r.pickupTime)}</p>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <p className="text-headingBlack">{r.patient.name}</p>
                      <p className="text-primaryGray">{r.patient.mobility}</p>
                    </TableCell>
                    <TableCell>
                      <p className="line-clamp-1 text-headingBlack">{r.pickup}</p>
                      <p className="line-clamp-1 text-primaryGray">{r.dropoff}</p>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {r.status === 'accepted' || r.status === 'assigned' ? (
                        <AssignDriverSelect ride={r} />
                      ) : (
                        <span className={drv ? 'text-headingBlack' : 'text-primaryGray'}>{fullName(drv)}</span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-primaryGray">{veh ? veh.plate : '—'}</TableCell>
                    <TableCell className="text-right">{r.billableMiles.toFixed(1)}</TableCell>
                    <TableCell className="text-right">{formatMoney(r.billableAmount)}</TableCell>
                    <TableCell className="text-right">{r.commissionPct}%</TableCell>
                    <TableCell className="text-right">{formatMoney(r.pickUpCharge)}</TableCell>
                    <TableCell className="text-right font-medium text-brand-green">{formatMoney(r.payableAmount)}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      <p className="text-headingBlack">{r.billingAccount}</p>
                      <p className="text-primaryGray">{r.fundingSource}</p>
                    </TableCell>
                    <TableCell>
                      <RideStatusBadge status={r.status} />
                    </TableCell>
                    <TableCell>
                      <RideRowActions ride={r} compact />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
        <div className="flex-between border-t border-[#E6EBF3] px-4 py-3 text-xs text-primaryGray lg:px-6">
          <span>
            Showing {visible.length} of {counts.total} rides
          </span>
          <span>Amounts are sample values set per ride by Maguy dispatch</span>
        </div>
      </Card>

      <RejectDialog
        open={rejectAllOpen}
        onOpenChange={setRejectAllOpen}
        title={`Reject all ${counts.pending} pending rides?`}
        description="The same reason is sent to Maguy dispatch for every ride."
        onConfirm={rejectAllPending}
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
