/* Right-hand drawer with the full ride record, mirroring the dispatch "View" panel. */
import { Clock, MapPin, Phone } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { KeyValue, RideStatusBadge, formatDate, formatDateTime } from '@/components/shared';
import { AssignDriverSelect, RideRowActions } from '@/components/ride-actions';
import { useDemo } from '@/demo/store';
import { canAssignDriver, formatMoney, formatTime12, fullName } from '@/demo/logic';

export function RideDetailsSheet({
  rideId,
  onOpenChange,
}: {
  rideId: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { rideById, driverById, vehicleById } = useDemo();
  const ride = rideById(rideId ?? undefined);
  const driver = driverById(ride?.driverId);
  const vehicle = vehicleById(ride?.vehicleId);

  return (
    <Sheet open={!!rideId} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        {ride && (
          <>
            <SheetHeader className="text-left">
              <div className="flex items-center gap-3">
                <SheetTitle className="text-headingBlack">{ride.rideNo}</SheetTitle>
                <RideStatusBadge status={ride.status} />
              </div>
              <SheetDescription>
                {formatDate(ride.date)} · Pickup {formatTime12(ride.pickupTime)}
                {ride.appointmentTime && ` · Appt ${formatTime12(ride.appointmentTime)}`}
              </SheetDescription>
            </SheetHeader>

            <div className="mt-5 space-y-5 text-sm">
              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-primaryGray">Patient</h3>
                <div className="grid grid-cols-2 gap-3">
                  <KeyValue label="Name" value={ride.patient.name} />
                  <KeyValue label="Mobility" value={ride.patient.mobility} />
                  <KeyValue
                    label="Phone"
                    value={
                      <span className="inline-flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5 text-primaryGray" /> {ride.patient.phone}
                      </span>
                    }
                  />
                  <KeyValue label="Trip" value={ride.tripType} />
                </div>
                {ride.patient.notes && (
                  <p className="rounded-md bg-primaryHoverMenu px-3 py-2 text-xs text-headingBlack">
                    {ride.patient.notes}
                  </p>
                )}
              </section>

              <Separator />

              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-primaryGray">Route</h3>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-green" />
                    <div>
                      <p className="text-xs text-primaryGray">Pickup</p>
                      <p className="text-headingBlack">{ride.pickup}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-red" />
                    <div>
                      <p className="text-xs text-primaryGray">Drop-off</p>
                      <p className="text-headingBlack">{ride.dropoff}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primaryGray" />
                    <p className="text-xs text-primaryGray">
                      {ride.billableMiles.toFixed(1)} billable miles
                      {ride.actualPickupTime && ` · actual pickup ${formatTime12(ride.actualPickupTime)}`}
                      {ride.actualDropoffTime && ` · drop-off ${formatTime12(ride.actualDropoffTime)}`}
                    </p>
                  </div>
                </div>
              </section>

              <Separator />

              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-primaryGray">Billing</h3>
                <div className="grid grid-cols-2 gap-3">
                  <KeyValue label="Funding source" value={ride.fundingSource} />
                  <KeyValue label="Billing account" value={ride.billingAccount} />
                  <KeyValue label="Billable amount" value={formatMoney(ride.billableAmount)} />
                  <KeyValue label="Commission" value={`${ride.commissionPct}%`} />
                  <KeyValue label="Pick up charge" value={formatMoney(ride.pickUpCharge)} />
                  <KeyValue
                    label="Payable to you"
                    value={<span className="font-semibold text-brand-green">{formatMoney(ride.payableAmount)}</span>}
                  />
                </div>
                <p className="text-xs text-primaryGray">
                  Amounts are set by Maguy dispatch when the ride is assigned. Sample figures only.
                </p>
              </section>

              <Separator />

              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-primaryGray">Your driver</h3>
                {canAssignDriver(ride) ? (
                  <AssignDriverSelect ride={ride} size="boosted" />
                ) : (
                  <KeyValue label="Driver" value={fullName(driver)} />
                )}
                {vehicle && (
                  <KeyValue label="Vehicle" value={`${vehicle.name} · ${vehicle.plate} · ${vehicle.type}`} />
                )}
              </section>

              <Separator />

              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-primaryGray">Timeline</h3>
                <ul className="space-y-1 text-xs text-primaryGray">
                  <li>Assigned to you by Maguy dispatch · {formatDateTime(ride.assignedAt)}</li>
                  {ride.status === 'pending' && <li>Respond by · {formatDateTime(ride.respondBy)}</li>}
                  {ride.acceptedAt && <li>Accepted · {formatDateTime(ride.acceptedAt)}</li>}
                  {ride.rejectedAt && (
                    <li className="text-brand-red">
                      Rejected · {formatDateTime(ride.rejectedAt)} — {ride.rejectReason}
                    </li>
                  )}
                  {ride.completedAt && <li>Completed · {formatDateTime(ride.completedAt)}</li>}
                </ul>
              </section>

              <div className="pt-2">
                <RideRowActions ride={ride} />
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
