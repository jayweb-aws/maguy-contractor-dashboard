/* Vehicles → vehicle View page (Medtransport HR vehicle view: details, compliance dates, driver, rides). */
import { Link, Navigate, useParams } from 'react-router-dom';
import { Pencil } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataViewer, FormNavbar, PageShell } from '@/components/pages';
import { RideStatusBadge, formatDate, formatDateLong } from '@/components/shared';
import { useDemo } from '@/demo/store';
import { ACTIVE_STATUSES, formatTime12, fullName } from '@/demo/logic';
import type { Vehicle } from '@/demo/types';

export const VEHICLE_STATUS: Record<Vehicle['status'], { label: string; variant: 'greenish' | 'yellowish' | 'grayish' }> = {
  active: { label: 'Active', variant: 'greenish' },
  maintenance: { label: 'In Maintenance', variant: 'yellowish' },
  inactive: { label: 'Inactive', variant: 'grayish' },
};

export default function VehicleView() {
  const { id } = useParams();
  const { vehicles, rides, driverById, today } = useDemo();
  const vehicle = vehicles.find((v) => v.id === id);
  if (!vehicle) return <Navigate to="/vehicles" replace />;
  const driver = driverById(vehicle.driverId);
  const inspOverdue = vehicle.inspectionDue < today;
  const upcoming = rides
    .filter((r) => r.vehicleId === vehicle.id && r.date >= today && (r.status === 'assigned' || ACTIVE_STATUSES.includes(r.status)))
    .sort((a, b) => `${a.date} ${a.pickupTime}`.localeCompare(`${b.date} ${b.pickupTime}`));
  const completed = rides.filter((r) => r.vehicleId === vehicle.id && r.status === 'completed');
  const miles = completed.reduce((s, r) => s + r.billableMiles, 0);

  return (
    <PageShell
      nav={
        <FormNavbar
          title={
            <span className="flex items-center gap-3">
              {vehicle.name}
              <Badge variant={VEHICLE_STATUS[vehicle.status].variant} withDot>
                {VEHICLE_STATUS[vehicle.status].label}
              </Badge>
            </span>
          }
          subTitle={`${vehicle.plate} · ${vehicle.type} · ${vehicle.ownership}`}
          backTo="/vehicles"
          hideButtons
        >
          <Button variant="bluish" asChild>
            <Link to={`/vehicles/${vehicle.id}/edit`}>
              <Pencil className="h-4 w-4" /> Edit
            </Link>
          </Button>
        </FormNavbar>
      }
    >
      <div className="mx-auto max-w-[1400px] space-y-10 px-4 py-6 lg:px-6 lg:py-8">
        <div className="grid grid-cols-1 gap-10 border-b border-[#E6EBF3] pb-6 lg:grid-cols-2 lg:pb-10">
          <DataViewer
            title="Vehicle Information"
            record={[
              { label: 'Vehicle', value: vehicle.name },
              { label: 'Plate', value: vehicle.plate },
              { label: 'VIN', value: vehicle.vin ?? '—' },
              { label: 'Type', value: vehicle.type },
              { label: 'Capacity', value: vehicle.capacity },
              { label: 'Ownership', value: <Badge variant={vehicle.ownership === 'Maguy-owned' ? 'bluish' : 'grayish'}>{vehicle.ownership}</Badge> },
              { label: 'Status', value: <Badge variant={VEHICLE_STATUS[vehicle.status].variant} withDot>{VEHICLE_STATUS[vehicle.status].label}</Badge> },
            ]}
          />
          <DataViewer
            title="Compliance"
            record={[
              {
                label: 'Inspection due',
                value: (
                  <span className={inspOverdue ? 'font-medium text-brand-red' : ''}>
                    {formatDateLong(vehicle.inspectionDue)}
                    {inspOverdue && ' · Overdue'}
                  </span>
                ),
              },
              { label: 'Insurance expires', value: formatDateLong(vehicle.insuranceExpires) },
              { label: 'Insurance carried by', value: vehicle.ownership === 'Maguy-owned' ? 'Maguy Medical Transport' : 'Contractor' },
              { label: 'Maintenance', value: vehicle.ownership === 'Maguy-owned' ? 'Maguy fleet team' : 'Contractor' },
              { label: 'Notes', value: vehicle.notes || <span className="text-primaryGray">None</span> },
            ]}
          />
        </div>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
          <DataViewer
            title="Assigned Driver & Usage"
            record={[
              {
                label: 'Driver',
                value: driver ? (
                  <Link to={`/drivers/${driver.id}`} className="text-primary hover:underline">
                    {fullName(driver)}
                  </Link>
                ) : (
                  <span className="text-primaryGray">Unassigned</span>
                ),
              },
              { label: 'Completed rides', value: completed.length },
              { label: 'Billable miles driven', value: miles.toFixed(1) },
              { label: 'Upcoming rides', value: upcoming.length },
            ]}
          />
          <div className="space-y-3">
            <h6 className="text-base font-medium text-headingBlack md:text-lg">Upcoming rides</h6>
            {upcoming.length === 0 ? (
              <p className="text-sm text-primaryGray">No upcoming rides on this vehicle.</p>
            ) : (
              <ul className="divide-y divide-[#E6EBF3] rounded-md border border-[#E6EBF3]">
                {upcoming.slice(0, 8).map((r) => (
                  <li key={r.id} className="flex-between gap-3 px-3 py-2">
                    <div className="min-w-0">
                      <Link to={`/schedules/rides/${r.id}`} className="text-sm text-primary hover:underline">
                        {r.rideNo}
                      </Link>
                      <span className="ml-2 text-sm text-headingBlack">
                        {formatDate(r.date)} {formatTime12(r.pickupTime)}
                      </span>
                      <p className="truncate text-xs text-primaryGray">{r.patient.name} · {r.dropoff}</p>
                    </div>
                    <RideStatusBadge status={r.status} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
