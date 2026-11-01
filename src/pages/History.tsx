/* Past rides — mirrors Medtransport contractor "past-rides" columns. */
import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState, PageHeader, RideStatusBadge, StatCard, formatDate } from '@/components/shared';
import { RideDetailsSheet } from '@/components/RideDetailsSheet';
import { useDemo } from '@/demo/store';
import { formatMoney, formatTime12, fullName, sumPayable } from '@/demo/logic';

export default function History() {
  const { rides, drivers, driverById, vehicleById, today } = useDemo();
  const [driverFilter, setDriverFilter] = useState('all');
  const [openRide, setOpenRide] = useState<string | null>(null);

  const past = useMemo(
    () =>
      rides
        .filter((r) => ['completed', 'rejected', 'cancelled'].includes(r.status) || r.date < today)
        .filter((r) => driverFilter === 'all' || r.driverId === driverFilter)
        .sort((a, b) => `${b.date} ${b.pickupTime}`.localeCompare(`${a.date} ${a.pickupTime}`)),
    [rides, driverFilter, today],
  );
  const completed = past.filter((r) => r.status === 'completed');
  const miles = completed.reduce((s, r) => s + r.billableMiles, 0);

  return (
    <>
      <PageHeader title="Ride History" description="Completed, rejected and cancelled rides." />

      <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
        <StatCard label="Completed" value={completed.length} tone="success" />
        <StatCard label="Billable miles" value={miles.toFixed(1)} />
        <StatCard label="Payable (completed)" value={formatMoney(sumPayable(completed, () => true))} />
        <StatCard
          label="Acceptance rate"
          value={`${Math.round((rides.filter((r) => r.status !== 'pending' && r.status !== 'rejected').length / Math.max(1, rides.filter((r) => r.status !== 'pending').length)) * 100)}%`}
          hint="Non-rejected ÷ responded"
        />
      </div>

      <Card className="mt-4 p-0 lg:p-0">
        <div className="flex-between gap-3 border-b border-[#E6EBF3] px-4 py-3 lg:px-6">
          <h2 className="card-title text-headingBlack">Past rides</h2>
          <Select value={driverFilter} onValueChange={setDriverFilter}>
            <SelectTrigger className="h-9 w-[200px]" aria-label="Filter by driver">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All drivers</SelectItem>
              {drivers.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {fullName(d)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {past.length === 0 ? (
          <div className="p-6">
            <EmptyState title="No past rides" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ride ID</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead className="min-w-[220px]">Pickup / Drop-off</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="whitespace-nowrap">Actual Pickup</TableHead>
                <TableHead className="whitespace-nowrap">Actual Drop-off</TableHead>
                <TableHead className="text-right">Miles</TableHead>
                <TableHead className="text-right">Payable</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {past.map((r) => {
                const veh = vehicleById(r.vehicleId);
                return (
                  <TableRow key={r.id} className="text-xs md:text-sm">
                    <TableCell className="whitespace-nowrap">
                      <button className="font-medium text-primary hover:underline" onClick={() => setOpenRide(r.id)}>
                        {r.rideNo}
                      </button>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{r.patient.name}</TableCell>
                    <TableCell className="whitespace-nowrap">{fullName(driverById(r.driverId))}</TableCell>
                    <TableCell className="whitespace-nowrap text-primaryGray">{veh?.plate ?? '—'}</TableCell>
                    <TableCell>
                      <p className="line-clamp-1">{r.pickup}</p>
                      <p className="line-clamp-1 text-primaryGray">{r.dropoff}</p>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(r.date)}
                      <p className="text-primaryGray">{formatTime12(r.pickupTime)}</p>
                    </TableCell>
                    <TableCell>{r.actualPickupTime ? formatTime12(r.actualPickupTime) : '—'}</TableCell>
                    <TableCell>{r.actualDropoffTime ? formatTime12(r.actualDropoffTime) : '—'}</TableCell>
                    <TableCell className="text-right">{r.billableMiles.toFixed(1)}</TableCell>
                    <TableCell className="text-right">
                      {r.status === 'completed' ? formatMoney(r.payableAmount) : <span className="text-primaryGray">—</span>}
                    </TableCell>
                    <TableCell>
                      <RideStatusBadge status={r.status} />
                      {r.rejectReason && <p className="mt-1 max-w-[180px] text-[11px] text-primaryGray">{r.rejectReason}</p>}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
      <RideDetailsSheet rideId={openRide} onOpenChange={(o) => !o && setOpenRide(null)} />
    </>
  );
}
